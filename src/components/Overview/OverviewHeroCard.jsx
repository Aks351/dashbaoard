import React from 'react';
import { mtd, calculateScore, formatNum } from '../../store/kpiStore';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function OverviewHeroCard({ department: d, weeks }) {
  let worst = null, worstSc = null;
  const validMetrics = d.metrics.filter(m => d.id !== 'hiring' || !/·\s*Position:/i.test(m.sub || ''));
  
  validMetrics.forEach(m => {
    if (m.dir === 'zero') return;
    const mt = mtd(m, weeks);
    const sc = calculateScore(mt.plan, mt.actual, m.dir);
    if (sc.pct !== null && sc.pct !== undefined && (worstSc === null || sc.pct < worstSc.pct)) {
      worst = m;
      worstSc = sc;
    }
  });
  if (!worst) {
    worst = validMetrics[0];
    worstSc = calculateScore(mtd(worst, weeks).plan, mtd(worst, weeks).actual, worst.dir);
  }
  
  const mt = mtd(worst, weeks);
  const cls = worstSc.color === 'green' ? 'good' : (worstSc.color === 'amber' ? 'warning' : 'danger');
  const heroActColor = (d.id === 'crm' && (worst.id.includes('dispatch') || worst.id.includes('payment'))) ? 'green' : cls;
  
  const valActual = (mt.actual === null || mt.actual === '') ? '—' : formatNum(mt.actual) + (worst.unit ? ` ${worst.unit}` : '');
  const valPlan = (mt.plan === null || mt.plan === '') ? '—' : formatNum(mt.plan) + (worst.unit ? ` ${worst.unit}` : '');

  return (
    <div className={`hero-card ${cls}`}>
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
}
