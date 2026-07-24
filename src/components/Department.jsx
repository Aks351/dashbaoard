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
       const nameB = b.id.split('_')[1];
       if (nameA !== nameB) return nameA.localeCompare(nameB);
       return (recOrder[stageA] ?? 99) - (recOrder[stageB] ?? 99);
    });
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
