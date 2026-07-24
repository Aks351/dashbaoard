/****************************************************************
 * config.gs - Configuration and Setup
 ****************************************************************/

const CONFIG = {
  DATA_TAB: "data",
  META_TAB: "meta",
  EDIT_KEY: PropertiesService.getScriptProperties().getProperty("EDIT_KEY")
};

/**
 * Fixed columns on the "data" tab, BEFORE the per-week Plan/Actual/Promised triples.
 * activeWeeks is stored as a JSON-serialised array so it survives the round-trip.
 */
const METRIC_COLUMNS = [
  "Department ID", "Department", "Emoji",
  "Metric ID", "Metric Name", "Sub", "Unit", "Dir", "Total",
  "Active Weeks"
];

function setup() {
  PropertiesService.getScriptProperties().setProperty("EDIT_KEY", "vinayak2026");
}


/****************************************************************
 * helpers.gs - Utility functions
 ****************************************************************/

function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(code, message) {
  return jsonResponse({ ok: false, code: code, message: message });
}

function has_(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function coerceBool_(v) {
  if (v === true  || v === "TRUE")  return true;
  return false;
}

function parseJsonCol_(v) {
  if (!v || v === "") return [];
  try { return JSON.parse(v); } catch (_) { return []; }
}


/****************************************************************
 * validation.gs - Data validation
 ****************************************************************/

function validateDashboard(data) {
  if (!data)                            throw { code: "VALIDATION_ERROR", message: "Missing data" };
  if (!data.meta)                       throw { code: "VALIDATION_ERROR", message: "Missing meta" };
  if (!Array.isArray(data.departments)) throw { code: "VALIDATION_ERROR", message: "departments missing or not an array" };
  if (!Array.isArray(data.weeks))       throw { code: "VALIDATION_ERROR", message: "weeks missing or not an array" };
  data.departments.forEach(function(dept, i) {
    if (!Array.isArray(dept.metrics)) {
      throw { code: "VALIDATION_ERROR", message: "departments[" + i + "] (\"" + (dept.id || "?") + "\") is missing a metrics array" };
    }
  });
}


/****************************************************************
 * grid.gs - Flatten dashboard JSON <-> wide sheet grid
 ****************************************************************/

function buildGrid_(data) {
  const weeks = data.weeks;

  const header = METRIC_COLUMNS.slice();
  weeks.forEach(function(wk) {
    header.push(wk.label + " Plan", wk.label + " Actual", wk.label + " Promised");
  });

  const rows = [header];

  data.departments.forEach(function(dept) {
    dept.metrics.forEach(function(metric) {
      const row = [
        dept.id,
        dept.name,
        dept.emoji || "",
        metric.id,
        metric.name,
        metric.sub   || "",
        metric.unit  || "",
        metric.dir   || "",
        metric.total ? true : false,
        JSON.stringify(metric.activeWeeks || [])
      ];

      weeks.forEach(function(wk) {
        row.push(
          has_(metric.plan,     wk.id) ? metric.plan[wk.id]     : "",
          has_(metric.actual,   wk.id) ? metric.actual[wk.id]   : "",
          has_(metric.promised, wk.id) ? metric.promised[wk.id] : ""
        );
      });

      rows.push(row);
    });
  });

  const weekRows = weeks.map(function(wk) { return [wk.id, wk.label, wk.range || ""]; });

  return { dataRows: rows, weekRows: weekRows };
}

function readGrid_(metaSheet, dataSheet) {
  const metaValues = metaSheet.getDataRange().getValues();
  if (metaValues.length < 5) return null;

  const dashboardMeta  = metaValues[0][1] ? JSON.parse(metaValues[0][1]) : {};
  const lastUpdatedRaw = metaValues[1][1];
  const version        = parseInt(metaValues[2][1], 10) || 1;

  const weeks = metaValues
    .slice(5)
    .filter(function(r) { return r[0] !== ""; })
    .map(function(r) { return { id: String(r[0]), label: String(r[1]), range: String(r[2] || "") }; });

  const dataValues = dataSheet.getDataRange().getValues();
  if (dataValues.length < 2) {
    return {
      data: { meta: dashboardMeta, weeks: weeks, departments: [] },
      lastUpdated: lastUpdatedRaw ? new Date(lastUpdatedRaw).toISOString() : null,
      version: version
    };
  }

  const headerRow         = dataValues[0].map(function(h) { return String(h).trim(); });
  const hasActiveWeeksCol = headerRow[9] === "Active Weeks";
  const fixedColCount     = hasActiveWeeksCol ? 10 : 9;

  const rows = dataValues.slice(1);

  const deptOrder = [];
  const deptById  = {};

  rows.forEach(function(row) {
    const deptId     = String(row[0]);
    const deptName   = String(row[1]);
    const emoji      = String(row[2] || "");
    const metricId   = String(row[3]);
    const metricName = String(row[4]);
    const sub        = String(row[5] || "");
    const unit       = String(row[6] || "");
    const dir        = String(row[7] || "higher");
    const total      = coerceBool_(row[8]);
    const activeWeeks = hasActiveWeeksCol ? parseJsonCol_(row[9]) : [];

    if (!deptId || !metricId) return;

    if (!deptById[deptId]) {
      deptById[deptId] = { id: deptId, name: deptName, emoji: emoji, metrics: [] };
      deptOrder.push(deptById[deptId]);
    }

    const plan = {}, actual = {}, promised = {};

    weeks.forEach(function(wk, i) {
      const base = fixedColCount + i * 3;

      const planVal   = row[base]     !== undefined ? row[base]     : "";
      const actualVal = row[base + 1] !== undefined ? row[base + 1] : "";

      plan[wk.id]   = planVal   === "" ? "" : Number(planVal);
      actual[wk.id] = actualVal === "" ? "" : Number(actualVal);

      const promisedVal = row[base + 2];
      if (promisedVal !== "" && promisedVal !== undefined && promisedVal !== null) {
        promised[wk.id] = Number(promisedVal);
      }
    });

    const metric = {
      id:       metricId,
      name:     metricName,
      sub:      sub,
      unit:     unit,
      dir:      dir,
      total:    total,
      plan:     plan,
      actual:   actual,
      promised: promised,
    };

    if (activeWeeks.length > 0) {
      metric.activeWeeks = activeWeeks;
    }

    deptById[deptId].metrics.push(metric);
  });

  return {
    data: { meta: dashboardMeta, weeks: weeks, departments: deptOrder },
    lastUpdated: lastUpdatedRaw ? new Date(lastUpdatedRaw).toISOString() : null,
    version: version
  };
}


/****************************************************************
 * main.gs - Core logic, routing, and Apps Script entry points
 ****************************************************************/

function readDashboard() {
  const metaSheet = getOrCreateSheet_(CONFIG.META_TAB);
  const dataSheet = getOrCreateSheet_(CONFIG.DATA_TAB);

  const grid = readGrid_(metaSheet, dataSheet);
  if (!grid) {
    return { ok: true, data: null, meta: { lastUpdated: null, version: 1 } };
  }

  return {
    ok: true,
    data: grid.data,
    meta: { lastUpdated: grid.lastUpdated, version: grid.version }
  };
}

function saveDashboard(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    validateDashboard(body.data);

    const grid = buildGrid_(body.data);

    const metaSheet = getOrCreateSheet_(CONFIG.META_TAB);
    const dataSheet = getOrCreateSheet_(CONFIG.DATA_TAB);

    const prevVersion = parseInt(metaSheet.getRange("B3").getValue(), 10) || 0;
    const version     = prevVersion + 1;
    const now         = new Date();

    metaSheet.clearContents();
    metaSheet.getRange(1, 1, 3, 2).setValues([
      ["Dashboard Meta (JSON)", JSON.stringify(body.data.meta)],
      ["Last Updated", now],
      ["Version", version]
    ]);
    metaSheet.getRange(5, 1, 1, 3).setValues([["Week ID", "Label", "Range"]]);
    if (grid.weekRows.length) {
      metaSheet.getRange(6, 1, grid.weekRows.length, 3).setValues(grid.weekRows);
    }

    dataSheet.clearContents();
    dataSheet.getRange(1, 1, grid.dataRows.length, grid.dataRows[0].length)
             .setValues(grid.dataRows);

    return { ok: true, savedAt: now.toISOString(), version: version };
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    return jsonResponse(readDashboard());
  } catch (err) {
    return errorResponse(err.code || "SERVER_ERROR", err.message || String(err));
  }
}

