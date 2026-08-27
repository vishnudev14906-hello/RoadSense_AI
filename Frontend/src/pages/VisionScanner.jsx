import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Scan, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Sliders, 
  ArrowRight, 
  Cpu,
  RefreshCw,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { SAMPLE_INSPECTION_SCENARIOS } from '../utils/sampleScenarios';
import { compressImageForUpload } from '../utils/imageUtils';
import { api } from '../api';

export default function VisionScanner({ onTransferToPredictor }) {
  const [selectedScenario, setSelectedScenario] = useState(SAMPLE_INSPECTION_SCENARIOS[0]);
  const [customImage, setCustomImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);

  const handleSelectScenario = (scenario) => {
    setValidationError(null);
    setCustomImage(null);
    setSelectedScenario(scenario);
    triggerScanAnimation();
  };

  const triggerScanAnimation = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 900);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setValidationError(null);
        setIsScanning(true);
        const dataUrl = await compressImageForUpload(file, 1280, 0.88);
        if (!dataUrl) return;

        setCustomImage(dataUrl);
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        
        let scanRes;
        try {
          scanRes = await api.scanImage({
            image_base64: dataUrl,
            road_name: cleanName,
            location: 'Field Survey Ingestion'
          });
        } catch (apiErr) {
          setValidationError("Invalid image. Please upload a valid road image.");
          return;
        }

        if (!scanRes || scanRes.is_valid_road === false || !scanRes.risk_level) {
          setValidationError("Invalid image. Please upload a valid road image.");
          return;
        }

        setValidationError(null);
        setSelectedScenario({
          id: 'custom-upload',
          title: `Field Survey: ${file.name}`,
          location: 'Field Survey Ingestion',
          road_name: cleanName,
          imageUrl: dataUrl,
          description: scanRes.surface_condition_summary || 'Uploaded roadway photo segmented by neural computer vision pipeline.',
          detections: scanRes.detections || [],
          telemetry: {
            pothole_count: scanRes.pothole_count,
            pothole_depth: scanRes.pothole_depth,
            crack_length: scanRes.crack_length,
            road_age: scanRes.road_age,
            traffic_density: scanRes.traffic_density,
            rainfall: scanRes.rainfall,
            estimated_risk: scanRes.risk_level
          }
        });
      } catch (err) {
        console.error("Scan error:", err);
        setValidationError("Invalid image. Please upload a valid road image.");
      } finally {
        setIsScanning(false);
      }
    }
  };

  const activeScenario = selectedScenario;
  const filteredDetections = activeScenario.detections.filter(d => d.confidence >= confidenceThreshold);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <Scan size={24} color="#3B82F6" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Vision AI Automated Damage Scanner
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Convolutional Neural Network computer vision pipeline for automated pothole segmentation, crack detection & defect telemetry extraction
          </p>
        </div>

        {/* Upload Custom Photo Button */}
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            <span>Upload Road Photo</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={triggerScanAnimation}
            disabled={isScanning}
          >
            <RefreshCw size={16} className={isScanning ? 'spin-animation' : ''} />
            <span>{isScanning ? 'Scanning Pixels...' : 'Re-scan Image'}</span>
          </button>
        </div>
      </div>

      {/* Validation Error Alert Banner */}
      {validationError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#FCA5A5',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertTriangle size={22} color="#EF4444" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, color: '#EF4444', fontSize: '1rem' }}>
              Invalid image. Please upload a valid road image.
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              The uploaded file does not contain a recognizable roadway or asphalt pavement scene. The AI model will not process non-road images.
            </div>
          </div>
        </div>
      )}

      {/* Preset Scenarios Selector Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {SAMPLE_INSPECTION_SCENARIOS.map((scen) => {
          const isSelected = activeScenario.id === scen.id;
          return (
            <div
              key={scen.id}
              onClick={() => handleSelectScenario(scen)}
              className="glass-card"
              style={{
                padding: '0.85rem 1rem',
                cursor: 'pointer',
                border: isSelected ? '2px solid #3B82F6' : '1px solid var(--border-subtle)',
                background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#60A5FA', fontWeight: 700, textTransform: 'uppercase' }}>
                  Sample {scen.id.split('-')[0]}
                </span>
                <RiskBadge level={scen.telemetry.estimated_risk} size="sm" />
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {scen.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {scen.location}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Scanner Viewport & Detection Readout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
        {/* Left: Interactive Image Canvas with Bounding Boxes */}
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden', position: 'relative' }}>
          {/* Top Canvas Bar */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(15, 23, 42, 0.9)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#93C5FD' }}>
              <Camera size={15} />
              <span>{activeScenario.title}</span>
            </div>
          </div>

          {/* Image & Bounding Box Viewport */}
          <div style={{ position: 'relative', width: '100%', minHeight: '380px', maxHeight: '480px', backgroundColor: '#000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={activeScenario.imageUrl}
              alt={activeScenario.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />

            {/* Neural Network Scanner Beam Overlay */}
            {isScanning && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.3) 0%, rgba(6, 182, 212, 0.1) 50%, transparent 100%)',
                borderBottom: '3px solid #06B6D4',
                boxShadow: '0 0 20px #06B6D4',
                animation: 'slideUp 1.2s ease-in-out infinite'
              }} />
            )}
          </div>
        </div>

        {/* Right: Extracted Defect Telemetry & Simulator Transfer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
              <Cpu size={18} color="#3B82F6" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Extracted Damage Telemetry
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {activeScenario.description}
            </p>

            {/* Extracted Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Pothole Count</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (activeScenario.telemetry.pothole_count || 0) > 15 ? '#EF4444' : (activeScenario.telemetry.pothole_count || 0) > 5 ? '#F59E0B' : '#10B981' }} className="mono">
                  {activeScenario.telemetry.pothole_count !== undefined ? activeScenario.telemetry.pothole_count : 0} units
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Avg Depth: {activeScenario.telemetry.pothole_depth !== undefined ? activeScenario.telemetry.pothole_depth : (activeScenario.telemetry.average_pothole_depth_cm || 0)} cm</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Crack Fissures</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (activeScenario.telemetry.crack_length || activeScenario.telemetry.total_crack_length_m || 0) >= 50 ? '#EF4444' : (activeScenario.telemetry.crack_length || activeScenario.telemetry.total_crack_length_m || 0) >= 15 ? '#F59E0B' : '#10B981' }} className="mono">
                  {activeScenario.telemetry.crack_length !== undefined ? activeScenario.telemetry.crack_length : (activeScenario.telemetry.total_crack_length_m || 0)} m
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Fatigue & Longitudinal</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Pavement Age</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }} className="mono">
                  {activeScenario.telemetry.road_age !== undefined ? activeScenario.telemetry.road_age : (activeScenario.telemetry.pavement_age_years || 1.0)} yrs
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Surface Lifecycle Stage</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Hazard Classification</div>
                <div style={{ marginTop: '0.2rem' }}>
                  <RiskBadge level={activeScenario.telemetry.estimated_risk || activeScenario.telemetry.risk_level || 'Low Risk'} size="sm" />
                </div>
              </div>
            </div>

            {/* Seamless 1-Click Pipeline Transfer Button */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', gap: '0.6rem', padding: '0.85rem', fontSize: '0.95rem' }}
              onClick={() => onTransferToPredictor(activeScenario.telemetry, activeScenario.road_name, activeScenario.location, {
                imageUrl: activeScenario.imageUrl,
                detections: activeScenario.detections,
                title: activeScenario.title
              })}
            >
              <Sparkles size={18} />
              <span>Run Full Multi-Modal AI Assessment & Decision Synthesis</span>
              <ArrowRight size={16} />
            </button>
            <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
              Combines custom PyTorch CNN visual damage detection with corridor telemetry under IRC:82 standards
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
