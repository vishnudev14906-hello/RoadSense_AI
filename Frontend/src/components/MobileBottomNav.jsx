import React from 'react';
import { 
  LayoutDashboard, 
  Navigation, 
  Scan, 
  Cpu, 
  Menu
} from 'lucide-react';

export default function MobileBottomNav({ currentTab, setCurrentTab, onOpenMenu }) {
  const primaryTabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'map', label: 'GIS Map', icon: Navigation },
    { id: 'vision', label: 'Scanner', icon: Scan },
    { id: 'predictor', label: 'AI Predict', icon: Cpu },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {primaryTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`mobile-bottom-item ${isActive ? 'active' : ''}`}
            onClick={() => setCurrentTab(tab.id)}
            aria-label={tab.label}
          >
            <Icon size={20} />
            <span>{tab.label}</span>
          </button>
        );
      })}

      {/* More / Menu Drawer Toggle */}
      <button
        className="mobile-bottom-item"
        onClick={onOpenMenu}
        aria-label="Open full menu"
      >
        <Menu size={20} />
        <span>Menu</span>
      </button>
    </nav>
  );
}
