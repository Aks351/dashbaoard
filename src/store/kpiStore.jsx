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

import { STORAGE_KEY, FREEZE_STORAGE_KEY, BACKEND_URL, PURCHASE_STOCK_URL, EDIT_KEY, FREEZE_KEY, FIXED_PLAN_VALUES } from '../constants/kpiConstants';
import { applyInitialMigrations, applyStorageMigrations } from './migrations';
import { buildComputedModel } from './computedModel';
import UnlockEditingModal from '../components/UnlockEditingModal';

import {
  getAvailableMonths,
  getFreezeBoundaryInfo,
  getCurrentWeek,
  formatTime12,
  formatDateDisplay,
  getPreviousWeeksUpToDate,
} from '../utils/dateUtils';

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
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [activeWeek, setActiveWeek] = useState(() => {
    const cur = getCurrentWeek(model.weeks);
    return cur ? cur.id : (model.weeks[0]?.id || null);
  });
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [purchaseStockData, setPurchaseStockData] = useState(() => {
    try {
      const stored = localStorage.getItem('ve_purchase_stock_data');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  // ── Data Freezing State ───────────────────────────────────────────────────
  // ── Data Freezing State ───────────────────────────────────────────────────
  const [freezeState, setFreezeState] = useState(() => {
    try {
      // 1. Check if cached model has freezeConfig in meta
      const storedModel = localStorage.getItem(STORAGE_KEY);
      if (storedModel) {
        const parsedModel = JSON.parse(storedModel);
        if (parsedModel?.meta?.freezeConfig?.isFrozen) {
          return parsedModel.meta.freezeConfig;
        }
      }
      // 2. Check dedicated freeze localStorage key
      const stored = localStorage.getItem(FREEZE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.isFrozen) return parsed;
      }
    } catch (e) {
      console.error('Failed to load freeze config from storage:', e);
    }
    return {
      isFrozen: false,
      freezeUpToWeekId: null,
      freezeUpToLabel: null,
      frozenWeekIds: [],
      snapshot: {},
      frozenAt: null,
    };
  });

  const freezeStateRef = useRef(freezeState);
  useEffect(() => {
    freezeStateRef.current = freezeState;
  }, [freezeState]);

  const isWeekFrozen = (weekId) => {
    return Boolean(freezeState.isFrozen && freezeState.frozenWeekIds?.includes(weekId));
  };

  const captureFrozenSnapshot = (currentModel, targetWeekIds) => {
    const snap = {};
    if (!currentModel?.departments) return snap;
    currentModel.departments.forEach(dept => {
      snap[dept.id] = {};
      dept.metrics.forEach(metric => {
        snap[dept.id][metric.id] = {
          plan: {},
          actual: {},
          ...(metric.promised ? { promised: {} } : {}),
        };
        targetWeekIds.forEach(wId => {
          if (metric.plan && metric.plan[wId] !== undefined) {
            snap[dept.id][metric.id].plan[wId] = metric.plan[wId];
          }
          if (metric.actual && metric.actual[wId] !== undefined) {
            snap[dept.id][metric.id].actual[wId] = metric.actual[wId];
          }
          if (metric.promised && metric.promised[wId] !== undefined) {
            snap[dept.id][metric.id].promised[wId] = metric.promised[wId];
          }
        });
      });
    });
    return snap;
  };

  const syncFreezeToCloud = async (freezeConfig, currentModel) => {
    if (!BACKEND_URL) return false;
    setConnState('syncing');
    try {
      // Build clean payload with meta.freezeConfig
      const payload = JSON.parse(
        JSON.stringify(currentModel, (k, v) => (k && k[0] === '_') ? undefined : v)
      );
      if (!payload.meta) payload.meta = {};
      payload.meta.freezeConfig = freezeConfig;

      const r = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'save', key: EDIT_KEY, data: payload }),
      });
      let j = {};
      try { j = await r.json(); } catch {}

      if (r.ok || j?.ok) {
        setConnState('online');
        return true;
      }
      console.error('syncFreezeToCloud failed:', j?.message);
      setConnState('error');
      return false;
    } catch (e) {
      console.error('syncFreezeToCloud error:', e);
      setConnState('error');
      return false;
    }
  };

  const freezeData = async (customUpToWeekId = null, options = {}) => {
    let actualWeekId = customUpToWeekId;
    let actualOptions = options;
    if (customUpToWeekId && typeof customUpToWeekId === 'object') {
      actualOptions = customUpToWeekId;
      actualWeekId = actualOptions.customUpToWeekId || null;
    }

    const { date, time = '18:00' } = actualOptions;

    let targetWeekIds = [];
    let freezeUpToWeek = null;

    if (actualWeekId) {
      const idx = model.weeks.findIndex(w => w.id === actualWeekId);
      if (idx !== -1) {
        targetWeekIds = model.weeks.slice(0, idx + 1).map(w => w.id);
        freezeUpToWeek = model.weeks[idx];
      }
    } else {
      const boundaryInfo = getPreviousWeeksUpToDate(model.weeks, date);
      targetWeekIds = boundaryInfo.frozenWeekIds;
      freezeUpToWeek = boundaryInfo.freezeUpToWeek;
    }

    if (!freezeUpToWeek || targetWeekIds.length === 0) {
      alert('Unable to determine previous weeks to freeze.');
      return false;
    }

    const timeFormatted = formatTime12(time);
    const dateFormatted = formatDateDisplay(date);
    const dateTimeStr = date && time ? ` · ${dateFormatted} at ${timeFormatted}` : date ? ` · ${dateFormatted}` : '';
    const freezeUpToLabel = `${freezeUpToWeek.label} (${freezeUpToWeek.range || ''})${dateTimeStr}`;

    const snapshot = captureFrozenSnapshot(model, targetWeekIds);
    const newFreeze = {
      isFrozen: true,
      freezeUpToWeekId: freezeUpToWeek.id,
      freezeUpToLabel,
      freezeDate: date,
      freezeTime: time,
      frozenWeekIds: targetWeekIds,
      snapshot,
      frozenAt: new Date().toISOString(),
    };

    setFreezeState(newFreeze);
    freezeStateRef.current = newFreeze;
    try {
      localStorage.setItem(FREEZE_STORAGE_KEY, JSON.stringify(newFreeze));
    } catch (e) {
      console.error('Failed to save freeze state:', e);
    }

    // Embed freezeConfig into model.meta and persist locally
    const nextModel = {
      ...model,
      meta: {
        ...model.meta,
        freezeConfig: newFreeze,
      },
    };
    saveToLocal(nextModel);

    // Push to cloud so all devices/users get the frozen state!
    await syncFreezeToCloud(newFreeze, nextModel);
    return true;
  };

  const defreezeData = async () => {
    const cleared = {
      isFrozen: false,
      freezeUpToWeekId: null,
      freezeUpToLabel: null,
      freezeDate: null,
      freezeTime: null,
      frozenWeekIds: [],
      snapshot: {},
      frozenAt: null,
    };
    setFreezeState(cleared);
    freezeStateRef.current = cleared;
    try {
      localStorage.removeItem(FREEZE_STORAGE_KEY);
    } catch {}

    const nextModel = {
      ...model,
      meta: {
        ...model.meta,
        freezeConfig: cleared,
      },
    };
    saveToLocal(nextModel);

    // Push defreeze to cloud so all devices/users are unlocked
    await syncFreezeToCloud(cleared, nextModel);
    return true;
  };

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

  const fetchPurchaseStock = async () => {
    if (!PURCHASE_STOCK_URL) return;
    try {
      const r = await fetch(`${PURCHASE_STOCK_URL}?t=${Date.now()}`);
      const j = await r.json();
      const stockMonths = j && (j.months || j.archieve?.months || j.archive?.months);
      if (j && stockMonths) {
        setPurchaseStockData(j);
        try { localStorage.setItem('ve_purchase_stock_data', JSON.stringify(j)); } catch {}
      }
    } catch (e) {
      console.error('Failed to fetch purchase stock data:', e);
    }
  };

  // ── Cloud sync ─────────────────────────────────────────────────────────────
  const pullFromCloud = async () => {
    fetchPurchaseStock();
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

          // ── Cloud Freeze Synchronization ──────────────────────────────────
          // Pull freeze status from cloud meta to sync across all laptops/users
          const cloudFreeze = migratedData.meta?.freezeConfig;
          let activeFreeze = freezeStateRef.current;
          if (cloudFreeze && cloudFreeze.isFrozen && cloudFreeze.frozenWeekIds?.length > 0) {
            setFreezeState(cloudFreeze);
            freezeStateRef.current = cloudFreeze;
            activeFreeze = cloudFreeze;
            try { localStorage.setItem(FREEZE_STORAGE_KEY, JSON.stringify(cloudFreeze)); } catch {}
          } else if (cloudFreeze && cloudFreeze.isFrozen === false && activeFreeze?.isFrozen) {
            // Cloud explicitly indicates dashboard was defrozen
            const cleared = {
              isFrozen: false,
              freezeUpToWeekId: null,
              freezeUpToLabel: null,
              freezeDate: null,
              freezeTime: null,
              frozenWeekIds: [],
              snapshot: {},
              frozenAt: null,
            };
            setFreezeState(cleared);
            freezeStateRef.current = cleared;
            activeFreeze = cleared;
            try { localStorage.removeItem(FREEZE_STORAGE_KEY); } catch {}
          } else if (activeFreeze?.isFrozen && (!cloudFreeze || !cloudFreeze.isFrozen)) {
            // Local state is frozen but cloud doesn't have it yet; ensure cloud receives it
            syncFreezeToCloud(activeFreeze, migratedData);
          }

          // ── Data Freezing Enforcer ─────────────────────────────────────────
          // If frozen, preserve frozen snapshot values so cloud updates do NOT
          // overwrite them on refresh!
          if (activeFreeze && activeFreeze.isFrozen && activeFreeze.frozenWeekIds?.length > 0) {
            const snap = activeFreeze.snapshot || {};
            migratedData.departments.forEach(dept => {
              const deptSnap = snap[dept.id] || {};
              dept.metrics.forEach(metric => {
                const metricSnap = deptSnap[metric.id];
                if (metricSnap) {
                  activeFreeze.frozenWeekIds.forEach(wId => {
                    if (metricSnap.plan && metricSnap.plan[wId] !== undefined) {
                      if (!metric.plan) metric.plan = {};
                      metric.plan[wId] = metricSnap.plan[wId];
                    }
                    if (metricSnap.actual && metricSnap.actual[wId] !== undefined) {
                      if (!metric.actual) metric.actual = {};
                      metric.actual[wId] = metricSnap.actual[wId];
                    }
                    if (metricSnap.promised && metricSnap.promised[wId] !== undefined && metric.promised) {
                      metric.promised[wId] = metricSnap.promised[wId];
                    }
                  });
                }
              });
            });
          }

          // Re-apply any pending local edits on top of the fresh cloud data
          Object.values(pendingEdits.current).forEach(edit => {
            const { deptId, metricId, field, weekId, value } = edit;
            if (activeFreeze?.isFrozen && activeFreeze.frozenWeekIds?.includes(weekId)) return;
            const metric = migratedData.departments.find(d => d.id === deptId)?.metrics.find(m => m.id === metricId);
            if (metric && metric[field]) metric[field][weekId] = value;
          });
          
          saveToLocal(migratedData);
          if (!migratedData.weeks.some(w => w.id === activeWeek)) {
            const cur = getCurrentWeek(migratedData.weeks);
            setActiveWeek(cur ? cur.id : (migratedData.weeks[0]?.id || null));
          }

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
    if (isWeekFrozen(weekId)) {
      alert(`This week is frozen (${freezeState.freezeUpToLabel || 'locked'}). Please defreeze first to make changes.`);
      return;
    }
    if (BACKEND_URL && !canEdit) {
      alert('You are in view mode. Please unlock editing first.');
      return;
    }
    const next = { ...model };
    
    // Redirect edits for mirrored metrics to their source department
    let targetDeptId = deptId;
    if (deptId === 'production' && ['total_crm_complaints', 'open_complaints', 'complaints', 'closed_complaints', 'avg_closing_days', 'matret'].includes(metricId)) targetDeptId = 'crm';
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
    setShowUnlockModal(true);
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
    if (isWeekFrozen(id)) {
      alert('Cannot edit a frozen week. Please defreeze first.');
      return;
    }
    const next = { ...model };
    const w    = next.weeks.find(w => w.id === id);
    if (!w) return;
    w.label = newLabel;
    w.range = newRange;
    saveToLocal(next);
    pushFullModelToCloud(next);
  };

  const removeWeek = (id) => {
    if (isWeekFrozen(id)) {
      alert('Cannot remove a frozen week. Please defreeze first.');
      return;
    }
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
  const computedModel = useMemo(() => buildComputedModel(model, purchaseStockData), [model, purchaseStockData]);
  
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
      freezeState,
      freezeData,
      defreezeData,
      isWeekFrozen,
      showUnlockModal,
      setShowUnlockModal,
    }}>
      {children}
      {showUnlockModal && (
        <UnlockEditingModal
          onClose={() => setShowUnlockModal(false)}
          onSuccess={() => {
            setCanEdit(true);
            setShowUnlockModal(false);
          }}
        />
      )}
    </KpiContext.Provider>
  );
}
