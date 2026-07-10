import React, { useContext } from 'react';
import { KpiContext } from '../store/kpiStore';
import { motion } from 'framer-motion';
import OverviewHeroCard from './Overview/OverviewHeroCard';
import OverviewMetricTable from './Overview/OverviewMetricTable';

export default function Overview() {
  const { model } = useContext(KpiContext);
  const { weeks, departments } = model;

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
        {departments.map(d => (
          <OverviewHeroCard key={d.id} department={d} weeks={weeks} />
        ))}
      </div>

      <OverviewMetricTable departments={departments} weeks={weeks} />

    </motion.div>
  );
}
