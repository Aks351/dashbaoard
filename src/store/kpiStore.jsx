// ─── KPI Store — React context + state ───────────────────────────────────────
// This file is intentionally thin: it wires together the modules in
//   src/constants/kpiConstants.js
//   src/utils/kpiUtils.js
//   src/store/migrations.js
//   src/store/computedModel.js
// into a React context that all components can consume.
//
// All public exports are re-exported below so that existing component
// import paths (from '../../store/kpiStore') continue to work unchanged.

import { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import SEED from '../../seed.json';

import { STORAGE_KEY, BACKEND_URL, EDIT_KEY, FIXED_PLAN_VALUES } from '../constants/kpiConstants';
import { applyInitialMigrations, applyStorageMigrations } from './migrations';
import { buildComputedModel } from './computedModel';

import { getAvailableMonths } from '../utils/dateUtils';

// ─── Re-exports (keeps all existing component imports working) ────────────────
export * from '../constants/kpiConstants';
export * from '../utils/kpiUtils';

// ─── Context ──────────────────────────────────────────────────────────────────
export const KpiContext = createContext();



// ─── Provider ─────────────────────────────────────────────────────────────────
export function KpiProvider({ children }) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [model, setModel] = useState(() => {
    let data = null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) data = JSON.parse(stored);
    } catch (e) { console.error('Failed to load from localStorage:', e); }

    if (!data) data = JSON.parse(JSON.stringify(SEED));
    return applyInitialMigrations(data);
  });

  const [connState, setConnState] = useState('offline'); // offline | online | syncing | error
  const [canEdit,   setCanEdit]   = useState(false);
  const [activeWeek, setActiveWeek] = useState(model.weeks[0]?.id || null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  // ── Pending Edits (Offline-first safe merge) ──────────────────────────────
  const pendingEdits = useRef(null);
  if (pendingEdits.current === null) {
    try {
      const stored = localStorage.getItem('ve_pending_edits');
      pendingEdits.current = stored ? JSON.parse(stored) : {};
    } catch {
      pendingEdits.current = {};
    }
  }

  // ── Boot: pull latest data from cloud ──────────────────────────────────────
  useEffect(() => { pullFromCloud(); }, []);

  // ── Persist + migrate on every model change ────────────────────────────────
  const saveToLocal = (modelData) => {
    const next = applyStorageMigrations(JSON.parse(JSON.stringify(modelData)));
    setModel(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { }
  };

  // ── Cloud sync ─────────────────────────────────────────────────────────────
  const pullFromCloud = async () => {
    if (!BACKEND_URL) { setConnState('offline'); return; }
    setConnState('syncing');
    try {
      const r = await fetch(`${BACKEND_URL}?action=get&t=${Date.now()}`);
      const j = await r.json();
      if (j.ok) {
        if (j.data?.departments) {
          // Collect all metric IDs present in cloud before migration
          const cloudMetricIds = new Set(
            j.data.departments.flatMap(d => d.metrics.map(m => m.id))
          );

          // Migrate stale cloud data to the latest schema before using it
          const migratedData = applyStorageMigrations(j.data);

          // Re-apply any pending local edits on top of the fresh cloud data
          Object.values(pendingEdits.current).forEach(edit => {
            const { deptId, metricId, field, weekId, value } = edit;
            const metric = migratedData.departments.find(d => d.id === deptId)?.metrics.find(m => m.id === metricId);
            if (metric && metric[field]) metric[field][weekId] = value;
          });
          
          saveToLocal(migratedData);
          if (!migratedData.weeks.some(w => w.id === activeWeek))
            setActiveWeek(migratedData.weeks[0]?.id || null);

          // ── Self-healing push ─────────────────────────────────────────────
          // If the cloud schema is missing metrics that now exist after
          // reconciliation (e.g. total_cuts was added locally but never pushed),
          // trigger a full save so they are registered in the sheet.
          // Without this, delta saves silently skip unknown metrics and data
          // entered for them is lost on the next pull.
          const newMetricIds = migratedData.departments.flatMap(d => d.metrics.map(m => m.id));
          const cloudIsMissingMetrics = newMetricIds.some(id => !cloudMetricIds.has(id));
          if (cloudIsMissingMetrics && canEdit) {
            console.info('[kpiStore] Cloud is missing metrics after reconciliation — pushing full schema.');
            pushFullModelToCloud(migratedData);
          }
        }
        setConnState('online');
      } else {
        console.error('Backend error:', j.message);
        setConnState('error');
      }
    } catch (e) {
      console.error('pullFromCloud error:', e);
      setConnState('error');
    }
  };


  const pushFullModelToCloud = async (currentModel) => {
    if (!BACKEND_URL || !canEdit) return;
    setConnState('syncing');
    
    // Capture the keys we are about to push
    const keysBeingPushed = Object.keys(pendingEdits.current);
    
    try {
      // Strip internal fields (prefixed with '_') before sending
      const payload = JSON.parse(JSON.stringify(currentModel, (k, v) => (k && k[0] === '_') ? undefined : v));
      const r = await fetch(BACKEND_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body:    JSON.stringify({ action: 'save', key: EDIT_KEY, data: payload }),
      });
      let j = {};
      try { j = await r.json(); } catch { }

      if (r.ok || j?.ok) {
        setConnState('online');
        // Successfully pushed; clear only the edits that were in this payload
        keysBeingPushed.forEach(k => delete pendingEdits.current[k]);
        try { localStorage.setItem('ve_pending_edits', JSON.stringify(pendingEdits.current)); } catch {}
      } else {
        setConnState('error');
        if (j?.ok === false) {
          if (j.code === 'AUTH_ERROR') { alert('Edit key rejected by server.'); setCanEdit(false); }
          else console.error('Save failed:', j.message);
        }
      }
    } catch (e) {
      console.error('pushFullModelToCloud error:', e);
      setConnState('error');
    }
  };

  const pushDeltaToCloud = async () => {
    if (!BACKEND_URL || !canEdit) return;
    
    const keysBeingPushed = Object.keys(pendingEdits.current);
    if (keysBeingPushed.length === 0) return;
    
    setConnState('syncing');
    const editsToPush = keysBeingPushed.map(k => pendingEdits.current[k]);
    
    try {
      const r = await fetch(BACKEND_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body:    JSON.stringify({ action: 'saveDelta', key: EDIT_KEY, edits: editsToPush }),
      });
      let j = {};
      try { j = await r.json(); } catch { }

      if (r.ok && j?.ok) {
        setConnState('online');
        keysBeingPushed.forEach(k => delete pendingEdits.current[k]);
        try { localStorage.setItem('ve_pending_edits', JSON.stringify(pendingEdits.current)); } catch {}
      } else if (j?.code === 'SCHEMA_MISMATCH') {
        // Cloud sheet is missing a metric (e.g. total_cuts newly added).
        // Fall back to full save — this writes the entire schema + all data.
        // Pending edits are kept so the full push includes the new values.
        console.info('[kpiStore] SCHEMA_MISMATCH from delta — falling back to full push.');
        await pushFullModelToCloud(model);
      } else {
        setConnState('error');
        if (j?.ok === false) {
          if (j.code === 'AUTH_ERROR') { alert('Edit key rejected by server.'); setCanEdit(false); }
          else console.error('Delta save failed:', j.message);
        }
      }
    } catch (e) {
      console.error('pushDeltaToCloud error:', e);
      setConnState('error');
    }
  };


  // ── Value mutations ─────────────────────────────────────────────────────────
  const updateValue = (deptId, metricId, field, weekId, value) => {
    if (BACKEND_URL && !canEdit) {
      alert('You are in view mode. Please unlock editing first.');
      return;
    }
    const next = { ...model };
    
    // Redirect edits for mirrored metrics to their source department
    let targetDeptId = deptId;
    if (deptId === 'production' && ['complaints', 'closed_complaints', 'avg_closing_days', 'matret'].includes(metricId)) targetDeptId = 'crm';
    if (deptId === 'crm' && metricId === 'qty_replaced') targetDeptId = 'production';
    
    const metric = next.departments.find(d => d.id === targetDeptId)?.metrics.find(m => m.id === metricId);
    if (!metric) return;
    if (!metric[field]) metric[field] = {};
    const numVal = Number(value);
    const finalVal = value === '' ? '' : (isNaN(numVal) ? value : numVal);
    metric[field][weekId] = finalVal;
    
    // Queue edit for safe merging
    const editKey = `${targetDeptId}|${metricId}|${field}|${weekId}`;
    pendingEdits.current[editKey] = { deptId: targetDeptId, metricId, field, weekId, value: finalVal };
    try { localStorage.setItem('ve_pending_edits', JSON.stringify(pendingEdits.current)); } catch {}

    saveToLocal(next);

    // Debounced cloud push
    if (window._pushTimer) clearTimeout(window._pushTimer);
    window._pushTimer = setTimeout(() => pushDeltaToCloud(), 800);
  };

  const unlockEditing = () => {
    const k = prompt('Enter the editor passphrase to enable editing:');
    if (k === null) return;
    if (k === EDIT_KEY) { setCanEdit(true); alert('Editing unlocked on this device.'); }
    else alert('Wrong passphrase. You can still view, but not edit.');
  };

  // ── Week management ─────────────────────────────────────────────────────────
  const addWeek = (label, range) => {
    const id       = 'w' + Date.now().toString(36);
    const next     = { ...model };
    next.weeks.push({ id, label, range });
    next.departments.forEach(d =>
      d.metrics.forEach(m => {
        m.plan[id]   = FIXED_PLAN_VALUES[m.id] !== undefined ? FIXED_PLAN_VALUES[m.id] : '';
        m.actual[id] = '';
        if (m.promised) m.promised[id] = '';
      })
    );
    setActiveWeek(id);
    saveToLocal(next);
    pushFullModelToCloud(next);
  };

  const editWeek = (id, newLabel, newRange) => {
    const next = { ...model };
    const w    = next.weeks.find(w => w.id === id);
    if (!w) return;
    w.label = newLabel;
    w.range = newRange;
    saveToLocal(next);
    pushFullModelToCloud(next);
  };

  const removeWeek = (id) => {
    const next = { ...model };
    next.weeks = next.weeks.filter(w => w.id !== id);
    next.departments.forEach(d =>
      d.metrics.forEach(m => {
        delete m.plan[id];
        delete m.actual[id];
        if (m.promised) delete m.promised[id];
      })
    );
    if (activeWeek === id) setActiveWeek(next.weeks[0]?.id || null);
    saveToLocal(next);
    pushFullModelToCloud(next);
  };

  // ── Hiring role management ──────────────────────────────────────────────────
  const addHiringRole = (recruiter, role, weekId) => {
    const next    = { ...model };
    const hiring  = next.departments.find(d => d.id === 'hiring');
    if (!hiring) return;

    const safeId  = role.toLowerCase().replace(/[^a-z0-9]/g, '');
    const recSafe = recruiter.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseId  = `pos_${recSafe}_${safeId}`;

    const stages  = [
      { id: `${baseId}_apps`,  name: `${role} — Applications`,       sub: `Recruiter: ${recruiter} · Position: ${role} · Applications`       },
      { id: `${baseId}_rono`,  name: `${role} — Interview with Rono`, sub: `Recruiter: ${recruiter} · Position: ${role} · Interview with Rono` },
      { id: `${baseId}_final`, name: `${role} — Final Rounds`,        sub: `Recruiter: ${recruiter} · Position: ${role} · Final Rounds`        },
      { id: `${baseId}_offer`, name: `${role} — Offer Given To`,      sub: `Recruiter: ${recruiter} · Position: ${role} · Offer Given To`      },
    ];

    stages.forEach(s => {
      let existing = hiring.metrics.find(m => m.id === s.id);
      if (!existing) {
        existing = { id: s.id, name: s.name, sub: s.sub, unit: '', dir: 'higher', total: false, plan: {}, actual: {}, activeWeeks: [] };
        next.weeks.forEach(w => { existing.plan[w.id] = ''; existing.actual[w.id] = ''; });
        hiring.metrics.push(existing);
      }
      if (!existing.activeWeeks) existing.activeWeeks = [];
      if (weekId && !existing.activeWeeks.includes(weekId)) existing.activeWeeks.push(weekId);
    });

    saveToLocal(next);
    pushFullModelToCloud(next);
  };

  /** Activate or deactivate an existing role for a specific week */
  const toggleRoleWeek = (recruiter, role, weekId) => {
    const next   = { ...model };
    const hiring = next.departments.find(d => d.id === 'hiring');
    if (!hiring) return;

    hiring.metrics
      .filter(m => (m.sub || '').includes(`Recruiter: ${recruiter}`) && (m.sub || '').includes(`Position: ${role}`))
      .forEach(m => {
        if (!m.activeWeeks) m.activeWeeks = [];
        if (m.activeWeeks.includes(weekId)) {
          m.activeWeeks     = m.activeWeeks.filter(w => w !== weekId);
          m.plan[weekId]   = '';
          m.actual[weekId] = '';
        } else {
          m.activeWeeks.push(weekId);
        }
      });

    saveToLocal(next);
    pushFullModelToCloud(next);
  };

  const removeHiringRole = (recruiter, role, weekId) => {
    const next   = { ...model };
    const hiring = next.departments.find(d => d.id === 'hiring');
    if (!hiring) return;

    const matches = (m) => (m.sub || '').includes(`Recruiter: ${recruiter}`) && (m.sub || '').includes(`Position: ${role}`);

    if (weekId) {
      // Week-scoped: deactivate for this week; delete metric entirely if no weeks remain
      hiring.metrics.filter(matches).forEach(m => {
        if (!m.activeWeeks) m.activeWeeks = [];
        m.activeWeeks     = m.activeWeeks.filter(w => w !== weekId);
        m.plan[weekId]   = '';
        m.actual[weekId] = '';
      });
      hiring.metrics = hiring.metrics.filter(m => !matches(m) || (m.activeWeeks || []).length > 0);
    } else {
      // Global: remove entirely
      hiring.metrics = hiring.metrics.filter(m => !matches(m));
    }

    saveToLocal(next);
    pushFullModelToCloud(next);
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const resetData = () => {
    const next = JSON.parse(JSON.stringify(SEED));
    saveToLocal(next);
    setActiveWeek(next.weeks[0].id);
    if (canEdit) pushFullModelToCloud(next);
  };

  // ── Computed (display-ready) model ─────────────────────────────────────────
  const computedModel = useMemo(() => buildComputedModel(model), [model]);
  
  // ── Active Period Logic ────────────────────────────────────────────────────
  const availableMonths = useMemo(() => getAvailableMonths(computedModel.weeks, computedModel.meta?.period), [computedModel]);
  const activePeriod = selectedPeriod || (availableMonths.length ? availableMonths[availableMonths.length - 1] : computedModel.meta?.period || '');

  // ── Context value ───────────────────────────────────────────────────────────
  return (
    <KpiContext.Provider value={{
      model: computedModel,
      connState,
      canEdit,
      activeWeek,
      setActiveWeek,
      selectedPeriod,
      setSelectedPeriod,
      activePeriod,
      updateValue,
      unlockEditing,
      addWeek,
      editWeek,
      removeWeek,
      addHiringRole,
      removeHiringRole,
      toggleRoleWeek,
      pullFromCloud,
      resetData,
      setModel: saveToLocal,
    }}>
      {children}
    </KpiContext.Provider>
  );
}
