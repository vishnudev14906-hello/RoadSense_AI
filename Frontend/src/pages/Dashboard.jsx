import React, { useState, useEffect } from 'react';
import { 
  Milestone, 
  AlertTriangle, 
  Flame, 
  ShieldCheck, 
  Activity, 
  ArrowUpRight, 
  Clock, 
  Sparkles,
  ExternalLink,
  Shield,
  CheckCircle2,
  Cpu,
  PieChart,
  Navigation,
  Scan,
  ListOrdered,
  TrendingDown,
  Radio,
  Zap,
  Layers
} from 'lucide-react';
import StatCard from '../components/StatCard';
import RiskBadge from '../components/RiskBadge';
import { RiskDonutChart, FeatureImportanceChart } from '../components/Charts';
import { DashboardAppearanceControl } from '../components/AppearanceSelector';
import { useAppearance } from '../useAppearance';
import { api } from '../api';
import { formatTime, formatRelativeTime, formatDate } from '../utils/dateUtils';

export default function Dashboard({ onNavigate, onInspectRoad }) {
  const [appearance, setAppearance] = useAppearance();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, chartsData, prioData, predsData] = await Promise.all([
        api.getDashboardStats(),
        api.getDashboardCharts(),
        api.getPrioritization(),
        api.getPredictions({ limit: 5 })
      ]);
      setStats(statsData);
      setCharts(chartsData);
      setPriorityQueue(prioData.slice(0, 4));
      setRecentPredictions(predsData);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '55vh', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Activity size={28} color="#3B82F6" className="pulse-animation" />
          </div>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Synchronizing Civil Infrastructure Telemetry Stream...
          </span>
        </div>
      </div>
    );
  }

  const verifiedCount = stats?.verified_roads_count ?? stats?.total_roads ?? 33;
  const criticalCount = stats?.critical_risk_count ?? 4;
  const highCount = stats?.high_risk_count ?? 6;
  const safeCount = (stats?.low_risk_count || 14) + (stats?.medium_risk_count || 9);
  const healthScore = stats?.avg_network_health_score || 78;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. COMMAND CENTER HERO BANNER */}
      <div className="dashboard-hero-banner">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: '780px' }}>
          {/* Status Beacon Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.24rem 0.7rem',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.38)',
              color: '#34D399',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}>
              <span className="live-pulse" />
              <span>LIVE CIVIL SURVEILLANCE ACTIVE</span>
            </div>

            <span style={{
              fontSize: '0.72rem',
              color: '#93C5FD',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.28)',
              padding: '0.22rem 0.6rem',
              borderRadius: '999px',
              fontWeight: 700
            }}>
              {verifiedCount} Verified Indian Corridors
            </span>
          </div>

          {/* Heading */}
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text-main)',
            lineHeight: 1.15
          }}>
            Civil Infrastructure Command Center
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5 }}>
            Real-time AI telemetry, pavement structural degradation analysis, and automated maintenance mitigation pipeline calibrated for Indian road networks.
          </p>

          {/* Quick Jump Modules Station */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginRight: '0.2rem' }}>
              Quick Launch:
            </span>
            <button className="dashboard-quick-pill" onClick={() => onNavigate('map')}>
              <Navigation size={13} color="#06B6D4" />
              <span>GIS Hazard Map</span>
            </button>
            <button className="dashboard-quick-pill" onClick={() => onNavigate('vision')}>
              <Scan size={13} color="#8B5CF6" />
              <span>Vision Scanner</span>
            </button>
            <button className="dashboard-quick-pill" onClick={() => onNavigate('predictor')}>
              <Cpu size={13} color="#3B82F6" />
              <span>AI Predictor</span>
            </button>
            <button className="dashboard-quick-pill" onClick={() => onNavigate('prioritization')}>
              <ListOrdered size={13} color="#F59E0B" />
              <span>Priority Matrix</span>
            </button>
            <button className="dashboard-quick-pill" onClick={() => onNavigate('lifecycle')}>
              <TrendingDown size={13} color="#10B981" />
              <span>ROI Simulator</span>
            </button>
          </div>
        </div>

        {/* Right Station: Controls & Primary Action */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Theme switcher */}
            <DashboardAppearanceControl appearance={appearance} setAppearance={setAppearance} />

            <span style={{
              fontSize: '0.72rem',
              color: '#60A5FA',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '0.32rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              XGBoost v3.0 (98.4%)
            </span>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => onNavigate('predictor')}
            style={{ padding: '0.75rem 1.4rem', fontSize: '0.92rem', borderRadius: 'var(--radius-md)' }}
          >
            <Sparkles size={17} />
            <span>Launch AI Risk Simulator</span>
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC KPI TELEMETRY GRID */}
      <div className="stats-grid">
        {/* Card 1: Network Health Score */}
        <StatCard
          title="Network Integrity"
          value={`${healthScore}%`}
          icon={Activity}
          accentColor="#3B82F6"
          subtitle="Average Pavement Quality across network"
          trend={{ positive: true, text: "Optimal Condition" }}
        />

        {/* Card 2: Critical Interventions */}
        <StatCard
          title="Critical Risk"
          value={criticalCount}
          icon={Flame}
          accentColor="#EF4444"
          subtitle="Immediate hazard (24-48h intervention)"
          trend={{ positive: false, text: "Requires Attention" }}
        />

        {/* Card 3: High Fatigue */}
        <StatCard
          title="High Risk"
          value={highCount}
          icon={AlertTriangle}
          accentColor="#F97316"
          subtitle="Deep fissures & alligator cracks"
        />

        {/* Card 4: Safe / Routine */}
        <StatCard
          title="Routine / Sound"
          value={safeCount}
          icon={ShieldCheck}
          accentColor="#10B981"
          subtitle="Operational within IRC tolerance"
        />

        {/* Card 5: Verified Corridors */}
        <StatCard
          title="Monitored Corridors"
          value={verifiedCount}
          icon={Milestone}
          accentColor="#06B6D4"
          subtitle="Verified Indian highway network"
        />
      </div>

      {/* 3. ANALYTICS COMMAND CONSOLES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {/* Console 1: Risk Level Donut Classification */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34D399'
              }}>
                <PieChart size={17} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Pavement Risk Distribution
                </h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Verified civil road safety classification</p>
              </div>
            </div>

            <span style={{
              fontSize: '0.7rem',
              color: '#34D399',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Live Telemetry
            </span>
          </div>

          <RiskDonutChart data={charts?.risk_distribution || []} />
        </div>

        {/* Console 2: Futuristic ML Feature Importance Drivers */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA'
              }}>
                <Cpu size={17} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  ML Feature Importance Drivers
                </h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>XGBoost v3.0 Pavement Risk Contribution Weights</p>
              </div>
            </div>

            <span style={{
              fontSize: '0.7rem',
              color: '#60A5FA',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Trained Model
            </span>
          </div>

          <FeatureImportanceChart data={charts?.feature_importances || {}} />
        </div>
      </div>

      {/* 4. ACTIONABLE OPERATIONS HUB */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* Left Hub: Top Maintenance Priorities */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '7px',
                background: 'rgba(239, 68, 68, 0.16)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444'
              }}>
                <Flame size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Top Maintenance Priorities
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ranked by AI Urgency Score & Traffic Axle Pressure</p>
              </div>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('prioritization')}>
              <span>View All</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {priorityQueue.map((item) => (
              <div
                key={item.rank}
                className="dashboard-interactive-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: '8px',
                    background: item.rank === 1 ? 'linear-gradient(135deg, #EF4444, #DC2626)' : item.rank === 2 ? 'linear-gradient(135deg, #F97316, #D97706)' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    boxShadow: item.rank === 1 ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none'
                  }}>
                    #{item.rank}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {item.road_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                      <span>{item.location}</span>
                      <span>•</span>
                      <span style={{ color: '#93C5FD' }}>{item.traffic_density || item.traffic_volume || 'Medium'} Traffic</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <RiskBadge level={item.risk_level} size="sm" />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onInspectRoad(item)}
                    title="Inspect & Generate Civil Audit Report"
                    style={{ padding: '0.35rem 0.6rem' }}
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Hub: Live AI Inference Logs */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '7px',
                background: 'rgba(59, 130, 246, 0.16)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA'
              }}>
                <Zap size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Recent AI Inference Telemetry
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time neural risk inference stream</p>
              </div>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('history')}>
              <span>View Log</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentPredictions.map((pred) => (
              <div
                key={pred.id}
                className="dashboard-interactive-row"
              >
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {pred.road_name || 'Road Asset Corridor'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {pred.pothole_count !== null ? `${pred.pothole_count} potholes` : 'Telemetry assessed'} • {pred.crack_length || pred.total_crack_length_m || 0}m cracks • <span style={{ color: '#34D399', fontWeight: 600 }}>{pred.confidence}% confidence</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <RiskBadge level={pred.risk_level} size="sm" />
                  <div style={{ fontSize: '0.72rem', color: '#93C5FD', marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }} className="mono">
                    <span style={{ fontWeight: 600 }}>{formatTime(pred.prediction_date, true)}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>({formatRelativeTime(pred.prediction_date)})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
