import React, { useContext } from 'react';
import { KpiContext } from '../store/kpiStore';
import { motion } from 'framer-motion';
import OverviewHeroCard from './Overview/OverviewHeroCard';
import OverviewMetricTable from './Overview/OverviewMetricTable';
import { getAvailableMonths } from '../utils/dateUtils';
import { Calendar } from 'lucide-react';

export default function Overview() {
  const { model, selectedPeriod, setSelectedPeriod } = useContext(KpiContext);
  const { weeks, departments, meta } = model;
  const defaultPeriod = meta?.period || '';

  const availableMonths = getAvailableMonths(weeks, defaultPeriod);
  const period = selectedPeriod || defaultPeriod || (availableMonths.length ? availableMonths[availableMonths.length - 1] : '');
  
  // Local fallback for select input in case it's not set globally yet
  const displayPeriod = selectedPeriod || period;

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
        {availableMonths.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} style={{ color: 'var(--muted)' }} />
            <select
              value={displayPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="hero-grid">
        {departments.map(d => (
          <OverviewHeroCard key={d.id} department={d} weeks={weeks} period={period} />
        ))}
      </div>

      <OverviewMetricTable departments={departments} weeks={weeks} period={period} />

    </motion.div>
  );
}
