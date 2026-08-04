// ─── Data-shape migrations ────────────────────────────────────────────────────
// Run on every data load / save to keep the model schema up to date.
// All functions receive a plain-object model and return it mutated in place.

import SEED from '../../seed.json';

// ─── Boot-time migrations (run once from localStorage / SEED) ─────────────────

/**
 * Migrate data loaded from localStorage or the cloud on first app boot.
 * Handles schema changes that are one-time transformations.
 */
export function applyInitialMigrations(data) {
  _migrateCrmSplitDispatchPayment(data);
  _migrateRemoveOnboardMetrics(data);
  _migrateInjectGasmt(data);
  _migrateInjectOilPerMt(data);
  _migrateInjectQtyReplaced(data);
  _migrateInjectRonoStage(data);
  _migrateComplaintsRename(data);
  _migrateInjectClosedComplaints(data);
  _migrateFixDurationCorruption(data);
  _migrateForceFixedPlans(data);
  return data;
}

import { FIXED_PLAN_VALUES } from '../constants/kpiConstants';

// ─── Save-time migrations (run every saveToLocal call) ────────────────────────

/**
 * Repair / backfill the model each time it is saved locally.
 * Guards against stale cloud data that may be missing newer fields.
 */
export function applyStorageMigrations(model) {
  _injectMissingCrmOnTimeMetrics(model);
  _repairHiringPositionSubStrings(model);
  _injectMissingGasmt(model);
  _injectMissingOilPerMt(model);
  _injectMissingQtyReplaced(model);
  _injectMissingRonoStage(model);
  _migrateComplaintsRename(model);
  _migrateInjectClosedComplaints(model);
  _migrateFixDurationCorruption(model);
  _migrateForceFixedPlans(model);
  return model;
}

// ─── Individual migration helpers ─────────────────────────────────────────────

/** Force fixed plan values onto all existing weeks (e.g. ingots=6, avg_closing=2) */
function _migrateForceFixedPlans(data) {
  if (!data.weeks || !data.departments) return;
  data.departments.forEach(d => {
    d.metrics.forEach(m => {
      if (FIXED_PLAN_VALUES[m.id] !== undefined) {
        data.weeks.forEach(w => {
          m.plan[w.id] = FIXED_PLAN_VALUES[m.id];
        });
      }
    });
  });
}

// ─── Individual migration helpers ─────────────────────────────────────────────

/** Split legacy 'otd' and 'paycoll' into planned + ontime pairs */
function _migrateCrmSplitDispatchPayment(data) {
  const crm = data.departments.find(d => d.id === 'crm');
  if (!crm) return;

  const newCrmMetrics = [];
  crm.metrics.forEach(m => {
    if (m.id === 'otd') {
      newCrmMetrics.push({ ...m, id: 'planned_dispatch', name: 'Planned Dispatch' });
      newCrmMetrics.push({ ...m, id: 'ontime_dispatch',  name: 'On-Time Dispatch', actual: m.ontime || m.actual });
    } else if (m.id === 'paycoll') {
      newCrmMetrics.push({ ...m, id: 'planned_payment', name: 'Planned Payment' });
      newCrmMetrics.push({ ...m, id: 'ontime_payment',  name: 'On-Time Payment', actual: m.ontime || m.actual });
    } else if (!['planned_dispatch','ontime_dispatch','planned_payment','ontime_payment'].includes(m.id)) {
      newCrmMetrics.push(m);
    }
  });
  newCrmMetrics.forEach(m => { delete m.ontime; });
  crm.metrics = newCrmMetrics;
}

/** Strip legacy onboard metrics from hiring */
function _migrateRemoveOnboardMetrics(data) {
  const hiring = data.departments.find(d => d.id === 'hiring');
  if (!hiring) return;
  hiring.metrics = hiring.metrics.filter(m => !m.id.endsWith('_onboard') && m.id !== 'onboard');
}

