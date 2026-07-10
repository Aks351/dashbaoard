import React, { useContext } from 'react';
import { KpiContext, mtd, calculateScore, formatNum } from '../store/kpiStore';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function Overview() {
  const { model } = useContext(KpiContext);
  const { weeks, departments, meta } = model;

  const renderHeroes = () => {
    return departments.map(d => {
      let worst = null, worstSc = null;
      d.metrics.forEach(m => {
        if (m.dir === 'zero') return;
        const mt = mtd(m, weeks);
        const sc = calculateScore(mt.plan, mt.actual, m.dir);
        if (sc.pct !== null && (worstSc === null || sc.pct < worstSc.pct)) {
          worst = m;
          worstSc = sc;
        }
      });
      if (!worst) {
        worst = d.metrics[0];
        worstSc = calculateScore(mtd(worst, weeks).plan, mtd(worst, weeks).actual, worst.dir);
      }
      
      const mt = mtd(worst, weeks);
      const isCrm = d.id === 'crm';
      const heroActColor = isCrm ? 'green' : (worstSc.color === 'green' ? 'good' : (worstSc.color === 'amber' ? 'warning' : 'danger'));
      const cls = worstSc.color === 'green' ? 'good' : (worstSc.color === 'amber' ? 'warning' : 'danger');
      
      const valActual = (mt.actual === null || mt.actual === '') ? '—' : formatNum(mt.actual) + (worst.unit ? ` ${worst.unit}` : '');
      const valPlan = (mt.plan === null || mt.plan === '') ? '—' : formatNum(mt.plan) + (worst.unit ? ` ${worst.unit}` : '');

      return (
        <div key={d.id} className={`hero-card ${cls}`}>
          <div className="hero-dept">{d.emoji} {d.name}</div>
          <div className="hero-label">{worst.name} MTD</div>
          <div className={`hero-val ${heroActColor}`}>{valActual}</div>
          <div className="hero-plan">Plan: {valPlan}</div>
          <div className={`hero-badge ${worstSc.color}`}>
            {worstSc.color === 'green' ? <TrendingUp size={12} style={{marginRight: 4}}/> : 
             worstSc.color === 'amber' ? <TrendingDown size={12} style={{marginRight: 4}}/> : 
             <AlertCircle size={12} style={{marginRight: 4}}/>}
            {worstSc.label}
          </div>
        </div>
      );
    });
  };

  const cols = `minmax(250px, 2.1fr) ` + weeks.map(() => `minmax(70px, 0.7fr) minmax(80px, 0.8fr)`).join(' ') + ` minmax(70px, 0.7fr) minmax(80px, 0.8fr) minmax(80px, 0.8fr)`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overview-page"
    >
      <div className="page-head">
        <div>
          <h1 className="page-title">Monthly KPI Overview</h1>
          <p className="page-subtitle">All departments · {weeks.length} week{weeks.length !== 1 ? 's' : ''} · plan vs actual with live MTD roll-up</p>
        </div>
      </div>

      <div className="hero-grid">
        {renderHeroes()}
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
              </React.Fragment>
            ))}
            <div className="t-cell head center" style={{ borderLeft: '1px solid var(--border)', background: 'rgba(220, 252, 231, 0.4)' }}>MTD Plan</div>
            <div className="t-cell head center" style={{ background: 'rgba(220, 252, 231, 0.4)' }}>MTD Act</div>
            <div className="t-cell head center" style={{ background: 'rgba(220, 252, 231, 0.4)' }}>Score</div>
          </div>

          {/* Rows */}
          {departments.map(d => {
            const isCrm = d.id === 'crm';
            return (
              <React.Fragment key={d.id}>
                <div className="table-row dept-sep" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="dept-sep-label">{d.emoji} {d.name.toUpperCase()}</div>
                </div>
                {d.metrics.map(m => {
                  const mt = mtd(m, weeks);
                  const msc = calculateScore(mt.plan, mt.actual, m.dir);
                  const mtActColor = isCrm ? 'green' : msc.color;
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
                        const actColor = isCrm ? 'green' : sc.color;
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
                        <span className={`val-actual ${mtActColor}`}>{mt.actual === null ? '—' : formatNum(mt.actual)}</span>
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
    </motion.div>
  );
}
