import React from 'react';

// 1. Risk Distribution Donut Chart
export function RiskDonutChart({ data = [] }) {
  const colorMap = {
    "Low Risk": "#10B981",
    "Medium Risk": "#F59E0B",
    "High Risk": "#F97316",
    "Critical Risk": "#EF4444",
  };

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  if (total === 0) return <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>No data available</div>;

  let cumulativeAngle = 0;
  const radius = 70;
  const strokeWidth = 22;
  const center = 100;
  const circumference = 2 * Math.PI * radius;

  const slices = data.map((item) => {
    const fraction = item.value / total;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeAngle * circumference;
    cumulativeAngle += fraction;
    return {
      ...item,
      color: colorMap[item.label] || '#3B82F6',
      strokeDasharray,
      strokeDashoffset,
      percentage: Math.round(fraction * 100)
    };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1.5rem' }}>
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
          {slices.map((slice, idx) => (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          ))}
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{total}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roads Assessed</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: '150px' }}>
        {slices.map((slice, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: slice.color }}></span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>{slice.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: slice.color }}>{slice.value}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>({slice.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. Radial Risk Speedometer Gauge
export function RiskGauge({ score = 50, level = "Medium Risk" }) {
  const normScore = Math.min(100, Math.max(0, score));
  // Needle rotation from -90deg (0 score) to +90deg (100 score)
  const rotation = -90 + (normScore / 100) * 180;

  const getColor = (s) => {
    if (s >= 80) return "#EF4444";
    if (s >= 60) return "#F97316";
    if (s >= 35) return "#F59E0B";
    return "#10B981";
  };

  const currentColor = getColor(normScore);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%', maxWidth: '280px', margin: '0 auto' }}>
      <svg width="260" height="150" viewBox="0 0 260 150">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="65%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        
        {/* Background Arc */}
        <path
          d="M 30 135 A 100 100 0 0 1 230 135"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="18"
          strokeLinecap="round"
        />

        {/* Value Track Arc */}
        <path
          d="M 30 135 A 100 100 0 0 1 230 135"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="18"
          strokeLinecap="round"
        />

        {/* Pivot Center Circle */}
        <circle cx="130" cy="135" r="8" fill="#1F2937" stroke={currentColor} strokeWidth="3" />

        {/* Needle */}
        <g transform={`rotate(${rotation} 130 135)`} style={{ transition: 'transform 0.2s ease-out' }}>
          <line x1="130" y1="135" x2="130" y2="48" stroke={currentColor} strokeWidth="4" strokeLinecap="round" />
          <polygon points="126,56 134,56 130,42" fill={currentColor} />
        </g>
      </svg>

      <div style={{ marginTop: '-10px', textAlign: 'center' }}>
        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: currentColor }} className="mono">
          {score}
          <span style={{ fontSize: '1.1rem', color: 'var(--text-dim)' }}>/100</span>
        </div>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: currentColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {level}
        </div>
      </div>
    </div>
  );
}

// 3. Feature Importance Bar Chart
export function FeatureImportanceChart({ data = {} }) {
  const labels = {
    pothole_count: "Pothole Density",
    crack_length: "Crack Length (m)",
    pothole_depth: "Pothole Depth (cm)",
    road_age: "Pavement Age",
    traffic_encoded: "Traffic Load",
    rainfall_encoded: "Rainfall Volume"
  };

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {entries.map(([key, val]) => {
        const pct = Math.round(val * 100);
        return (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{labels[key] || key}</span>
              <span style={{ color: '#60A5FA', fontWeight: 700 }}>{pct}% Weight</span>
            </div>
            <div style={{ height: 7, borderRadius: 4, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, #3B82F6, #6366F1)',
                  transition: 'width 0.6s ease'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
