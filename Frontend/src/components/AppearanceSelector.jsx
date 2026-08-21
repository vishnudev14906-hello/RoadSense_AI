import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check, ChevronDown } from 'lucide-react';

export const appearanceOptions = [
  { id: 'light', label: 'Light Mode', shortLabel: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark Mode', shortLabel: 'Dark', icon: Moon },
  { id: 'system', label: 'System Default', shortLabel: 'System Default', icon: Monitor },
];

/**
 * Dashboard-only Appearance Tab Selector (Light Mode | Dark Mode | System Default)
 */
export function DashboardAppearanceControl({ appearance, setAppearance }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '0.25rem',
      gap: '0.25rem'
    }}>
      {appearanceOptions.map((opt) => {
        const Icon = opt.icon;
        const isSelected = appearance === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            className={`appearance-segment-btn ${isSelected ? 'active' : ''}`}
            onClick={() => setAppearance(opt.id)}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: isSelected ? 700 : 500,
              gap: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <Icon size={14} color={isSelected ? '#3B82F6' : 'currentColor'} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Navbar Dropdown Appearance Selector
 */
export function NavbarAppearanceDropdown({ appearance, setAppearance }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentOption = appearanceOptions.find(o => o.id === appearance) || appearanceOptions[2];
  const CurrentIcon = currentOption.icon;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="appearance-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{ gap: '0.45rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
        title="Change UI Appearance"
      >
        <CurrentIcon size={14} color="#60A5FA" />
        <span style={{ fontWeight: 600 }}>{currentOption.label}</span>
        <ChevronDown size={12} style={{ opacity: 0.7, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </button>

      {isOpen && (
        <div className="appearance-popover">
          <div style={{ padding: '0.35rem 0.6rem 0.25rem 0.6rem', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Theme Appearance
          </div>
          {appearanceOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = appearance === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`appearance-option ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setAppearance(opt.id);
                  setIsOpen(false);
                }}
              >
                <Icon size={15} color={isSelected ? '#3B82F6' : 'currentColor'} />
                <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
                {isSelected && <Check size={14} color="#3B82F6" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Sidebar 3-Option Segment Control
 */
export function SidebarAppearanceControl({ appearance, setAppearance }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Appearance
      </div>
      <div className="appearance-segment">
        {appearanceOptions.map((opt) => {
          const Icon = opt.icon;
          const isSelected = appearance === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className={`appearance-segment-btn ${isSelected ? 'active' : ''}`}
              onClick={() => setAppearance(opt.id)}
              title={opt.label}
            >
              <Icon size={13} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
