// ─── Data-shape migrations ────────────────────────────────────────────────────
// Uses declarative schema reconciliation: seed.json is the single source of
// truth for metric definitions, names, and ordering.
//
// Flow (applied on every load + save):
//   1. Legacy data-fix transforms  (irreversible schema changes from old versions)
//   2. Schema reconciliation        (merge stored data onto seed structure)
//   3. Dynamic-metric recovery      (re-attach custom hiring roles from old data)
//   4. Enforce constant rules       (FIXED_PLAN_VALUES, etc.)

import SEED from '../../seed.json';
import { FIXED_PLAN_VALUES } from '../constants/kpiConstants';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run on first app boot (from localStorage or cloud data).
 * Includes one-time legacy transforms + full reconciliation.
 */
export function applyInitialMigrations(data) {
  _legacySplitCrmDispatchPayment(data);
  _legacyFixDurationCorruption(data);
  _reconcileSchema(data);
  _ensureHiringRoleStages(data);
  _enforceFixedPlans(data);
  return data;
}

/**
 * Run every time data is saved to localStorage or received from the cloud.
 * Guards against stale or partially-migrated data.
 */
export function applyStorageMigrations(model) {
  _legacyFixDurationCorruption(model);
  _reconcileSchema(model);
  _ensureHiringRoleStages(model);
  _enforceFixedPlans(model);
  return model;
}

// ─── Core Engine: Declarative Schema Reconciliation ───────────────────────────

/**
 * For each department in SEED, builds the canonical metric list:
 *   - Uses SEED for metric shape (id, name, sub, unit, dir, total, promised flag)
 *   - Merges stored plan/actual/promised values from the user's existing data
 *   - Metrics that exist in SEED but not in stored data are added blank (in SEED order)
 *   - Metrics that exist in stored data but NOT in SEED are dropped
 *     (exception: hiring department where users create dynamic role metrics)
 *
 * Adding a new metric to seed.json is all that is needed — it appears
 * automatically in the correct position on every user's next load.
 */
function _reconcileSchema(model) {
  if (!model.departments || !model.weeks) return;
  const weekIds = model.weeks.map(w => w.id);

  SEED.departments.forEach(seedDept => {
    let storedDept = model.departments.find(d => d.id === seedDept.id);

    // Department missing entirely — add it wholesale from SEED
    if (!storedDept) {
      const blankDept = JSON.parse(JSON.stringify(seedDept));
      blankDept.metrics.forEach(m => _backfillWeeks(m, weekIds));
      model.departments.push(blankDept);
      return;
    }

    // Build index of stored metrics for fast lookup
    const storedMetricMap = {};
    storedDept.metrics.forEach(m => { storedMetricMap[m.id] = m; });

    // Build reconciled metric list following SEED ordering
    const reconciledMetrics = seedDept.metrics.map(seedMetric => {
      const stored = storedMetricMap[seedMetric.id];
      if (stored) {
        // Metric exists: use SEED for shape, overlay stored data values
        return {
          ...seedMetric,
          plan:     _mergeWeekData(seedMetric.plan,     stored.plan,     weekIds),
          actual:   _mergeWeekData(seedMetric.actual,   stored.actual,   weekIds),
          promised: _mergeWeekData(seedMetric.promised, stored.promised, weekIds),
          // Preserve dynamic fields (e.g. activeWeeks on hiring metrics)
          ...(stored.activeWeeks != null ? { activeWeeks: stored.activeWeeks } : {}),
        };
      } else {
        // New metric (e.g. total_cuts, gasmt): initialise blank for all weeks
        const fresh = JSON.parse(JSON.stringify(seedMetric));
        _backfillWeeks(fresh, weekIds);
        return fresh;
      }
    });

    // For hiring: also preserve user-created dynamic role metrics
    // (those that don't exist in SEED — pos_* and rec_* prefixed roles)
    if (seedDept.id === 'hiring') {
      const seedIds = new Set(seedDept.metrics.map(m => m.id));
      const dynamicRoles = storedDept.metrics.filter(m => !seedIds.has(m.id));
      dynamicRoles.forEach(m => _backfillWeeks(m, weekIds));
      reconciledMetrics.push(...dynamicRoles);
    }

    storedDept.metrics = reconciledMetrics;
  });
}

/**
 * For every dynamic hiring role identified by a `_apps` metric, ensure all
 * required stage siblings exist (apps → rono → final → offer).
 * Inserts missing siblings in the correct order immediately after _apps.
 */
