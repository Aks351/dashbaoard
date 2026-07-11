import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import SEED from '../../seed.json';

const STORAGE_KEY = 've_kpi_model_react_v1';
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbzS6DhQjUl440_wwJZaClcIwV03LHS_tq3ntMkiIPSbR_ovfYZ51L-wUFXU7MgfDHnh/exec";
const EDIT_KEY = "vinayak2026";

export const SOLUTION_LINKS = {
  purchase: "https://docs.google.com/document/d/1VI-ROkFGQ3n909IWbJKWBMw_aYepOLUOsfh9EgyGo3s/edit?tab=t.0",
  production: "https://docs.google.com/document/d/1_QqoquU80AmTE2sLy3cEp12EVWqCKDk7BHKXgcLlvmU/edit?tab=t.0",
  crm: "https://docs.google.com/document/d/1rAW5FitcZK1v92vG6Wak_rZUKYpc0gNzse-bn3rw_GI/edit?tab=t.0",
  hiring: "https://docs.google.com/document/d/17DIiKkxoKz89yEmJJv3McHqLrnrhbBt8sRjvWo3-utc/edit?tab=t.0"
};

export const RECRUITERS = ['Dipesh', 'Madhu'];
export const STAGES = [
  ['Applications', 'Applications'],
  ['Final Rounds', 'Final Rounds'],
  ['Offer Given To', 'Offer Given To']
];

export function num(v) { return (v === null || v === undefined || v === '') ? null : Number(v); }

export function formatNum(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return v;
  return Number(n.toFixed(3)).toString();
}

export function calculateScore(plan, actual, dir = 'higher') {
  if (plan === '' || actual === '' || plan == null || actual == null) return { label: '—', color: 'gray', pct: null };
  const p = Number(plan);
  const a = Number(actual);

  if (dir === 'zero') {
    if (a === 0) return { pct: 0, color: 'green', label: '0 ✓' };
    return { pct: null, color: (a <= 1 ? 'amber' : 'red'), label: a + (a === 1 ? ' issue' : ' issues') };
  }

  if (p === 0) return a > 0 ? { label: '+∞%', color: 'green', pct: 9999 } : { label: '0%', color: 'gray', pct: 0 };

  let pct = Math.round((a / p) * 100);
  if (dir === 'lower') pct = a === 0 ? 100 : Math.round((p / a) * 100);

  const variance = pct - 100;
  const prefix = variance > 0 ? '+' : '';

  if (pct >= 100) return { label: `${prefix}${variance}%`, color: 'green', pct };
  if (pct >= 90) return { label: `${prefix}${variance}%`, color: 'amber', pct };
  return { label: `${prefix}${variance}%`, color: 'red', pct };
}

export function mtd(metric, weeks) {
  let plan = 0, act = 0, planCount = 0, actCount = 0;
  weeks.forEach(w => {
    const p = num(metric.plan[w.id]); if (p !== null) { plan += p; planCount++; }
    const a = num(metric.actual[w.id]); if (a !== null) { act += a; actCount++; }
  });

  if (metric.id === 'oilmt') {
    return {
      plan: planCount > 0 ? plan / planCount : null,
      actual: actCount > 0 ? act / actCount : null
    };
  }

  return { plan: planCount > 0 ? plan : null, actual: actCount > 0 ? act : null };
}

export const KpiContext = createContext();

