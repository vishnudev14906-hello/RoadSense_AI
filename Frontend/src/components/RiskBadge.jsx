import React from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, Flame } from 'lucide-react';

export default function RiskBadge({ level, riskLevel, risk, risk_level, showIcon = true, size = "md" }) {
  const rawLevel = String(level || riskLevel || risk || risk_level || 'Low Risk');
  const normLevel = rawLevel.toLowerCase();
  
  let badgeClass = "risk-badge ";
  let Icon = CheckCircle2;

  if (normLevel.includes("critical")) {
    badgeClass += "critical";
    Icon = Flame;
  } else if (normLevel.includes("high")) {
    badgeClass += "high";
    Icon = AlertTriangle;
  } else if (normLevel.includes("medium")) {
    badgeClass += "medium";
    Icon = AlertCircle;
  } else {
    badgeClass += "low";
    Icon = CheckCircle2;
  }

  const iconSize = size === "sm" ? 12 : 14;

  return (
    <span className={badgeClass} style={{ fontSize: size === "sm" ? '0.7rem' : undefined }}>
      {showIcon && <Icon size={iconSize} />}
      <span>{rawLevel}</span>
    </span>
  );
}
