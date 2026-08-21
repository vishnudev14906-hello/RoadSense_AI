import React from 'react';

export default function StatCard({ title, value, icon: Icon, subtitle, accentColor = "#3B82F6", trend }) {
  return (
    <div className="stat-card" style={{ "--stat-accent": accentColor }}>
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        {Icon && (
          <div className="stat-icon">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="stat-value mono">{value}</div>
      {(subtitle || trend) && (
        <div className="stat-footer">
          {trend && (
            <span style={{ color: trend.positive ? "#10B981" : "#EF4444", fontWeight: 600 }}>
              {trend.text}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
