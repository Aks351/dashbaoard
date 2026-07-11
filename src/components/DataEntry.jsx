import React, { useContext } from 'react';
import { KpiContext } from '../store/kpiStore';
import { Cloud, FolderOpen } from 'lucide-react';
import DataEntryWeekSelector from './DataEntry/DataEntryWeekSelector';
import DataEntryDepartmentRow from './DataEntry/DataEntryDepartmentRow';
import DataEntryHiringGrid from './DataEntry/DataEntryHiringGrid';

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
    addHiringRole,
    removeHiringRole,
    connState
  } = useContext(KpiContext);

  const { weeks, departments } = model;
  const wk = weeks.find(w => w.id === activeWeek);
  const cloudOn = true; // Simulating backend connection

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

      <DataEntryWeekSelector 
        weeks={weeks}
        activeWeek={activeWeek}
        setActiveWeek={setActiveWeek}
        canEdit={canEdit}
        addWeek={addWeek}
        editWeek={editWeek}
        removeWeek={removeWeek}
      />

      {cloudOn && !canEdit && (
        <div style={{ padding: 16, background: '#fff', border: '1px dashed var(--border)', borderRadius: 12, marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text2)' }}>
          🔒 <span>You are in <b>view mode</b>. Click <b>Unlock Editing</b> (top right) to change values.</span>
        </div>
      )}

      {wk ? (
        departments.map(d => {
          let baseMetrics = d.metrics;
          let posMetrics = [];
          if (d.id === 'hiring') {
            // baseMetrics are now computed, so we don't show them in Data Entry anymore!
            baseMetrics = []; 
            posMetrics = d.metrics.filter(m => /·\s*Position:/i.test(m.sub || ''));
          }

          return (
            <div key={d.id} className="de-dept">
              <div className="de-dept-head">
                <span>{d.emoji} {d.name}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{wk.label} · {wk.range}</span>
              </div>
              
              <DataEntryDepartmentRow 
                department={d} 
                wk={wk} 
                canEdit={canEdit} 
                updateValue={updateValue} 
                baseMetrics={baseMetrics} 
              />
              
              {d.id === 'hiring' && (
                <DataEntryHiringGrid 
                  department={d}
                  wk={wk}
                  canEdit={canEdit}
                  updateValue={updateValue}
                  posMetrics={posMetrics}
                  addHiringRole={addHiringRole}
                  removeHiringRole={removeHiringRole}
                />
              )}
            </div>
          );
        })
      ) : (
        <div className="empty-state">
          No weeks available. Add a week to start entering data.
        </div>
      )}
    </div>
  );
}
