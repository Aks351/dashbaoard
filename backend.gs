/****************************************************************
 * DASHBOARD BACKEND - Google Apps Script
 *
 * TIME HANDLING STRATEGY
 * ──────────────────────────────────────────────────────────────
 * Time values (e.g. "50:26") are stored as real [h]:mm DURATION
 * cells in Google Sheets.
 *
 * WRITE:  Format the cell range as [h]:mm  BEFORE setValues().
 *         Google Sheets auto-parses "50:26" into a proper duration.
 *
 * READ:   Use getDisplayValues() instead of getValues() for data
 *         cells.  Display values are always plain strings ("50:26",
 *         "42", "") — Date objects are never returned, so timezone
 *         and epoch offsets cannot corrupt anything.
 ****************************************************************/


/* ============================================================
   CONFIG
   ============================================================ */
const CONFIG = {
  DATA_TAB: "data",
  META_TAB:  "meta",
  EDIT_KEY:  PropertiesService.getScriptProperties().getProperty("EDIT_KEY")
};

const METRIC_COLUMNS = [
  "Department ID", "Department", "Emoji",
  "Metric ID", "Metric Name", "Sub", "Unit", "Dir", "Total",
  "Active Weeks"
];

function setup() {
  PropertiesService.getScriptProperties().setProperty("EDIT_KEY", "vinayak2026");
}


/* ============================================================
   HELPERS
   ============================================================ */
function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}
function errorResponse(code, msg) {
  return jsonResponse({ ok: false, code: code, message: msg });
}
function has_(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}
function coerceBool_(v) {
  return (v === true || v === "TRUE");
}
function parseJsonCol_(v) {
  if (!v || v === "") return [];
  try { return JSON.parse(v); } catch (_) { return []; }
}


/* ============================================================
   VALUE COERCION  (display string  <->  model value)
   ============================================================ */

/**
 * Convert a display-value string (from getDisplayValues) to a
 * frontend-safe value.
 *
 *   "50:26"   ->  "50:26"  (time string — kept as-is for frontend)
 *   "42"      ->  42       (plain number)
 *   "3.14"    ->  3.14
 *   ""        ->  ""
 */
function displayToModel_(str) {
  if (str === "" || str === null || str === undefined) return "";
  // Duration strings like "50:26" or "50:26:00" — keep as HH:MM
  var dm = str.match(/^(\d+):(\d{2})(:\d{2})?$/);
  if (dm) return dm[1] + ":" + dm[2];   // normalise to HH:MM (drop seconds)
  var n = Number(str);
  return isNaN(n) ? str : n;
}

/**
 * Prepare a model value for writing into a Sheets cell.
 *
 * For NON-time cells we write the raw number/string so Sheets keeps
 * them as numbers (no special treatment needed).
 *
 * For time values we write the "HH:MM" string; the caller is
 * responsible for setting [h]:mm format on the range BEFORE calling
 * setValues(), which makes Sheets parse it as a real duration.
 */
function modelToSheet_(val) {
  if (val === "" || val === null || val === undefined) return "";
  return val;   // HH:MM strings and plain numbers both go straight in
}


/* ============================================================
   VALIDATION
   ============================================================ */
function validateDashboard(data) {
  if (!data)                            throw { code: "VALIDATION_ERROR", message: "Missing data" };
  if (!data.meta)                       throw { code: "VALIDATION_ERROR", message: "Missing meta" };
  if (!Array.isArray(data.departments)) throw { code: "VALIDATION_ERROR", message: "departments not an array" };
  if (!Array.isArray(data.weeks))       throw { code: "VALIDATION_ERROR", message: "weeks not an array" };
  data.departments.forEach(function(dept, i) {
    if (!Array.isArray(dept.metrics))
      throw { code: "VALIDATION_ERROR", message: "dept[" + i + "] missing metrics array" };
  });
}


/* ============================================================
   GRID BUILD  (model JSON  ->  2-D array for setValues)
   ============================================================ */
function buildGrid_(data) {
  var weeks = data.weeks;

  // Header row
  var header = METRIC_COLUMNS.slice();
  weeks.forEach(function(wk) {
    header.push(wk.label + " Plan", wk.label + " Actual", wk.label + " Promised");
  });

  var rows = [header];

  data.departments.forEach(function(dept) {
    dept.metrics.forEach(function(metric) {
      var row = [
        dept.id, dept.name, dept.emoji || "",
        metric.id, metric.name, metric.sub || "",
        metric.unit || "", metric.dir || "",
        metric.total ? true : false,
        JSON.stringify(metric.activeWeeks || [])
      ];
      weeks.forEach(function(wk) {
        row.push(
          modelToSheet_(has_(metric.plan,     wk.id) ? metric.plan[wk.id]     : ""),
          modelToSheet_(has_(metric.actual,   wk.id) ? metric.actual[wk.id]   : ""),
          modelToSheet_(has_(metric.promised, wk.id) ? metric.promised[wk.id] : "")
        );
      });
      rows.push(row);
    });
  });

  var weekRows = weeks.map(function(wk) {
    return [wk.id, wk.label, wk.range || ""];
  });

  return { dataRows: rows, weekRows: weekRows, weeks: weeks };
}


