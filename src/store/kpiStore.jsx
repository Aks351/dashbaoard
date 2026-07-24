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

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import SEED from '../../seed.json';

import { STORAGE_KEY, BACKEND_URL, EDIT_KEY } from '../constants/kpiConstants';
import { applyInitialMigrations, applyStorageMigrations } from './migrations';
import { buildComputedModel } from './computedModel';

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
          saveToLocal(j.data);
          if (!j.data.weeks.some(w => w.id === activeWeek))
            setActiveWeek(j.data.weeks[0]?.id || null);
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

  const pushToCloud = async (currentModel) => {
    if (!BACKEND_URL || !canEdit) return;
    setConnState('syncing');
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
      } else {
        setConnState('error');
        if (j?.ok === false) {
          if (j.code === 'AUTH_ERROR') { alert('Edit key rejected by server.'); setCanEdit(false); }
          else console.error('Save failed:', j.message);
        }
      }
    } catch (e) {
      console.error('pushToCloud error:', e);
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
    const metric = next.departments.find(d => d.id === deptId)?.metrics.find(m => m.id === metricId);
    if (!metric) return;
    if (!metric[field]) metric[field] = {};
    metric[field][weekId] = value === '' ? '' : Number(value);

    saveToLocal(next);

    // Debounced cloud push
    if (window._pushTimer) clearTimeout(window._pushTimer);
    window._pushTimer = setTimeout(() => pushToCloud(next), 800);
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
        m.plan[id]   = '';
        m.actual[id] = '';
        if (m.promised) m.promised[id] = '';
      })
    );
    setActiveWeek(id);
    saveToLocal(next);
    pushToCloud(next);
  };

  const editWeek = (id, newLabel, newRange) => {
    const next = { ...model };
    const w    = next.weeks.find(w => w.id === id);
    if (!w) return;
    w.label = newLabel;
    w.range = newRange;
    saveToLocal(next);
    pushToCloud(next);
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
    pushToCloud(next);
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
    pushToCloud(next);
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
    pushToCloud(next);
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
    pushToCloud(next);
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const resetData = () => {
    const next = JSON.parse(JSON.stringify(SEED));
    saveToLocal(next);
    setActiveWeek(next.weeks[0].id);
    if (canEdit) pushToCloud(next);
  };

  // ── Computed (display-ready) model ─────────────────────────────────────────
  const computedModel = useMemo(() => buildComputedModel(model), [model]);

  // ── Context value ───────────────────────────────────────────────────────────
  return (
    <KpiContext.Provider value={{
      model: computedModel,
      connState,
      canEdit,
      activeWeek,
      setActiveWeek,
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
