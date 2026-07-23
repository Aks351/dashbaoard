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
  return data;
}

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
  return model;
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
