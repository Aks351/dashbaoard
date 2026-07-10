import React from 'react';
import { mtd, calculateScore, formatNum } from '../../store/kpiStore';

export default function DepartmentMetricsTable({ department: d, weeks, baseMetrics }) {
  const showPromised = ['purchase', 'production'].includes(d.id);
  
  const colsPerWeek = showPromised ? `minmax(70px, 0.65fr) minmax(80px, 0.8fr) minmax(70px, 0.65fr) minmax(70px, 0.65fr)` : `minmax(70px, 0.65fr) minmax(80px, 0.8fr) minmax(70px, 0.65fr)`;
  const cols = `minmax(250px, 1.9fr) ` + weeks.map(() => colsPerWeek).join(' ') + ` minmax(100px, 1.1fr)`;

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
                const prom = m.promised ? m.promised[w.id] : '';
                const actColor = d.id === 'crm' ? 'green' : sc.color;

                return (
                  <React.Fragment key={w.id}>
                    <div className="t-cell center" style={{ borderLeft: '1px solid var(--border)' }}>
                      <span className="plan-num">{p === '' || p == null ? '—' : formatNum(p)}</span>
                    </div>
                    <div className="t-cell center">
                      <span className={`val-actual ${actColor}`}>{a === '' || a == null ? '—' : formatNum(a)}</span>
                    </div>
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
                  <span className={`val-actual ${d.id === 'crm' ? 'green' : msc.color}`}>{mt.actual === null ? '—' : formatNum(mt.actual)}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>Plan: {mt.plan === null ? '—' : formatNum(mt.plan)}</span>
                  <span className={`score-pill ${msc.color}`}>{msc.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
