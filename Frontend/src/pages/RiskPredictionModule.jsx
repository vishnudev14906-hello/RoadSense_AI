import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Sparkles, 
  TrendingUp, 
  Activity, 
  Layers, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  Sliders, 
  Zap, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { api } from '../api';

export default function RiskPredictionModule({ onOpenReport }) {
  const [params, setParams] = useState({
    road_name: 'Avinashi Road Express Corridor',
    location: 'Coimbatore',
    road_length: 5.5,
    pothole_count: 16,
    pothole_depth: 8.5,
    crack_length: 62.0,
    road_age: 7.0,
    traffic_density: 'High',
    rainfall: 'Heavy'
  });

  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);

  // What-If Simulation State
  const [simParams, setSimParams] = useState({
    delta_potholes_pct: 40.0,
    delta_cracks_pct: 35.0,
    delta_traffic: 'Very High',
    delta_rainfall: 'Torrential'
  });
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const runPrediction = async () => {
    setLoading(true);
    try {
      const res = await api.riskPrediction.predict({
        ...params,
        save_prediction: false
      });
      setPrediction(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModelInfo = async () => {
    try {
      const info = await api.riskPrediction.getModelInfo();
      setModelInfo(info);
    } catch (err) {
      console.error(err);
    }
  };

  const runWhatIfSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await api.riskPrediction.simulateWhatIf({
        ...params,
        ...simParams
      });
      setWhatIfResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();
    runPrediction();
  }, []);

  const getRiskColor = (level) => {
    if (level === 'Critical Risk') return '#EF4444';
    if (level === 'High Risk') return '#F97316';
    if (level === 'Medium Risk') return '#F59E0B';
    return '#10B981';
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
              MODULE 3 OF 6
            </span>
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
              XGBoost ML Classifier
            </span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Cpu className="text-primary" size={28} />
            Road Risk Prediction Module
          </h1>
          <p className="page-subtitle">
            Continuous 0–100 pavement failure risk inference powered by trained XGBoost models, feature importance extraction, and real-time sensitivity simulations.
          </p>
        </div>

        <button className="btn btn-primary" onClick={runPrediction} disabled={loading}>
          <Sparkles size={16} />
          <span>{loading ? "Evaluating..." : "Run ML Inference"}</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Left: Telemetry Controls */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} className="text-primary" />
            Corridor Physical Parameters
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                <span className="form-label">Pothole Count</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{params.pothole_count} surface craters</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                className="input-field"
                value={params.pothole_count}
                onChange={(e) => setParams({ ...params, pothole_count: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                <span className="form-label">Pothole Depth</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{params.pothole_depth} cm</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="25.0"
                step="0.5"
                className="input-field"
                value={params.pothole_depth}
                onChange={(e) => setParams({ ...params, pothole_depth: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                <span className="form-label">Crack Length</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{params.crack_length} m</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="150.0"
                step="5.0"
                className="input-field"
                value={params.crack_length}
                onChange={(e) => setParams({ ...params, crack_length: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                <span className="form-label">Pavement Age</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{params.road_age} yrs</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="20.0"
                step="0.5"
                className="input-field"
                value={params.road_age}
                onChange={(e) => setParams({ ...params, road_age: parseFloat(e.target.value) })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="form-label">Traffic Density</label>
                <select
                  className="input-field"
                  value={params.traffic_density}
                  onChange={(e) => setParams({ ...params, traffic_density: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Very High">Very High</option>
                </select>
              </div>

              <div>
                <label className="form-label">Rainfall Pattern</label>
                <select
                  className="input-field"
                  value={params.rainfall}
                  onChange={(e) => setParams({ ...params, rainfall: e.target.value })}
                >
                  <option value="Light">Light</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Heavy">Heavy</option>
                  <option value="Torrential">Torrential</option>
                </select>
              </div>
            </div>

            <button className="btn btn-primary" onClick={runPrediction} disabled={loading} style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
              <Zap size={16} />
              <span>{loading ? "Calculating..." : "Compute Prediction"}</span>
            </button>
          </div>
        </div>

        {/* Right: Prediction Output & Probabilities */}
        {prediction && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Score Gauge Card */}
            <div className="glass-card" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: '6px',
                background: getRiskColor(prediction.risk_level)
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Predicted Failure Risk Level
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: getRiskColor(prediction.risk_level), marginTop: '0.2rem' }}>
                    {prediction.risk_level}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confidence</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {prediction.confidence}%
                  </div>
                </div>
              </div>

              {/* Visual Continuous Score Bar */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Continuous Risk Score</span>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{prediction.risk_score} / 100</span>
                </div>
                <div style={{ height: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${prediction.risk_score}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, #10B981, #F59E0B, #EF4444)`,
                    transition: 'width 0.5s ease-out'
                  }} />
                </div>
              </div>

              {/* Class Probabilities Distribution */}
              {prediction.probabilities && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                    Multi-Class XGBoost Probability Distribution:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {Object.entries(prediction.probabilities).map(([cls, prob]) => (
                      <div key={cls} style={{
                        padding: '0.6rem',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.2)',
                        textAlign: 'center',
                        border: prediction.risk_level === cls ? `1px solid ${getRiskColor(cls)}` : '1px solid transparent'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cls.replace(' Risk', '')}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: getRiskColor(cls) }}>{prob}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Feature Impacts */}
            {prediction.feature_impacts && (
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={16} className="text-primary" />
                  Feature Contribution & Model Importance
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {prediction.feature_impacts.slice(0, 4).map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{f.feature}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.contribution}</span>
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}>{f.importance}% Weight</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* WHAT-IF SENSITIVITY SIMULATOR */}
      <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24' }}>Interactive Predictive Feature</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                "What-If" Sensitivity Simulator
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Dynamically stress-test future weather surges, traffic escalations, or wear deterioration to project risk score changes.
            </p>
          </div>

          <button className="btn btn-primary" onClick={runWhatIfSimulation} disabled={simLoading}>
            <Sparkles size={16} />
            <span>{simLoading ? "Simulating..." : "Run What-If Simulation"}</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
              <span className="form-label">Simulated Pothole Growth</span>
              <span style={{ fontWeight: 700, color: '#F87171' }}>+{simParams.delta_potholes_pct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              step="10"
              className="input-field"
              value={simParams.delta_potholes_pct}
              onChange={(e) => setSimParams({ ...simParams, delta_potholes_pct: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
              <span className="form-label">Simulated Crack Extension</span>
              <span style={{ fontWeight: 700, color: '#FBBF24' }}>+{simParams.delta_cracks_pct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              step="10"
              className="input-field"
              value={simParams.delta_cracks_pct}
              onChange={(e) => setSimParams({ ...simParams, delta_cracks_pct: parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <label className="form-label">Simulated Future Traffic</label>
            <select
              className="input-field"
              value={simParams.delta_traffic}
              onChange={(e) => setSimParams({ ...simParams, delta_traffic: e.target.value })}
            >
              <option value="Low">Low Traffic</option>
              <option value="Medium">Medium Traffic</option>
              <option value="High">High Traffic</option>
              <option value="Very High">Very High (Logistics Corridor)</option>
            </select>
          </div>

          <div>
            <label className="form-label">Simulated Future Monsoon</label>
            <select
              className="input-field"
              value={simParams.delta_rainfall}
              onChange={(e) => setSimParams({ ...simParams, delta_rainfall: e.target.value })}
            >
              <option value="Light">Light Rainfall</option>
              <option value="Moderate">Moderate Rainfall</option>
              <option value="Heavy">Heavy Monsoon</option>
              <option value="Torrential">Torrential Rain Surge</option>
            </select>
          </div>
        </div>

        {/* What-If Simulation Results */}
        {whatIfResult && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              {/* Baseline */}
              <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Baseline</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: getRiskColor(whatIfResult.baseline.risk_level) }}>
                  {whatIfResult.baseline.risk_score} / 100
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{whatIfResult.baseline.risk_level}</div>
              </div>

              {/* Arrow Delta Shift */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: whatIfResult.risk_delta >= 0 ? '#EF4444' : '#10B981' }}>
                  {whatIfResult.risk_delta >= 0 ? `+${whatIfResult.risk_delta}` : whatIfResult.risk_delta} pts
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Projected Shift</div>
              </div>

              {/* Simulated */}
              <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Simulated Risk Projection</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: getRiskColor(whatIfResult.simulated.risk_level) }}>
                  {whatIfResult.simulated.risk_score} / 100
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{whatIfResult.simulated.risk_level}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.9rem 1.1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <strong>AI Sensitivity Projection:</strong> {whatIfResult.analysis_narrative}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
