import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Search, 
  MapPin, 
  ShieldCheck, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Flame,
  Wrench
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { api } from '../api';
import { formatDate, formatTime } from '../utils/dateUtils';

export default function Reports() {
  const [roads, setRoads] = useState([]);
  const [selectedRoad, setSelectedRoad] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoads();
  }, []);

  const loadRoads = async () => {
    setLoading(true);
    try {
      const data = await api.getRoads();
      setRoads(data);
      if (data.length > 0) {
        setSelectedRoad(data[0]);
      }
    } catch (err) {
      console.error("Failed to fetch roads for reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!roads.length) return;
    const headers = ["ID", "Road Name", "Location", "Length (km)", "Age (yrs)", "Potholes", "Depth (cm)", "Cracks (m)", "Traffic", "Rainfall", "Risk Level", "Risk Score", "Urgency Priority", "Action", "Estimated Budget"];
    const rows = roads.map(r => [
      r.id,
      `"${r.road_name}"`,
      `"${r.location}"`,
      r.road_length,
      r.road_age,
      r.pothole_count,
      r.pothole_depth,
      r.crack_length,
      r.traffic_density,
      r.rainfall,
      r.latest_prediction?.risk_level || 'N/A',
      r.latest_prediction?.risk_score || 'N/A',
      r.latest_prediction?.priority || 'N/A',
      `"${(r.latest_prediction?.recommendation || '').replace(/"/g, '""')}"`,
      `"${r.latest_prediction?.estimated_budget || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RoadSense_Network_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pred = selectedRoad?.latest_prediction;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header (Hidden in Print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Road Safety & Maintenance Audit Reports
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Generate and export certified engineering inspection audits & budgetary maintenance work plans
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV Audit</span>
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Report Document</span>
          </button>
        </div>
      </div>

      {/* Road Selector Bar (Hidden in Print) */}
      <div className="glass-card no-print" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Select Road Corridor for Detailed Audit:
          </span>
          <select
            className="form-select"
            style={{ maxWidth: '400px' }}
            value={selectedRoad?.id || ''}
            onChange={(e) => {
              const id = parseInt(e.target.value);
              const found = roads.find(r => r.id === id);
              if (found) setSelectedRoad(found);
            }}
          >
            {roads.map(r => (
              <option key={r.id} value={r.id}>
                {r.road_name} ({r.location}) - [{r.latest_prediction?.risk_level || 'Pending'}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Official Printable Report Document */}
      {selectedRoad && (
        <div className="glass-card" style={{ padding: '2.5rem', background: 'var(--bg-card)' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid var(--border-subtle)',
            paddingBottom: '1.5rem',
            marginBottom: '1.75rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '1rem'
                }}>
                  RS
                </div>
                <div>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    ROADSENSE AI INFRASTRUCTURE AUDIT
                  </h1>
                  <span style={{ fontSize: '0.75rem', color: '#60A5FA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Machine Learning Pavement Condition Index (PCI) Evaluation
                  </span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Certificate Number</div>
              <div style={{ fontSize: '1rem', fontWeight: 800 }} className="mono">
                RSAI-AUDIT-{selectedRoad.id.toString().padStart(5, '0')}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                Inspection Date: {formatDate(selectedRoad.latest_prediction?.prediction_date || selectedRoad.updated_at)} {formatTime(selectedRoad.latest_prediction?.prediction_date || selectedRoad.updated_at, true)}
              </div>
            </div>
          </div>

          {/* Road Specifications Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedRoad.road_name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <MapPin size={14} />
                  <span>Municipality of {selectedRoad.location}</span>
                </div>
              </div>
              <RiskBadge level={pred?.risk_level || 'Medium Risk'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Span</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }} className="mono">{selectedRoad.road_length} km</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Surface Age</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }} className="mono">{selectedRoad.road_age} Years</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Traffic Volume</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedRoad.traffic_density}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Rainfall Exposure</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedRoad.rainfall}</div>
              </div>
            </div>
          </div>

          {/* Distress Telemetry Table */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              1. Physical Distress Measurement
            </h4>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Distress Factor</th>
                    <th>Measured Metric</th>
                    <th>Structural Severity</th>
                    <th>Degradation Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Pothole Density</td>
                    <td className="mono">{selectedRoad.pothole_count} surface craters</td>
                    <td>{selectedRoad.pothole_count > 15 ? 'Critical High' : selectedRoad.pothole_count > 5 ? 'Moderate' : 'Within Limits'}</td>
                    <td>
                      <span style={{ color: selectedRoad.pothole_count > 15 ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                        {selectedRoad.pothole_count > 15 ? 'Structural Breach' : 'Superficial'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Average Crater Depth</td>
                    <td className="mono">{selectedRoad.pothole_depth} cm</td>
                    <td>{selectedRoad.pothole_depth >= 8.0 ? 'Immediate Hazard' : selectedRoad.pothole_depth >= 3.0 ? 'Elevated Concern' : 'Minor'}</td>
                    <td>
                      <span style={{ color: selectedRoad.pothole_depth >= 8.0 ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                        {selectedRoad.pothole_depth >= 8.0 ? 'Dangerous to Wheel Axles' : 'Tolerable'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Fatigue & Longitudinal Cracks</td>
                    <td className="mono">{selectedRoad.crack_length} meters</td>
                    <td>{selectedRoad.crack_length >= 50 ? 'Extensive Alligatoring' : 'Hairline Distress'}</td>
                    <td>
                      <span style={{ color: selectedRoad.crack_length >= 50 ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                        {selectedRoad.crack_length >= 50 ? 'Sub-base Infiltration' : 'Sealed Surface'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Decision & Remediation Plan */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.04))',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            marginBottom: '1.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <Wrench size={18} color="#60A5FA" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase' }}>
                2. AI Maintenance Agent Work Order Prescription
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Urgency Window</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F87171' }}>
                  [{pred?.priority?.toUpperCase() || 'ROUTINE'}] DISPATCH
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Budgetary Allocation Estimate</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34D399' }} className="mono">
                  {pred?.estimated_budget || '₹1,50,000 - ₹3,50,000'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recommended Remediation Action</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {pred?.recommendation || 'Standard scheduled road inspection.'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Reasoning Log</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '0.2rem' }}>
                {pred?.ai_reasoning || 'Evaluated combined impact of measured physical parameters against trained XGBoost decision trees.'}
              </p>
            </div>
          </div>

          {/* Signoff / Seal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              <div>RoadSense AI Machine Learning Core v1.0</div>
              <div>FastAPI Infrastructure & XGBoost Multi-Class Model</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid var(--border-subtle)', width: '200px', marginBottom: '0.4rem' }}></div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 600 }}>Supervising Civil Inspector</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Municipal Road Safety Board</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
