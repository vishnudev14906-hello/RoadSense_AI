import React, { useState, useRef } from 'react';
import { X, Download, Upload, FileSpreadsheet, FileJson, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../api';

export default function DataToolsModal({ isOpen, onClose, onDataImported }) {
  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleExportCsv = async () => {
    try {
      const roads = await api.getRoads();
      if (!roads || roads.length === 0) {
        alert("No road records available to export.");
        return;
      }

      const headers = [
        "Road ID", "Road Name", "Municipality", "Length (km)", "Pavement Age (yrs)",
        "Pothole Count", "Pothole Depth (cm)", "Crack Length (m)", "Traffic Density",
        "Rainfall Exposure", "Latest Risk Level", "Latest Risk Score", "Estimated Budget", "Recommendation"
      ];

      const rows = roads.map(r => {
        const latest = r.predictions && r.predictions[0];
        return [
          r.id,
          `"${r.road_name.replace(/"/g, '""')}"`,
          `"${r.location.replace(/"/g, '""')}"`,
          r.road_length || 1.0,
          r.road_age || 0.0,
          r.pothole_count,
          r.pothole_depth,
          r.crack_length,
          `"${r.traffic_density}"`,
          `"${r.rainfall}"`,
          `"${latest ? latest.risk_level : 'Medium Risk'}"`,
          latest ? latest.risk_score : 50.0,
          `"${(latest ? latest.estimated_budget : '').replace(/"/g, '""')}"`,
          `"${(latest ? latest.recommendation : '').replace(/"/g, '""')}"`
        ];
      });

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `roadsense_municipal_audit_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to export CSV: " + err.message);
    }
  };

  const handleExportJson = async () => {
    try {
      window.location.href = api.getDatabaseJsonExportUrl();
    } catch (err) {
      alert("Failed to export JSON: " + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const isJson = file.name.endsWith('.json');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        if (isJson) {
          const jsonData = JSON.parse(text);
          const res = await api.importDatabaseJson(Array.isArray(jsonData) ? jsonData : [jsonData]);
          setSuccessMsg(`✅ Successfully imported ${res.imported_count} real-world road corridors from JSON database!`);
          if (onDataImported) onDataImported();
        } else {
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length <= 1) {
            throw new Error("CSV file is empty or missing data rows.");
          }

          let importedCount = 0;
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
            if (cols.length >= 3) {
              const roadName = cols[1] || cols[0];
              const location = cols[2] || 'Coimbatore';
              const potholeCount = parseInt(cols[5]) || 0;
              const potholeDepth = parseFloat(cols[6]) || 0.0;
              const crackLength = parseFloat(cols[7]) || 0.0;
              const trafficDensity = cols[8] || 'Medium';
              const rainfall = cols[9] || 'Moderate';
              const roadLength = parseFloat(cols[3]) || 1.0;
              const roadAge = parseFloat(cols[4]) || 1.0;

              await api.createRoad({
                road_name: roadName,
                location: location,
                pothole_count: potholeCount,
                pothole_depth: potholeDepth,
                crack_length: crackLength,
                traffic_density: trafficDensity,
                rainfall: rainfall,
                road_length: roadLength,
                road_age: roadAge
              });
              importedCount++;
            }
          }

          setSuccessMsg(`Successfully imported & batch-assessed ${importedCount} real road corridor records from CSV!`);
          if (onDataImported) onDataImported();
        }
      } catch (err) {
        setErrorMsg("Failed to parse file: " + err.message);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };


  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileSpreadsheet size={20} color="#3B82F6" />
            <h2 className="modal-title">Municipal Data Tools & Dataset Hub</h2>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Export municipal road network audit data or batch import field inspection surveys directly into RoadSense AI.
          </p>

          {successMsg && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34D399', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Export Section */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              📥 Export RoadSense Network Data
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button className="btn btn-secondary" onClick={handleExportCsv}>
                <FileSpreadsheet size={15} color="#10B981" />
                <span>Export to CSV</span>
              </button>
              <button className="btn btn-secondary" onClick={handleExportJson}>
                <FileJson size={15} color="#3B82F6" />
                <span>Export JSON Dump</span>
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              📤 Ingest Real Road Database or Survey (JSON / CSV)
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
              Upload a real-world database JSON dump or inspection spreadsheet containing verified road corridors and distress telemetry.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.csv"
              style={{ display: 'none' }}
            />
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload size={16} />
              <span>{importing ? 'Ingesting Dataset...' : 'Select & Ingest Database (JSON / CSV)'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
