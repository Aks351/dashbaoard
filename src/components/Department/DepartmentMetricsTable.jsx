import React from 'react';
import { mtd, calculateScore, formatVal, ZERO_PLAN_IDS } from '../../store/kpiStore';
import { weeksInMonth } from '../../utils/dateUtils';


const WEEK_COLORS = [
  { head: '#fef9ec', body: '#fffdf5' },
  { head: '#f0f4ff', body: '#f5f8ff' },
  { head: '#eef9f1', body: '#f3fbf6' },
  { head: '#fdf0f6', body: '#fdf4f9' },
  { head: '#f8f9fa', body: '#fdfdfd' },
];

// These CRM metrics always display green — they represent positive counts (higher = better, no penalty)
const ALWAYS_GREEN_IDS = new Set(['otd', 'otd_ontime', 'paycoll', 'paycoll_ontime']);
const applyGreen = (id, sc) => ALWAYS_GREEN_IDS.has(id) && sc.color !== 'gray' ? { ...sc, color: 'green' } : sc;

const B = '1px solid var(--border)'; // shorthand border

export default function DepartmentMetricsTable({ department: d, weeks, baseMetrics, period }) {
  const showPromised = ['purchase', 'production', 'crm'].includes(d.id);
  const isHiring = d.id === 'hiring';
  const isProduction = d.id === 'production';
  const scoreOpts = isProduction ? { strict: true } : {};

  // All rows share this SINGLE gridTemplateColumns string on ONE container grid.
  // This guarantees fr units compute identically for every row — no shifting.
  const colsPerWeek = showPromised ? `0.65fr 0.8fr 0.65fr 0.65fr` : `0.65fr 0.8fr 0.65fr`;
  const cols = `1.9fr ` + weeks.map(() => colsPerWeek).join(' ') + ` 1.1fr`;

  return (
    <div className="metric-table">
      {/*
        KEY FIX: ONE flat grid. Header cells + all data cells are direct children
        of this single grid. fr units compute once, columns lock perfectly.
      */}
      <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 'max-content', width: '100%' }}>

        {/* ── HEADER CELLS ── */}
        <div
          className="d-cell head"
          style={{
            position: 'sticky', left: 0, zIndex: 3,
            background: 'rgba(241, 245, 249, 0.85)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '2px 0 4px -2px rgba(0,0,0,0.10)',
          }}
        >Metric</div>
        {weeks.map((w, idx) => {
          const bg = isHiring ? WEEK_COLORS[idx % WEEK_COLORS.length].head : '#f1f5f9';
          return (
            <React.Fragment key={w.id}>
              <div className="d-cell head center" style={{ background: bg, borderLeft: B }}>
                <div>{w.label.replace('Week', 'W')} Plan</div>
                {w.range && <div style={{ fontSize: '8px', textTransform: 'none', color: '#64748b', fontWeight: 400, marginTop: '1px' }}>{w.range}</div>}
              </div>
              <div className="d-cell head center" style={{ background: bg }}>
                <div>{w.label.replace('Week', 'W')} Act</div>
                {w.range && <div style={{ fontSize: '8px', textTransform: 'none', color: '#64748b', fontWeight: 400, marginTop: '1px' }}>{w.range}</div>}
              </div>
              <div className="d-cell head center" style={{ background: bg }}>
                <div>Score</div>
                {w.range && <div style={{ fontSize: '8px', textTransform: 'none', color: '#64748b', fontWeight: 400, marginTop: '1px' }}>{w.range}</div>}
              </div>
              {showPromised && (
                <div className="d-cell head center" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontSize: 9 }}>
                  <div>Promised</div>
                  {w.range && <div style={{ fontSize: '8px', textTransform: 'none', color: '#3b82f6', opacity: 0.8, fontWeight: 400, marginTop: '1px' }}>{w.range}</div>}
                </div>
              )}
            </React.Fragment>
          );
        })}
        <div className="d-cell head center" style={{ background: isHiring ? '#f0faf4' : '#f1f5f9', borderLeft: B }}>MTD</div>

        {/* ── DATA CELLS — React.Fragment keeps them flat in the grid ── */}
        {baseMetrics.map((m, mIdx) => {
          const mt  = mtd(m, weeksInMonth(weeks, period));
          const isZeroPlan = ZERO_PLAN_IDS.has(m.id);
          const scoreDir = isZeroPlan ? 'zero' : m.dir;
          // For zero-plan metrics, pass null as plan so calculateScore uses only the 'zero' direction logic
          const msc = applyGreen(m.id, calculateScore(isZeroPlan ? null : mt.plan, mt.actual, scoreDir, scoreOpts));
          const isLast = mIdx === baseMetrics.length - 1;
          const rowBg = m.total ? 'rgba(248,250,252,0.85)' : 'transparent';
          const bb = isLast ? 'none' : B; // border-bottom

          return (
            <React.Fragment key={m.id}>
              {/* Metric name — sticky first column */}
              <div
                className="d-cell"
                style={{
                  background: m.total ? 'rgba(248, 250, 252, 0.9)' : 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                  borderBottom: bb,
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)',
                }}
              >
                <div>
                  <div className="metric-name" style={{ fontWeight: m.total ? 700 : 600 }}>{d.emoji} {m.name}</div>
                  {m.sub && <div className="metric-sub">{m.sub}</div>}
                </div>
              </div>

              {/* Per-week cells */}
              {weeks.map((w, idx) => {
                const p = m.plan[w.id];
                const a = m.actual[w.id];
                const sc = applyGreen(m.id, calculateScore(p, a, m.dir, scoreOpts));
                const prom = m.promised ? m.promised[w.id] : null;
                const wkBg = m.total ? rowBg : (isHiring ? WEEK_COLORS[idx % WEEK_COLORS.length].body : 'transparent');

                return (
                  <React.Fragment key={w.id}>
                    <div className="d-cell center" style={{ background: wkBg, borderLeft: B, borderBottom: bb }}>
                      <span className="plan-num">{p === '' || p == null ? '—' : formatVal(p, m.unit, m.id)}</span>
                    </div>
                    <div className="d-cell center" style={{ background: wkBg, borderBottom: bb }}>
                      <span className={`val-actual ${sc.color}`}>{a === '' || a == null ? '—' : formatVal(a, m.unit, m.id)}</span>
                    </div>
                    <div className="d-cell center" style={{ background: wkBg, borderBottom: bb }}>
                      <span className={`score-pill ${sc.color === 'gray' ? 'muted' : sc.color}`}>{sc.label}</span>
                    </div>
                    {showPromised && (
                      <div className="d-cell center" style={{ background: m.total ? rowBg : 'rgba(59, 130, 246, 0.05)', borderBottom: bb }}>
                        {m.dir === 'zero' ? (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                        ) : prom !== '' && prom != null ? (
                          <span className="score-pill" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                            {`${Number(prom) > 0 ? '+' : ''}${Number(prom)}%`}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* MTD */}
              <div className="d-cell center" style={{ borderLeft: B, borderBottom: bb, background: isHiring ? '#f5fff8' : 'rgba(240,253,244,0.3)' }}>
                <div className="mtd-cell">
                  <span className={`val-actual ${msc.color}`}>{mt.actual === null ? '—' : formatVal(mt.actual, m.unit, m.id)}</span>
                  {m.dir === 'zero' ? null : (
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>Plan: {mt.plan === null ? '—' : formatVal(mt.plan, m.unit, m.id)}</span>
                  )}
                  <span className={`score-pill ${msc.color === 'gray' ? 'muted' : msc.color}`}>{msc.label}</span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
