import React from 'react';
import { mtd, calculateScore, formatNum } from '../../store/kpiStore';

const WEEK_COLORS = [
  { head: '#fef9ec', body: '#fffdf5' },
  { head: '#f0f4ff', body: '#f5f8ff' },
  { head: '#eef9f1', body: '#f3fbf6' },
  { head: '#fdf0f6', body: '#fdf4f9' },
  { head: '#f8f9fa', body: '#fdfdfd' },
];

export default function DepartmentMetricsTable({ department: d, weeks, baseMetrics }) {
  const showPromised = ['purchase', 'production'].includes(d.id);
  const isHiring = d.id === 'hiring';
  
  const colsPerWeek = showPromised ? `0.65fr 0.8fr 0.65fr 0.65fr` : `0.65fr 0.8fr 0.65fr`;
  const cols = `1.9fr ` + weeks.map(() => colsPerWeek).join(' ') + ` 1.1fr`;

  return (
    <div className="metric-table">
      {/* Header */}
      <div className="dept-tbl head-row" style={{ gridTemplateColumns: cols }}>
        <div className="d-cell head">Metric</div>
        {weeks.map((w, idx) => {
          const bg = isHiring ? WEEK_COLORS[idx % WEEK_COLORS.length].head : '#f1f5f9';
          return (
            <React.Fragment key={w.id}>
              <div className="d-cell head center" style={{ background: bg, borderLeft: '1px solid var(--border)' }}>{w.label.replace('Week', 'W')} Plan</div>
              <div className="d-cell head center" style={{ background: bg }}>{w.label.replace('Week', 'W')} Act</div>
              <div className="d-cell head center" style={{ background: bg }}>Score</div>
              {showPromised && <div className="d-cell head center" style={{ background: bg }}>Promised Score</div>}
            </React.Fragment>
          );
        })}
        <div className="d-cell head center" style={{ background: isHiring ? '#f0faf4' : '#f1f5f9', borderLeft: '1px solid var(--border)' }}>MTD</div>
      </div>

      {/* Rows */}
      {baseMetrics.map(m => {
        const mt = mtd(m, weeks);
        const msc = calculateScore(mt.plan, mt.actual, m.dir);

        return (
          <div key={m.id} className="dept-tbl" style={{ gridTemplateColumns: cols, background: m.total ? 'rgba(248, 250, 252, 0.7)' : 'transparent' }}>
            <div className="d-cell">
              <div>
                <div className="metric-name" style={{ fontWeight: m.total ? 700 : 600 }}>{d.emoji} {m.name}</div>
                {m.sub && <div className="metric-sub">{m.sub}</div>}
              </div>
            </div>

            {weeks.map((w, idx) => {
              const p = m.plan[w.id];
              const a = m.actual[w.id];
              const sc = calculateScore(p, a, m.dir);
              const prom = m.promised ? m.promised[w.id] : '';
              const actColor = (d.id === 'crm' && (m.id === 'otd' || m.id === 'paycoll' || m.id === 'otd_ontime' || m.id === 'paycoll_ontime')) ? 'green' : sc.color;
              const bg = isHiring ? WEEK_COLORS[idx % WEEK_COLORS.length].body : 'transparent';

              return (
                <React.Fragment key={w.id}>
                  <div className="d-cell center" style={{ background: bg, borderLeft: '1px solid var(--border)' }}>
                    <span className="plan-num">{p === '' || p == null ? '—' : formatNum(p)}</span>
                  </div>
                  <div className="d-cell center" style={{ background: bg }}>
                    <span className={`val-actual ${actColor}`}>{a === '' || a == null ? '—' : formatNum(a)}</span>
                  </div>
                  <div className="d-cell center" style={{ background: bg }}>
                    <span className={`score-pill ${sc.color === 'gray' ? 'muted' : sc.color}`}>{sc.label}</span>
                  </div>
                  {showPromised && (
                    <div className="d-cell center" style={{ background: bg }}>
                      <span className="score-pill" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                        {prom === '' || prom == null ? '—' : `${prom}%`}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* MTD Cell */}
            <div className="d-cell center" style={{ borderLeft: '1px solid var(--border)', background: isHiring ? '#f5fff8' : 'rgba(240, 253, 244, 0.3)' }}>
              <div className="mtd-cell">
                <span className={`val-actual ${(d.id === 'crm' && (m.id === 'otd' || m.id === 'paycoll' || m.id === 'otd_ontime' || m.id === 'paycoll_ontime')) ? 'green' : msc.color}`}>
                  {mt.actual === null ? '—' : formatNum(mt.actual)}
                </span>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Plan: {mt.plan === null ? '—' : formatNum(mt.plan)}</span>
                <span className={`score-pill ${msc.color === 'gray' ? 'muted' : msc.color}`}>{msc.label}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
