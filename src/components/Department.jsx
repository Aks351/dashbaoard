import React, { useContext, useState } from 'react';
import { KpiContext, SOLUTION_LINKS } from '../store/kpiStore';
import { ExternalLink } from 'lucide-react';
import DepartmentMetricsTable from './Department/DepartmentMetricsTable';
import DepartmentHiringMatrix from './Department/DepartmentHiringMatrix';

export default function Department({ department: d }) {
  const { model } = useContext(KpiContext);
  const { weeks } = model;
  
  const [hireMxWeek, setHireMxWeek] = useState(weeks.length ? weeks[weeks.length - 1].id : null);

  let baseMetrics = d.metrics;
  let posMetrics = [];
  let recruiterMetrics = [];
  
  if (d.id === 'hiring') {
    // Top table: strictly company overall metrics
    baseMetrics = d.metrics.filter(m => (m.sub || '').trim() === 'All positions');
    // Position metrics: specifically assigned to a position
    posMetrics = d.metrics.filter(m => /·\s*Position:/i.test(m.sub || ''));
    // Recruiter metrics: overall totals assigned to a recruiter, but not a position
    recruiterMetrics = d.metrics.filter(m => 
      (m.sub || '').includes('Recruiter:') && !/·\s*Position:/i.test(m.sub || '')
    );
  }

  const link = SOLUTION_LINKS[d.id];

  return (
    <div className="dept-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">{d.emoji} {d.name}</h1>
          <p className="page-subtitle">Week-by-week plan vs actual · live MTD roll-up</p>
        </div>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="solution-link">
            <ExternalLink size={16} /> Open Solution Report
          </a>
        )}
      </div>

      <DepartmentMetricsTable 
        department={d}
        weeks={weeks}
        baseMetrics={baseMetrics}
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