export function KpiProvider({ children }) {
  const [model, setModel] = useState(() => {
    let initialData = null;
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) initialData = JSON.parse(s);
    } catch (e) { console.error(e); }
    if (!initialData) initialData = JSON.parse(JSON.stringify(SEED));

    // MIGRATION: Split CRM Dispatch and Payment
    const crm = initialData.departments.find(d => d.id === 'crm');
    if (crm) {
      const newCrmMetrics = [];
      crm.metrics.forEach(m => {
        if (m.id === 'otd') {
          newCrmMetrics.push({ ...m, id: 'planned_dispatch', name: 'Planned Dispatch' });
          newCrmMetrics.push({ ...m, id: 'ontime_dispatch', name: 'On-Time Dispatch', actual: m.ontime || m.actual });
        } else if (m.id === 'paycoll') {
          newCrmMetrics.push({ ...m, id: 'planned_payment', name: 'Planned Payment' });
          newCrmMetrics.push({ ...m, id: 'ontime_payment', name: 'On-Time Payment', actual: m.ontime || m.actual });
        } else if (m.id !== 'planned_dispatch' && m.id !== 'ontime_dispatch' && m.id !== 'planned_payment' && m.id !== 'ontime_payment') {
          newCrmMetrics.push(m);
        }
      });
      // Delete ontime from all crm metrics
      newCrmMetrics.forEach(m => { delete m.ontime; });
      crm.metrics = newCrmMetrics;
    }

    // MIGRATION: Remove any existing onboard metrics
    const hiring = initialData.departments.find(d => d.id === 'hiring');
    if (hiring) {
      const newMetrics = [];
      hiring.metrics.forEach(m => {
        if (!m.id.endsWith('_onboard') && m.id !== 'onboard') {
          newMetrics.push(m);
        }
      });
      hiring.metrics = newMetrics;
    }
    return initialData;
  });

  const [connState, setConnState] = useState('offline'); // offline, online, syncing, error
  const [canEdit, setCanEdit] = useState(false);
  const [activeWeek, setActiveWeek] = useState(model.weeks[0]?.id || null);

  useEffect(() => {
    // Initial fetch
    pullFromCloud();
  }, []);

  const saveToLocal = (modelData) => {
    const newModel = JSON.parse(JSON.stringify(modelData)); // Deep copy to safely mutate

    // Inject missing CRM metrics securely
    const crm = newModel.departments.find(d => d.id === 'crm');
    if (crm) {
      const missingMetrics = [
        { id: 'otd_ontime', name: 'On-time Disptach', sub: '', unit: '', dir: 'higher', total: false, plan: {}, actual: {}, promised: {} },
        { id: 'paycoll_ontime', name: 'On-time Payment', sub: '', unit: '', dir: 'higher', total: false, plan: {}, actual: {}, promised: {} }
      ];
      missingMetrics.forEach(newM => {
        if (!crm.metrics.some(m => m.id === newM.id)) {
          const parentIndex = crm.metrics.findIndex(m => m.id === (newM.id === 'otd_ontime' ? 'otd' : 'paycoll'));
          if (parentIndex !== -1) {
            crm.metrics.splice(parentIndex + 1, 0, newM);
          } else {
            crm.metrics.push(newM);
          }
        }
      });
    }

    // Repair broken hiring position sub strings (in case they were manually modified in Google Sheets)
    const hiring = newModel.departments.find(d => d.id === 'hiring');
    if (hiring) {
      hiring.metrics.filter(m => m.id.startsWith('pos_')).forEach(m => {
        if (!/Position:/i.test(m.sub || '')) {
          // It is a position metric but missing the Position string. Try to infer the name.
          // e.g. pos_dipesh_tenderexecutive_apps
          const parts = m.id.split('_');
          if (parts.length >= 4) {
            const rec = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
            const stage = parts[parts.length - 1]; // apps, final, offer
            let stageName = stage === 'apps' ? 'Applications' : stage === 'final' ? 'Final Rounds' : 'Offer Given To';
            // We can't perfectly recover the spaces in Tender Executive from 'tenderexecutive', 
            // but we can try to copy the position name from a sibling metric!
            const sibling = hiring.metrics.find(sib => sib.id.startsWith(`pos_${parts[1]}_${parts[2]}_`) && sib.id !== m.id && /Position:/i.test(sib.sub || ''));
            let posName = parts[2];
            if (sibling) {
              const pMatch = sibling.sub.match(/Position:\s*([^·]+)/i);
              if (pMatch) posName = pMatch[1].trim();
            }
            m.sub = `Recruiter: ${rec} · Position: ${posName} · ${stageName}`;
          }
        }
      });
    }

    setModel(newModel);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newModel)); } catch (e) { }
  };

  const updateValue = (deptId, metricId, field, weekId, value) => {
    if (BACKEND_URL && !canEdit) {
      alert('You are in view mode. Please unlock editing first.');
      return;
    }
    const newModel = { ...model };
    const dept = newModel.departments.find(d => d.id === deptId);
    const metric = dept.metrics.find(m => m.id === metricId);
    if (!metric[field]) metric[field] = {};
    metric[field][weekId] = value === '' ? '' : Number(value);

    saveToLocal(newModel);

    // Debounce cloud push
    if (window._pushTimer) clearTimeout(window._pushTimer);
    window._pushTimer = setTimeout(() => pushToCloud(newModel), 800);
  };

  const unlockEditing = () => {
    const k = prompt('Enter the editor passphrase to enable editing:');
    if (k === null) return;
    if (k === EDIT_KEY) {
      setCanEdit(true);
      alert('Editing unlocked on this device.');
    } else {
      alert('Wrong passphrase. You can still view, but not edit.');
    }
  };

  const pullFromCloud = async () => {
    if (!BACKEND_URL) { setConnState('offline'); return; }
    setConnState('syncing');
    try {
      const r = await fetch(BACKEND_URL + '?action=get&t=' + Date.now());
      const j = await r.json();
      if (j.ok) {
        if (j.data && j.data.departments) {
          saveToLocal(j.data);
          if (!j.data.weeks.some(w => w.id === activeWeek)) {
            setActiveWeek(j.data.weeks[0]?.id || null);
          }
        }
        setConnState('online');
      } else {
        console.error('Backend returned error:', j.message);
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
      const dataToPush = JSON.parse(JSON.stringify(currentModel, (k, v) => (k && k[0] === '_') ? undefined : v));
      const r = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'save', key: EDIT_KEY, data: dataToPush })
      });
      let j = {};
      try { j = await r.json(); } catch (e) { }

      if (r.ok || (j && j.ok)) {
        setConnState('online');
      } else {
        setConnState('error');
      }

      if (j && j.ok === false) {
        if (j.code === 'AUTH_ERROR') {
          alert('Edit key rejected by server.');
          setCanEdit(false);
        } else {
          console.error('Save failed:', j.message);
        }
      }
    } catch (e) {
      console.error('pushToCloud error:', e);
      setConnState('error');
    }
  };

  const addWeek = (label, range) => {
    const id = 'w' + Date.now().toString(36);
    const newModel = { ...model };
    newModel.weeks.push({ id, label, range });
    newModel.departments.forEach(d => {
      d.metrics.forEach(m => {
        m.plan[id] = '';
        m.actual[id] = '';
        if (m.promised) m.promised[id] = '';
      });
    });
    setActiveWeek(id);
    saveToLocal(newModel);
    pushToCloud(newModel);
  };

  const editWeek = (id, newLabel, newRange) => {
    const newModel = { ...model };
    const w = newModel.weeks.find(w => w.id === id);
    if (w) {
      w.label = newLabel;
      w.range = newRange;
      saveToLocal(newModel);
      pushToCloud(newModel);
    }
  };

  const removeWeek = (id) => {
    const newModel = { ...model };
    newModel.weeks = newModel.weeks.filter(w => w.id !== id);
    newModel.departments.forEach(d => {
      d.metrics.forEach(m => {
        delete m.plan[id];
        delete m.actual[id];
        if (m.promised) delete m.promised[id];
      });
    });
    if (activeWeek === id) setActiveWeek(newModel.weeks[0]?.id || null);
    saveToLocal(newModel);
    pushToCloud(newModel);
  };

  const addHiringRole = (recruiter, role) => {
    const newModel = { ...model };
    const hiring = newModel.departments.find(d => d.id === 'hiring');
    if (!hiring) return;

    const safeId = role.toLowerCase().replace(/[^a-z0-9]/g, '');
    const recSafe = recruiter.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseId = `pos_${recSafe}_${safeId}`;

    const stages = [
      { id: `${baseId}_apps`, name: `${role} — Applications`, sub: `Recruiter: ${recruiter} · Position: ${role} · Applications` },
      { id: `${baseId}_final`, name: `${role} — Final Rounds`, sub: `Recruiter: ${recruiter} · Position: ${role} · Final Rounds` },
      { id: `${baseId}_offer`, name: `${role} — Offer Given To`, sub: `Recruiter: ${recruiter} · Position: ${role} · Offer Given To` }
    ];

    stages.forEach(s => {
      // Don't add if it already exists
      if (hiring.metrics.some(m => m.id === s.id)) return;

      const newMetric = {
        id: s.id,
        name: s.name,
        sub: s.sub,
        unit: '',
        dir: 'higher',
        total: false,
        plan: {},
        actual: {}
      };
      // initialize weeks
      newModel.weeks.forEach(w => {
        newMetric.plan[w.id] = '';
        newMetric.actual[w.id] = '';
      });
      hiring.metrics.push(newMetric);
    });

    saveToLocal(newModel);
    pushToCloud(newModel);
  };

  const removeHiringRole = (recruiter, role) => {
    const newModel = { ...model };
    const hiring = newModel.departments.find(d => d.id === 'hiring');
    if (!hiring) return;

    const recSafe = `Recruiter: ${recruiter} `;
    const posSafe = `Position: ${role} `;

    hiring.metrics = hiring.metrics.filter(m => {
      const sub = m.sub || '';
      // We look for exact matches in the sub string to be safe
      return !(sub.includes(`Recruiter: ${recruiter}`) && sub.includes(`Position: ${role}`));
    });

    saveToLocal(newModel);
    pushToCloud(newModel);
  };

  const resetData = () => {
    const newModel = JSON.parse(JSON.stringify(SEED));
    saveToLocal(newModel);
    setActiveWeek(newModel.weeks[0].id);
    if (canEdit) pushToCloud(newModel);
  };

  const computedModel = useMemo(() => {
    if (!model) return model;

    // Create a deep copy to avoid mutating the React state directly
    const newModel = JSON.parse(JSON.stringify(model));
    const hiring = newModel.departments.find(d => d.id === 'hiring');
    if (hiring) {
      const posMetrics = hiring.metrics.filter(m => m.id.startsWith('pos_'));

      // Ensure core top-level metrics exist (in case they were deleted from Google Sheets)
      const CORE_STAGES = [
        { id: 'apps', name: 'Applications' },
        { id: 'final', name: 'Final Round Interviews' },
        { id: 'offer', name: 'Offer Given To' }
      ];

      CORE_STAGES.forEach(stg => {
        if (!hiring.metrics.some(m => m.id === stg.id)) {
          hiring.metrics.unshift({
            id: stg.id,
            name: stg.name,
            sub: 'All positions',
            unit: '',
            dir: 'higher',
            total: false,
            plan: {},
            actual: {},
            promised: {}
          });
        }
      });

      const RECRUITERS_LIST = ['Dipesh', 'Madhu'];
      RECRUITERS_LIST.forEach(rec => {
        CORE_STAGES.forEach(stg => {
          const rId = `rec_${rec.toLowerCase()}_${stg.id}`;
          if (!hiring.metrics.some(m => m.id === rId)) {
            hiring.metrics.push({
              id: rId,
              name: `${rec} — ${stg.name === 'Final Round Interviews' ? 'Final Rounds' : stg.name}`,
              sub: `Recruiter: ${rec}`,
              unit: '',
              dir: 'higher',
              total: false,
              plan: {},
              actual: {},
              promised: {}
            });
          }
        });
      });

      const isTopOrRec = m => !m.id.startsWith('pos_');

      // Clear out plan and actual for aggregate metrics
      hiring.metrics.filter(isTopOrRec).forEach(m => {
        m.plan = {};
        m.actual = {};
      });

      newModel.weeks.forEach(w => {
        const wid = w.id;
        posMetrics.forEach(pm => {
          // ID format: pos_dipesh_tenderexecutive_apps
          const parts = pm.id.split('_');
          if (parts.length >= 4) {
            const rec = parts[1]; // dipesh
            const stageId = parts[parts.length - 1]; // apps, final, offer

            const recM = hiring.metrics.find(m => m.id === `rec_${rec.toLowerCase()}_${stageId}`);
            const topM = hiring.metrics.find(m => m.id === stageId);

            const pVal = pm.plan[wid];
            const aVal = pm.actual[wid];

            if (recM) {
              if (pVal !== '' && pVal != null && !isNaN(pVal)) recM.plan[wid] = (recM.plan[wid] || 0) + Number(pVal);
              if (aVal !== '' && aVal != null && !isNaN(aVal)) recM.actual[wid] = (recM.actual[wid] || 0) + Number(aVal);
            }
            if (topM) {
              if (pVal !== '' && pVal != null && !isNaN(pVal)) topM.plan[wid] = (topM.plan[wid] || 0) + Number(pVal);
              if (aVal !== '' && aVal != null && !isNaN(aVal)) topM.actual[wid] = (topM.actual[wid] || 0) + Number(aVal);
            }
          }
        });
      });
    }

    const crm = newModel.departments.find(d => d.id === 'crm');
    if (crm) {
      crm.metrics.forEach(m => {
        if (m.id === 'otd') m.name = 'Total dispatch';
        if (m.id === 'paycoll') m.name = 'Total Payement collection';
      });
    }

    return newModel;
  }, [model]);

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
      pullFromCloud,
      resetData,
      setModel: saveToLocal
    }}>
      {children}
    </KpiContext.Provider>
  );
}
