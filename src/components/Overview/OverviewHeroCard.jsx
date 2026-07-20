import React from 'react';
import { mtd, calculateScore, formatNum, formatVal } from '../../store/kpiStore';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { weeksInMonth } from '../../utils/dateUtils';

export default function OverviewHeroCard({ department: d, weeks }) {
  const mw = weeksInMonth(weeks); // current-month weeks only
  let worst = null, worstSc = null;
  const validMetrics = d.metrics.filter(m => d.id !== 'hiring' || !/·\s*Position:/i.test(m.sub || ''));
  
  validMetrics.forEach(m => {
    if (m.dir === 'zero') return;
    const mt = mtd(m, mw);
    const sc = calculateScore(mt.plan, mt.actual, m.dir);
    if (sc.pct !== null && sc.pct !== undefined && (worstSc === null || sc.pct < worstSc.pct)) {
      worst = m;
      worstSc = sc;
    }
  });
  if (!worst) {
    if (!validMetrics.length) return null;
    worst = validMetrics[0];
    worstSc = calculateScore(mtd(worst, mw).plan, mtd(worst, mw).actual, worst.dir);
    if (!worstSc) return null;
  }
  
  const mt = mtd(worst, mw);
  const cls = worstSc.color === 'green' ? 'good' : (worstSc.color === 'amber' ? 'warning' : 'danger');
  
  const valActual = (mt.actual === null || mt.actual === '') ? '—' : formatVal(mt.actual, worst.unit, worst.id) + (worst.unit ? ` ${worst.unit}` : '');
  const valPlan = (mt.plan === null || mt.plan === '') ? '—' : formatVal(mt.plan, worst.unit, worst.id) + (worst.unit ? ` ${worst.unit}` : '');

  return (
    <div className={`hero-card ${cls}`}>
      <div className="hero-dept">{d.emoji} {d.name}</div>
      <div className="hero-label">{worst.name} MTD</div>
      <div className={`hero-val ${cls}`}>{valActual}</div>
      <div className="hero-plan">Plan: {valPlan}</div>
      <div className={`hero-badge ${worstSc.color}`}>
        {worstSc.color === 'green' ? <TrendingUp size={12} style={{marginRight: 4}}/> : 
         worstSc.color === 'amber' ? <TrendingDown size={12} style={{marginRight: 4}}/> : 
         <AlertCircle size={12} style={{marginRight: 4}}/>}
        {worstSc.label}
      </div>
    </div>
  );
}
