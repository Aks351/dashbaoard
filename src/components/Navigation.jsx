import { useContext, useState } from 'react';
import { KpiContext, SOLUTION_LINKS } from '../store/kpiStore';
import { ExternalLink, Database, Activity, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navigation({ activeTab, setActiveTab }) {
  const { model, connState, unlockEditing, pullFromCloud } = useContext(KpiContext);
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

      <div className="nav-right">
        <div className="nav-period">KPI Review · {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</div>
        <button 
          className="btn-refresh" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', transition: 'all 0.2s' }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        <div className="nav-conn" onClick={unlockEditing} style={{ cursor: 'pointer' }} title="Click to unlock editing">
          <span className={`conn-indicator ${connState}`}></span>
          {connState === 'offline' ? 'Offline' : connState === 'online' ? 'Synced' : connState === 'syncing' ? 'Syncing...' : 'Sync Error'}
        </div>
      </div>
    </nav>
  );
}
