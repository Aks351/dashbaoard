import React from 'react';
import { calculateScore, RECRUITERS, STAGES, formatNum } from '../../store/kpiStore';

export default function DepartmentHiringMatrix({
  department: d,
  weeks,
  posMetrics,
  hireMxWeek,
  setHireMxWeek
}) {
  if (d.id !== 'hiring' || !posMetrics.length) return null;
  
  const curWk = weeks.find(w => w.id === hireMxWeek) || weeks[weeks.length - 1];
  
  return (
    <div className="mx-container" style={{ marginTop: 32 }}>
      <h3 style={{ fontSize: 14, color: 'var(--navy)', marginBottom: 12 }}>Position Breakdown by Recruiter — {curWk ? curWk.label : ''} (Actual / Plan · %)</h3>
      
      <div className="week-bar" style={{ marginBottom: 16 }}>
        {weeks.map(w => (
          <div 
            key={w.id} 
            className={`week-chip ${w.id === hireMxWeek ? 'active' : ''}`}
            onClick={() => setHireMxWeek(w.id)}
          >
            {w.label} · {w.range}
          </div>
        ))}
      </div>

      {RECRUITERS.map(rec => {
        const mine = posMetrics.filter(m => (m.sub || '').match(/Recruiter:\s*([^·]+)/i)?.[1].trim() === rec);
        let positions = [];
        mine.forEach(m => {
          const pMatch = (m.sub || '').match(/Position:\s*([^·]+)/i);
          if (pMatch && !positions.includes(pMatch[1].trim())) positions.push(pMatch[1].trim());
        });

        return (
          <div key={rec} className="mx-block">
            <div className="mx-rec-title">👤 {rec}</div>
            {!positions.length ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>No positions added yet for {rec}. Add them in Data Entry.</div>
            ) : (
              <div className="mx-scroll">
                <table className="mx-table">
                  <thead>
                    <tr>
                      <th>Stage \\ Position</th>
                      {positions.map(p => <th key={p}>{p}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {STAGES.map(st => (
                      <tr key={st[1]}>
                        <th>{st[0]}</th>
                        {positions.map(p => {
                          const m = mine.find(x => {
                            const pMatch = (x.sub || '').match(/Position:\s*([^·]+)/i);
                            const stMatch = (x.sub.split('·').pop() || '').trim();
                            return pMatch && pMatch[1].trim() === p && stMatch === st[1];
                          });
                          if (!m || !curWk) return <td key={p} className="muted">—</td>;
                          const pv = m.plan[curWk.id], av = m.actual[curWk.id], sc = calculateScore(pv, av, m.dir);
                          return (
                            <td key={p}>
                              <span className={`mx-act ${sc.color === 'gray' ? 'muted' : sc.color}`}>
                                {av === '' || av == null ? '—' : formatNum(av)}
                              </span>
                              <span className="mx-plan">/ {pv === '' || pv == null ? '—' : formatNum(pv)}</span>
                              <span className={`mx-pct ${sc.color === 'gray' ? 'muted' : sc.color}`}>
                                {sc.label}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
