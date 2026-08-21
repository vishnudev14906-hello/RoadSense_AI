import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  MapPin, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Printer, 
  RefreshCw, 
  Layers, 
  BarChart3, 
  Compass, 
  Calendar,
  IndianRupee,
  Eye
} from 'lucide-react';
import { api } from '../api';

export default function MonitoringReportingModule({ onOpenReport }) {
  const [kpis, setKpis] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [selectedRoadId, setSelectedRoadId] = useState(null);
  const [auditReport, setAuditReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchMonitoringData = async () => {
    setLoading(true);
    try {
      const [kpiRes, hazardRes] = await Promise.all([
        api.monitoringReporting.getKPIs(),
        api.monitoringReporting.getGISHazards()
      ]);
      setKpis(kpiRes);
      setHazards(hazardRes);
      if (hazardRes.length > 0 && !selectedRoadId) {
        setSelectedRoadId(hazardRes[0].road_id);
        fetchAuditReport(hazardRes[0].road_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditReport = async (roadId) => {
    if (!roadId) return;
    setReportLoading(true);
    try {
      const report = await api.monitoringReporting.getAuditReport(roadId);
      setAuditReport(report);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  const getRiskColor = (level) => {
    if (level === 'Critical Risk') return '#EF4444';
    if (level === 'High Risk') return '#F97316';
    if (level === 'Medium Risk') return '#F59E0B';
    return '#10B981';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              MODULE 6 OF 6
            </span>
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
              Real-Time GIS & Audit Engine
            </span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText className="text-primary" size={28} />
            Road Risk Monitoring & Reporting Module
          </h1>
          <p className="page-subtitle">
            Continuous spatial hazard monitoring, network health KPIs, accredited civil engineering inspection audit reports, and CSV dataset export.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a
            href={api.monitoringReporting.getExportCsvUrl()}
            className="btn btn-secondary"
            download="roadsense_risk_monitoring_export.csv"
          >
            <Download size={16} />
            <span>Export SQLite CSV</span>
          </a>

          <button className="btn btn-secondary" onClick={fetchMonitoringData} disabled={loading}>
            <RefreshCw size={16} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* Network Health KPI Dashboard */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399' }}>
              <Activity size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Network Health Index</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#34D399' }}>
                {kpis.network_health_score} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>/100</span>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA' }}>
              <Compass size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Monitored Corridors</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {kpis.total_monitored_corridors}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Urgent Action Items</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#EF4444' }}>
                {kpis.urgent_repair_actions_required}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24' }}>
              <BarChart3 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Critical / High Risk</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#FBBF24' }}>
                {(kpis.risk_breakdown['Critical Risk'] || 0) + (kpis.risk_breakdown['High Risk'] || 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: GIS Spatial Hazard Monitor & Audit Report Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr', gap: '1.5rem' }}>
        {/* Left: GIS Spatial Hazard Monitor List */}
        <div className="glass-card" style={{ padding: '1.5rem', maxHeight: '720px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} className="text-primary" />
              GIS Spatial Hazard Telemetry
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {hazards.length} GPS Corridors
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {hazards.map((h) => {
              const isSelected = selectedRoadId === h.road_id;
              const rColor = getRiskColor(h.risk_level);
              return (
                <div
                  key={h.road_id}
                  onClick={() => {
                    setSelectedRoadId(h.road_id);
                    fetchAuditReport(h.road_id);
                  }}
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid #3B82F6' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      {h.road_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.6rem' }}>
                      <span>{h.location}</span>
                      <span>•</span>
                      <span>GPS: {h.latitude.toFixed(4)}°, {h.longitude.toFixed(4)}°</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                      {h.pothole_count} potholes | {h.crack_length}m cracks
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className="badge" style={{ background: `${rColor}22`, color: rColor, fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'inline-block' }}>
                      {h.risk_level}
                    </span>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {h.risk_score} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>/100</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Formal Civil Infrastructure Inspection & Audit Report Card */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} className="text-primary" />
              Civil Infrastructure Audit Report
            </h2>

            {auditReport && (
              <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
                <Printer size={14} />
                <span>Print / Export PDF</span>
              </button>
            )}
          </div>

          {reportLoading && (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
              <div>Generating Accredited Civil Audit Report...</div>
            </div>
          )}

          {!reportLoading && auditReport && (
            <div style={{
              background: 'rgba(0,0,0,0.25)',
              borderRadius: '12px',
              padding: '1.75rem',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              {/* Report Header Metadata */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Document Audit ID</div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#60A5FA', fontFamily: 'monospace' }}>
                    {auditReport.report_id}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generated Date</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {auditReport.generation_date}
                  </div>
                </div>
              </div>

              {/* Corridor Particulars */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div><strong>Corridor:</strong> {auditReport.road_name}</div>
                <div><strong>Location:</strong> {auditReport.location}</div>
                <div><strong>Coordinates:</strong> {auditReport.coordinates}</div>
                <div><strong>Length / Age:</strong> {auditReport.corridor_length_km} km / {auditReport.pavement_age_years} yrs</div>
              </div>

              {/* Safety Evaluation Banner */}
              <div style={{
                padding: '1rem 1.25rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                borderLeft: `4px solid ${getRiskColor(auditReport.risk_level)}`,
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 800, color: getRiskColor(auditReport.risk_level), fontSize: '1.1rem' }}>
                    {auditReport.risk_level} (Score: {auditReport.risk_score}/100)
                  </span>
                  <span className="badge" style={{ background: 'rgba(59,130,246,0.2)', color: '#60A5FA' }}>
                    Confidence: {auditReport.confidence_pct}%
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Urgency Priority: <strong>{auditReport.urgency_priority}</strong> | Inspection Deadline: <strong>{auditReport.inspection_deadline}</strong>
                </div>
              </div>

              {/* Condition Narrative */}
              <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong>Condition Assessment:</strong> {auditReport.condition_summary}
              </div>

              {/* Prescribed Action & Budget */}
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                marginBottom: '1.25rem'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#34D399', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Prescribed Civil Engineering Intervention:
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {auditReport.engineering_recommendation}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#34D399', fontWeight: 700 }}>
                  Estimated Municipal Budget: {auditReport.estimated_budget_inr}
                </div>
              </div>

              {/* Signoff */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', textAlign: 'center' }}>
                {auditReport.ai_audit_signoff}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
