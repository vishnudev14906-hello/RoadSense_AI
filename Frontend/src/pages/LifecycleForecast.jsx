import React, { useState, useEffect } from 'react';
import { 
  TrendingDown, 
  ShieldAlert, 
  IndianRupee, 
  Calendar, 
  CheckCircle, 
  AlertOctagon, 
  BarChart3, 
  Sliders, 
  RefreshCw,
  Award,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../api';
import RiskBadge from '../components/RiskBadge';

export default function LifecycleForecast({ onNavigate, onLaunchPredictor }) {
  const [roads, setRoads] = useState([]);
  const [selectedRoadId, setSelectedRoadId] = useState('');
  const [initialPci, setInitialPci] = useState(72);
  const [pavementAge, setPavementAge] = useState(6.5);
  const [trafficDensity, setTrafficDensity] = useState('High');
  const [rainfallLevel, setRainfallLevel] = useState('Heavy');
  const [roadLength, setRoadLength] = useState(5.0);

  useEffect(() => {
    loadRoads();
  }, []);

  const loadRoads = async () => {
    try {
      const data = await api.getRoads();
      setRoads(data);
      if (data.length > 0) {
        setSelectedRoadId(data[0].id);
        applyRoadPreset(data[0]);
      }
    } catch (err) {
      console.error("Failed to load roads for lifecycle forecast:", err);
    }
  };

  const applyRoadPreset = (road) => {
    if (!road) return;
    const latestPred = road.predictions && road.predictions[0];
    const risk = latestPred ? latestPred.risk_score : 50;
    setInitialPci(Math.max(20, Math.min(95, Math.round(100 - risk * 0.8))));
    setPavementAge(road.road_age || 4.0);
    setTrafficDensity(road.traffic_density || 'High');
    setRainfallLevel(road.rainfall || 'Moderate');
    setRoadLength(road.road_length || 3.0);
  };

  const handleSelectRoad = (e) => {
    const id = e.target.value;
    setSelectedRoadId(id);
    const found = roads.find(r => r.id === Number(id));
    if (found) {
      applyRoadPreset(found);
    }
  };

  const handleLaunchPredictor = () => {
    const found = roads.find(r => r.id === Number(selectedRoadId));
    if (found && onLaunchPredictor) {
      onLaunchPredictor({
        road_id: found.id,
        road_name: found.road_name,
        location: found.location,
        road_length: roadLength !== undefined ? roadLength : (found.road_length || 1.0),
        pothole_count: found.pothole_count !== undefined ? found.pothole_count : 0,
        pothole_depth: found.pothole_depth !== undefined ? found.pothole_depth : 0.0,
        crack_length: found.crack_length !== undefined ? found.crack_length : 0.0,
        road_age: pavementAge !== undefined ? pavementAge : (found.road_age || 1.0),
        traffic_density: trafficDensity || found.traffic_density || 'Medium',
        rainfall: rainfallLevel || found.rainfall || 'Moderate',
      });
    } else if (onNavigate) {
      onNavigate('predictor');
    }
  };

  // Deterioration Rates based on traffic & weather
  const trafficFactor = { 'Low': 0.8, 'Medium': 1.0, 'High': 1.3, 'Very High': 1.7 }[trafficDensity] || 1.0;
  const rainFactor = { 'Light': 0.85, 'Moderate': 1.0, 'Heavy': 1.25, 'Torrential': 1.55 }[rainfallLevel] || 1.0;
  const degradationRate = 8.5 * trafficFactor * rainFactor;

  // Calculate 5-year trajectory for 3 strategies
  const years = [0, 1, 2, 3, 4, 5];

  // Strategy A: Proactive Timely Maintenance (Repairs at Yr 1)
  const trajectoryProactive = years.map(y => {
    if (y === 0) return initialPci;
    if (y === 1) return Math.min(95, initialPci + 20); // Maintenance boosted
    return Math.max(30, Math.round(95 - (y - 1) * (degradationRate * 0.4)));
  });

  // Strategy B: Delayed Maintenance (Wait 2 years till severe distress)
  const trajectoryDelayed = years.map(y => {
    if (y === 0) return initialPci;
    if (y === 1) return Math.max(15, Math.round(initialPci - degradationRate));
    if (y === 2) return Math.max(10, Math.round(initialPci - degradationRate * 2.2));
    if (y === 3) return Math.min(85, Math.round(initialPci - degradationRate * 2.2 + 45)); // Late overhaul
    return Math.max(25, Math.round(85 - (y - 3) * (degradationRate * 0.7)));
  });

  // Strategy C: Zero Action (Do Nothing - Complete breakdown)
  const trajectoryDoNothing = years.map(y => {
    if (y === 0) return initialPci;
    return Math.max(5, Math.round(initialPci - y * degradationRate * 1.35));
  });

  // Cost estimates in INR
  const costProactive = Math.round(roadLength * 90000);
  const costDelayed = Math.round(roadLength * 420000);
  const costDoNothing = Math.round(roadLength * 1250000);
  const taxpayerSavings = costDoNothing - costProactive;
  const roiPercentage = Math.round((taxpayerSavings / costProactive) * 100);

  const formatInrDisplay = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <TrendingDown size={24} color="#3B82F6" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
              5-Year Pavement Deterioration & Budget ROI Simulator
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Predictive lifecycle degradation curves comparing proactive maintenance vs. delayed repair cost escalation
          </p>
        </div>
      </div>

      {/* Simulator Inputs & ROI Highlight Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '1.25rem' }}>
        {/* Left: Corridor Preset & Lifecycle Param Slider Controls */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Sliders size={18} color="#60A5FA" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Corridor Stress Factors & Degradation Multipliers
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Select Monitored Road Corridor</label>
              <select
                className="form-select"
                value={selectedRoadId}
                onChange={handleSelectRoad}
              >
                {roads.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.road_name} ({r.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Traffic Load Exposure</label>
              <select
                className="form-select"
                value={trafficDensity}
                onChange={(e) => setTrafficDensity(e.target.value)}
              >
                <option value="Low">Low Traffic</option>
                <option value="Medium">Medium Traffic</option>
                <option value="High">High Traffic</option>
                <option value="Very High">Very High (Axle Impact Stress)</option>
              </select>
            </div>

            <div>
              <label className="form-label">Monsoon Weather Exposure</label>
              <select
                className="form-select"
                value={rainfallLevel}
                onChange={(e) => setRainfallLevel(e.target.value)}
              >
                <option value="Light">Light Rain</option>
                <option value="Moderate">Moderate Rain</option>
                <option value="Heavy">Heavy Rain</option>
                <option value="Torrential">Torrential Monsoon</option>
              </select>
            </div>
          </div>

          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Initial Pavement Condition Index (PCI)</span>
                <span className="mono" style={{ color: '#60A5FA', fontWeight: 700 }}>{initialPci}/100</span>
              </div>
              <input
                type="range"
                min="20"
                max="95"
                value={initialPci}
                onChange={(e) => setInitialPci(Number(e.target.value))}
                className="form-range"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Corridor Section Length</span>
                <span className="mono" style={{ color: '#34D399', fontWeight: 700 }}>{roadLength} km</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="25.0"
                step="0.5"
                value={roadLength}
                onChange={(e) => setRoadLength(Number(e.target.value))}
                className="form-range"
              />
            </div>
          </div>
        </div>

        {/* Right: Projected 5-Year Municipal Taxpayer Savings Card */}
        <div className="glass-card highlight" style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60A5FA', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <Award size={16} />
                <span>Lifecycle Cost Optimization</span>
              </div>
              <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                {roiPercentage}% ROI
              </span>
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {formatInrDisplay(taxpayerSavings)}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Projected taxpayer savings by dispatching early preventive repair on this {roadLength} km corridor instead of allowing base layer failure.
            </p>
          </div>

          {/* Strategy Cost Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#34D399', fontWeight: 700, textTransform: 'uppercase' }}>Early Fix</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34D399', marginTop: '0.2rem' }} className="mono">
                {formatInrDisplay(costProactive)}
              </div>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase' }}>2-Yr Delay</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.2rem' }} className="mono">
                {formatInrDisplay(costDelayed)}
              </div>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase' }}>Do Nothing</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#EF4444', marginTop: '0.2rem' }} className="mono">
                {formatInrDisplay(costDoNothing)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Year Visual Degradation Curve Chart */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Pavement Condition Index (PCI) Trajectory Forecast
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Higher score (100) = Pristine road. Lower score (&lt;40) = Sub-grade base failure & safety hazard.
            </p>
          </div>

          {/* Chart Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#34D399', fontWeight: 600 }}>
              <span style={{ width: 12, height: 4, background: '#10B981', borderRadius: '2px' }}></span> Proactive Repair
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#F59E0B', fontWeight: 600 }}>
              <span style={{ width: 12, height: 4, background: '#F59E0B', borderRadius: '2px' }}></span> Delayed 2 Years
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#EF4444', fontWeight: 600 }}>
              <span style={{ width: 12, height: 4, background: '#EF4444', borderRadius: '2px' }}></span> Zero Maintenance
            </span>
          </div>
        </div>

        {/* SVG Multi-Curve Trajectory Graph */}
        <div style={{ width: '100%', height: '260px', position: 'relative' }}>
          <svg viewBox="0 0 700 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            {/* Background Grid Lines */}
            {[20, 40, 60, 80, 100].map(val => {
              const y = 200 - (val / 100) * 180;
              return (
                <g key={val}>
                  <line x1="50" y1={y} x2="680" y2={y} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                  <text x="35" y={y + 4} fill="var(--text-dim)" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* X-Axis Year Labels */}
            {years.map((yr, idx) => {
              const x = 70 + idx * 120;
              return (
                <g key={yr}>
                  <line x1={x} y1="20" x2={x} y2="200" stroke="var(--border-subtle)" strokeOpacity="0.4" />
                  <text x={x} y="218" fill="var(--text-muted)" fontSize="11" textAnchor="middle" fontWeight="600">
                    {yr === 0 ? 'Today (Yr 0)' : `Year ${yr}`}
                  </text>
                </g>
              );
            })}

            {/* Helper to calculate points for SVG path */}
            {(() => {
              const getPathD = (data) => {
                return data.map((val, idx) => {
                  const x = 70 + idx * 120;
                  const y = 200 - (val / 100) * 180;
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ');
              };

              return (
                <>
                  {/* Zero Action (Red) */}
                  <path
                    d={getPathD(trajectoryDoNothing)}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="3"
                    strokeDasharray="4 4"
                  />

                  {/* Delayed Repair (Amber) */}
                  <path
                    d={getPathD(trajectoryDelayed)}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="3"
                  />

                  {/* Proactive Maintenance (Green) */}
                  <path
                    d={getPathD(trajectoryProactive)}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3.5"
                  />

                  {/* Data Points */}
                  {years.map((yr, idx) => {
                    const x = 70 + idx * 120;
                    const yPro = 200 - (trajectoryProactive[idx] / 100) * 180;
                    const yDel = 200 - (trajectoryDelayed[idx] / 100) * 180;
                    const yNo = 200 - (trajectoryDoNothing[idx] / 100) * 180;
                    return (
                      <g key={yr}>
                        <circle cx={x} cy={yPro} r="4.5" fill="#10B981" stroke="white" strokeWidth="1.5" />
                        <circle cx={x} cy={yDel} r="4.5" fill="#F59E0B" stroke="white" strokeWidth="1.5" />
                        <circle cx={x} cy={yNo} r="4.5" fill="#EF4444" stroke="white" strokeWidth="1.5" />
                      </g>
                    );
                  })}
                </>
              );
            })()}
          </svg>
        </div>
      </div>
    </div>
  );
}
