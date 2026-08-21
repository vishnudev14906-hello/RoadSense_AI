import React, { useState, useEffect } from 'react';
import { 
  ListOrdered, 
  Filter, 
  MapPin, 
  Truck, 
  CheckCircle, 
  FileText, 
  AlertTriangle,
  ArrowRight,
  Search,
  Activity,
  Layers,
  CloudRain,
  Car,
  Calendar,
  Sparkles,
  ShieldAlert,
  RefreshCw,
  Sliders,
  DollarSign,
  Coins,
  CheckCircle2,
  Clock
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import { api } from '../api';
import { formatDate, formatTime, formatRelativeTime } from '../utils/dateUtils';

export default function Prioritization({ onOpenReport }) {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' or 'budget'
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [dispatchedRoads, setDispatchedRoads] = useState({});

  // Budget Optimizer State
  const [budgetLakhs, setBudgetLakhs] = useState(50.0);
  const [optimizerResult, setOptimizerResult] = useState(null);
  const [loadingOptimizer, setLoadingOptimizer] = useState(false);

  useEffect(() => {
    loadQueue();
  }, [locationFilter, riskFilter, searchTerm]);

  useEffect(() => {
    if (activeTab === 'budget') {
      runBudgetOptimizer(budgetLakhs);
    }
  }, [activeTab, budgetLakhs]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await api.getPrioritization({
        search: searchTerm || undefined,
        location: locationFilter,
        min_risk: riskFilter
      });
      setQueue(data);
    } catch (err) {
      console.error("Failed to load priority queue:", err);
    } finally {
      setLoading(false);
    }
  };

  const runBudgetOptimizer = async (lakhs) => {
    setLoadingOptimizer(true);
    try {
      const res = await api.maintenanceRecommendation.optimizeBudget(lakhs);
      setOptimizerResult(res);
    } catch (err) {
      console.error("Failed to run budget optimizer:", err);
    } finally {
      setLoadingOptimizer(false);
    }
  };

  const handleDispatch = (roadId, roadName) => {
    setDispatchedRoads(prev => ({ ...prev, [roadId]: true }));
  };

  const filteredQueue = queue.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.road_name && item.road_name.toLowerCase().includes(term)) ||
      (item.location && item.location.toLowerCase().includes(term)) ||
      (item.action && item.action.toLowerCase().includes(term)) ||
      (item.risk_level && item.risk_level.toLowerCase().includes(term)) ||
      (item.priority && item.priority.toLowerCase().includes(term)) ||
      (item.traffic_density && item.traffic_density.toLowerCase().includes(term)) ||
      (item.rainfall && item.rainfall.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
            <ListOrdered size={24} color="#3B82F6" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Intelligent Road Prioritization & Budget Allocation
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Urgency-ranked corridor maintenance queue and municipal budget optimization in Indian Rupees (₹ INR)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button
              className={`btn btn-sm ${activeTab === 'queue' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('queue')}
            >
              Urgency Queue
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'budget' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('budget')}
            >
              Budget Optimizer (₹ INR)
            </button>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={loadQueue} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: URGENCY QUEUE                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <>
          {/* Search & Filter Toolbar */}
          <div className="glass-card" style={{ padding: '1.1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
              {/* Search Box */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-dim)' }} />
                <input
                  type="text"
                  placeholder="Search corridor, city, action, or risk..."
                  className="form-input"
                  style={{ paddingLeft: '2.2rem' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Location Filter */}
              <div>
                <select
                  className="form-select"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                >
                  <option value="All">All Municipalities & Highways</option>
                  <option value="Coimbatore">Coimbatore</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Kochi">Kochi</option>
                  <option value="Delhi NCR">Delhi NCR</option>
                  <option value="Salem">Salem</option>
                  <option value="Madurai">Madurai</option>
                  <option value="Trichy">Trichy</option>
                  <option value="Tirupur">Tirupur</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <select
                  className="form-select"
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                >
                  <option value="All">All Risk Classes</option>
                  <option value="Critical Risk">Critical Risk Corridors Only</option>
                  <option value="High Risk">High & Critical Risk</option>
                  <option value="Medium Risk">Medium & Above</option>
                </select>
              </div>
            </div>
          </div>

          {/* Priority Queue Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
                <p>Loading real-world prioritized maintenance queue...</p>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <ShieldAlert size={32} style={{ margin: '0 auto 0.75rem auto', color: '#60A5FA' }} />
                <h3>No corridors match the active filter criteria</h3>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Try clearing filters or search terms.</p>
              </div>
            ) : (
              filteredQueue.map((item) => {
                const isDispatched = dispatchedRoads[item.road_id];
                const isImmediate = item.priority === 'Immediate';
                const isHigh = item.priority === 'High';

                return (
                  <div
                    key={item.road_id}
                    className="glass-card"
                    style={{
                      padding: '1.25rem',
                      borderLeft: isImmediate 
                        ? '4px solid #EF4444' 
                        : isHigh 
                        ? '4px solid #F97316' 
                        : '4px solid #3B82F6',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {/* Left: Rank, Name, Location */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: isImmediate ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: isImmediate ? '#EF4444' : '#60A5FA',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1rem',
                          border: isImmediate ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
                        }} className="mono">
                          #{item.rank}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {item.road_name}
                            </h3>
                            <RiskBadge level={item.risk_level} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <MapPin size={13} color="#60A5FA" />
                              {item.location}
                            </span>
                            <span>•</span>
                            <span>Length: <strong>{item.road_length} km</strong></span>
                            <span>•</span>
                            <span>Age: <strong>{item.road_age} yrs</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenReport && onOpenReport({
                            ...item,
                            id: item.road_id,
                            latest_prediction: item
                          })}
                        >
                          <FileText size={14} />
                          <span>Audit Report</span>
                        </button>

                        <button
                          className={`btn btn-sm ${isDispatched ? 'btn-secondary' : isImmediate ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => handleDispatch(item.road_id, item.road_name)}
                          disabled={isDispatched}
                        >
                          {isDispatched ? (
                            <>
                              <CheckCircle size={14} color="#10B981" />
                              <span style={{ color: '#10B981' }}>Crew Dispatched</span>
                            </>
                          ) : (
                            <>
                              <Truck size={14} />
                              <span>Dispatch Repair Crew</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Distress Telemetry Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      marginTop: '0.85rem',
                      border: '1px solid rgba(255, 255, 255, 0.04)'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                          Pothole Count
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: item.pothole_count > 10 ? '#EF4444' : '#F59E0B' }} className="mono">
                          {item.pothole_count} ({item.pothole_depth} cm avg)
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                          Crack Length
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: item.crack_length > 40 ? '#EF4444' : '#F59E0B' }} className="mono">
                          {item.crack_length} m
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                          Traffic Density
                        </div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {item.traffic_density}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                          Precipitation
                        </div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {item.rainfall}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                          Risk Score
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: item.risk_score > 70 ? '#EF4444' : '#60A5FA' }} className="mono">
                          {item.risk_score}/100
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Prescription & Indian Currency Budget */}
                    <div style={{
                      marginTop: '0.9rem',
                      paddingTop: '0.85rem',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: '#60A5FA', fontWeight: 600 }}>AI Prescription:</span>
                        <span>{item.action || item.recommendation}</span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#34D399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }} className="mono">
                        <span>Est. Budget (INR):</span>
                        <span>{item.estimated_budget}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MUNICIPAL BUDGET OPTIMIZER                                         */}
      {/* ========================================================================= */}
      {activeTab === 'budget' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Budget Control Slider Card */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Municipal Maintenance Budget Allocation (INR ₹)
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Optimizes road repair allocation across corridors to maximize safety index under fiscal caps.
                </p>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginRight: '0.4rem' }}>Total Budget:</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34D399' }}>₹{budgetLakhs} Lakhs</span>
              </div>
            </div>

            {/* Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                <span>₹10 Lakhs</span>
                <span>₹50 Lakhs</span>
                <span>₹1.00 Crore (₹100L)</span>
                <span>₹2.50 Crores (₹250L)</span>
              </div>
              <input
                type="range"
                min="10"
                max="250"
                step="5"
                value={budgetLakhs}
                onChange={(e) => setBudgetLakhs(parseFloat(e.target.value))}
                className="form-range"
              />
            </div>
          </div>

          {/* Optimizer Summary KPIs */}
          {optimizerResult && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="glass-card" style={{ padding: '1.15rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Budget Limit</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#60A5FA', marginTop: '0.2rem' }}>{optimizerResult.total_budget_limit}</div>
              </div>

              <div className="glass-card" style={{ padding: '1.15rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Allocated (INR)</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34D399', marginTop: '0.2rem' }}>{optimizerResult.total_allocated}</div>
              </div>

              <div className="glass-card" style={{ padding: '1.15rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Remaining Surplus</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#A78BFA', marginTop: '0.2rem' }}>{optimizerResult.remaining_surplus}</div>
              </div>

              <div className="glass-card" style={{ padding: '1.15rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Funded vs Deferred</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  <span style={{ color: '#34D399' }}>{optimizerResult.funded_count} Funded</span> / <span style={{ color: '#EF4444' }}>{optimizerResult.deferred_count} Deferred</span>
                </div>
              </div>
            </div>
          )}

          {/* Funded Corridors List */}
          {optimizerResult && (
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#34D399', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} />
                <span>Fully Funded Real-World Corridors ({optimizerResult.funded_count})</span>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {optimizerResult.funded_corridors.slice(0, 10).map((r) => (
                  <div key={r.road_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{r.road_name} ({r.location})</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.action} • {r.road_length} km</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#34D399', fontSize: '0.9rem' }} className="mono">{r.allocated_cost_inr}</div>
                      <div style={{ fontSize: '0.7rem', color: '#34D399' }}>Funded (INR ₹)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
