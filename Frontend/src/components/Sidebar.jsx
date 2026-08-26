import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Milestone, 
  Cpu, 
  ListOrdered, 
  FileText, 
  History, 
  ShieldAlert,
  Database,
  Navigation,
  Scan,
  TrendingDown,
  RefreshCw,
  CheckCircle2,
  X
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, onReseed, isMobileOpen, onClose }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedSuccess, setSyncedSuccess] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Network Dashboard', icon: LayoutDashboard },
    { id: 'map', label: 'GIS Hazard Map', icon: Navigation, badge: 'GIS' },
    { id: 'vision', label: 'Vision Damage Scanner', icon: Scan, badge: 'CV' },
    { id: 'predictor', label: 'AI Risk Predictor & Assessment', icon: Cpu, badge: 'ML' },
    { id: 'prioritization', label: 'Priority Matrix & Budget Optimizer', icon: ListOrdered, badge: 'PRIO' },
    { id: 'lifecycle', label: 'Pavement Lifecycle & ROI', icon: TrendingDown, badge: 'ROI' },
    { id: 'roads', label: 'Road Network Database', icon: Milestone },
    { id: 'reports', label: 'Civil Audit Reports', icon: FileText },
    { id: 'history', label: 'Assessment Audit Log', icon: History },
  ];

  const handleSyncClick = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      if (onReseed) {
        await onReseed();
      }
      setSyncedSuccess(true);
      setTimeout(() => setSyncedSuccess(false), 3000);
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleItemClick = (id) => {
    setCurrentTab(id);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isMobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <ShieldAlert size={22} />
          </div>
          <div className="sidebar-logo-text" style={{ flex: 1 }}>
            <h1>RoadSense AI</h1>
            <span>Civil Infrastructure Risk & Maintenance</span>
          </div>

          {/* Close button for mobile drawer */}
          <button 
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close Sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item.id)}
              >
                <Icon size={18} />
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                    color: 'white',
                    fontWeight: 700
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Persistent Sidebar Footer */}
        <div className="sidebar-footer">
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
            <Database size={13} color="#60A5FA" />
            <span>Database: <strong>SQLite (roadsense.db)</strong></span>
          </div>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ width: '100%', justifyContent: 'center', gap: '0.45rem', padding: '0.55rem 0.75rem' }}
            onClick={handleSyncClick}
            disabled={isSyncing}
            title="Synchronize verified real-world Indian road database into SQLite"
          >
            {syncedSuccess ? (
              <>
                <CheckCircle2 size={14} color="#34D399" />
                <span style={{ color: '#34D399', fontWeight: 700 }}>Database Synced!</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Syncing Database...' : 'Sync Real Road Data'}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
