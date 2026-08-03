import React from 'react';
import { calculateScore, FIXED_PLAN_VALUES } from '../../store/kpiStore';

export default function DataEntryDepartmentRow({
  department: d,
  wk,
  canEdit,
  updateValue,
  baseMetrics
}) {
  const showPromised = ['purchase', 'production', 'crm'].includes(d.id);
  const gridCols = showPromised ? '2fr 1fr 1fr 1fr 1fr' : '2fr 1fr 1fr 1fr';

  return (
    <>
      <div className="table-row head-row" style={{ gridTemplateColumns: gridCols }}>
        <div className="t-cell head">Metric</div>
        <div className="t-cell head center">Plan</div>
        {showPromised && <div className="t-cell head center" style={{ color: '#3b82f6' }}>Promised Score %</div>}
        <div className="t-cell head center">Actual</div>
        <div className="t-cell head center">Score</div>
      </div>

      {baseMetrics.map(m => {
        const p  = m.plan[wk.id] ?? '';
        const a  = m.actual[wk.id] ?? '';
        const pr = (m.promised && m.promised[wk.id]) ?? '';
        // Use fixed plan value for scoring if this metric has one
        const fixedPlan = FIXED_PLAN_VALUES[m.id];
        const effectivePlan = fixedPlan !== undefined ? fixedPlan : p;
        const sc = calculateScore(effectivePlan, a, m.dir);

        return (
          <div key={m.id} className="table-row" style={{ gridTemplateColumns: gridCols }}>
            <div className="t-cell">
              <div>
                <div className="metric-name">{m.name}</div>
                {m.sub && <div className="metric-sub">{m.sub}</div>}
              </div>
            </div>
            <div className="t-cell">
              {m.dir === 'zero' ? (
                <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--muted)', fontSize: 13, padding: '6px 0' }}
                  title="Plan is not applicable for this metric">—</div>
              ) : fixedPlan !== undefined ? (
                <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--muted)', fontSize: 13, padding: '6px 0' }}
                  title={`Plan is always ${fixedPlan} for this metric`}>{fixedPlan} <span style={{ fontSize: 10, fontWeight: 400 }}>(fixed)</span></div>
              ) : (
                <input className={`de-input ${p !== '' ? 'filled' : ''}`} type={m.unit === 'hrs' ? "text" : "number"} step="any" value={p} placeholder="plan"
                  disabled={!canEdit}
                  onChange={e => updateValue(d.id, m.id, 'plan', wk.id, e.target.value)} />
              )}
            </div>
            {showPromised && (
              <div className="t-cell">
                {m.promised && m.dir !== 'zero' ? (
                  <input className={`de-input ${pr !== '' ? 'filled' : ''}`} type="number" step="any" value={pr} placeholder="%" 
                    disabled={!canEdit}
                    style={{ color: '#3b82f6', background: pr !== '' ? 'rgba(59, 130, 246, 0.15)' : '' }}
                    onChange={e => updateValue(d.id, m.id, 'promised', wk.id, e.target.value)} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>—</div>
                )}
              </div>
            )}
            <div className="t-cell">
              <input className={`de-input ${a !== '' ? 'filled' : ''}`} type={m.unit === 'hrs' ? "text" : "number"} step="any" value={a} placeholder="actual" 
                disabled={!canEdit}
                onChange={e => updateValue(d.id, m.id, 'actual', wk.id, e.target.value)} />
            </div>
            <div className="t-cell center">
              <span className={`score-pill ${sc.color}`}>{sc.label}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}
