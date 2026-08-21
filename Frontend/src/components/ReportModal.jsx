import React from 'react';
import { X, Printer, ShieldCheck, Download, Calendar, MapPin, Activity, Wrench, AlertTriangle } from 'lucide-react';
import RiskBadge from './RiskBadge';
import { formatDate, formatTime } from '../utils/dateUtils';

export default function ReportModal({ isOpen, onClose, road = null, prediction = null }) {
  if (!isOpen || (!road && !prediction)) return null;

  const data = prediction || (road?.latest_prediction ? { ...road.latest_prediction, road_name: road.road_name, location: road.location } : road);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={20} color="#10B981" />
            <h2 className="modal-title">Official Road Inspection & AI Maintenance Report</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
            <button className="btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '2rem' }}>
          {/* Official Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid var(--border-subtle)',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  RS
                </div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>ROADSENSE AI</h1>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Department of Municipal Transportation & Infrastructure Safety
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AUDIT CERTIFICATE</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }} className="mono">
                RSAI-{(data?.id || Math.floor(Math.random() * 90000 + 10000)).toString().padStart(6, '0')}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                Inspection Timestamp: {formatDate(data?.prediction_date || data?.created_at || new Date())} {formatTime(data?.prediction_date || data?.created_at || new Date(), true)}
              </div>
            </div>
          </div>

          {/* Road Identity Block */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {data?.road_name || 'Road Asset Corridor'}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <MapPin size={14} />
                  <span>{data?.location || 'Unspecified Location'}</span>
                </div>
              </div>
              <RiskBadge level={data?.risk_level || 'Medium Risk'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.8rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Length</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }} className="mono">{data?.road_length || 1.0} km</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Pavement Age</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }} className="mono">{data?.road_age} Years</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Traffic Load</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{data?.traffic_density}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Precipitation</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{data?.rainfall}</div>
              </div>
            </div>
          </div>

          {/* Distress Telemetry Table */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
              1. Physical Distress Telemetry
            </h4>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Distress Parameter</th>
                    <th>Measured Value</th>
                    <th>Critical Threshold</th>
                    <th>Distress Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Pothole Frequency</td>
                    <td className="mono">{data?.pothole_count} units</td>
                    <td className="mono">&gt; 15 units</td>
                    <td>
                      <span style={{ color: data?.pothole_count >= 15 ? '#EF4444' : data?.pothole_count >= 5 ? '#F59E0B' : '#10B981', fontWeight: 600 }}>
                        {data?.pothole_count >= 15 ? 'Severe' : data?.pothole_count >= 5 ? 'Moderate' : 'Low'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Average Pothole Depth</td>
                    <td className="mono">{data?.pothole_depth} cm</td>
                    <td className="mono">&gt; 8.0 cm</td>
                    <td>
                      <span style={{ color: data?.pothole_depth >= 8.0 ? '#EF4444' : data?.pothole_depth >= 3.0 ? '#F59E0B' : '#10B981', fontWeight: 600 }}>
                        {data?.pothole_depth >= 8.0 ? 'Hazardous Crater' : data?.pothole_depth >= 3.0 ? 'Developing' : 'Surface Wear'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Longitudinal & Fatigue Cracking</td>
                    <td className="mono">{data?.crack_length} meters</td>
                    <td className="mono">&gt; 50.0 m</td>
                    <td>
                      <span style={{ color: data?.crack_length >= 50.0 ? '#EF4444' : data?.crack_length >= 20.0 ? '#F59E0B' : '#10B981', fontWeight: 600 }}>
                        {data?.crack_length >= 50.0 ? 'Structural Failure' : data?.crack_length >= 20.0 ? 'Fatigue Distress' : 'Hairline'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Decision & Engineering Recommendation */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.04))',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Wrench size={16} />
              <span>2. AI Maintenance Agent Prescription</span>
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Urgency Priority</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F87171' }}>
                  [{data?.priority?.toUpperCase() || 'ROUTINE'}] DISPATCH
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimated Budget Scope</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34D399' }} className="mono">
                  {data?.estimated_budget || '₹1,20,000 - ₹2,80,000'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prescribed Action</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {data?.recommendation || data?.action || 'Regular surface monitoring and preventive crack sealing.'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Causal Reasoning</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '0.2rem' }}>
                {data?.ai_reasoning || data?.reason || 'Multi-variate XGBoost model evaluates surface distress index with traffic loading multiplier.'}
              </p>
            </div>
          </div>

          {/* Signoff / Seal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              <div>Generated by RoadSense AI Framework v1.0</div>
              <div>FastAPI Engine + XGBoost Multi-Class Classifier</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid var(--border-subtle)', width: '180px', marginBottom: '0.3rem' }}></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Authorized Civil Engineer</div>
            </div>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Report</span>
          </button>
        </div>
      </div>
    </div>
  );
}
