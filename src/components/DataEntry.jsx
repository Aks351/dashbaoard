import React, { useContext, useState } from 'react';
import { KpiContext, calculateScore, RECRUITERS, STAGES, formatNum } from '../store/kpiStore';
import { X, Plus, Cloud, FolderOpen, Printer, Download, Upload, RotateCcw, Edit2 } from 'lucide-react';

function calculateNextWeekRange(lastRangeStr, year = new Date().getFullYear()) {
  if (!lastRangeStr) return '';
  const match = lastRangeStr.match(/(\d+)\s*([a-zA-Z]+)?$/);
  if (!match) return '';
  let day = parseInt(match[1], 10);
  let monthStr = match[2];
  if (!monthStr) {
    const m = lastRangeStr.match(/([a-zA-Z]+)/);
    if (m) monthStr = m[1];
    else return '';
  }
  const d = new Date(`${day} ${monthStr} ${year}`);
  if (isNaN(d.getTime())) return '';
  const nextStart = new Date(d);
  nextStart.setDate(nextStart.getDate() + 1);
  const nextEnd = new Date(d);
  nextEnd.setDate(nextEnd.getDate() + 7);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startM = months[nextStart.getMonth()];
  const endM = months[nextEnd.getMonth()];
  if (startM === endM) {
    return `${nextStart.getDate()}–${nextEnd.getDate()} ${startM}`;
  } else {
    return `${nextStart.getDate()} ${startM}–${nextEnd.getDate()} ${endM}`;
  }
}

