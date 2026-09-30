import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Search, Calendar, FileText, MapPin, Sparkles, Clock, RefreshCw } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { api } from '../api';
import { formatDate, formatTime, formatRelativeTime } from '../utils/dateUtils';
import { DEFAULT_ROADS } from '../data/roadsData';

const defaultHistory = DEFAULT_ROADS.filter(r => r.latest_prediction).map(r => ({
  id: r.id,
  road_id: r.id,
  road_name: r.road_name,
  location: r.location,
  city: r.city,
  prediction_date: r.latest_prediction.prediction_date,
  risk_level: r.latest_prediction.risk_level,
  risk_score: r.latest_prediction.risk_score,
  confidence: r.latest_prediction.confidence,
  priority: r.latest_prediction.priority,
  recommendation: r.latest_prediction.recommendation
}));

export default function History({ onOpenReport }) {
  const [predictions, setPredictions] = useState(defaultHistory);
  const [loading, setLoading] = useState(false);
  const [riskFilter, setRiskFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadPredictions();
  }, [riskFilter]);

  const loadPredictions = async () => {
    setLoading(true);
    let localAudits = [];
    try {
      const stored = localStorage.getItem('roadsense_assessment_audit_log');
      if (stored) {
        localAudits = JSON.parse(stored);
      }
    } catch (e) {}

    try {
      const data = await api.getPredictions({
        limit: 100,
        risk_level: riskFilter
      });
      const combined = [...localAudits];
      const seenIds = new Set(localAudits.map(a => String(a.id || a.road_id)));
      if (data && Array.isArray(data)) {
        data.forEach(item => {
          if (!seenIds.has(String(item.id || item.road_id))) {
            combined.push(item);
          }
        });
      }
      setPredictions(combined.length > 0 ? combined : defaultHistory);
    } catch (err) {
      console.warn("Using local verified prediction history:", err);
      if (localAudits.length > 0) {
        setPredictions([...localAudits, ...defaultHistory]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = predictions.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.road_name && p.road_name.toLowerCase().includes(term)) ||
      (p.location && p.location.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            AI Prediction History & Audit Trail
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Historical record of all machine learning inference runs and generated maintenance prescriptions in local real time
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={loadPredictions} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search historical road names..."
              className="form-input"
              style={{ paddingLeft: '2.2rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <select
              className="form-select"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="All">All Risk Levels</option>
              <option value="Critical Risk">Critical Risk</option>
              <option value="High Risk">High Risk</option>
              <option value="Medium Risk">Medium Risk</option>
              <option value="Low Risk">Low Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Real-Time Detection</th>
              <th>Road Asset</th>
              <th>Damage Snapshot</th>
              <th>ML Risk Output</th>
              <th>Confidence</th>
              <th>Prescribed Action</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading prediction audit trail...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                  No historical records found.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {formatDate(item.prediction_date)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.74rem', color: '#93C5FD', fontWeight: 700 }} className="mono">
                        {formatTime(item.prediction_date, true)}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        background: 'rgba(59, 130, 246, 0.15)',
                        color: '#60A5FA',
                        padding: '0.05rem 0.35rem',
                        borderRadius: '4px'
                      }}>
                        {formatRelativeTime(item.prediction_date)}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      {item.road_name || 'Unassigned Simulation'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <MapPin size={11} />
                      <span>{item.location || 'Local Simulation'}</span>
                    </div>
                  </td>

                  <td>
                    <div style={{ fontSize: '0.8rem' }}>
                      <span style={{ color: item.pothole_count > 15 ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                        {item.pothole_count} Potholes
                      </span>
                      {' '}({item.pothole_depth} cm)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {item.crack_length}m Cracks • {item.road_age} yrs
                    </div>
                  </td>

                  <td>
                    <RiskBadge level={item.risk_level} size="sm" />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                      Risk Score: {item.risk_score}/100
                    </div>
                  </td>

                  <td>
                    <span style={{ color: '#60A5FA', fontWeight: 700 }} className="mono">
                      {item.confidence}%
                    </span>
                  </td>

                  <td style={{ maxWidth: '240px' }}>
                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }} title={item.recommendation}>
                      {item.recommendation}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600 }} className="mono">
                      {item.estimated_budget}
                    </div>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenReport(item)}
                      title="View Report Audit"
                    >
                      <FileText size={13} />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