/** Ensure gasmt exists in production (adds it from SEED if absent) */
function _migrateInjectGasmt(data) {
  const production = data.departments.find(d => d.id === 'production');
  if (!production || production.metrics.find(m => m.id === 'gasmt')) return;

  const seedGasmt = SEED.departments.find(d => d.id === 'production')?.metrics.find(m => m.id === 'gasmt');
  if (seedGasmt) production.metrics.push(JSON.parse(JSON.stringify(seedGasmt)));
}

/** Inject 'otd_ontime' and 'paycoll_ontime' stubs into CRM if absent */
function _injectMissingCrmOnTimeMetrics(model) {
  const crm = model.departments.find(d => d.id === 'crm');
  if (!crm) return;

  const stubs = [
    { id: 'otd_ontime',     name: 'On-time Dispatch', parentId: 'otd' },
    { id: 'paycoll_ontime', name: 'On-time Payment',  parentId: 'paycoll' },
  ];

  stubs.forEach(stub => {
    if (crm.metrics.some(m => m.id === stub.id)) return;
    const newM = { id: stub.id, name: stub.name, sub: '', unit: '', dir: 'higher', total: false, plan: {}, actual: {}, promised: {} };
    const parentIdx = crm.metrics.findIndex(m => m.id === stub.parentId);
    if (parentIdx !== -1) crm.metrics.splice(parentIdx + 1, 0, newM);
    else crm.metrics.push(newM);
  });
}

/** Repair missing 'Position:' prefix in hiring position metric sub-strings */
function _repairHiringPositionSubStrings(model) {
  const hiring = model.departments.find(d => d.id === 'hiring');
  if (!hiring) return;

  hiring.metrics.filter(m => m.id.startsWith('pos_')).forEach(m => {
    if (/Position:/i.test(m.sub || '')) return;

    const parts = m.id.split('_');
    if (parts.length < 4) return;

    const rec      = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    const stageKey = parts[parts.length - 1];
    const stageName = stageKey === 'apps' ? 'Applications' : stageKey === 'final' ? 'Final Rounds' : 'Offer Given To';

    // Try to recover position name from a sibling metric that still has the sub string
    const sibling = hiring.metrics.find(s =>
      s.id.startsWith(`pos_${parts[1]}_${parts[2]}_`) && s.id !== m.id && /Position:/i.test(s.sub || '')
    );
    let posName = parts[2];
    if (sibling) {
      const pMatch = sibling.sub.match(/Position:\s*([^·]+)/i);
      if (pMatch) posName = pMatch[1].trim();
    }

    m.sub = `Recruiter: ${rec} · Position: ${posName} · ${stageName}`;
  });
}

/** Ensure gasmt exists in production on every save (may arrive without it from cloud) */
function _injectMissingGasmt(model) {
  const prod = model.departments.find(d => d.id === 'production');
  if (!prod || prod.metrics.find(m => m.id === 'gasmt')) return;

  const seedGasmt = SEED.departments.find(d => d.id === 'production')?.metrics.find(m => m.id === 'gasmt');
  if (!seedGasmt) return;

  // Ensure all current week keys exist on the seed metric copy
  const copy = JSON.parse(JSON.stringify(seedGasmt));
  model.weeks.forEach(w => {
    if (!(w.id in copy.plan))   copy.plan[w.id]   = '';
    if (!(w.id in copy.actual)) copy.actual[w.id] = '';
  });
  prod.metrics.push(copy);
}
/** Ensure oilpermt exists in production on every save */
function _injectMissingOilPerMt(model) {
  const prod = model.departments.find(d => d.id === 'production');
  if (!prod || prod.metrics.find(m => m.id === 'oilpermt')) return;

  const seedOilPerMt = SEED.departments.find(d => d.id === 'production')?.metrics.find(m => m.id === 'oilpermt');
  if (!seedOilPerMt) return;

  const copy = JSON.parse(JSON.stringify(seedOilPerMt));
  model.weeks.forEach(w => {
    if (!(w.id in copy.plan))   copy.plan[w.id]   = '';
    if (!(w.id in copy.actual)) copy.actual[w.id] = '';
  });

  // Insert right after oilmt
  const oilmtIdx = prod.metrics.findIndex(m => m.id === 'oilmt');
  if (oilmtIdx !== -1) prod.metrics.splice(oilmtIdx + 1, 0, copy);
  else prod.metrics.push(copy);
}

