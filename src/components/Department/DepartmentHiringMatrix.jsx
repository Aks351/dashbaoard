import React from 'react';
import { calculateScore, RECRUITERS, STAGES, formatNum } from '../../store/kpiStore';
import DepartmentMetricsTable from './DepartmentMetricsTable';

export default function DepartmentHiringMatrix({
  department: d,
  weeks,
  posMetrics,
  recruiterMetrics,
  hireMxWeek,
  setHireMxWeek
}) {
  if (d.id !== 'hiring' || !posMetrics.length) return null;

  const curId = hireMxWeek || (weeks.length ? weeks[weeks.length - 1].id : null);
  const curWk = weeks.find(w => w.id === curId);

  return (
    <div className="mx-container">
      <div className="section-label" style={{ marginTop: 32, marginBottom: 16, fontSize: 14, color: '#0f172a' }}>
        Recruiter Performance Dashboards
      </div>

      <div className="week-toggle" style={{ marginTop: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginRight: 12, alignSelf: 'center' }}>Breakdown Week:</span>
        {weeks.map(w => (
          <div
            key={w.id}
            className={`wtab ${w.id === curId ? 'active' : ''}`}
            onClick={() => setHireMxWeek(w.id)}
          >
            {w.label} · {w.range}
          </div>
        ))}
      </div>

      {RECRUITERS.map(rec => {
        const recTotals = recruiterMetrics.filter(m => (m.sub || '').trim() === `Recruiter: ${rec}`);
        const mine = posMetrics.filter(m => (m.sub || '').match(/Recruiter:\s*([^·]+)/i)?.[1].trim() === rec);

        let positions = [];
        mine.forEach(m => {
          const pMatch = (m.sub || '').match(/Position:\s*([^·]+)/i);
          if (pMatch && !positions.includes(pMatch[1].trim())) positions.push(pMatch[1].trim());
        });

        return (
          <div key={rec} className="mx-block" style={{ marginBottom: 40, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div className="mx-rec-title" style={{ fontSize: 16, marginBottom: 16 }}>👤 {rec} — Overall Totals</div>

            {recTotals.length > 0 ? (
              <div style={{ marginBottom: 24 }}>
                <DepartmentMetricsTable
                  department={d}
                  weeks={weeks}
                  baseMetrics={recTotals}
                />
              </div>
            ) : (
              <div className="mx-empty" style={{ marginBottom: 24 }}>No overall metrics tracked for {rec}.</div>
            )}

            <div className="section-label" style={{ marginTop: 18 }}>{rec}'s Position Breakdown — {curWk ? curWk.label : ''}</div>

            {!positions.length ? (
              <div className="mx-empty">No positions added yet for {rec}. Add them in the Data Entry tab.</div>
            ) : (
              <div className="mx-scroll">
                <table className="mx-table">
                  <thead>
                    <tr>
                      <th>Stage \ Position</th>
                      <th style={{ borderRight: '2px solid var(--border)' }}>Total (This Wk)</th>
                      {positions.map(p => <th key={p}>{p}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {STAGES.map(st => {
                      // Calculate the total for this specific week across all positions in this grid
                      let totalPlan = 0, totalAct = 0, hasPlan = false, hasAct = false;

                      const stageCells = positions.map(p => {
                        const m = mine.find(x => {
                          const pMatch = (x.sub || '').match(/Position:\s*([^·]+)/i);
                          const stMatch = (x.sub.split('·').pop() || '').trim();
                          return pMatch && pMatch[1].trim() === p && stMatch === st[1];
                        });

                        if (!m || !curWk) return { p, el: <td key={p}><span className="mx-act muted">—</span></td> };

                        const pv = m.plan[curId];
                        const av = m.actual[curId];

                        if (pv !== '' && pv != null && !isNaN(pv)) { totalPlan += Number(pv); hasPlan = true; }
                        if (av !== '' && av != null && !isNaN(av)) { totalAct += Number(av); hasAct = true; }

                        const sc = calculateScore(pv, av, m.dir);
                        return {
                          p,
                          el: (
                            <td key={p}>
                              <span className={`mx-act ${sc.color}`}>{av === '' || av == null ? '—' : av}</span>
                              <span className="mx-plan">/ {pv === '' || pv == null ? '—' : pv}</span>
                              <span className={`mx-pct ${sc.color}`}>{sc.label}</span>
                            </td>
                          )
                        };
                      });

                      const totalSc = calculateScore(hasPlan ? totalPlan : null, hasAct ? totalAct : null, 'higher');

                      return (
                        <tr key={st[1]}>
                          <th>{st[0]}</th>
                          <td style={{ background: 'rgba(241,245,249,0.5)', borderRight: '2px solid var(--border)' }}>
                            <span className={`mx-act ${totalSc.color}`}>{!hasAct ? '—' : totalAct}</span>
                            <span className="mx-plan">/ {!hasPlan ? '—' : totalPlan}</span>
                            <span className={`mx-pct ${totalSc.color}`}>{totalSc.label}</span>
                          </td>
                          {stageCells.map(c => c.el)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <div className="legend-bar">
        <span style={{ fontWeight: 600, color: 'var(--text2)' }}>Score:</span>
        <span>🟢 on/above target</span>
        <span>🟡 within 10%</span>
        <span>🔴 behind</span>
        <span style={{ color: '#3b82f6' }}>🔵 promised score by employee</span>
      </div>
    </div>
  );
}
