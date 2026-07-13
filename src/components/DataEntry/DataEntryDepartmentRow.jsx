import React from 'react';
import { calculateScore, formatNum } from '../../store/kpiStore';

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
        const p = m.plan[wk.id] ?? '';
        const a = m.actual[wk.id] ?? '';
        const pr = (m.promised && m.promised[wk.id]) ?? '';
        const sc = calculateScore(p, a, m.dir);

        return (
          <div key={m.id} className="table-row" style={{ gridTemplateColumns: gridCols }}>
            <div className="t-cell">
              <div>
                <div className="metric-name">{m.name}</div>
                {m.sub && <div className="metric-sub">{m.sub}</div>}
              </div>
            </div>
            <div className="t-cell">
              <input className={`de-input ${p !== '' ? 'filled' : ''}`} type="number" step="any" value={p} placeholder="plan" 
                disabled={!canEdit}
                onChange={e => updateValue(d.id, m.id, 'plan', wk.id, e.target.value)} />
            </div>
            {showPromised && (
              <div className="t-cell">
                {m.promised ? (
                  <input className={`de-input ${pr !== '' ? 'filled' : ''}`} type="number" step="any" value={pr} placeholder="%" 
                    disabled={!canEdit}
                    style={{ color: '#3b82f6', background: pr !== '' ? '#eff6ff' : '' }}
                    onChange={e => updateValue(d.id, m.id, 'promised', wk.id, e.target.value)} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>—</div>
                )}
              </div>
            )}
            <div className="t-cell">
              <input className={`de-input ${a !== '' ? 'filled' : ''}`} type="number" step="any" value={a} placeholder="actual" 
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