export default function DataEntry() {
  const { 
    model, 
    activeWeek, 
    setActiveWeek, 
    updateValue, 
    canEdit, 
    unlockEditing,
    addWeek,
    editWeek,
    removeWeek,
    resetData,
    addHiringRole,
    connState
  } = useContext(KpiContext);

  const { weeks, departments } = model;
  const wk = weeks.find(w => w.id === activeWeek);
  const cloudOn = true; // Simulating backend connection

  const handleAddWeek = () => {
    if (!canEdit) {
      alert('You are in view mode. Click "Unlock Editing" first.');
      return;
    }
    const label = `Week ${weeks.length + 1}`;
    let range = '';
    if (weeks.length > 0) {
      range = calculateNextWeekRange(weeks[weeks.length - 1].range);
    }
    // If we couldn't parse the range automatically, prompt the user
    if (!range) {
      range = prompt('Date range (e.g. 15–21 Jun):', '');
      if (!range) return;
    }
    addWeek(label, range);
  };

  const handleEditWeek = (w) => {
    if (!canEdit) {
      alert('You are in view mode. Click "Unlock Editing" first.');
      return;
    }
    const newLabel = prompt('Edit week label:', w.label);
    if (newLabel === null) return;
    const newRange = prompt('Edit date range:', w.range);
    if (newRange === null) return;
    editWeek(w.id, newLabel, newRange);
  };

  const handleRemoveWeek = (id) => {
    if (!canEdit) {
      alert('You are in view mode. Click "Unlock Editing" first.');
      return;
    }
    if (weeks.length <= 1) {
      alert('At least one week is required.');
      return;
    }
    if (confirm('Remove this week? Data will be deleted.')) {
      removeWeek(id);
    }
  };

  const handleImport = () => {
    // Basic import logic (requires more state handling if full implementation needed)
    alert('Import functionality requires file picker implementation.');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `vinayak_kpi_${model.meta.period.replace(/\s+/g, '_')}.json`;
    a.click(); 
    URL.revokeObjectURL(url);
  };

  return (
    <div className="data-entry-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">⚙️ Data Entry</h1>
          <p className="page-subtitle">Add a week, then type Plan & Actual for each metric. Everything updates automatically.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="nav-conn" style={{ background: 'rgba(255,255,255,0.8)', padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)' }}>
            <span className={`conn-indicator ${connState}`}></span>
            <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{connState === 'online' ? 'Cloud Sync On' : 'Offline Mode'}</span>
          </div>
          {cloudOn && !canEdit && (
            <button className="btn-primary" style={{ padding: '8px 16px' }} onClick={unlockEditing}>
              🔓 Unlock Editing
            </button>
          )}
        </div>
      </div>

      <div className="de-intro">
        <div className="de-intro-icon">{cloudOn ? <Cloud size={24} color="var(--primary)" /> : <FolderOpen size={24} color="var(--primary)" />}</div>
        <div>
          <h3>How it works</h3>
          <p>
            {cloudOn 
              ? <span>Pick a week below (or add a new one) and enter Plan & Actual. Changes sync to the shared Google Sheet so <b>everyone sees the same data</b>. You must <b>Unlock Editing</b> with the team passphrase to make changes.</span>
              : <span>Pick a week below (or add a new one). Enter planned and actual values — everything saves to this browser automatically. Use <b>Export</b> to back up or move data to another computer.</span>
            }
          </p>
        </div>
      </div>

      <div className="week-bar">
        {weeks.map(w => (
          <div 
            key={w.id} 
            className={`week-chip ${w.id === activeWeek ? 'active' : ''}`}
            onClick={() => setActiveWeek(w.id)}
          >
            {w.label} · {w.range}
            <span className="x" style={{ display: 'flex', alignItems: 'center', marginLeft: 6 }} onClick={(e) => { e.stopPropagation(); handleEditWeek(w); }}>
              <Edit2 size={12} />
            </span>
            <span className="x" style={{ display: 'flex', alignItems: 'center', marginLeft: 4 }} onClick={(e) => { e.stopPropagation(); handleRemoveWeek(w.id); }}>
              <X size={14} />
            </span>
          </div>
        ))}
        <button className="btn-addweek" onClick={handleAddWeek}>
          <Plus size={14} /> Add Week
        </button>
      </div>

      {cloudOn && !canEdit && (
        <div style={{ padding: 16, background: '#fff', border: '1px dashed var(--border)', borderRadius: 12, marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text2)' }}>
          🔒 <span>You are in <b>view mode</b>. Click <b>Unlock Editing</b> (top right) to change values.</span>
        </div>
      )}

      {wk ? (
        departments.map(d => {
          const isCrm = d.id === 'crm';
          const showPromised = ['purchase', 'production'].includes(d.id);
          const gridCols = isCrm ? '2fr 1fr 1fr 1fr 0.8fr 1fr' : (showPromised ? '2fr 1fr 1fr 1fr 1fr' : '2fr 1fr 1fr 1fr');

          let baseMetrics = d.metrics;
          let posMetrics = [];
          if (d.id === 'hiring') {
            baseMetrics = d.metrics.filter(m => !/·\s*Position:/i.test(m.sub || ''));
            posMetrics = d.metrics.filter(m => /·\s*Position:/i.test(m.sub || ''));
          }

          return (
            <div key={d.id} className="de-dept">
              <div className="de-dept-head">
                <span>{d.emoji} {d.name}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{wk.label} · {wk.range}</span>
              </div>

              <div className="table-row head-row" style={{ gridTemplateColumns: gridCols }}>
                <div className="t-cell head">Metric</div>
                <div className="t-cell head center">Plan</div>
                {showPromised && <div className="t-cell head center" style={{ color: '#3b82f6' }}>Promised Score %</div>}
                <div className="t-cell head center">Actual</div>
                {isCrm && (
                  <>
                    <div className="t-cell head center" style={{ color: '#2563eb' }}>On-Time</div>
                    <div className="t-cell head center" style={{ color: 'var(--red)' }}>Pending</div>
                  </>
                )}
                <div className="t-cell head center">Score</div>
              </div>

              {baseMetrics.map(m => {
                const p = m.plan[wk.id] ?? '';
                const a = m.actual[wk.id] ?? '';
                const pr = (m.promised && m.promised[wk.id]) ?? '';
                const sc = calculateScore(p, a, m.dir);
                
                let crmCells = null;
                if (isCrm) {
                  const ot = m.ontime ? (m.ontime[wk.id] ?? '') : '';
                  const pend = (p !== '' && p != null && a !== '' && a != null) ? Math.max(0, p - a) : '—';
                  crmCells = (
                    <>
                      <div className="t-cell">
                        <input className={`de-input ${ot !== '' ? 'filled' : ''}`} type="number" step="any" value={ot} placeholder="on-time" 
                          disabled={!canEdit}
                          style={{ color: '#2563eb' }}
                          onChange={e => updateValue(d.id, m.id, 'ontime', wk.id, e.target.value)} />
                      </div>
                      <div className="t-cell center">
                        <span className="score-pill red">{formatNum(pend)}</span>
                      </div>
                    </>
                  );
                }

                return (
                  <div key={m.id} className="table-row" style={{ gridTemplateColumns: gridCols }}>
                    <div className="t-cell">
                      <div>
                        <div className="metric-name">{m.name}</div>
                        <div className="metric-sub">{m.unit || 'count'} · {m.dir === 'lower' ? 'lower better' : (m.dir === 'zero' ? 'target 0' : 'higher better')}</div>
                      </div>
                    </div>
                    <div className="t-cell">
                      <input className={`de-input ${p !== '' ? 'filled' : ''}`} type="number" step="any" value={p} placeholder="plan" 
                        disabled={!canEdit}
                        onChange={e => updateValue(d.id, m.id, 'plan', wk.id, e.target.value)} />
                    </div>
                    {showPromised && (
                      <div className="t-cell">
                        <input className={`de-input ${pr !== '' ? 'filled' : ''}`} type="number" step="any" value={pr} placeholder="e.g. 85" 
                          disabled={!canEdit}
                          style={{ borderColor: '#93c5fd', background: pr !== '' ? '#eff6ff' : '#f8fafc' }}
                          onChange={e => updateValue(d.id, m.id, 'promised', wk.id, e.target.value)} />
                      </div>
                    )}
                    <div className="t-cell">
                      <input className={`de-input ${a !== '' ? 'filled' : ''}`} type="number" step="any" value={a} placeholder="actual" 
                        disabled={!canEdit}
                        style={isCrm ? { color: 'var(--green)', fontWeight: 700 } : {}}
                        onChange={e => updateValue(d.id, m.id, 'actual', wk.id, e.target.value)} />
                    </div>
                    {crmCells}
                    <div className="t-cell center">
                      <span className={`score-pill ${sc.color}`}>{sc.label}</span>
                    </div>
                  </div>
                );
              })}
              {d.id === 'hiring' && (
                <div className="rec-wrap">
                  <div className="section-label" style={{ marginTop: 4, marginBottom: 12 }}>Recruiter-wise Breakdown — by Position</div>
                  <div className="rec-split">
                    {RECRUITERS.map(rec => {
                      const mine = posMetrics.filter(m => (m.sub || '').match(/Recruiter:\s*([^·]+)/i)?.[1].trim() === rec);
                      let positions = [];
                      let byPos = {};
                      mine.forEach(m => {
                        const pMatch = (m.sub || '').match(/Position:\s*([^·]+)/i);
                        const pos = pMatch ? pMatch[1].trim() : '';
                        if (!byPos[pos]) { byPos[pos] = []; positions.push(pos); }
                        byPos[pos].push(m);
                      });

                      return (
                        <div key={rec} className="rec-table">
                          <div className="rec-head">
                            👤 {rec}
                            <span className="sub">{wk.label} · {wk.range}</span>
                          </div>
                          {!positions.length ? (
                            <div className="pos-empty">No positions yet. Click "＋ Add Position" below.</div>
                          ) : (
                            positions.map(pos => {
                              const order = { 'Applications': 0, 'Final Rounds': 1, 'Offer Given To': 2, 'Onboarded': 3 };
                              byPos[pos].sort((a, b) => {
                                const aStage = (a.sub.split('·').pop() || '').trim();
                                const bStage = (b.sub.split('·').pop() || '').trim();
                                return (order[aStage] ?? 99) - (order[bStage] ?? 99);
                              });
                              
                              return (
                                <div key={pos} className="pos-group">
                                  <div className="pos-title">
                                    <span>📌 {pos}</span>
                                    <span 
                                      className="rm" 
                                      title="Remove position" 
                                      onClick={() => {
                                        if (!canEdit) { alert('Unlock editing first.'); return; }
                                        removeHiringRole(rec, pos);
                                      }}
                                    >✕</span>
                                  </div>
                                  <div className="de-row head" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                                    <div className="de-cell head">Stage</div>
                                    <div className="de-cell head" style={{ textAlign: 'center' }}>Plan</div>
                                    <div className="de-cell head" style={{ textAlign: 'center' }}>Actual</div>
                                    <div className="de-cell head" style={{ textAlign: 'center' }}>Score</div>
                                  </div>
                                  {byPos[pos].map(m => {
                                    const p = m.plan[wk.id] ?? '';
                                    const a = m.actual[wk.id] ?? '';
                                    const sc = calculateScore(p, a, m.dir);
                                    const stage = (m.sub.split('·').pop() || '').trim();
                                    return (
                                      <div key={m.id} className="de-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                                        <div className="de-cell"><div className="de-metric-name">{stage}</div></div>
                                        <div className="de-cell">
                                          <input className={`de-input ${p !== '' ? 'filled' : ''}`} type="number" step="any" value={p} placeholder="plan" 
                                            disabled={!canEdit}
                                            onChange={e => updateValue(d.id, m.id, 'plan', wk.id, e.target.value)} />
                                        </div>
                                        <div className="de-cell">
                                          <input className={`de-input ${a !== '' ? 'filled' : ''}`} type="number" step="any" value={a} placeholder="actual" 
                                            disabled={!canEdit}
                                            onChange={e => updateValue(d.id, m.id, 'actual', wk.id, e.target.value)} />
                                        </div>
                                        <div className="de-cell de-score" id={`sc-hiring-${m.id}`}>
                                          <span className={`score-pill ${sc.color}`}>{sc.label}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })
                          )}
                          <button 
                            className="add-pos" 
                            onClick={() => {
                              if (!canEdit) { alert('Unlock editing first.'); return; }
                              const role = prompt(`Enter Position Name for ${rec}:`);
                              if (!role) return;
                              addHiringRole(rec, role);
                            }}
                          >
                            ＋ Add Position
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', borderRadius: 16 }}>
          No weeks available. Click "Add Week" to start.
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button className="btn-addweek" style={{ borderColor: 'var(--red)', color: 'var(--red)' }} onClick={resetData}>
          <RotateCcw size={16} /> Reset to Original
        </button>
        <button className="btn-addweek" style={{ borderColor: 'var(--text2)', color: 'var(--text2)' }} onClick={handleImport}>
          <Upload size={16} /> Import
        </button>
        <button className="btn-addweek" style={{ borderColor: 'var(--text2)', color: 'var(--text2)' }} onClick={handleExport}>
          <Download size={16} /> Export Backup
        </button>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => window.print()}>
          <Printer size={16} /> Print / PDF
        </button>
      </div>

    </div>
  );
}
