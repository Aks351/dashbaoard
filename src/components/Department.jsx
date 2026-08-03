import React, { useContext, useState } from 'react';
import { KpiContext, SOLUTION_LINKS } from '../store/kpiStore';
import { ExternalLink, Calendar } from 'lucide-react';
import DepartmentMetricsTable from './Department/DepartmentMetricsTable';
import DepartmentHiringMatrix from './Department/DepartmentHiringMatrix';
import { getAvailableMonths } from '../utils/dateUtils';

export default function Department({ department: d }) {
  const { model, selectedPeriod, setSelectedPeriod, activePeriod } = useContext(KpiContext);
  const { weeks, meta } = model;
  const defaultPeriod = meta?.period || '';

  const availableMonths = getAvailableMonths(weeks, defaultPeriod);

  const [hireMxWeek, setHireMxWeek] = useState(weeks.length ? weeks[weeks.length - 1].id : null);

  let baseMetrics = d.metrics;
  let posMetrics = [];
  let recruiterMetrics = [];

  if (d.id === 'hiring') {
    // Top table: strictly company overall metrics (using strict IDs instead of text matching)
    const topIds = ['apps', 'rono', 'final', 'offer'];
    baseMetrics = d.metrics.filter(m => topIds.includes(m.id)).sort((a, b) => topIds.indexOf(a.id) - topIds.indexOf(b.id));

    // Position metrics: specifically assigned to a position
    posMetrics = d.metrics.filter(m => m.id.startsWith('pos_'));

    // Recruiter metrics: overall totals assigned to a recruiter, but not a position
    const recOrder = { 'apps': 0, 'rono': 1, 'final': 2, 'offer': 3 };
    recruiterMetrics = d.metrics.filter(m => m.id.startsWith('rec_')).sort((a, b) => {
      const stageA = a.id.split('_').pop();
      const stageB = b.id.split('_').pop();
      // First sort by recruiter name alphabetically, then by stage order
      const nameA = a.id.split('_')[1];
      const nameB = a.id.split('_')[1];
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return (recOrder[stageA] ?? 99) - (recOrder[stageB] ?? 99);
    });
  }

  const link = SOLUTION_LINKS[d.id];

  return (
    <div className="dept-page">
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 className="page-title" style={{ margin: 0 }}>{d.emoji} {d.name}</h1>
            {d.id === 'production' && (
              <a
                href="https://production-weekly-report-dashboard.vercel.app/"
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#3b82f6',
                  color: '#ffffff',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <ExternalLink size={14} />
                Production Hours Dashboard
              </a>
            )}
          </div>
          <p className="page-subtitle" style={{ marginTop: '4px' }}>Week-by-week plan vs actual · live MTD roll-up</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="solution-link">
              <ExternalLink size={16} /> Open Solution Report
            </a>
          )}
          {availableMonths.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} style={{ color: 'var(--muted)' }} />
              <select
                value={activePeriod}
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
      </div>

      <DepartmentMetricsTable
        department={d}
        weeks={weeks}
        baseMetrics={baseMetrics}
        period={activePeriod}
      />

      <DepartmentHiringMatrix
        department={d}
        weeks={weeks}
        posMetrics={posMetrics}
        recruiterMetrics={recruiterMetrics}
        hireMxWeek={hireMxWeek}
        setHireMxWeek={setHireMxWeek}
      />

    </div>
  );
}
