import React from 'react';
import { calculateScore, RECRUITERS } from '../../store/kpiStore';

export default function DataEntryHiringGrid({
  department: d,
  wk,
  canEdit,
  updateValue,
  posMetrics,       // all pos_ metrics (from computed model — used for display)
  allPosMetrics,    // raw pos_ metrics (from raw model — has activeWeeks)
  addHiringRole,
  removeHiringRole,
  toggleRoleWeek
}) {
  // Helper: is a role active for the current week?
  // A role is active if activeWeeks includes wk.id,
  // OR if activeWeeks is missing/empty (legacy metrics without the field — treat as always active)
  const isActiveForWeek = (posMetricGroup) => {
    const sample = posMetricGroup[0];
    if (!sample) return false;
    const raw = allPosMetrics?.find(m => m.id === sample.id);
    if (!raw) return true; // fallback
    if (!raw.activeWeeks || raw.activeWeeks.length === 0) return true; // legacy: always show
    return raw.activeWeeks.includes(wk.id);
  };

  return (
    <div className="rec-wrap">
      <div className="section-label" style={{ marginTop: 4, marginBottom: 12 }}>
        Recruiter-wise Breakdown — by Position
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', marginLeft: 10 }}>
          ({wk.label} · {wk.range})
        </span>
      </div>
      <div className="rec-split">
        {RECRUITERS.map(rec => {
          const mine = posMetrics.filter(m => (m.sub || '').match(/Recruiter:\s*([^·]+)/i)?.[1].trim() === rec);

          // Group metrics by position
          let allPositions = [];
          let byPos = {};
          mine.forEach(m => {
            const pMatch = (m.sub || '').match(/Position:\s*([^·]+)/i);
            const pos = pMatch ? pMatch[1].trim() : '';
            if (!byPos[pos]) { byPos[pos] = []; allPositions.push(pos); }
            byPos[pos].push(m);
          });

          // Split positions into active-this-week vs inactive-this-week
          const activePositions = allPositions.filter(pos => isActiveForWeek(byPos[pos]));
          const inactivePositions = allPositions.filter(pos => !isActiveForWeek(byPos[pos]));

          return (
            <div key={rec} className="rec-table">
              <div className="rec-head">
                👤 {rec}
                <span className="sub">{wk.label} · {wk.range}</span>
              </div>

              {/* ── Active roles for this week ── */}
              {!activePositions.length ? (
                <div className="pos-empty">No positions active this week. Click "＋ Add Position" below.</div>
              ) : (
                activePositions.map(pos => {
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
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {/* Remove from THIS week only */}
                          <span
                            className="rm"
                            title={`Remove ${pos} from ${wk.label} only`}
                            onClick={() => {
                              if (!canEdit) { alert('Unlock editing first.'); return; }
                              if (confirm(`Remove "${pos}" from ${wk.label} only?\n\nData for other weeks will be kept.`)) {
                                removeHiringRole(rec, pos, wk.id);
                              }
                            }}
                          >✕ This week</span>
                          {/* Remove from ALL weeks */}
                          <span
                            style={{ fontSize: 11, color: '#ef4444', cursor: 'pointer', fontWeight: 600, padding: '2px 6px', borderRadius: 4, border: '1px solid #fecaca' }}
                            title={`Delete ${pos} from ALL weeks`}
                            onClick={() => {
                              if (!canEdit) { alert('Unlock editing first.'); return; }
                              if (confirm(`Permanently delete "${pos}" from ALL weeks?\n\nThis cannot be undone.`)) {
                                removeHiringRole(rec, pos);
                              }
                            }}
                          >✕✕ All weeks</span>
                        </div>
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

              {/* ── Roles from other weeks that can be enabled here ── */}
              {inactivePositions.length > 0 && (
                <div style={{ marginTop: 12, marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.04em' }}>
                    ROLES FROM OTHER WEEKS — enable for {wk.label}:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {inactivePositions.map(pos => (
                      <button
                        key={pos}
                        style={{
                          padding: '4px 12px', fontSize: 12, borderRadius: 20,
                          background: '#eff6ff', color: '#3b82f6',
                          border: '1px solid #bfdbfe', cursor: canEdit ? 'pointer' : 'not-allowed',
                          fontWeight: 600
                        }}
                        onClick={() => {
                          if (!canEdit) { alert('Unlock editing first.'); return; }
                          toggleRoleWeek(rec, pos, wk.id);
                        }}
                      >
                        ＋ {pos}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Add a brand new position ── */}
              <button
                className="add-pos"
                onClick={() => {
                  if (!canEdit) { alert('Unlock editing first.'); return; }
                  const role = prompt(`Enter Position Name for ${rec} (for ${wk.label}):`);
                  if (!role) return;
                  addHiringRole(rec, role, wk.id);
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
