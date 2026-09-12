import React, { useRef, useLayoutEffect } from 'react';
import { mtd, calculateScore, formatVal, ZERO_PLAN_IDS } from '../../store/kpiStore';
import { groupWeeksByMonth } from '../../utils/dateUtils';

const PROMISED_DEPTS = ['crm'];
const B = '1px solid var(--border)';
const WEEK_SEP_BORDER = '2px solid #cbd5e1';

// Sticky styles for the frozen first column
const STICKY_HEAD = {
  position: 'sticky', left: 0, zIndex: 3,
  background: '#f1f5f9',
  boxShadow: '2px 0 4px -2px rgba(0,0,0,0.10)',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#334155',
  padding: '10px 14px',
};
const stickyData = (isTotal) => ({
  position: 'sticky', left: 0, zIndex: 1,
  background: isTotal ? '#f8fafc' : '#ffffff',
  boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)',
  padding: '11px 14px',
});


export default function OverviewMetricTable({ departments, weeks, period }) {
  const tableRef = useRef(null);

  useLayoutEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollLeft = tableRef.current.scrollWidth;
    }
  }, [weeks, period]);

  const monthGroups = groupWeeksByMonth(weeks);

  // Per-week: Plan | Act | Promised  (3 cols per week)
  // End of each month: MTD Plan | MTD Act | Score  (3 fixed cols per month)
  const cols =
    `minmax(240px, 2fr) ` +
    monthGroups.map(mg =>
      mg.weeks.map(() => `minmax(62px, 0.62fr) minmax(72px, 0.72fr) minmax(68px, 0.68fr)`).join(' ') +
      ` minmax(65px, 0.65fr) minmax(75px, 0.75fr) minmax(75px, 0.75fr)`
    ).join(' ');

  // Total column count for dept separator spanning
  const totalCols = 1 + monthGroups.reduce((acc, mg) => acc + mg.weeks.length * 3 + 3, 0);

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
                {monthGroups.map(mg => (
                  <React.Fragment key={mg.monthKey}>
                    {mg.weeks.map((w, idx) => {
                      const isAltWeek = idx % 2 === 1;
                      const headBg = isAltWeek ? '#e2e8f0' : '#f1f5f9';
                      return (
                        <React.Fragment key={w.id}>
                          <div className="t-cell head center" style={{ background: headBg, borderLeft: WEEK_SEP_BORDER }}>
                            <div>{w.label.replace('Week', 'W')} Plan</div>
                            {w.range && <div style={{ fontSize: '8px', textTransform: 'none', color: '#475569', fontWeight: 500, marginTop: '1px' }}>{w.range}</div>}
                          </div>
                          <div className="t-cell head center" style={{ background: headBg }}>
                            <div>{w.label.replace('Week', 'W')} Act</div>
                            {w.range && <div style={{ fontSize: '8px', textTransform: 'none', color: '#475569', fontWeight: 500, marginTop: '1px' }}>{w.range}</div>}
                          </div>
                          <div className="t-cell head center" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontSize: 9 }}>
                            <div>Promised</div>
                            {w.range && <div style={{ fontSize: '8px', textTransform: 'none', color: '#3b82f6', opacity: 0.8, fontWeight: 400, marginTop: '1px' }}>{w.range}</div>}
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <div className="t-cell head center" style={{ background: '#ecfdf5', borderLeft: 'none', borderRight: 'none' }}>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.14)',
                        color: '#065f46',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        display: 'inline-block'
                      }}>
                        {monthGroups.length > 1 ? `${mg.monthShort} MTD Plan` : 'MTD Plan'}
                      </span>
                    </div>
                    <div className="t-cell head center" style={{ background: '#ecfdf5', borderLeft: 'none', borderRight: 'none' }}>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.14)',
                        color: '#065f46',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        display: 'inline-block'
                      }}>
                        {monthGroups.length > 1 ? `${mg.monthShort} MTD Act` : 'MTD Act'}
                      </span>
                    </div>
                    <div className="t-cell head center" style={{ background: '#ecfdf5', borderLeft: 'none', borderRight: 'none' }}>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.14)',
                        color: '#065f46',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        fontSize: '11px',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        display: 'inline-block'
                      }}>Score</span>
                    </div>
                  </React.Fragment>
                ))}
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

              {monthGroups.map(mg => {
                const mt = mtd(m, mg.weeks);
                const msc = calculateScore(mt.plan, mt.actual, m.dir);

                return (
                  <React.Fragment key={mg.monthKey}>
                    {/* Per-week: Plan | Act | Promised */}
                    {mg.weeks.map((w, idx) => {
                      const p = m.plan[w.id];
                      const a = m.actual[w.id];
                      const sc = calculateScore(p, a, m.dir);
                      const prom = showProm && m.promised ? m.promised[w.id] : null;
                      const isAltWeek = idx % 2 === 1;
                      const wkBg = m.total ? rowBg : (isAltWeek ? 'rgba(248, 250, 252, 0.75)' : rowBg);

                      return (
                        <React.Fragment key={w.id}>
                          <div className="t-cell center" style={{ background: wkBg, borderLeft: WEEK_SEP_BORDER, borderBottom: bb }}>
                            <span className="plan-num">{p == null || p === '' ? '—' : formatVal(p, m.unit, m.id)}</span>
                          </div>
                          <div className="t-cell center" style={{ background: wkBg, borderBottom: bb }}>
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
                    <div className="t-cell center" style={{ background: 'rgba(236, 253, 245, 0.55)', borderLeft: 'none', borderRight: 'none', borderBottom: bb }}>
                      <span className="plan-num" style={{ fontWeight: 600, color: '#334155' }}>{mt.plan === null ? '—' : formatVal(mt.plan, m.unit, m.id)}</span>
                    </div>
                    {/* MTD Act */}
                    <div className="t-cell center" style={{ background: 'rgba(236, 253, 245, 0.55)', borderLeft: 'none', borderRight: 'none', borderBottom: bb }}>
                      <span className={`val-actual ${msc.color}`}>{mt.actual === null ? '—' : formatVal(mt.actual, m.unit, m.id)}</span>
                    </div>
                    {/* Score */}
                    <div className="t-cell center" style={{ background: 'rgba(236, 253, 245, 0.55)', borderLeft: 'none', borderRight: 'none', borderBottom: bb }}>
                      <span className={`score-pill ${msc.color === 'gray' ? 'muted' : msc.color}`}>{msc.label}</span>
                    </div>
                  </React.Fragment>
                );
              })}

            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