var POST_HANDLERS = {
  save: saveDashboard,
  get:  function(_body) { return readDashboard(); }
};

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return errorResponse("BAD_REQUEST", "Missing POST body");
    }

    const body = JSON.parse(e.postData.contents);

    if (body.key !== CONFIG.EDIT_KEY) {
      return errorResponse("AUTH_ERROR", "Invalid or missing EDIT_KEY");
    }

    const action  = body.action || "save";
    const handler = POST_HANDLERS[action];
    if (!handler) {
      return errorResponse("UNKNOWN_ACTION", "Action '" + action + "' is not supported");
    }

    return jsonResponse(handler(body));
  } catch (err) {
    return errorResponse(err.code || "SERVER_ERROR", err.message || String(err));
  }
}

/****************************************************************
 * seed.gs - One-time database initializer
 *
 * HOW TO USE:
 * 1. Copy the full contents of your seed.json
 * 2. Paste it as the value of SEED_JSON below (between the backticks)
 * 3. Run seedSheetFromJSON() ONCE from the Apps Script editor
 * 4. The Google Sheet will be populated with all your latest metrics
 *
 * Safe to re-run: it always overwrites with the pasted data.
 ****************************************************************/

var SEED_JSON = '';  // <-- paste your seed.json contents here

function seedSheetFromJSON() {
  if (!SEED_JSON || SEED_JSON.trim() === '') {
    throw new Error('SEED_JSON is empty. Paste your seed.json content into the SEED_JSON variable first.');
  }

  var data;
  try {
    data = JSON.parse(SEED_JSON);
  } catch (e) {
    throw new Error('Failed to parse SEED_JSON: ' + e.message);
  }

  validateDashboard(data);

  saveDashboard({ data: data });

  Logger.log('Sheet seeded successfully from SEED_JSON. Departments: ' + data.departments.length + ', Weeks: ' + data.weeks.length);
}
