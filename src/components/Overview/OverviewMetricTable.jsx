import React from 'react';
import { mtd, calculateScore, formatNum } from '../../store/kpiStore';

export default function OverviewMetricTable({ departments, weeks }) {
  const cols = `minmax(250px, 2.1fr) ` + weeks.map(() => `minmax(70px, 0.7fr) minmax(80px, 0.8fr)`).join(' ') + ` minmax(70px, 0.7fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr)`;

  return (
    <div className="metric-table-container">
      <div className="metric-table-grid">
        {/* Header */}
        <div className="table-row head-row" style={{ gridTemplateColumns: cols }}>
          <div className="t-cell head">Metric</div>
          {weeks.map((w) => (
            <React.Fragment key={w.id}>
              <div className="t-cell head center" style={{ borderLeft: '1px solid var(--border)' }}>{w.label.replace('Week', 'W')} Plan</div>
              <div className="t-cell head center">{w.label.replace('Week', 'W')} Act</div>
            </React.Fragment>
          ))}
          <div className="t-cell head center" style={{ borderLeft: '1px solid var(--border)', background: 'rgba(220, 252, 231, 0.4)' }}>MTD Plan</div>
          <div className="t-cell head center" style={{ background: 'rgba(220, 252, 231, 0.4)' }}>MTD Act</div>
          <div className="t-cell head center" style={{ background: 'rgba(220, 252, 231, 0.4)' }}>Score</div>
        </div>

        {/* Rows */}
        {departments.map(d => {
          return (
            <React.Fragment key={d.id}>
              <div className="table-row dept-sep" style={{ gridTemplateColumns: '1fr' }}>
                <div className="dept-sep-label">{d.emoji} {d.name.toUpperCase()}</div>
              </div>
              {d.metrics.filter(m => d.id !== 'hiring' || !/·\s*Position:/i.test(m.sub || '')).map(m => {
                const mt = mtd(m, weeks);
                const msc = calculateScore(mt.plan, mt.actual, m.dir);
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
                      const actColor = (d.id === 'crm' && (m.id.includes('dispatch') || m.id.includes('payment'))) ? 'green' : sc.color;
                      return (
                        <React.Fragment key={w.id}>
                          <div className="t-cell center" style={{ borderLeft: '1px solid var(--border)' }}>
                            <span className="plan-num">{p === '' || p === null || p === undefined ? '—' : formatNum(p)}</span>
                          </div>
                          <div className="t-cell center">
                            <span className={`val-actual ${actColor}`}>{a === '' || a === null || a === undefined ? '—' : formatNum(a)}</span>
                          </div>
                        </React.Fragment>
                      );
                    })}

                    <div className="t-cell center" style={{ borderLeft: '1px solid var(--border)', background: 'rgba(240, 253, 244, 0.3)' }}>
                      <span className="plan-num">{mt.plan === null ? '—' : formatNum(mt.plan)}</span>
                    </div>
                    <div className="t-cell center" style={{ background: 'rgba(240, 253, 244, 0.3)' }}>
                      <span className={`val-actual ${(d.id === 'crm' && (m.id.includes('dispatch') || m.id.includes('payment'))) ? 'green' : msc.color}`}>{mt.actual === null ? '—' : formatNum(mt.actual)}</span>
                    </div>
                    <div className="t-cell center" style={{ background: 'rgba(240, 253, 244, 0.3)' }}>
                      <span className={`score-pill ${msc.color}`}>{msc.label}</span>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
