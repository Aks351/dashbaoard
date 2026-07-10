import React from 'react';
import { calculateScore, RECRUITERS } from '../../store/kpiStore';

export default function DataEntryHiringGrid({
  department: d,
  wk,
  canEdit,
  updateValue,
  posMetrics,
  addHiringRole,
  removeHiringRole
}) {
  return (
    <div className="rec-wrap">
      <div className="section-label" style={{ marginTop: 4, marginBottom: 12 }}>Recruiter-wise Breakdown — by Position</div>
      <div className="rec-split">
        {RECRUITERS.map(rec => {
          const mine = posMetrics.filter(m => (m.sub || '').match(/Recruiter:\s*([^·]+)/i)?.[1].trim() === rec);
          let positions = [];
          let byPos = {};
          mine.forEach(m => {
            const pMatch = (m.sub || '').match(/Position:\s*([^·]+)/i);
            const pos = pMatch ? pMatch[1].trim() : '';
            if (!byPos[pos]) { byPos[pos] = []; positions.push(pos); }
            byPos[pos].push(m);
          });

          return (
            <div key={rec} className="rec-table">
              <div className="rec-head">
                👤 {rec}
                <span className="sub">{wk.label} · {wk.range}</span>
              </div>
              {!positions.length ? (
                <div className="pos-empty">No positions yet. Click "＋ Add Position" below.</div>
              ) : (
                positions.map(pos => {
                  const order = { 'Applications': 0, 'Final Rounds': 1, 'Offer Given To': 2 };
                  byPos[pos].sort((a, b) => {
                    const aStage = (a.sub.split('·').pop() || '').trim();
                    const bStage = (b.sub.split('·').pop() || '').trim();
                    return (order[aStage] ?? 99) - (order[bStage] ?? 99);
                  });
                  
                  return (
                    <div key={pos} className="pos-group">
                      <div className="pos-title">
                        <span>📌 {pos}</span>
                        <span 
                          className="rm" 
                          title="Remove position" 
                          onClick={() => {
                            if (!canEdit) { alert('Unlock editing first.'); return; }
                            removeHiringRole(rec, pos);
                          }}
                        >✕</span>
                      </div>
                      <div className="de-row head">
                        <div className="de-cell head">Stage</div>
                        <div className="de-cell head" style={{ textAlign: 'center' }}>Plan</div>
                        <div className="de-cell head" style={{ textAlign: 'center' }}>Actual</div>
                        <div className="de-cell head" style={{ textAlign: 'center' }}>Score</div>
                      </div>
                      {byPos[pos].map(m => {
                        const p = m.plan[wk.id] ?? '';
                        const a = m.actual[wk.id] ?? '';
                        const sc = calculateScore(p, a, m.dir);
                        const stage = (m.sub.split('·').pop() || '').trim();
                        return (
                          <div key={m.id} className="de-row">
                            <div className="de-cell"><div className="de-metric-name">{stage}</div></div>
                            <div className="de-cell">
                              <input className={`de-input ${p !== '' ? 'filled' : ''}`} type="number" step="any" value={p} placeholder="plan" 
                                disabled={!canEdit}
                                onChange={e => updateValue(d.id, m.id, 'plan', wk.id, e.target.value)} />
                            </div>
                            <div className="de-cell">
                              <input className={`de-input ${a !== '' ? 'filled' : ''}`} type="number" step="any" value={a} placeholder="actual" 
                                disabled={!canEdit}
                                onChange={e => updateValue(d.id, m.id, 'actual', wk.id, e.target.value)} />
                            </div>
                            <div className="de-cell de-score" id={`sc-hiring-${m.id}`}>
                              <span className={`score-pill ${sc.color}`}>{sc.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
              <button 
                className="add-pos" 
                onClick={() => {
                  if (!canEdit) { alert('Unlock editing first.'); return; }
                  const role = prompt(`Enter Position Name for ${rec}:`);
                  if (!role) return;
                  addHiringRole(rec, role);
                }}
              >
                ＋ Add Position
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
