import React, { useState } from 'react';
import { Plus, X, Edit2, Check } from 'lucide-react';
import { calculateNextWeekRange } from '../../utils/dateUtils';

export default function DataEntryWeekSelector({ 
  weeks, 
  activeWeek, 
  setActiveWeek, 
  canEdit, 
  addWeek, 
  editWeek, 
  removeWeek 
}) {
  const [editingId, setEditingId] = useState(null); // null, 'NEW', or week id
  const [editLabel, setEditLabel] = useState('');
  const [editRange, setEditRange] = useState('');

  const handleAddWeekInit = () => {
    if (!canEdit) {
      alert('You are in view mode. Click "Unlock Editing" first.');
      return;
    }
    const label = `Week ${weeks.length + 1}`;
    let range = '';
    if (weeks.length > 0) {
      range = calculateNextWeekRange(weeks[weeks.length - 1].range);
    }
    setEditLabel(label);
    setEditRange(range);
    setEditingId('NEW');
  };

  const handleEditWeekInit = (w) => {
    if (!canEdit) {
      alert('You are in view mode. Click "Unlock Editing" first.');
      return;
    }
    setEditLabel(w.label);
    setEditRange(w.range);
    setEditingId(w.id);
  };

  const handleSaveWeek = () => {
    if (!editLabel.trim() || !editRange.trim()) {
      alert("Both Label and Range are required.");
      return;
    }
    if (editingId === 'NEW') {
      addWeek(editLabel, editRange);
    } else {
      editWeek(editingId, editLabel, editRange);
    }
    setEditingId(null);
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
    if (window.confirm('Remove this week? Data will be deleted.')) {
      removeWeek(id);
    }
  };

  return (
    <div className="week-bar">
      {weeks.map(w => {
        if (editingId === w.id) {
          return (
            <div key={w.id} className="week-chip active" style={{ display: 'flex', gap: 6, padding: '6px 12px' }}>
              <input 
                type="text" 
                value={editLabel} 
                onChange={e => setEditLabel(e.target.value)} 
                className="de-input" 
                style={{ width: 80, padding: '4px 8px' }} 
                placeholder="Label" 
                autoFocus 
              />
              <input 
                type="text" 
                value={editRange} 
                onChange={e => setEditRange(e.target.value)} 
                className="de-input" 
                style={{ width: 120, padding: '4px 8px' }} 
                placeholder="Range (e.g. 15-21 Jun)" 
              />
              <span className="x" style={{ display: 'flex', alignItems: 'center', color: 'var(--green)', cursor: 'pointer' }} onClick={handleSaveWeek}>
                <Check size={16} />
              </span>
              <span className="x" style={{ display: 'flex', alignItems: 'center', color: 'var(--red)', cursor: 'pointer' }} onClick={() => setEditingId(null)}>
                <X size={16} />
              </span>
            </div>
          );
        }

        return (
          <div 
            key={w.id} 
            className={`week-chip ${w.id === activeWeek ? 'active' : ''}`}
            onClick={() => setActiveWeek(w.id)}
          >
            {w.label} · {w.range}
            <span className="x" style={{ display: 'flex', alignItems: 'center', marginLeft: 6 }} onClick={(e) => { e.stopPropagation(); handleEditWeekInit(w); }}>
              <Edit2 size={12} />
            </span>
            <span className="x" style={{ display: 'flex', alignItems: 'center', marginLeft: 4 }} onClick={(e) => { e.stopPropagation(); handleRemoveWeek(w.id); }}>
              <X size={14} />
            </span>
          </div>
        );
      })}

      {editingId === 'NEW' ? (
        <div className="week-chip active" style={{ display: 'flex', gap: 6, padding: '6px 12px' }}>
          <input 
            type="text" 
            value={editLabel} 
            onChange={e => setEditLabel(e.target.value)} 
            className="de-input" 
            style={{ width: 80, padding: '4px 8px' }} 
            placeholder="Label" 
            autoFocus 
          />
          <input 
            type="text" 
            value={editRange} 
            onChange={e => setEditRange(e.target.value)} 
            className="de-input" 
            style={{ width: 120, padding: '4px 8px' }} 
            placeholder="Range (e.g. 15-21 Jun)" 
          />
          <span className="x" style={{ display: 'flex', alignItems: 'center', color: 'var(--green)', cursor: 'pointer' }} onClick={handleSaveWeek}>
            <Check size={16} />
          </span>
          <span className="x" style={{ display: 'flex', alignItems: 'center', color: 'var(--red)', cursor: 'pointer' }} onClick={() => setEditingId(null)}>
            <X size={16} />
          </span>
        </div>
      ) : (
        <button className="btn-addweek" onClick={handleAddWeekInit}>
          <Plus size={14} /> Add Week
        </button>
      )}
    </div>
  );
}