/* ============================================================
   GRID READ  (sheet  ->  model JSON)
   Uses getDisplayValues() so we always get strings — never Dates.
   ============================================================ */
function readGrid_(metaSheet, dataSheet) {
  var metaValues = metaSheet.getDataRange().getValues();
  if (metaValues.length < 5) return null;

  var dashboardMeta  = metaValues[0][1] ? JSON.parse(metaValues[0][1]) : {};
  var lastUpdatedRaw = metaValues[1][1];
  var version        = parseInt(metaValues[2][1], 10) || 1;

  var weeks = metaValues.slice(5)
    .filter(function(r) { return r[0] !== ""; })
    .map(function(r) { return { id: String(r[0]), label: String(r[1]), range: String(r[2] || "") }; });

  var dataRange = dataSheet.getDataRange();
  if (dataRange.getNumRows() < 2) {
    return {
      data: { meta: dashboardMeta, weeks: weeks, departments: [] },
      lastUpdated: lastUpdatedRaw ? new Date(lastUpdatedRaw).toISOString() : null,
      version: version
    };
  }

  // ── KEY: use getDisplayValues() so Sheets durations come back as
  //    "50:26" strings, NOT as Date objects. ──────────────────────
  var displayRows = dataRange.getDisplayValues();
  var headerRow   = displayRows[0].map(function(h) { return String(h).trim(); });

  var hasActiveWeeksCol = (headerRow[9] === "Active Weeks");
  var fixedColCount     = hasActiveWeeksCol ? 10 : 9;
  var dataRows          = displayRows.slice(1);

  var deptOrder = [];
  var deptById  = {};

  dataRows.forEach(function(row) {
    var deptId     = String(row[0]);
    var deptName   = String(row[1]);
    var emoji      = String(row[2] || "");
    var metricId   = String(row[3]);
    var metricName = String(row[4]);
    var sub        = String(row[5] || "");
    var unit       = String(row[6] || "");
    var dir        = String(row[7] || "higher");
    var total      = coerceBool_(row[8]);
    var activeWeeks = hasActiveWeeksCol ? parseJsonCol_(row[9]) : [];

    if (!deptId || !metricId) return;

    if (!deptById[deptId]) {
      deptById[deptId] = { id: deptId, name: deptName, emoji: emoji, metrics: [] };
      deptOrder.push(deptById[deptId]);
    }

    var plan = {}, actual = {}, promised = {};
    weeks.forEach(function(wk, i) {
      var base       = fixedColCount + i * 3;
      plan[wk.id]    = displayToModel_(row[base]);
      actual[wk.id]  = displayToModel_(row[base + 1]);
      promised[wk.id]= displayToModel_(row[base + 2]);
    });

    var metric = {
      id: metricId, name: metricName, sub: sub,
      unit: unit, dir: dir, total: total,
      plan: plan, actual: actual, promised: promised
    };
    if (activeWeeks.length > 0) metric.activeWeeks = activeWeeks;

    deptById[deptId].metrics.push(metric);
  });

  return {
    data: { meta: dashboardMeta, weeks: weeks, departments: deptOrder },
    lastUpdated: lastUpdatedRaw ? new Date(lastUpdatedRaw).toISOString() : null,
    version: version
  };
}


/* ============================================================
   WRITE HELPER  (shared by saveDashboard + saveDelta)
   ============================================================ */
