import { useContext, useState } from 'react';
import { KpiContext } from '../store/kpiStore';
import { Database, Activity, RefreshCw } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab }) {
  const { 
    model, 
    connState, 
    unlockEditing, 
    pullFromCloud, 
    activePeriod 
  } = useContext(KpiContext);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
    ...model.departments.map(d => ({
      id: d.id,
      label: `${d.emoji} ${d.name}`,
    })),
    { id: 'data', label: 'Data Entry', icon: <Database size={16} /> }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await pullFromCloud();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <div className="nav-logo">Vinayak Enterprises</div>
      </div>

      <div className="nav-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon && <span className="tab-icon">{t.icon}</span>}
            {t.label}
          </button>
        ))}
      </div>

      <div className="nav-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '3px' }}>
        <div className="nav-period">KPI Review · {activePeriod || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn-refresh"
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', transition: 'all 0.2s' }}
          >
            <RefreshCw size={12} className={isRefreshing ? 'spin' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="nav-conn" onClick={unlockEditing} style={{ cursor: 'pointer' }} title="Click to unlock editing">
            <span className={`conn-indicator ${connState}`}></span>
            {connState === 'offline' ? 'Offline' : connState === 'online' ? 'Synced' : connState === 'syncing' ? 'Syncing...' : 'Sync Error'}
          </div>
        </div>
      </div>
    </nav>
  );
}
