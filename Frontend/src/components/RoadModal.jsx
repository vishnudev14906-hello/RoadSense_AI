import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

export default function RoadModal({ isOpen, onClose, onSave, road = null }) {
  const [formData, setFormData] = useState({
    road_name: '',
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    city: 'Coimbatore',
    road_length_km: '2.5',
    pavement_age_years: '4.0',
    pothole_count: '5',
    average_pothole_depth_cm: '4.0',
    total_crack_length_m: '20.0',
    surface_type: 'Bituminous Concrete (BC)',
    traffic_volume: 'Medium',
    rainfall: 'Moderate',
    damage_type: 'Potholes & Minor Cracks',
    source_name: 'Field Inspector Survey',
    source_url: 'https://data.gov.in/',
    verification_status: 'Verified',
    latitude: '',
    longitude: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (road) {
      setFormData({
        road_name: road.road_name || '',
        state: road.state || 'Tamil Nadu',
        district: road.district || 'Coimbatore',
        city: road.city || road.location || 'Coimbatore',
        road_length_km: String(road.road_length_km ?? road.road_length ?? '2.5'),
        pavement_age_years: String(road.pavement_age_years ?? road.road_age ?? '4.0'),
        pothole_count: String(road.pothole_count ?? '5'),
        average_pothole_depth_cm: String(road.average_pothole_depth_cm ?? road.pothole_depth ?? '4.0'),
        total_crack_length_m: String(road.total_crack_length_m ?? road.crack_length ?? '20.0'),
        surface_type: road.surface_type || 'Bituminous Concrete (BC)',
        traffic_volume: road.traffic_volume || road.traffic_density || 'Medium',
        rainfall: road.rainfall || 'Moderate',
        damage_type: road.damage_type || 'Surface Distress',
        source_name: road.source_name || 'Official Municipal / PWD Survey',
        source_url: road.source_url || 'https://data.gov.in/',
        verification_status: road.verification_status || 'Verified',
        latitude: road.latitude ? String(road.latitude) : '',
        longitude: road.longitude ? String(road.longitude) : '',
      });
    } else {
      setFormData({
        road_name: '',
        state: 'Tamil Nadu',
        district: 'Coimbatore',
        city: 'Coimbatore',
        road_length_km: '3.0',
        pavement_age_years: '3.5',
        pothole_count: '4',
        average_pothole_depth_cm: '3.5',
        total_crack_length_m: '15.0',
        surface_type: 'Bituminous Concrete (BC)',
        traffic_volume: 'Medium',
        rainfall: 'Moderate',
        damage_type: 'Shallow Potholes',
        source_name: 'Official Municipal / PWD Survey',
        source_url: 'https://data.gov.in/',
        verification_status: 'Verified',
        latitude: '',
        longitude: '',
      });
    }
    setError('');
  }, [road, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.road_name.trim()) {
      setError('Road name is required');
      return;
    }

    const r_len = parseFloat(formData.road_length_km);
    if (isNaN(r_len) || r_len <= 0) {
      setError('Road length must be strictly greater than 0 km');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload = {
        road_name: formData.road_name.trim(),
        state: formData.state.trim(),
        district: formData.district.trim(),
        city: formData.city.trim(),
        location: formData.city.trim(),
        road_length_km: r_len,
        road_length: r_len,
        pavement_age_years: Math.max(0, parseFloat(formData.pavement_age_years) || 1.0),
        pothole_count: Math.max(0, parseInt(formData.pothole_count) || 0),
        average_pothole_depth_cm: Math.max(0, parseFloat(formData.average_pothole_depth_cm) || 0.0),
        total_crack_length_m: Math.max(0, parseFloat(formData.total_crack_length_m) || 0.0),
        surface_type: formData.surface_type,
        traffic_volume: formData.traffic_volume,
        rainfall: formData.rainfall,
        damage_type: formData.damage_type,
        source_name: formData.source_name,
        source_url: formData.source_url,
        verification_status: formData.verification_status,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };
      await onSave(payload, road ? road.id : null);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save road');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h2 className="modal-title">{road ? 'Edit Road Asset & Telemetry' : 'Register Verified Road Asset'}</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#F87171',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Road Name / Corridor Designation</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Avinashi Road Arterial Corridor"
                  value={formData.road_name}
                  onChange={(e) => setFormData({ ...formData, road_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Tamil Nadu, Karnataka, Maharashtra"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">District</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Coimbatore, Chennai, Bengaluru Urban"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">City / Municipality</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Coimbatore, Chennai, Mumbai"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Road Length (km)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="form-input"
                  value={formData.road_length_km}
                  onChange={(e) => setFormData({ ...formData, road_length_km: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Surface / Pavement Type</label>
                <select
                  className="form-select"
                  value={formData.surface_type}
                  onChange={(e) => setFormData({ ...formData, surface_type: e.target.value })}
                >
                  <option value="Bituminous Concrete (BC)">Bituminous Concrete (BC)</option>
                  <option value="Dense Bituminous Macadam (DBM)">Dense Bituminous Macadam (DBM)</option>
                  <option value="Semi-Dense Bituminous Concrete (SDBC)">Semi-Dense Bituminous Concrete (SDBC)</option>
                  <option value="Rigid PQC Concrete">Rigid PQC Concrete</option>
                  <option value="Paver Block & Asphalt">Paver Block & Asphalt</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Pavement Age (Years)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-input"
                  value={formData.pavement_age_years}
                  onChange={(e) => setFormData({ ...formData, pavement_age_years: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pothole Count</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.pothole_count}
                  onChange={(e) => setFormData({ ...formData, pothole_count: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Avg Pothole Depth (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="form-input"
                  value={formData.average_pothole_depth_cm}
                  onChange={(e) => setFormData({ ...formData, average_pothole_depth_cm: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Crack Length (m)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-input"
                  value={formData.total_crack_length_m}
                  onChange={(e) => setFormData({ ...formData, total_crack_length_m: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Traffic Volume</label>
                <select
                  className="form-select"
                  value={formData.traffic_volume}
                  onChange={(e) => setFormData({ ...formData, traffic_volume: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Very High">Very High</option>
                </select>
              </div>

              {/* Provenance Fields */}
              <div className="form-group">
                <label className="form-label">Data Source Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Tamil Nadu Highways / CCMC Register"
                  value={formData.source_name}
                  onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Data Verification Status</label>
                <select
                  className="form-select"
                  value={formData.verification_status}
                  onChange={(e) => setFormData({ ...formData, verification_status: e.target.value })}
                >
                  <option value="Verified">Verified</option>
                  <option value="Source Available">Source Available</option>
                  <option value="Derived from Source">Derived from Source</option>
                  <option value="Not Available">Not Available</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Source URL / Open Portal Link</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://tnhighways.tn.gov.in/ or https://data.gov.in/"
                  value={formData.source_url}
                  onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Check size={16} />
              <span>{loading ? 'Saving...' : road ? 'Update Road Asset' : 'Register & Run AI'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
