import React, { useRef, useLayoutEffect } from 'react';
import { mtd, calculateScore, formatVal, ZERO_PLAN_IDS } from '../../store/kpiStore';
import { weeksInMonth } from '../../utils/dateUtils';

const PROMISED_DEPTS = ['purchase', 'production', 'crm'];
const B = '1px solid var(--border)';

// Sticky styles for the frozen first column
const STICKY_HEAD = {
  position: 'sticky', left: 0, zIndex: 3,
  background: 'rgba(241, 245, 249, 0.85)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '2px 0 4px -2px rgba(0,0,0,0.10)',
};
const stickyData = (isTotal) => ({
  position: 'sticky', left: 0, zIndex: 1,
  background: isTotal ? 'rgba(248, 250, 252, 0.9)' : 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)',
});

export default function OverviewMetricTable({ departments, weeks, period }) {
  const tableRef = useRef(null);

  useLayoutEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollLeft = tableRef.current.scrollWidth;
    }
  }, [weeks, period]);

  // Per-week: Plan | Act | Promised  (3 cols per week)
  // End: MTD Plan | MTD Act | Score  (3 fixed cols)
  const cols =
    `minmax(220px, 2fr) ` +
    weeks.map(() => `minmax(62px, 0.62fr) minmax(72px, 0.72fr) minmax(68px, 0.68fr)`).join(' ') +
    ` minmax(65px, 0.65fr) minmax(75px, 0.75fr) minmax(75px, 0.75fr)`;

  // Total column count for dept separator spanning
  const totalCols = 1 + weeks.length * 3 + 3;

  // Flatten all rows
  const rows = [];
  rows.push({ type: 'header' });
  departments.forEach(d => {
    const showProm = PROMISED_DEPTS.includes(d.id);
    rows.push({ type: 'dept-sep', d });
    d.metrics
      .filter(m => d.id !== 'hiring' || !/·\s*Position:/i.test(m.sub || ''))
      .forEach((m, mIdx, arr) => {
        rows.push({ type: 'metric', d, m, showProm, isLast: mIdx === arr.length - 1 });
      });
  });

  return (
    <div className="metric-table-container" ref={tableRef}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 'max-content', width: '100%' }}>

        {rows.map((row, rIdx) => {
          /* ── HEADER ── */
          if (row.type === 'header') {
            return (
              <React.Fragment key="header">
                {/* Sticky header first cell */}
                <div className="t-cell head" style={STICKY_HEAD}>Metric</div>
                {weeks.map(w => (
                  <React.Fragment key={w.id}>
                    <div className="t-cell head center" style={{ background: '#f1f5f9', borderLeft: B }}>
                      <div>{w.label.replace('Week', 'W')} Plan</div>
                      {w.range && <div style={{ fontSize: '8px', textTransform: 'none', color: '#64748b', fontWeight: 400, marginTop: '1px' }}>{w.range}</div>}
                    </div>
                    <div className="t-cell head center" style={{ background: '#f1f5f9' }}>
                      <div>{w.label.replace('Week', 'W')} Act</div>
                      {w.range && <div style={{ fontSize: '8px', textTransform: 'none', color: '#64748b', fontWeight: 400, marginTop: '1px' }}>{w.range}</div>}
                    </div>
                    <div className="t-cell head center" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontSize: 9 }}>
                      <div>Promised</div>
                      {w.range && <div style={{ fontSize: '8px', textTransform: 'none', color: '#3b82f6', opacity: 0.8, fontWeight: 400, marginTop: '1px' }}>{w.range}</div>}
                    </div>
                  </React.Fragment>
                ))}
                <div className="t-cell head center" style={{ background: 'rgba(220,252,231,0.5)', borderLeft: B }}>MTD Plan</div>
                <div className="t-cell head center" style={{ background: 'rgba(220,252,231,0.5)' }}>MTD Act</div>
                <div className="t-cell head center" style={{ background: 'rgba(220,252,231,0.5)' }}>Score</div>
              </React.Fragment>
            );
          }

          /* ── DEPT SEPARATOR — spans all cols, also sticky so label stays visible ── */
          if (row.type === 'dept-sep') {
            return (
              <div
                key={`sep-${row.d.id}`}
                className="dept-sep-label"
                style={{
                  gridColumn: `1 / ${totalCols + 1}`,
                  borderBottom: B,
                  borderTop: rIdx > 0 ? B : 'none',
                  background: '#f1f5f9',
                }}
              >
                {row.d.emoji} {row.d.name.toUpperCase()}
              </div>
            );
          }

          /* ── METRIC ROW ── */
          const { d, m, showProm, isLast } = row;
          const mt = mtd(m, weeksInMonth(weeks, period));
          const msc = calculateScore(mt.plan, mt.actual, m.dir);
          const rowBg = m.total ? 'rgba(248,250,252,0.85)' : 'transparent';
          const bb = isLast ? 'none' : B;

          return (
            <React.Fragment key={`${d.id}-${m.id}`}>
              {/* Sticky metric name */}
              <div
                className="t-cell"
                style={{ ...stickyData(m.total), borderBottom: bb }}
              >
                <div>
                  <div className="metric-name" style={{ fontWeight: m.total ? 700 : 600 }}>{m.name}</div>
                  {m.sub && <div className="metric-sub">{m.sub}</div>}
                </div>
              </div>

              {/* Per-week: Plan | Act | Promised */}
              {weeks.map(w => {
                const p = m.plan[w.id];
                const a = m.actual[w.id];
                const sc = calculateScore(p, a, m.dir);
                const prom = showProm && m.promised ? m.promised[w.id] : null;

                return (
                  <React.Fragment key={w.id}>
                    <div className="t-cell center" style={{ background: rowBg, borderLeft: B, borderBottom: bb }}>
                      <span className="plan-num">{p == null || p === '' ? '—' : formatVal(p, m.unit, m.id)}</span>
                    </div>
                    <div className="t-cell center" style={{ background: rowBg, borderBottom: bb }}>
                      <span className={`val-actual ${sc.color}`}>{a == null || a === '' ? '—' : formatVal(a, m.unit, m.id)}</span>
                    </div>
                    <div className="t-cell center" style={{ background: rowBg === 'transparent' ? 'rgba(59, 130, 246, 0.05)' : rowBg, borderBottom: bb }}>
                      {m.dir === 'zero' ? (
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                      ) : prom != null && prom !== '' ? (
                        <span className="score-pill" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                          {`${Number(prom) > 0 ? '+' : ''}${Number(prom)}%`}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              {/* MTD Plan */}
              <div className="t-cell center" style={{ background: 'rgba(240,253,244,0.3)', borderLeft: B, borderBottom: bb }}>
                <span className="plan-num">{mt.plan === null ? '—' : formatVal(mt.plan, m.unit, m.id)}</span>
              </div>
              {/* MTD Act */}
              <div className="t-cell center" style={{ background: 'rgba(240,253,244,0.3)', borderBottom: bb }}>
                <span className={`val-actual ${msc.color}`}>{mt.actual === null ? '—' : formatVal(mt.actual, m.unit, m.id)}</span>
              </div>
              {/* Score */}
              <div className="t-cell center" style={{ background: 'rgba(240,253,244,0.3)', borderBottom: bb }}>
                <span className={`score-pill ${msc.color === 'gray' ? 'muted' : msc.color}`}>{msc.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
