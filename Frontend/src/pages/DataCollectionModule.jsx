import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Upload, 
  Camera, 
  Radio, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Activity, 
  Layers,
  Sparkles,
  RefreshCw,
  MapPin,
  Car,
  CloudRain
} from 'lucide-react';
import { api } from '../api';

export default function DataCollectionModule({ onInspectRoad, onTransferToPredictor }) {
  const [activeTab, setActiveTab] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // 1. Manual Form State
  const [manualForm, setManualForm] = useState({
    road_name: '',
    location: 'Coimbatore',
    road_length: 3.5,
    road_age: 4.0,
    pothole_count: 8,
    pothole_depth: 5.5,
    crack_length: 35.0,
    traffic_density: 'High',
    rainfall: 'Moderate',
    latitude: 11.0168,
    longitude: 76.9558
  });

  // 2. Vision State
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [visionName, setVisionName] = useState('Avinashi Road Survey Corridor');
  const [visionLocation, setVisionLocation] = useState('Coimbatore');
  const [visionResult, setVisionResult] = useState(null);

  // 3. IoT Stream State
  const [iotForm, setIotForm] = useState({
    corridor_name: 'Trichy Road NH-81 Section',
    location: 'Coimbatore',
    sensor_sample_rate_hz: 100,
    vibration_amplitude_g: 1.4,
    surface_acoustic_db: 74.0,
    estimated_potholes: 6,
    estimated_depth_cm: 6.0,
    estimated_cracks_m: 24.0,
    traffic_density: 'High',
    rainfall: 'Heavy',
    latitude: 10.9992,
    longitude: 77.0095
  });

  // 4. Batch Ingestion State
  const [batchJson, setBatchJson] = useState(JSON.stringify([
    {
      road_name: "Thudiyalur Bypass Link",
      location: "Coimbatore",
      road_length: 4.2,
      road_age: 6.5,
      pothole_count: 12,
      pothole_depth: 7.2,
      crack_length: 48.0,
      traffic_density: "High",
      rainfall: "Heavy",
      latitude: 11.0750,
      longitude: 76.9380
    },
    {
      road_name: "Saravanampatti IT Expressway",
      location: "Coimbatore",
      road_length: 5.0,
      road_age: 2.0,
      pothole_count: 2,
      pothole_depth: 2.0,
      crack_length: 10.0,
      traffic_density: "Medium",
      rainfall: "Moderate",
      latitude: 11.0825,
      longitude: 76.9972
    }
  ], null, 2));

  const fetchSummary = async () => {
    try {
      const data = await api.dataCollection.getSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.dataCollection.submitManual(manualForm);
      setStatusMessage({ type: 'success', text: `✅ ${res.message} (Risk: ${res.risk_level} - ${res.risk_score}/100)` });
      fetchSummary();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `❌ Failed: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunVision = async () => {
    if (!imageBase64) {
      alert("Please select or upload a road surface image first.");
      return;
    }
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.scanImage({
        image_base64: imageBase64,
        road_name: visionName,
        location: visionLocation,
        save_prediction: true
      });
      setVisionResult(res);
      setStatusMessage({ type: 'success', text: `✨ Neural Vision detected ${res.pothole_count} potholes & ${res.crack_length}m cracks. Saved to SQLite database.` });
      fetchSummary();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `❌ Vision scan failed: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleIotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.dataCollection.simulateIoT(iotForm);
      setStatusMessage({ type: 'success', text: `⚡ Telemetry ingested from IoT Accelerometer Stream into SQLite. Road ID: ${res.road_id}` });
      fetchSummary();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `❌ IoT Ingestion failed: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const entries = JSON.parse(batchJson);
      const res = await api.dataCollection.submitBatch(entries);
      setStatusMessage({ type: 'success', text: `📦 ${res.message}` });
      fetchSummary();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `❌ Batch JSON invalid or ingestion failed: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header Banner */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
              MODULE 1 OF 6
            </span>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              SQLite Data Layer
            </span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Database className="text-primary" size={28} />
            Road Data Collection Module
          </h1>
          <p className="page-subtitle">
            Multi-source road physical telemetry intake engine: Field Inspector Surveys, Computer Vision Damage Detection, IoT Sensor Streams & Batch Dataset Ingestion into SQLite.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchSummary} title="Refresh SQLite summary">
          <RefreshCw size={16} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA' }}>
              <Layers size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SQLite Surveyed Corridors</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{summary.total_collected_corridors}</div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#F87171' }}>
              <Activity size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Avg Pothole Density</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{summary.average_pothole_count} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>potholes/corridor</span></div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24' }}>
              <Radio size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Avg Fatigue Cracks</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{summary.average_crack_length_m} <span style={{ fontSize: '0.85rem', fontWeight: 400 }}>meters</span></div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399' }}>
              <Database size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Database Engine</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34D399' }}>SQLite 3.x (roadsense.db)</div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {statusMessage && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          color: statusMessage.type === 'success' ? '#34D399' : '#F87171'
        }}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
        <button
          className={`btn ${activeTab === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('manual')}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          <Plus size={16} />
          <span>Manual Field Telemetry</span>
        </button>

        <button
          className={`btn ${activeTab === 'vision' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('vision')}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          <Camera size={16} />
          <span>Computer Vision Camera Scan</span>
        </button>

        <button
          className={`btn ${activeTab === 'iot' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('iot')}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          <Radio size={16} />
          <span>Simulated IoT Vibration Stream</span>
        </button>

        <button
          className={`btn ${activeTab === 'batch' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('batch')}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          <FileSpreadsheet size={16} />
          <span>Batch Dataset Ingestion (JSON/CSV)</span>
        </button>
      </div>

      {/* TAB 1: Manual Field Telemetry Form */}
      {activeTab === 'manual' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Field Survey Ingestion Form
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Directly collect field telemetry measurements and immediately register them in SQLite database.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-sm btn-secondary"
                onClick={() => setManualForm({
                  road_name: 'Avinashi Road Express Corridor',
                  location: 'Coimbatore',
                  road_length: 5.5,
                  road_age: 7.0,
                  pothole_count: 18,
                  pothole_depth: 9.5,
                  crack_length: 65.0,
                  traffic_density: 'Very High',
                  rainfall: 'Heavy',
                  latitude: 11.0285,
                  longitude: 77.0118
                })}
              >
                Load Critical Sample
              </button>
              <button 
                type="button" 
                className="btn btn-sm btn-secondary"
                onClick={() => setManualForm({
                  road_name: 'Mettupalayam Link Road',
                  location: 'Coimbatore',
                  road_length: 2.8,
                  road_age: 1.5,
                  pothole_count: 1,
                  pothole_depth: 1.5,
                  crack_length: 6.0,
                  traffic_density: 'Low',
                  rainfall: 'Light',
                  latitude: 11.0750,
                  longitude: 76.9380
                })}
              >
                Load Healthy Sample
              </button>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label className="form-label">Road / Corridor Name *</label>
              <input
                type="text"
                className="input-field"
                required
                placeholder="e.g. Trichy Road Flyover Corridor"
                value={manualForm.road_name}
                onChange={(e) => setManualForm({ ...manualForm, road_name: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">City / Region Location *</label>
              <input
                type="text"
                className="input-field"
                required
                placeholder="e.g. Coimbatore"
                value={manualForm.location}
                onChange={(e) => setManualForm({ ...manualForm, location: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">Corridor Length (km)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="input-field"
                value={manualForm.road_length}
                onChange={(e) => setManualForm({ ...manualForm, road_length: parseFloat(e.target.value) || 1.0 })}
              />
            </div>

            <div>
              <label className="form-label">Pavement Age (years)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="input-field"
                value={manualForm.road_age}
                onChange={(e) => setManualForm({ ...manualForm, road_age: parseFloat(e.target.value) || 1.0 })}
              />
            </div>

            <div>
              <label className="form-label">Detected Pothole Count</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={manualForm.pothole_count}
                onChange={(e) => setManualForm({ ...manualForm, pothole_count: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="form-label">Average Pothole Depth (cm)</label>
              <input
                type="number"
                step="0.1"
                min="0.0"
                className="input-field"
                value={manualForm.pothole_depth}
                onChange={(e) => setManualForm({ ...manualForm, pothole_depth: parseFloat(e.target.value) || 0.0 })}
              />
            </div>

            <div>
              <label className="form-label">Total Crack Length (meters)</label>
              <input
                type="number"
                step="0.5"
                min="0.0"
                className="input-field"
                value={manualForm.crack_length}
                onChange={(e) => setManualForm({ ...manualForm, crack_length: parseFloat(e.target.value) || 0.0 })}
              />
            </div>

            <div>
              <label className="form-label">Traffic Density Pattern</label>
              <select
                className="input-field"
                value={manualForm.traffic_density}
                onChange={(e) => setManualForm({ ...manualForm, traffic_density: e.target.value })}
              >
                <option value="Low">Low (Suburban / Local Access)</option>
                <option value="Medium">Medium (Commercial Arterial)</option>
                <option value="High">High (Major Highway / High Flow)</option>
                <option value="Very High">Very High (Freight Logistics Corridor)</option>
              </select>
            </div>

            <div>
              <label className="form-label">Precipitation Pattern</label>
              <select
                className="input-field"
                value={manualForm.rainfall}
                onChange={(e) => setManualForm({ ...manualForm, rainfall: e.target.value })}
              >
                <option value="Light">Light Rainfall (&lt; 200 mm/yr)</option>
                <option value="Moderate">Moderate Rainfall (200 - 800 mm/yr)</option>
                <option value="Heavy">Heavy Monsoon (800 - 1500 mm/yr)</option>
                <option value="Torrential">Torrential Rain (&gt; 1500 mm/yr)</option>
              </select>
            </div>

            <div>
              <label className="form-label">GPS Latitude</label>
              <input
                type="number"
                step="0.0001"
                className="input-field"
                value={manualForm.latitude}
                onChange={(e) => setManualForm({ ...manualForm, latitude: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="form-label">GPS Longitude</label>
              <input
                type="number"
                step="0.0001"
                className="input-field"
                value={manualForm.longitude}
                onChange={(e) => setManualForm({ ...manualForm, longitude: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.9rem' }}>
                <Plus size={18} />
                <span>{loading ? "Registering Telemetry..." : "Submit & Save to SQLite Database"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Computer Vision Image Scan */}
      {activeTab === 'vision' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            Computer Vision Telemetry Extractor
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Upload high-resolution camera imagery or drone drone orthomosaic photos to automatically detect asphalt potholes, fissures, and defect densities.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Target Road Corridor Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={visionName}
                  onChange={(e) => setVisionName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="input-field"
                  value={visionLocation}
                  onChange={(e) => setVisionLocation(e.target.value)}
                />
              </div>

              <div style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  id="vision-upload-input"
                />
                <label htmlFor="vision-upload-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <Upload size={32} className="text-primary" />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Click to Select Road Pavement Image</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supports JPG, PNG, WEBP high-res surveys</span>
                </label>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleRunVision}
                disabled={loading || !imageBase64}
                style={{ width: '100%', marginTop: '1.25rem', justifyContent: 'center' }}
              >
                <Sparkles size={18} />
                <span>{loading ? "Running Neural Vision..." : "Extract Physical Distress & Save to SQLite"}</span>
              </button>
            </div>

            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                Optical Inspection Preview & AI Detections
              </div>
              <div style={{
                height: '340px',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Road Survey" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Camera size={48} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <div>No Image Selected</div>
                  </div>
                )}
              </div>

              {visionResult && (
                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <div style={{ fontWeight: 700, color: '#60A5FA', marginBottom: '0.4rem' }}>Extracted Physical Telemetry:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div>Potholes: <strong>{visionResult.pothole_count}</strong></div>
                    <div>Avg Depth: <strong>{visionResult.pothole_depth} cm</strong></div>
                    <div>Crack Length: <strong>{visionResult.crack_length} m</strong></div>
                    <div>Risk Score: <strong>{visionResult.risk_score}/100</strong></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Simulated IoT Stream */}
      {activeTab === 'iot' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Vehicle IoT Telemetry Stream Simulator
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Simulates live telemetry from accelerometer, acoustic, and axle displacement sensors mounted on fleet vehicles.
              </p>
            </div>
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
              Live Telemetry Simulation
            </span>
          </div>

          <form onSubmit={handleIotSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label className="form-label">Corridor Name</label>
              <input
                type="text"
                className="input-field"
                value={iotForm.corridor_name}
                onChange={(e) => setIotForm({ ...iotForm, corridor_name: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">City Location</label>
              <input
                type="text"
                className="input-field"
                value={iotForm.location}
                onChange={(e) => setIotForm({ ...iotForm, location: e.target.value })}
              />
            </div>

            <div>
              <label className="form-label">Vibration Amplitude (g-force RMS: {iotForm.vibration_amplitude_g}g)</label>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.1"
                className="input-field"
                value={iotForm.vibration_amplitude_g}
                onChange={(e) => setIotForm({ ...iotForm, vibration_amplitude_g: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <label className="form-label">Surface Acoustic Emission ({iotForm.surface_acoustic_db} dB)</label>
              <input
                type="range"
                min="40.0"
                max="100.0"
                step="1.0"
                className="input-field"
                value={iotForm.surface_acoustic_db}
                onChange={(e) => setIotForm({ ...iotForm, surface_acoustic_db: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <label className="form-label">Traffic Density</label>
              <select
                className="input-field"
                value={iotForm.traffic_density}
                onChange={(e) => setIotForm({ ...iotForm, traffic_density: e.target.value })}
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
                value={iotForm.rainfall}
                onChange={(e) => setIotForm({ ...iotForm, rainfall: e.target.value })}
              >
                <option value="Light">Light</option>
                <option value="Moderate">Moderate</option>
                <option value="Heavy">Heavy</option>
                <option value="Torrential">Torrential</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                <Radio size={18} />
                <span>{loading ? "Streaming Telemetry..." : "Stream IoT Vibration Packet into SQLite"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Batch Dataset Ingestion */}
      {activeTab === 'batch' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            Batch Dataset Ingestion & Synchronizer
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Paste structured JSON or survey records to ingest multiple road corridors into the SQLite repository in one transaction.
          </p>

          <textarea
            className="input-field"
            rows="10"
            style={{ fontFamily: 'monospace', fontSize: '0.85rem', width: '100%', marginBottom: '1.25rem' }}
            value={batchJson}
            onChange={(e) => setBatchJson(e.target.value)}
          />

          <button
            className="btn btn-primary"
            onClick={handleBatchSubmit}
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <FileSpreadsheet size={18} />
            <span>{loading ? "Ingesting Batch Records..." : "Ingest Batch Dataset to SQLite Database"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
