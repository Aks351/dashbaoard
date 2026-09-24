import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Edit2, Check, Lock } from 'lucide-react';
import { calculateNextWeekRange, parseWeekEndMonth, getWeekAnchorDate } from '../../utils/dateUtils';

export default function DataEntryWeekSelector({ 
  weeks, 
  activeWeek, 
  setActiveWeek, 
  canEdit, 
  addWeek, 
  editWeek, 
  removeWeek,
  isWeekFrozen,
}) {
  const [editingId, setEditingId] = useState(null); // null, 'NEW', or week id
  const [editLabel, setEditLabel] = useState('');
  const [editRange, setEditRange] = useState('');
  const activeChipRef = useRef(null);

  useEffect(() => {
    if (activeChipRef.current) {
      activeChipRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeWeek]);

  const handleAddWeekInit = () => {
    if (!canEdit) {
      alert('You are in view mode. Click "Unlock Editing" first.');
      return;
    }
    let label = `Week ${weeks.length + 1}`;
    let range = '';
    if (weeks.length > 0) {
      range = calculateNextWeekRange(weeks[weeks.length - 1].range);
      
      // Calculate the relative week number for the new month based on ISO anchor
      const dummyEnd = parseWeekEndMonth(range, new Date().getFullYear());
      if (dummyEnd) {
        const anchor = getWeekAnchorDate(dummyEnd);
        if (anchor) {
          const targetMonth = anchor.getMonth();
          const targetYear = anchor.getFullYear();
          let count = 0;
          weeks.forEach(w => {
            const wEnd = parseWeekEndMonth(w.range, new Date().getFullYear());
            const wAnchor = getWeekAnchorDate(wEnd);
            if (wAnchor && wAnchor.getMonth() === targetMonth && wAnchor.getFullYear() === targetYear) {
              count++;
            }
          });
          label = `Week ${count + 1}`;
        }
      }
    }
    setEditLabel(label);
    setEditRange(range);
    setEditingId('NEW');
  };

  const handleEditWeekInit = (w) => {
    if (isWeekFrozen?.(w.id)) {
      alert('This week is frozen. Please defreeze first to edit it.');
      return;
    }
    if (!canEdit) {
      alert('You are in view mode. Click "Unlock Editing" first.');
      return;
    }
    setEditLabel(w.label);
    setEditRange(w.range);
    setEditingId(w.id);
  };

  const handleSaveWeek = () => {
    if (!editLabel.trim()) return;
    if (editingId === 'NEW') {
      addWeek(editLabel, editRange);
    } else {
      editWeek(editingId, editLabel, editRange);
    }
    setEditingId(null);
  };

  const handleRemoveWeek = (id) => {
    if (isWeekFrozen?.(id)) {
      alert('This week is frozen. Please defreeze first to remove it.');
      return;
    }
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
        const isFrozen = isWeekFrozen?.(w.id);

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
            ref={w.id === activeWeek ? activeChipRef : null}
            className={`week-chip ${w.id === activeWeek ? 'active' : ''}`}
            onClick={() => setActiveWeek(w.id)}
            style={isFrozen ? {
              borderColor: '#0284c7',
              background: w.id === activeWeek ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#e0f2fe',
              color: w.id === activeWeek ? '#ffffff' : '#0369a1',
              fontWeight: 600,
              boxShadow: '0 1px 4px rgba(2, 132, 199, 0.2)',
            } : undefined}
            title={isFrozen ? '🔒 Data for this week is frozen (locked)' : undefined}
          >
            {isFrozen && (
              <Lock 
                size={12} 
                style={{ 
                  marginRight: 5, 
                  color: w.id === activeWeek ? '#ffffff' : '#0284c7', 
                  flexShrink: 0 
                }} 
              />
            )}
            {w.label} · {w.range}
            {!isFrozen && (
              <>
                <span className="x" style={{ display: 'flex', alignItems: 'center', marginLeft: 6 }} onClick={(e) => { e.stopPropagation(); handleEditWeekInit(w); }} title="Edit week">
                  <Edit2 size={12} />
                </span>
                <span className="x" style={{ display: 'flex', alignItems: 'center', marginLeft: 4 }} onClick={(e) => { e.stopPropagation(); handleRemoveWeek(w.id); }} title="Remove week">
                  <X size={14} />
                </span>
              </>
            )}
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
