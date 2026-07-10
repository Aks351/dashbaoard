import { useContext } from 'react';
import { KpiContext, SOLUTION_LINKS } from '../store/kpiStore';
import { ExternalLink, Database, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navigation({ activeTab, setActiveTab }) {
  const { model, connState, unlockEditing } = useContext(KpiContext);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
    ...model.departments.map(d => ({
      id: d.id,
      label: `${d.emoji} ${d.name}`,
    })),
    { id: 'data', label: 'Data Entry', icon: <Database size={16} /> }
  ];

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
        <div className="nav-period">KPI Review · {model.meta.period}</div>
        <div className="nav-conn" onClick={unlockEditing}>
          <span className={`conn-indicator ${connState}`}></span>
          {connState === 'offline' ? 'Offline' : connState === 'online' ? 'Synced' : connState === 'syncing' ? 'Syncing...' : 'Sync Error'}
        </div>
      </div>
    </nav>
  );
}
