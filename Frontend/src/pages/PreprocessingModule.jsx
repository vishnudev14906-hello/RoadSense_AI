import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Cpu, 
  CheckCircle2, 
  Layers, 
  ArrowRight, 
  RefreshCw, 
  FileCode, 
  Activity, 
  Gauge, 
  Compass,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api';

export default function PreprocessingModule() {
  const [params, setParams] = useState({
    pothole_count: 14,
    pothole_depth: 7.5,
    crack_length: 52.0,
    road_age: 6.0,
    road_length: 3.5,
    traffic_density: 'High',
    rainfall: 'Heavy'
  });

  const [loading, setLoading] = useState(false);
  const [inspectionResult, setInspectionResult] = useState(null);
  const [pipelineInfo, setPipelineInfo] = useState(null);

  const runInspection = async () => {
    setLoading(true);
    try {
      const res = await api.preprocessing.inspect(params);
      setInspectionResult(res);
    } catch (err) {
      console.error("Inspection error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelineInfo = async () => {
    try {
      const info = await api.preprocessing.getPipelineInfo();
      setPipelineInfo(info);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    runInspection();
    fetchPipelineInfo();
  }, []);

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header Banner */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#A78BFA', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
              MODULE 2 OF 6
            </span>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              Data Pipeline & Feature Engineering
            </span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sliders className="text-primary" size={28} />
            Data Preprocessing Module
          </h1>
          <p className="page-subtitle">
            Sanitizes raw physical telemetry, performs missing value imputation, executes categorical ordinal encoding, and computes composite PDI & Damage Density indices.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={runInspection} title="Re-run Pipeline">
          <RefreshCw size={16} />
          <span>Execute Pipeline</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Left: Input Telemetry Controls */}
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} className="text-primary" />
            Raw Telemetry Input Stream
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                <span className="form-label">Pothole Count</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{params.pothole_count} craters</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                className="input-field"
                value={params.pothole_count}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setParams({ ...params, pothole_count: val });
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                <span className="form-label">Average Pothole Depth (cm)</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{params.pothole_depth} cm</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                className="input-field"
                value={params.pothole_depth}
                onChange={(e) => setParams({ ...params, pothole_depth: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                <span className="form-label">Fatigue Crack Length (m)</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{params.crack_length} m</span>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                step="5"
                className="input-field"
                value={params.crack_length}
                onChange={(e) => setParams({ ...params, crack_length: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                <span className="form-label">Pavement Age (years)</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{params.road_age} yrs</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="20"
                step="0.5"
                className="input-field"
                value={params.road_age}
                onChange={(e) => setParams({ ...params, road_age: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                <span className="form-label">Corridor Length (km)</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{params.road_length} km</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="20"
                step="0.5"
                className="input-field"
                value={params.road_length}
                onChange={(e) => setParams({ ...params, road_length: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <label className="form-label">Traffic Density</label>
              <select
                className="input-field"
                value={params.traffic_density}
                onChange={(e) => setParams({ ...params, traffic_density: e.target.value })}
              >
                <option value="Low">Low (Ordinal = 1)</option>
                <option value="Medium">Medium (Ordinal = 2)</option>
                <option value="High">High (Ordinal = 3)</option>
                <option value="Very High">Very High (Ordinal = 4)</option>
              </select>
            </div>

            <div>
              <label className="form-label">Precipitation Pattern</label>
              <select
                className="input-field"
                value={params.rainfall}
                onChange={(e) => setParams({ ...params, rainfall: e.target.value })}
              >
                <option value="Light">Light (Ordinal = 1)</option>
                <option value="Moderate">Moderate (Ordinal = 2)</option>
                <option value="Heavy">Heavy (Ordinal = 3)</option>
                <option value="Torrential">Torrential (Ordinal = 4)</option>
              </select>
            </div>

            <button className="btn btn-primary" onClick={runInspection} disabled={loading} style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
              <RefreshCw size={16} />
              <span>{loading ? "Transforming..." : "Re-Calculate Preprocessing Pipeline"}</span>
            </button>
          </div>
        </div>

        {/* Right: Preprocessed Feature Tensor & Diagnostics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Engineered Indicators */}
          {inspectionResult && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PDI (Distress Index)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F87171', margin: '0.3rem 0' }}>
                  {inspectionResult.engineered_features.pavement_distress_index_pdi} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/100</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Composite distress penalty</div>
              </div>

              <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Damage Density</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FBBF24', margin: '0.3rem 0' }}>
                  {inspectionResult.engineered_features.surface_damage_density_per_km} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>def/km</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Defects per corridor km</div>
              </div>

              <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Environmental Factor</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60A5FA', margin: '0.3rem 0' }}>
                  {inspectionResult.engineered_features.environmental_stress_factor}x
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Traffic & rain multiplier</div>
              </div>

              <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fatigue Ratio</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34D399', margin: '0.3rem 0' }}>
                  {inspectionResult.engineered_features.structural_fatigue_ratio}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Crack-to-age progression</div>
              </div>
            </div>
          )}

          {/* Transformation Matrix */}
          {inspectionResult && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={16} className="text-primary" />
                Raw vs. Preprocessed Feature Tensor
              </h3>

              <div className="table-responsive">
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Feature Name</th>
                      <th>Raw Telemetry</th>
                      <th>Cleaned Value</th>
                      <th>Numerical Encoding</th>
                      <th>Normalized ML Vector (0-1)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Pothole Density</strong></td>
                      <td>{inspectionResult.raw_input.pothole_count} units</td>
                      <td>{inspectionResult.cleaned_input.pothole_count_clean}</td>
                      <td><code>int({inspectionResult.cleaned_input.pothole_count_clean})</code></td>
                      <td><span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}>{inspectionResult.normalized_feature_vector.norm_pothole_count}</span></td>
                    </tr>
                    <tr>
                      <td><strong>Pothole Depth</strong></td>
                      <td>{inspectionResult.raw_input.pothole_depth} cm</td>
                      <td>{inspectionResult.cleaned_input.pothole_depth_clean} cm</td>
                      <td><code>float({inspectionResult.cleaned_input.pothole_depth_clean})</code></td>
                      <td><span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}>{inspectionResult.normalized_feature_vector.norm_pothole_depth}</span></td>
                    </tr>
                    <tr>
                      <td><strong>Crack Length</strong></td>
                      <td>{inspectionResult.raw_input.crack_length} m</td>
                      <td>{inspectionResult.cleaned_input.crack_length_clean} m</td>
                      <td><code>float({inspectionResult.cleaned_input.crack_length_clean})</code></td>
                      <td><span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}>{inspectionResult.normalized_feature_vector.norm_crack_length}</span></td>
                    </tr>
                    <tr>
                      <td><strong>Pavement Age</strong></td>
                      <td>{inspectionResult.raw_input.road_age} yrs</td>
                      <td>{inspectionResult.cleaned_input.road_age_clean} yrs</td>
                      <td><code>float({inspectionResult.cleaned_input.road_age_clean})</code></td>
                      <td><span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}>{inspectionResult.normalized_feature_vector.norm_road_age}</span></td>
                    </tr>
                    <tr>
                      <td><strong>Traffic Density</strong></td>
                      <td>{inspectionResult.raw_input.traffic_density}</td>
                      <td>{inspectionResult.cleaned_input.traffic_density}</td>
                      <td><code>{inspectionResult.numerical_encodings.traffic_num} (Ordinal)</code></td>
                      <td><span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}>{inspectionResult.normalized_feature_vector.norm_traffic}</span></td>
                    </tr>
                    <tr>
                      <td><strong>Precipitation</strong></td>
                      <td>{inspectionResult.raw_input.rainfall}</td>
                      <td>{inspectionResult.cleaned_input.rainfall}</td>
                      <td><code>{inspectionResult.numerical_encodings.rain_num} (Ordinal)</code></td>
                      <td><span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}>{inspectionResult.normalized_feature_vector.norm_rainfall}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Execution Pipeline Logs */}
          {inspectionResult && (
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} className="text-success" />
                Pipeline Execution Steps & Sanitization Logs
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {inspectionResult.preprocessing_log.map((step, idx) => (
                  <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.65rem', borderRadius: '6px' }}>
                    &gt; {step}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
