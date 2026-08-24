import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  BarChart3, 
  RefreshCw, 
  Sparkles, 
  Gauge, 
  Activity,
  Award
} from 'lucide-react';
import { api } from '../api';

export default function RiskClassificationModule() {
  const [metrics, setMetrics] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testScore, setTestScore] = useState(72.5);
  const [classifiedResult, setClassifiedResult] = useState(null);

  const fetchMetricsAndTiers = async () => {
    setLoading(true);
    try {
      const [mRes, tRes] = await Promise.all([
        api.riskClassification.getMetrics(),
        api.riskClassification.getTierMatrix()
      ]);
      setMetrics(mRes);
      setTiers(tRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestClassification = async () => {
    try {
      const res = await api.riskClassification.classifyScore(testScore);
      setClassifiedResult(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMetricsAndTiers();
    handleTestClassification();
  }, []);

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
              MODULE 4 OF 6
            </span>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              Multi-Tier Safety Standard
            </span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldAlert className="text-primary" size={28} />
            Risk Classification Module
          </h1>
          <p className="page-subtitle">
            Classifies continuous risk scores into 4 civil engineering hazard tiers, benchmarks test accuracy (96.5%), and provides confusion matrix validation.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchMetricsAndTiers} disabled={loading}>
          <RefreshCw size={16} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Model Benchmark Performance Cards */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Test Accuracy</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34D399', margin: '0.3rem 0' }}>
              {metrics.test_accuracy}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>XGBoost 100 Trees</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precision (Macro)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60A5FA', margin: '0.3rem 0' }}>
              {metrics.precision_macro}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Positive predictive rate</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recall (Macro)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#A78BFA', margin: '0.3rem 0' }}>
              {metrics.recall_macro}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>True positive capture</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>F1-Score (Macro)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FBBF24', margin: '0.3rem 0' }}>
              {metrics.f1_score_macro}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Harmonic balance</div>
          </div>
        </div>
      )}

      {/* 4 Official Hazard Tiers Cards */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={18} className="text-primary" />
          4-Tier Civil Engineering Risk Matrix
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {tiers.map((tier) => (
            <div key={tier.tier} className="glass-card" style={{
              padding: '1.5rem',
              borderTop: `4px solid ${tier.color_hex}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="badge" style={{ background: `${tier.color_hex}22`, color: tier.color_hex, fontWeight: 700 }}>
                    {tier.tier}: {tier.name}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {tier.score_range} pts
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: tier.color_hex, marginBottom: '0.4rem' }}>
                  {tier.hazard_level}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '0.8rem' }}>
                  {tier.description}
                </p>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
                <strong>Prescribed Action:</strong> {tier.standard_action}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Arbitrary Score Classifier & Confusion Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Interactive Score Resolver */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gauge size={16} className="text-primary" />
            Interactive Risk Score Classifier
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Test how any continuous risk score (0 to 100) dynamically maps into its official civil risk category.
          </p>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
              <span className="form-label">Test Continuous Score</span>
              <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{testScore} / 100</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="100.0"
              step="0.5"
              className="input-field"
              value={testScore}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setTestScore(val);
              }}
            />
          </div>

          <button className="btn btn-primary" onClick={handleTestClassification} style={{ width: '100%', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <Sparkles size={16} />
            <span>Classify Score</span>
          </button>

          {classifiedResult && (
            <div style={{
              padding: '1.25rem',
              borderRadius: '10px',
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${classifiedResult.color_hex}55`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Classified Safety Tier:</span>
                <span className="badge" style={{ background: `${classifiedResult.color_hex}22`, color: classifiedResult.color_hex, fontWeight: 700, fontSize: '0.85rem' }}>
                  {classifiedResult.tier} - {classifiedResult.risk_level}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                <strong>Hazard Level:</strong> {classifiedResult.hazard_level}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {classifiedResult.description}
              </div>
            </div>
          )}
        </div>

        {/* 4x4 Confusion Matrix */}
        {metrics && metrics.confusion_matrix && (
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={16} className="text-primary" />
              4x4 Multi-Class Confusion Matrix
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Validation test set evaluated across 480 held-out roadway survey segments.
            </p>

            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', fontSize: '0.8rem', textAlign: 'center' }}>
                <thead>
                  <tr>
                    <th>Actual \ Pred</th>
                    <th style={{ color: '#10B981' }}>Low</th>
                    <th style={{ color: '#F59E0B' }}>Medium</th>
                    <th style={{ color: '#F97316' }}>High</th>
                    <th style={{ color: '#EF4444' }}>Critical</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.confusion_matrix.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'left', fontWeight: 700 }}>{row.actual}</td>
                      <td style={{ background: idx === 0 ? 'rgba(16, 185, 129, 0.2)' : 'transparent', fontWeight: idx === 0 ? 800 : 400 }}>{row.predicted_low}</td>
                      <td style={{ background: idx === 1 ? 'rgba(245, 158, 11, 0.2)' : 'transparent', fontWeight: idx === 1 ? 800 : 400 }}>{row.predicted_medium}</td>
                      <td style={{ background: idx === 2 ? 'rgba(249, 115, 22, 0.2)' : 'transparent', fontWeight: idx === 2 ? 800 : 400 }}>{row.predicted_high}</td>
                      <td style={{ background: idx === 3 ? 'rgba(239, 68, 68, 0.2)' : 'transparent', fontWeight: idx === 3 ? 800 : 400 }}>{row.predicted_critical}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              Diagonal bold entries indicate correct predictions (96.5% Overall Accuracy)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
