import { useContext, useState } from 'react';
import { KpiContext } from '../store/kpiStore';
import { Database, Activity, RefreshCw, Download } from 'lucide-react';
import DownloadReportModal from './DownloadReportModal';

export default function Navigation({ activeTab, setActiveTab }) {
  const { 
    model, 
    connState, 
    unlockEditing, 
    pullFromCloud, 
    activePeriod 
  } = useContext(KpiContext);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

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

  const currentSectionForExport = activeTab === 'data' ? 'overview' : activeTab;

  return (
    <>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn-download-pdf"
              onClick={() => setShowDownloadModal(true)}
              title="Download Monthly Report PDF"
              style={{
                background: 'rgba(2, 132, 199, 0.22)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                padding: '2px 9px',
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: '#e0f2fe',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              <Download size={12} />
              <span>Download PDF</span>
            </button>
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
      {showDownloadModal && (
        <DownloadReportModal
          onClose={() => setShowDownloadModal(false)}
          defaultSectionId={currentSectionForExport}
          defaultPeriod={activePeriod}
        />
      )}
    </>
  );
}