/** Boot-time: inject oilpermt from SEED if absent */
function _migrateInjectOilPerMt(data) {
  _injectMissingOilPerMt(data);
}

/** Ensure qty_replaced exists in production on every save */
function _injectMissingQtyReplaced(model) {
  const prod = model.departments.find(d => d.id === 'production');
  if (!prod || prod.metrics.find(m => m.id === 'qty_replaced')) return;

  const seedMetric = SEED.departments.find(d => d.id === 'production')?.metrics.find(m => m.id === 'qty_replaced');
  if (!seedMetric) return;

  const copy = JSON.parse(JSON.stringify(seedMetric));
  model.weeks.forEach(w => {
    if (!(w.id in copy.plan))   copy.plan[w.id]   = '';
    if (!(w.id in copy.actual)) copy.actual[w.id] = '';
  });
  prod.metrics.push(copy);
}

/** Boot-time: inject qty_replaced from SEED if absent */
function _migrateInjectQtyReplaced(data) {
  _injectMissingQtyReplaced(data);
}

// ─── Interview with Rono stage injection ───────────────────────────────────────

/**
 * For every existing hiring role (identified by a _apps metric), inject the
 * matching _rono metric if it is absent. Inserts it right after _apps so the
 * stage order stays: apps → rono → final → offer.
 */
function _injectMissingRonoStage(model) {
  const hiring = model.departments.find(d => d.id === 'hiring');
  if (!hiring) return;

  // Find all _apps metrics — each represents one role/recruiter combo
  const appsMetrics = hiring.metrics.filter(m => m.id.endsWith('_apps'));

  appsMetrics.forEach(appsM => {
    const baseId  = appsM.id.slice(0, -5); // strip '_apps'
    const ronoId  = `${baseId}_rono`;
    if (hiring.metrics.some(m => m.id === ronoId)) return; // already present

    // Derive recruiter & role names from the _apps metric's sub string
    // sub format: "Recruiter: Dipesh · Position: Manager · Applications"
    const subStr    = appsM.sub || '';
    const recMatch  = subStr.match(/Recruiter:\s*([^·]+)/);
    const posMatch  = subStr.match(/Position:\s*([^·]+)/);
    const recruiter = recMatch ? recMatch[1].trim() : '';
    const role      = posMatch ? posMatch[1].trim() : '';

    const ronoM = {
      id:          ronoId,
      name:        role ? `${role} — Interview with Rono` : 'Interview with Rono',
      sub:         `Recruiter: ${recruiter} · Position: ${role} · Interview with Rono`,
      unit:        '',
      dir:         'higher',
      total:       false,
      plan:        {},
      actual:      {},
      activeWeeks: Array.isArray(appsM.activeWeeks) ? [...appsM.activeWeeks] : [],
    };

    // Seed week keys from the _apps metric
    Object.keys(appsM.plan).forEach(wid => { ronoM.plan[wid] = ''; });
    Object.keys(appsM.actual).forEach(wid => { ronoM.actual[wid] = ''; });

    // Insert immediately after _apps
    const appsIdx = hiring.metrics.findIndex(m => m.id === appsM.id);
    hiring.metrics.splice(appsIdx + 1, 0, ronoM);
  });
}

/** Boot-time: inject _rono stage for existing roles */
function _migrateInjectRonoStage(data) {
  _injectMissingRonoStage(data);
}

