// ─── Computed model builder ───────────────────────────────────────────────────
// Transforms the raw stored model into a display-ready computed model.
// Pure function — takes the raw model, returns a new object (deep copy).

import { ZERO_PLAN_IDS, HIDDEN_METRIC_IDS, RECRUITERS } from '../constants/kpiConstants';

const CORE_HIRING_STAGES = [
  { id: 'apps',  name: 'Applications' },
  { id: 'final', name: 'Final Round Interviews' },
  { id: 'offer', name: 'Offer Given To' },
];

/**
 * Build the display-ready computed model from raw stored state.
 * Called inside a useMemo in KpiProvider.
 */
export function buildComputedModel(rawModel) {
  if (!rawModel) return rawModel;

  const model = JSON.parse(JSON.stringify(rawModel));

  _computeHiringAggregates(model);
  _hideHiddenMetrics(model);
  _applyZeroPlanOverrides(model);
  _normalizeCrmNames(model);

  return model;
}

// ─── Hiring aggregate rollup ──────────────────────────────────────────────────

function _computeHiringAggregates(model) {
  const hiring = model.departments.find(d => d.id === 'hiring');
  if (!hiring) return;

  const posMetrics = hiring.metrics.filter(m => m.id.startsWith('pos_'));

  // Ensure core top-level stage metrics exist
  CORE_HIRING_STAGES.forEach(stg => {
    if (!hiring.metrics.some(m => m.id === stg.id)) {
      hiring.metrics.unshift({
        id: stg.id, name: stg.name, sub: 'All positions',
        unit: '', dir: 'higher', total: false,
        plan: {}, actual: {}, promised: {},
      });
    }
  });

  // Ensure per-recruiter stage metrics exist
  RECRUITERS.forEach(rec => {
    CORE_HIRING_STAGES.forEach(stg => {
      const rId = `rec_${rec.toLowerCase()}_${stg.id}`;
      if (!hiring.metrics.some(m => m.id === rId)) {
        hiring.metrics.push({
          id: rId,
          name: `${rec} — ${stg.name === 'Final Round Interviews' ? 'Final Rounds' : stg.name}`,
          sub: `Recruiter: ${rec}`,
          unit: '', dir: 'higher', total: false,
          plan: {}, actual: {}, promised: {},
        });
      }
    });
  });

  // Clear aggregate metrics before recomputing
  hiring.metrics.filter(m => !m.id.startsWith('pos_')).forEach(m => {
    m.plan   = {};
    m.actual = {};
  });

  // Roll up position metrics into recruiter + top totals
  model.weeks.forEach(w => {
    const wid = w.id;
    posMetrics.forEach(pm => {
      const parts   = pm.id.split('_');
      if (parts.length < 4) return;

      const rec     = parts[1];
      const stageId = parts[parts.length - 1];
      const pVal    = pm.plan[wid];
      const aVal    = pm.actual[wid];

      const recM = hiring.metrics.find(m => m.id === `rec_${rec.toLowerCase()}_${stageId}`);
      const topM = hiring.metrics.find(m => m.id === stageId);

      const addVal = (metric, field, val) => {
        if (val !== '' && val != null && !isNaN(val))
          metric[field][wid] = (metric[field][wid] || 0) + Number(val);
      };

      if (recM) { addVal(recM, 'plan', pVal); addVal(recM, 'actual', aVal); }
      if (topM) { addVal(topM, 'plan', pVal); addVal(topM, 'actual', aVal); }
    });
  });
}

// ─── Hide metrics flagged as hidden ──────────────────────────────────────────

function _hideHiddenMetrics(model) {
  model.departments.forEach(dept => {
    dept.metrics = dept.metrics.filter(m => !HIDDEN_METRIC_IDS.has(m.id));
  });
}

// ─── Force plan = 0 for zero-target metrics ───────────────────────────────────

function _applyZeroPlanOverrides(model) {
  model.departments.forEach(dept => {
    dept.metrics.forEach(m => {
      if (ZERO_PLAN_IDS.has(m.id)) {
        model.weeks.forEach(w => { m.plan[w.id] = 0; });
      }
    });
  });
}

// ─── CRM name normalisations ─────────────────────────────────────────────────

function _normalizeCrmNames(model) {
  const crm = model.departments.find(d => d.id === 'crm');
  if (!crm) return;
  crm.metrics.forEach(m => {
    if (m.id === 'otd')     m.name = 'Total dispatch';
    if (m.id === 'paycoll') m.name = 'Total Payement collection';
  });
}