function _ensureHiringRoleStages(model) {
  const hiring = model.departments.find(d => d.id === 'hiring');
  if (!hiring) return;

  const weekIds = model.weeks.map(w => w.id);
  const blankWeeks = () => Object.fromEntries(weekIds.map(id => [id, '']));

  const appsMetrics = hiring.metrics.filter(m => m.id.endsWith('_apps'));
  appsMetrics.forEach(appsM => {
    const baseId = appsM.id.slice(0, -5); // strip '_apps'

    // Derive recruiter & role from sub string
    // sub format: "Recruiter: Dipesh · Position: Manager · Applications"
    const subStr    = appsM.sub || '';
    const recMatch  = subStr.match(/Recruiter:\s*([^·]+)/);
    const posMatch  = subStr.match(/Position:\s*([^·]+)/);
    const recruiter = recMatch ? recMatch[1].trim() : '';
    const role      = posMatch ? posMatch[1].trim() : '';

    const siblings = [
      { suffix: '_rono',  label: 'Interview with Rono' },
      { suffix: '_final', label: 'Final Rounds' },
      { suffix: '_offer', label: 'Offer Given To' },
    ];

    let insertAfterIdx = hiring.metrics.findIndex(m => m.id === appsM.id);

    siblings.forEach(({ suffix, label }) => {
      const sibId  = `${baseId}${suffix}`;
      const existingIdx = hiring.metrics.findIndex(m => m.id === sibId);
      if (existingIdx !== -1) {
        insertAfterIdx = Math.max(insertAfterIdx, existingIdx);
        return;
      }
      const newM = {
        id:          sibId,
        name:        role ? `${role} — ${label}` : label,
        sub:         `Recruiter: ${recruiter} · Position: ${role} · ${label}`,
        unit:        '',
        dir:         'higher',
        total:       false,
        plan:        blankWeeks(),
        actual:      blankWeeks(),
        activeWeeks: Array.isArray(appsM.activeWeeks) ? [...appsM.activeWeeks] : [],
      };
      hiring.metrics.splice(insertAfterIdx + 1, 0, newM);
      insertAfterIdx += 1;
    });
  });
}

// ─── Legacy One-Time Transforms ───────────────────────────────────────────────
// Kept because they represent irreversible schema changes that cannot be
// inferred from seed.json alone.

/**
 * Split legacy 'otd' into 'planned_dispatch' + 'ontime_dispatch',
 * and 'paycoll' into 'planned_payment' + 'ontime_payment'.
 * Idempotent — exits early if already split.
 */
function _legacySplitCrmDispatchPayment(data) {
  const crm = data.departments.find(d => d.id === 'crm');
  if (!crm) return;
  // Already in new format — otd and otd_ontime are separate metrics
  if (crm.metrics.some(m => m.id === 'otd_ontime' || m.id === 'paycoll_ontime')) return;
  if (!crm.metrics.some(m => m.id === 'otd' || m.id === 'paycoll')) return;

  const newMetrics = [];
  crm.metrics.forEach(m => {
    if (m.id === 'otd') {
      newMetrics.push({ ...m, id: 'planned_dispatch', name: 'Planned Dispatch' });
      newMetrics.push({ ...m, id: 'ontime_dispatch',  name: 'On-Time Dispatch', actual: m.ontime || m.actual });
    } else if (m.id === 'paycoll') {
      newMetrics.push({ ...m, id: 'planned_payment', name: 'Planned Payment' });
      newMetrics.push({ ...m, id: 'ontime_payment',  name: 'On-Time Payment', actual: m.ontime || m.actual });
    } else if (!['planned_dispatch','ontime_dispatch','planned_payment','ontime_payment'].includes(m.id)) {
      newMetrics.push(m);
    }
  });
  newMetrics.forEach(m => { delete m.ontime; });
  crm.metrics = newMetrics;
}

/**
 * Fix corrupted [h]:mm duration strings produced when the backend mistakenly
 * formatted all numeric week values as Sheets [h]:mm durations.
 * Non-time metrics (unit !== 'hrs') have their values converted back to numbers.
 */
function _legacyFixDurationCorruption(model) {
  const HH_MM = /^(\d+):(\d{2})$/;
  model.departments.forEach(dept => {
    dept.metrics.forEach(m => {
      if (m.unit === 'hrs') return; // legitimate time metrics — leave as-is
      ['plan', 'actual', 'promised'].forEach(field => {
        if (!m[field]) return;
        Object.keys(m[field]).forEach(wid => {
          const v = m[field][wid];
          if (typeof v !== 'string') return;
          const match = v.match(HH_MM);
          if (!match) return;
          const h  = parseInt(match[1], 10);
          const mm = parseInt(match[2], 10);
          m[field][wid] = Math.round(((h + mm / 60) / 24) * 10000) / 10000;
        });
      });
    });
  });
}

// ─── Rule Enforcement ─────────────────────────────────────────────────────────

/** Force fixed plan values (e.g. avg_closing_days=2, ing97=7) onto all weeks. */
function _enforceFixedPlans(data) {
  if (!data.weeks || !data.departments) return;
  data.departments.forEach(d => {
    d.metrics.forEach(m => {
      const fixedVal = FIXED_PLAN_VALUES[m.id];
      if (fixedVal !== undefined) {
        data.weeks.forEach(w => { m.plan[w.id] = fixedVal; });
      }
    });
  });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Merge stored week data onto a base object.
 *   - base: SEED defaults (provides the shape/keys)
 *   - stored: user's entered data (takes priority over SEED defaults)
 *   - All current weekIds are guaranteed to exist in the result.
 */
function _mergeWeekData(base, stored, weekIds) {
  const result = {};
  Object.assign(result, base   || {});
  Object.assign(result, stored || {});
  weekIds.forEach(id => { if (!(id in result)) result[id] = ''; });
  return result;
}

/** Ensure plan/actual/promised all have a key (blank string) for every week. */
function _backfillWeeks(metric, weekIds) {
  ['plan', 'actual', 'promised'].forEach(field => {
    if (!metric[field]) metric[field] = {};
    weekIds.forEach(id => { if (!(id in metric[field])) metric[field][id] = ''; });
  });
}