// ─── Complaints rename + new metrics migration ────────────────────────────────

/** Rename 'Complaints' -> 'Open Complaints' in CRM if still on old name. */
function _migrateComplaintsRename(model) {
  const crm = model.departments.find(d => d.id === 'crm');
  if (!crm) return;
  const comp = crm.metrics.find(m => m.id === 'complaints');
  if (comp && comp.name === 'Complaints') comp.name = 'Open Complaints';
}

/**
 * Inject 'closed_complaints' and 'avg_closing_days' into CRM
 * immediately after 'complaints', if they don't exist yet.
 */
function _migrateInjectClosedComplaints(model) {
  const crm = model.departments.find(d => d.id === 'crm');
  if (!crm) return;

  const weekIds = model.weeks.map(w => w.id);
  const blankWeeks = wids => Object.fromEntries(wids.map(id => [id, '']));

  const compIdx = crm.metrics.findIndex(m => m.id === 'complaints');
  if (compIdx === -1) return;

  let insertAfter = compIdx;

  if (!crm.metrics.some(m => m.id === 'closed_complaints')) {
    const closedM = {
      id: 'closed_complaints',
      name: 'Closed Complaints',
      sub: '',
      unit: '',
      dir: 'higher',
      total: false,
      plan:    blankWeeks(weekIds),
      actual:  blankWeeks(weekIds),
      promised: {},
    };
    crm.metrics.splice(insertAfter + 1, 0, closedM);
    insertAfter += 1;
  }

  if (!crm.metrics.some(m => m.id === 'avg_closing_days')) {
    const avgM = {
      id: 'avg_closing_days',
      name: 'Avg. Closing Days',
      sub: 'lower is better',
      unit: 'days',
      dir: 'lower',
      total: false,
      plan:    Object.fromEntries(weekIds.map(id => [id, 2])), // force 2
      actual:  blankWeeks(weekIds),
      promised: {},
    };
    crm.metrics.splice(insertAfter + 1, 0, avgM);
  } else {
    // Backfill existing empty plans to 2
    const avgM = crm.metrics.find(m => m.id === 'avg_closing_days');
    if (avgM && avgM.plan) {
      Object.keys(avgM.plan).forEach(wid => {
        avgM.plan[wid] = 2;
      });
    }
  }
}

// ─── Fix [h]:mm duration corruption ──────────────────────────────────────────

/**
 * When the backend mistakenly applied [h]:mm format to ALL week columns,
 * Google Sheets displayed every number N as a duration (N treated as days).
 * getDisplayValues() then returned strings like "1008:00" for what was 42.
 *
 * Reverse formula:  original_number = (hours + minutes/60) / 24
 * because Sheets rendered:  N days  →  [N*24]h [fractional*60]m
 *
 * This migration converts those corrupted "H:MM" strings back to numbers
 * for every metric that is NOT a time metric (unit !== 'hrs').
 * Time metrics (hrslost) keep their "H:MM" strings untouched.
 */
function _migrateFixDurationCorruption(model) {
  const HH_MM = /^(\d+):(\d{2})$/;
  model.departments.forEach(dept => {
    dept.metrics.forEach(m => {
      // Keep HH:MM strings as-is for genuine time metrics
      if (m.unit === 'hrs') return;
      ['plan', 'actual', 'promised'].forEach(field => {
        if (!m[field]) return;
        Object.keys(m[field]).forEach(wid => {
          const v = m[field][wid];
          if (typeof v !== 'string') return;
          const match = v.match(HH_MM);
          if (!match) return;
          const h  = parseInt(match[1], 10);
          const mm = parseInt(match[2], 10);
          // Reverse Sheets [h]:mm day-fraction rendering
          const original = (h + mm / 60) / 24;
          // Round to a sensible precision (no floating-point noise)
          m[field][wid] = Math.round(original * 10000) / 10000;
        });
      });
    });
  });
}