function writeGrid_(grid, data, metaSheet, dataSheet) {
  var prevVersion = parseInt(metaSheet.getRange("B3").getValue(), 10) || 0;
  var version     = prevVersion + 1;
  var now         = new Date();

  // ── meta sheet ────────────────────────────────────────────
  metaSheet.clearContents();
  metaSheet.getRange(1, 1, 3, 2).setValues([
    ["Dashboard Meta (JSON)", JSON.stringify(data.meta)],
    ["Last Updated",          now                      ],
    ["Version",               version                  ]
  ]);
  metaSheet.getRange(5, 1, 1, 3).setValues([["Week ID", "Label", "Range"]]);
  if (grid.weekRows.length) {
    metaSheet.getRange(6, 1, grid.weekRows.length, 3).setValues(grid.weekRows);
  }

  // ── data sheet ────────────────────────────────────────────
  // Use clear() (wipes content AND format) so no old [h]:mm or other
  // cell formats linger from previous writes.
  dataSheet.clear();

  var numRows = grid.dataRows.length;
  var numCols = grid.dataRows[0].length;
  var range   = dataSheet.getRange(1, 1, numRows, numCols);

  // Format ALL cells as plain text BEFORE writing.
  // This stops Sheets from auto-converting "50:26" into a Date/Duration
  // or treating numbers as day-fractions.  getDisplayValues() will then
  // return exactly what we wrote ("50:26", "42", "") with no surprises.
  range.setNumberFormat("@");
  range.setValues(grid.dataRows);

  return { version: version, savedAt: now.toISOString() };
}


/* ============================================================
   PUBLIC API FUNCTIONS
   ============================================================ */
function readDashboard() {
  var metaSheet = getOrCreateSheet_(CONFIG.META_TAB);
  var dataSheet = getOrCreateSheet_(CONFIG.DATA_TAB);
  var grid      = readGrid_(metaSheet, dataSheet);
  if (!grid) return { ok: true, data: null, meta: { lastUpdated: null, version: 1 } };
  return { ok: true, data: grid.data, meta: { lastUpdated: grid.lastUpdated, version: grid.version } };
}

function saveDashboard(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    validateDashboard(body.data);
    var grid      = buildGrid_(body.data);
    var metaSheet = getOrCreateSheet_(CONFIG.META_TAB);
    var dataSheet = getOrCreateSheet_(CONFIG.DATA_TAB);
    var result    = writeGrid_(grid, body.data, metaSheet, dataSheet);
    return { ok: true, savedAt: result.savedAt, version: result.version };
  } finally { lock.releaseLock(); }
}

function saveDelta(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var current = readDashboard();
    if (!current || !current.data) throw { code: "STATE_ERROR", message: "Failed to read current state" };

    var data  = current.data;
    var edits = body.edits || [];

    edits.forEach(function(edit) {
      var dept = data.departments.filter(function(d) { return d.id === edit.deptId; })[0];
      if (!dept) return;
      var metric = dept.metrics.filter(function(m) { return m.id === edit.metricId; })[0];
      if (!metric) return;
      if (!metric[edit.field]) metric[edit.field] = {};
      metric[edit.field][edit.weekId] = edit.value;
    });

    var grid      = buildGrid_(data);
    var metaSheet = getOrCreateSheet_(CONFIG.META_TAB);
    var dataSheet = getOrCreateSheet_(CONFIG.DATA_TAB);
    var result    = writeGrid_(grid, data, metaSheet, dataSheet);
    return { ok: true, savedAt: result.savedAt, version: result.version, delta: true };
  } finally { lock.releaseLock(); }
}

function doGet(e) {
  try { return jsonResponse(readDashboard()); }
  catch (err) { return errorResponse(err.code || "SERVER_ERROR", err.message || String(err)); }
}

var POST_HANDLERS = {
  save:      saveDashboard,
  saveDelta: saveDelta,
  get:       function(_body) { return readDashboard(); }
};

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents)
      return errorResponse("BAD_REQUEST", "Missing POST body");

    var body = JSON.parse(e.postData.contents);

    if (body.key !== CONFIG.EDIT_KEY)
      return errorResponse("AUTH_ERROR", "Invalid or missing EDIT_KEY");

    var handler = POST_HANDLERS[body.action || "save"];
    if (!handler)
      return errorResponse("UNKNOWN_ACTION", "Action '" + (body.action) + "' not supported");

    return jsonResponse(handler(body));
  } catch (err) {
    return errorResponse(err.code || "SERVER_ERROR", err.message || String(err));
  }
}


/* ============================================================
   SEED  -  one-time DB initialiser
   ============================================================ */
var SEED_JSON = "";   // paste seed.json content here

function seedSheetFromJSON() {
  if (!SEED_JSON || SEED_JSON.trim() === "")
    throw new Error("SEED_JSON is empty. Paste your seed.json content first.");
  var data;
  try { data = JSON.parse(SEED_JSON); }
  catch (e) { throw new Error("Failed to parse SEED_JSON: " + e.message); }
  validateDashboard(data);
  saveDashboard({ data: data });
  Logger.log("Seeded OK. Depts: " + data.departments.length + "  Weeks: " + data.weeks.length);
}
