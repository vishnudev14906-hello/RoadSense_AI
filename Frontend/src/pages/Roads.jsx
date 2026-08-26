import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Sparkles, 
  Edit3, 
  Trash2, 
  FileText, 
  RefreshCw, 
  MapPin, 
  Car,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Info,
  Layers,
  X
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import RoadModal from '../components/RoadModal';
import DataToolsModal from '../components/DataToolsModal';
import { api } from '../api';
import { formatDate, formatTime, formatRelativeTime } from '../utils/dateUtils';

export default function Roads({ onOpenReport }) {
  const [roads, setRoads] = useState([]);
  const [filters, setFilters] = useState({
    states: [],
    districts: [],
    cities: [],
    surface_types: [],
    verification_statuses: ["Verified", "Source Available", "Derived from Source", "Not Available"],
    risk_levels: ["Low Risk", "Medium Risk", "High Risk", "Critical Risk"]
  });
  
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [surfaceFilter, setSurfaceFilter] = useState('All');
  const [verificationFilter, setVerificationFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [editingRoad, setEditingRoad] = useState(null);
  const [assessingId, setAssessingId] = useState(null);
  const [selectedProvenanceRoad, setSelectedProvenanceRoad] = useState(null);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadRoads();
  }, [search, stateFilter, districtFilter, cityFilter, surfaceFilter, verificationFilter, riskFilter]);

  const loadFilterOptions = async () => {
    try {
      const opts = await api.getRoadFilters();
      setFilters(opts);
    } catch (err) {
      console.error("Failed to load road filter options:", err);
    }
  };

  const loadRoads = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.getRoads({
        search: search || undefined,
        state: stateFilter !== 'All' ? stateFilter : undefined,
        district: districtFilter !== 'All' ? districtFilter : undefined,
        city: cityFilter !== 'All' ? cityFilter : undefined,
        surface_type: surfaceFilter !== 'All' ? surfaceFilter : undefined,
        verification_status: verificationFilter !== 'All' ? verificationFilter : undefined,
        risk_level: riskFilter !== 'All' ? riskFilter : undefined,
      });
      setRoads(data || []);
      setFetchError(null);
    } catch (err) {
      console.error("Failed to load roads:", err);
      setFetchError("Unable to connect to the backend service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoad = async (formData, roadId) => {
    if (roadId) {
      await api.updateRoad(roadId, formData);
    } else {
      await api.createRoad(formData);
    }
    loadFilterOptions();
    loadRoads();
  };

  const handleDeleteRoad = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from the network?`)) {
      try {
        await api.deleteRoad(id);
        loadRoads();
      } catch (err) {
        alert("Failed to delete road: " + err.message);
      }
    }
  };

  const handleQuickAssess = async (road) => {
    setAssessingId(road.id);
    try {
      await api.predictRoad({
        road_id: road.id,
        road_name: road.road_name,
        state: road.state,
        district: road.district,
        city: road.city,
        location: road.city || road.district || road.state,
        road_length_km: road.road_length_km || road.road_length,
        pothole_count: road.pothole_count,
        average_pothole_depth_cm: road.average_pothole_depth_cm || road.pothole_depth,
        total_crack_length_m: road.total_crack_length_m || road.crack_length,
        pavement_age_years: road.pavement_age_years || road.road_age,
        traffic_volume: road.traffic_volume || road.traffic_density,
        rainfall: road.rainfall,
        surface_type: road.surface_type,
        damage_type: road.damage_type,
        save_prediction: true
      });
      await loadRoads();
    } catch (err) {
      alert("AI Assessment failed: " + err.message);
    } finally {
      setAssessingId(null);
    }
  };

  const renderVerificationBadge = (status) => {
    const s = status || "Verified";
    let bg = 'rgba(16, 185, 129, 0.15)';
    let text = '#34D399';
    let border = 'rgba(16, 185, 129, 0.3)';
    let label = 'Verified Real Data';

    if (s === 'Derived from Source') {
      bg = 'rgba(59, 130, 246, 0.15)';
      text = '#60A5FA';
      border = 'rgba(59, 130, 246, 0.3)';
      label = 'Derived from Source';
    } else if (s === 'Source Available') {
      bg = 'rgba(245, 158, 11, 0.15)';
      text = '#FBBF24';
      border = 'rgba(245, 158, 11, 0.3)';
      label = 'Source Available';
    } else if (s === 'Not Available') {
      bg = 'rgba(156, 163, 175, 0.15)';
      text = '#9CA3AF';
      border = 'rgba(156, 163, 175, 0.3)';
      label = 'Data Not Available';
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        fontSize: '0.72rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '999px',
        backgroundColor: bg,
        color: text,
        border: `1px solid ${border}`,
        fontWeight: 600
      }}>
        <ShieldCheck size={12} />
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Road Network Asset Directory
            </h1>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34D399',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              Real Data Only
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Verified Indian road network inventory with full data provenance, measured distress parameters & AI risk evaluation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => setIsDataModalOpen(true)}
            title="Import/Export CSV Surveys"
          >
            <FileSpreadsheet size={16} color="#10B981" />
            <span>Municipal CSV Data Hub</span>
          </button>

          <button 
            className="btn btn-primary"
            onClick={() => { setEditingRoad(null); setIsModalOpen(true); }}
          >
            <Plus size={16} />
            <span>Register Road Asset</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search by road name, district, or city..."
              className="form-input"
              style={{ paddingLeft: '2.2rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* State Filter */}
          <div>
            <select
              className="form-select"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            >
              <option value="All">All Indian States</option>
              {filters.states.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div>
            <select
              className="form-select"
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
            >
              <option value="All">All Districts</option>
              {filters.districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* City / Municipality Filter */}
          <div>
            <select
              className="form-select"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            >
              <option value="All">All Municipalities</option>
              {filters.cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Road / Surface Type Filter */}
          <div>
            <select
              className="form-select"
              value={surfaceFilter}
              onChange={(e) => setSurfaceFilter(e.target.value)}
            >
              <option value="All">All Surface Types</option>
              {filters.surface_types.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Verification Status Filter */}
          <div>
            <select
              className="form-select"
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
            >
              <option value="All">All Verification Statuses</option>
              <option value="Verified">Verified Data Available</option>
              <option value="Derived from Source">Derived from Source</option>
              <option value="Source Available">Source Available</option>
              <option value="Not Available">Data Not Available</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <select
              className="form-select"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="All">All Risk Levels</option>
              <option value="Low Risk">Low Risk</option>
              <option value="Medium Risk">Medium Risk</option>
              <option value="High Risk">High Risk</option>
              <option value="Critical Risk">Critical Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Roads Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Road Asset & Region</th>
              <th>Length & Age</th>
              <th>Surface Distress</th>
              <th>Surface Type & Traffic</th>
              <th>AI Risk Status</th>
              <th>Data Verification</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <RefreshCw size={22} className="spin-animation" color="#3B82F6" />
                    <span>Querying verified road network records...</span>
                  </div>
                </td>
              </tr>
            ) : fetchError ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', maxWidth: '440px', margin: '0 auto' }}>
                    <span style={{ color: '#F87171', fontWeight: 600, fontSize: '0.92rem' }}>
                      {fetchError}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={loadRoads}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem', color: '#60A5FA', border: '1px solid rgba(96, 165, 250, 0.4)' }}
                    >
                      <RefreshCw size={14} />
                      <span>Retry</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : roads.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                  No road assets match the specified filters.
                </td>
              </tr>
            ) : (
              roads.map((road) => {
                const isAssessing = assessingId === road.id;
                const pred = road.latest_prediction;
                const rLen = road.road_length_km ?? road.road_length;
                const rAge = road.pavement_age_years ?? road.road_age;
                const pCnt = road.pothole_count;
                const pDep = road.average_pothole_depth_cm ?? road.pothole_depth;
                const cLen = road.total_crack_length_m ?? road.crack_length;

                return (
                  <tr key={road.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                        {road.road_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        <MapPin size={12} />
                        <span>{road.city || road.district || road.location || 'India'}, {road.state || ''}</span>
                      </div>
                    </td>

                    <td>
                      <div className="mono" style={{ fontSize: '0.85rem' }}>
                        {rLen !== null && rLen !== undefined ? `${rLen} km` : '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Age: {rAge !== null && rAge !== undefined ? `${rAge} yrs` : 'Not Available'}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        {pCnt !== null && pCnt !== undefined ? (
                          <span style={{ color: pCnt > 15 ? '#EF4444' : pCnt > 5 ? '#F59E0B' : '#10B981', fontWeight: 600 }}>
                            {pCnt} Potholes ({pDep !== null && pDep !== undefined ? `${pDep} cm` : '—'})
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>Potholes: Not Available</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Cracks: {cLen !== null && cLen !== undefined ? `${cLen} m` : 'Not Available'}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-main)' }}>
                        {road.surface_type || 'Bituminous'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {road.traffic_volume || road.traffic_density || 'Medium'} Traffic • {road.rainfall || 'Moderate'} Rain
                      </div>
                    </td>

                    <td>
                      {pred ? (
                        <div>
                          <RiskBadge level={pred.risk_level} size="sm" />
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                            Score: {pred.risk_score}/100
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Pending AI</span>
                      )}
                    </td>

                    <td>
                      <div 
                        onClick={() => setSelectedProvenanceRoad(road)} 
                        style={{ cursor: 'pointer' }}
                        title="Click to view full data provenance & source details"
                      >
                        {renderVerificationBadge(road.verification_status)}
                        {road.source_name && (
                          <div style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            marginTop: '0.2rem',
                            maxWidth: '160px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {road.source_name}
                          </div>
                        )}
                      </div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleQuickAssess(road)}
                          disabled={isAssessing}
                          title="Re-run AI Machine Learning Assessment"
                          style={{ color: '#60A5FA' }}
                        >
                          <Sparkles size={13} className={isAssessing ? 'spin-animation' : ''} />
                          <span>{isAssessing ? 'AI...' : 'Analyze'}</span>
                        </button>

                        <button
                          className="btn-icon"
                          onClick={() => setSelectedProvenanceRoad(road)}
                          title="View Data Provenance & Source Information"
                          style={{ color: '#34D399' }}
                        >
                          <Info size={15} />
                        </button>

                        <button
                          className="btn-icon"
                          onClick={() => onOpenReport(road)}
                          title="Generate Inspection Report"
                        >
                          <FileText size={15} />
                        </button>

                        <button
                          className="btn-icon"
                          onClick={() => { setEditingRoad(road); setIsModalOpen(true); }}
                          title="Edit Parameters"
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          className="btn-icon"
                          onClick={() => handleDeleteRoad(road.id, road.road_name)}
                          title="Delete Road"
                          style={{ color: '#F87171' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Data Source / Verification Provenance Modal */}
      {selectedProvenanceRoad && (
        <div className="modal-backdrop" onClick={() => setSelectedProvenanceRoad(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShieldCheck size={22} color="#34D399" />
                <div>
                  <h2 className="modal-title">Data Provenance & Verification Audit</h2>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {selectedProvenanceRoad.road_name}
                  </div>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedProvenanceRoad(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Verification Status Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Verification Classification</span>
                  {renderVerificationBadge(selectedProvenanceRoad.verification_status)}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.72rem' }}>Sponsoring Authority / Source</span>
                    <strong style={{ color: 'var(--text-main)' }}>{selectedProvenanceRoad.source_name || 'Official PWD / Municipal Asset Register'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.72rem' }}>Collection Method</span>
                    <strong style={{ color: 'var(--text-main)' }}>{selectedProvenanceRoad.data_collection_method || 'Field Visual Survey & Profilometry'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.72rem' }}>Survey Date</span>
                    <strong style={{ color: 'var(--text-main)' }}>{selectedProvenanceRoad.source_date || '2024'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.72rem' }}>GPS Coordinates (WGS-84)</span>
                    <strong className="mono" style={{ color: '#93C5FD' }}>
                      {selectedProvenanceRoad.latitude ? `${selectedProvenanceRoad.latitude.toFixed(4)}°N, ${selectedProvenanceRoad.longitude.toFixed(4)}°E` : 'Available'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Field Provenance Table */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.6rem' }}>
                  Field-Level Provenance Breakdown
                </h4>
                <div className="table-container">
                  <table className="custom-table" style={{ fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Recorded Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Road Length</td>
                        <td className="mono">{selectedProvenanceRoad.road_length_km ? `${selectedProvenanceRoad.road_length_km} km` : 'Not Available'}</td>
                        <td><span style={{ color: '#34D399' }}>Directly Sourced</span></td>
                      </tr>
                      <tr>
                        <td>Pothole Count</td>
                        <td className="mono">{selectedProvenanceRoad.pothole_count !== null ? selectedProvenanceRoad.pothole_count : 'Not Available'}</td>
                        <td><span style={{ color: '#34D399' }}>Measured Survey</span></td>
                      </tr>
                      <tr>
                        <td>Avg Pothole Depth</td>
                        <td className="mono">{selectedProvenanceRoad.average_pothole_depth_cm !== null ? `${selectedProvenanceRoad.average_pothole_depth_cm} cm` : 'Not Available'}</td>
                        <td><span style={{ color: '#34D399' }}>Measured Survey</span></td>
                      </tr>
                      <tr>
                        <td>Total Crack Length</td>
                        <td className="mono">{selectedProvenanceRoad.total_crack_length_m !== null ? `${selectedProvenanceRoad.total_crack_length_m} m` : 'Not Available'}</td>
                        <td><span style={{ color: '#34D399' }}>Measured Survey</span></td>
                      </tr>
                      <tr>
                        <td>Pavement Age</td>
                        <td className="mono">{selectedProvenanceRoad.pavement_age_years !== null ? `${selectedProvenanceRoad.pavement_age_years} yrs` : 'Not Available'}</td>
                        <td><span style={{ color: '#34D399' }}>Asset Registry</span></td>
                      </tr>
                      <tr>
                        <td>Failure Risk Level</td>
                        <td>{selectedProvenanceRoad.risk_level || 'Evaluated'}</td>
                        <td><span style={{ color: '#60A5FA' }}>Derived via XGBoost ML</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedProvenanceRoad(null)}>
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Road Modal */}
      <RoadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRoad}
        road={editingRoad}
      />

      {/* Municipal CSV & JSON Data Hub Modal */}
      <DataToolsModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onDataImported={loadRoads}
      />
    </div>
  );
}
