import React, { useState, useEffect } from 'react';
import { 
  Milestone, 
  AlertTriangle, 
  Flame, 
  ShieldCheck, 
  Activity, 
  ArrowUpRight, 
  Wrench, 
  Clock, 
  Sparkles,
  ExternalLink,
  Shield,
  CheckCircle2
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Activity size={32} color="#3B82F6" className="pulse-animation" />
          <span>Synchronizing RoadSense AI Verified Telemetry...</span>
        </div>
      </div>
    );
  }

  const verifiedCount = stats?.verified_roads_count ?? stats?.total_roads ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Civil Infrastructure Command Center
            </h1>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34D399',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              Verified Real Data
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Authentic Indian road condition risk prediction, pavement integrity monitoring & maintenance prioritization
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Appearance tab control (Light Mode | Dark Mode | System Default) */}
          <DashboardAppearanceControl appearance={appearance} setAppearance={setAppearance} />

          <button className="btn btn-primary" onClick={() => onNavigate('predictor')}>
            <Sparkles size={16} />
            <span>Launch AI Risk Simulator</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Verified Corridors"
          value={verifiedCount}
          icon={Milestone}
          accentColor="#3B82F6"
          subtitle="Real-world Indian roads"
        />
        <StatCard
          title="Critical Risk"
          value={stats?.critical_risk_count || 0}
          icon={Flame}
          accentColor="#EF4444"
          subtitle="Immediate hazard (24-48h)"
        />
        <StatCard
          title="High Risk"
          value={stats?.high_risk_count || 0}
          icon={AlertTriangle}
          accentColor="#F97316"
          subtitle="Fatigue & deep fissures"
        />
        <StatCard
          title="Routine / Safe"
          value={(stats?.low_risk_count || 0) + (stats?.medium_risk_count || 0)}
          icon={ShieldCheck}
          accentColor="#10B981"
          subtitle="Healthy operational status"
        />
        <StatCard
          title="Network Health"
          value={`${stats?.avg_network_health_score || 0}%`}
          icon={Activity}
          accentColor="#6366F1"
          subtitle="Composite safety index"
        />
      </div>

      {/* Charts & Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Risk Distribution Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Risk Level Classification
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>XGBoost Output</span>
          </div>
          <RiskDonutChart data={charts?.risk_distribution || []} />
        </div>

        {/* AI Model Feature Importances */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              ML Feature Importance Drivers
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#60A5FA', fontWeight: 600 }}>Trained Model Weights</span>
          </div>
          <FeatureImportanceChart data={charts?.feature_importances || {}} />
        </div>
      </div>

      {/* Actionable Priority Queue & Recent Predictions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Top Priority Roads Needed Attention */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                🚨 Top Maintenance Priorities
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ranked by AI Urgency Score & Traffic Load</p>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: item.rank === 1 ? '#EF4444' : item.rank === 2 ? '#F97316' : '#3B82F6',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 800
                  }}>
                    #{item.rank}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {item.road_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.location} • {item.traffic_density || item.traffic_volume || 'Medium'} Traffic
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <RiskBadge level={item.risk_level} size="sm" />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onInspectRoad(item)}
                    title="Inspect & Generate Report"
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live AI Inference Telemetry Stream */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                ⚡ Recent AI Inference Logs
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Latest machine learning risk predictions</p>
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
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {pred.road_name || 'Road Asset'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {pred.pothole_count !== null ? `${pred.pothole_count} potholes` : 'Telemetry assessed'} • {pred.crack_length || pred.total_crack_length_m || 0}m cracks • {pred.confidence}% confidence
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
