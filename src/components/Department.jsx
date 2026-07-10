import React, { useContext, useState } from 'react';
import { KpiContext, mtd, calculateScore, SOLUTION_LINKS, RECRUITERS, STAGES, formatNum } from '../store/kpiStore';
import { ExternalLink } from 'lucide-react';

export default function Department({ department: d }) {
  const { model } = useContext(KpiContext);
  const { weeks } = model;
  const isCrm = d.id === 'crm';
  const showPromised = ['purchase', 'production'].includes(d.id);
  
  const [hireMxWeek, setHireMxWeek] = useState(weeks.length ? weeks[weeks.length - 1].id : null);

  let baseMetrics = d.metrics;
  let posMetrics = [];
  if (d.id === 'hiring') {
    baseMetrics = d.metrics.filter(m => !/·\s*Position:/i.test(m.sub || ''));
    posMetrics = d.metrics.filter(m => /·\s*Position:/i.test(m.sub || ''));
  }

  const colsPerWeek = isCrm ? `minmax(70px, 0.65fr) minmax(70px, 0.65fr) minmax(70px, 0.65fr) minmax(70px, 0.6fr) minmax(70px, 0.65fr)` : (showPromised ? `minmax(70px, 0.65fr) minmax(80px, 0.8fr) minmax(70px, 0.65fr) minmax(70px, 0.65fr)` : `minmax(70px, 0.65fr) minmax(80px, 0.8fr) minmax(70px, 0.65fr)`);
  const cols = `minmax(250px, 1.9fr) ` + weeks.map(() => colsPerWeek).join(' ') + ` minmax(100px, 1.1fr)`;

  const link = SOLUTION_LINKS[d.id];

  const renderHiringMatrix = () => {
    if (d.id !== 'hiring' || !posMetrics.length) return null;
    
    const curWk = weeks.find(w => w.id === hireMxWeek) || weeks[weeks.length - 1];
    
    return (
      <div className="mx-container" style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 14, color: 'var(--navy)', marginBottom: 12 }}>Position Breakdown by Recruiter — {curWk ? curWk.label : ''} (Actual / Plan · %)</h3>
        
        <div className="week-bar" style={{ marginBottom: 16 }}>
          {weeks.map(w => (
            <div 
              key={w.id} 
              className={`week-chip ${w.id === hireMxWeek ? 'active' : ''}`}
              onClick={() => setHireMxWeek(w.id)}
            >
              {w.label} · {w.range}
            </div>
          ))}
        </div>

        {RECRUITERS.map(rec => {
          const mine = posMetrics.filter(m => (m.sub || '').match(/Recruiter:\s*([^·]+)/i)?.[1].trim() === rec);
          let positions = [];
          mine.forEach(m => {
            const pMatch = (m.sub || '').match(/Position:\s*([^·]+)/i);
            if (pMatch && !positions.includes(pMatch[1].trim())) positions.push(pMatch[1].trim());
          });

          return (
            <div key={rec} className="mx-block">
              <div className="mx-rec-title">👤 {rec}</div>
              {!positions.length ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>No positions added yet for {rec}. Add them in Data Entry.</div>
              ) : (
                <div className="mx-scroll">
                  <table className="mx-table">
                    <thead>
                      <tr>
                        <th>Stage \\ Position</th>
                        {positions.map(p => <th key={p}>{p}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {STAGES.map(st => (
                        <tr key={st[1]}>
                          <th>{st[0]}</th>
                          {positions.map(p => {
                            const m = mine.find(x => {
                              const pMatch = (x.sub || '').match(/Position:\s*([^·]+)/i);
                              const stMatch = (x.sub.split('·').pop() || '').trim();
                              return pMatch && pMatch[1].trim() === p && stMatch === st[1];
                            });
                            if (!m || !curWk) return <td key={p} className="muted">—</td>;
                            const pv = m.plan[curWk.id], av = m.actual[curWk.id], sc = calculateScore(pv, av, m.dir);
                            return (
                              <td key={p}>
                                <span className={`mx-act ${sc.color === 'gray' ? 'muted' : sc.color}`}>
                                  {av === '' || av == null ? '—' : formatNum(av)}
                                </span>
                                <span className="mx-plan">/ {pv === '' || pv == null ? '—' : formatNum(pv)}</span>
                                <span className={`mx-pct ${sc.color === 'gray' ? 'muted' : sc.color}`}>
                                  {sc.label}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="dept-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">{d.emoji} {d.name}</h1>
          <p className="page-subtitle">Week-by-week plan vs actual · live MTD roll-up</p>
        </div>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="solution-link">
            <ExternalLink size={16} /> Open Solution Report
          </a>
        )}
      </div>

      <div className="metric-table-container">
        <div className="metric-table-grid">
          {/* Header */}
          <div className="table-row head-row" style={{ gridTemplateColumns: cols }}>
            <div className="t-cell head">Metric</div>
            {weeks.map((w, i) => (
              <React.Fragment key={w.id}>
                <div className="t-cell head center" style={{ borderLeft: '1px solid var(--border)' }}>{w.label.replace('Week', 'W')} Plan</div>
                <div className="t-cell head center">{w.label.replace('Week', 'W')} Act</div>
                {isCrm && (
                  <>
                    <div className="t-cell head center" style={{ color: '#2563eb' }}>On-Time</div>
                    <div className="t-cell head center" style={{ color: 'var(--red)' }}>Pending</div>
                  </>
                )}
                <div className="t-cell head center">Score</div>
                {showPromised && <div className="t-cell head center">Promised Score</div>}
              </React.Fragment>
            ))}
            <div className="t-cell head center" style={{ borderLeft: '1px solid var(--border)', background: 'rgba(220, 252, 231, 0.4)' }}>MTD</div>
          </div>

          {/* Rows */}
          {baseMetrics.map(m => {
            const mt = mtd(m, weeks);
            const msc = calculateScore(mt.plan, mt.actual, m.dir);
            const mtActCol = isCrm ? 'green' : msc.color;

            return (
              <div key={m.id} className="table-row" style={{ gridTemplateColumns: cols, background: m.total ? 'rgba(248, 250, 252, 0.7)' : 'transparent' }}>
                <div className="t-cell">
                  <div>
                    <div className="metric-name">{m.name}</div>
                    {m.sub && <div className="metric-sub">{m.sub}</div>}
                  </div>
                </div>

                {weeks.map(w => {
                  const p = m.plan[w.id];
                  const a = m.actual[w.id];
                  const sc = calculateScore(p, a, m.dir);
                  const actCol = isCrm ? 'green' : sc.color;
                  const prom = m.promised ? m.promised[w.id] : '';

                  let crmCells = null;
                  if (isCrm) {
                    const ot = m.ontime ? m.ontime[w.id] : '';
                    const pend = (p !== '' && p != null && a !== '' && a != null) ? Math.max(0, p - a) : '—';
                    crmCells = (
                      <>
                        <div className="t-cell center">
                          <span className="val-actual" style={{ color: '#2563eb' }}>{ot === '' || ot == null ? '—' : formatNum(ot)}</span>
                        </div>
                        <div className="t-cell center">
                          <span className="val-actual red">{formatNum(pend)}</span>
                        </div>
                      </>
                    );
                  }

                  return (
                    <React.Fragment key={w.id}>
                      <div className="t-cell center" style={{ borderLeft: '1px solid var(--border)' }}>
                        <span className="plan-num">{p === '' || p == null ? '—' : formatNum(p)}</span>
                      </div>
                      <div className="t-cell center">
                        <span className={`val-actual ${actCol}`}>{a === '' || a == null ? '—' : formatNum(a)}</span>
                      </div>
                      {crmCells}
                      <div className="t-cell center">
                        <span className={`score-pill ${sc.color}`}>{sc.label}</span>
                      </div>
                      {showPromised && (
                        <div className="t-cell center">
                          <span className="score-pill" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                            {prom === '' || prom == null ? '—' : `${prom}%`}
                          </span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* MTD Cell */}
                <div className="t-cell center" style={{ borderLeft: '1px solid var(--border)', background: 'rgba(240, 253, 244, 0.3)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span className={`val-actual ${mtActCol}`}>{mt.actual === null ? '—' : formatNum(mt.actual)}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>Plan: {mt.plan === null ? '—' : formatNum(mt.plan)}</span>
                    <span className={`score-pill ${msc.color}`}>{msc.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {renderHiringMatrix()}

    </div>
  );
}
