import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  ListOrdered, 
  IndianRupee, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  Filter, 
  RefreshCw, 
  TrendingUp, 
  Clock, 
  ShieldAlert,
  Sliders,
  DollarSign
} from 'lucide-react';
import { api } from '../api';

export default function MaintenanceRecommendationModule({ onOpenReport }) {
  const [activeTab, setActiveTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');

  // Budget Optimizer State
  const [budgetLakhs, setBudgetLakhs] = useState(50.0);
  const [optimizerResult, setOptimizerResult] = useState(null);
  const [optLoading, setOptLoading] = useState(false);

  // Single Recommendation Form State
  const [testRoad, setTestRoad] = useState({
    road_name: 'Avinashi Road Flyover Section',
    risk_level: 'Critical Risk',
    risk_score: 88.5,
    pothole_count: 22,
    pothole_depth: 11.0,
    crack_length: 85.0,
    road_age: 8.5,
    traffic_density: 'Very High',
    rainfall: 'Heavy',
    road_length: 4.5
  });
  const [recommendationResult, setRecommendationResult] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await api.maintenanceRecommendation.getPrioritizedQueue({
        priority: priorityFilter,
        location: locationFilter
      });
      setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const r = await api.maintenanceRecommendation.getRules();
      setRules(r);
    } catch (err) {
      console.error(err);
    }
  };

  const runOptimizer = async () => {
    setOptLoading(true);
    try {
      const res = await api.maintenanceRecommendation.optimizeBudget(budgetLakhs);
      setOptimizerResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setOptLoading(false);
    }
  };

  const generateSingleRecommendation = () => {
    // Generate recommendation on current test road
    const pothole_count = testRoad.pothole_count;
    const pothole_depth = testRoad.pothole_depth;
    const crack_length = testRoad.crack_length;
    const road_age = testRoad.road_age;
    const traffic_density = testRoad.traffic_density;
    const rainfall = testRoad.rainfall;
    const road_length = testRoad.road_length;
    const risk_score = testRoad.risk_score;

    let priority = "Routine";
    let timeline = "Quarterly routine cycle (90 days)";
    let urgency = 25.0;

    if (risk_score >= 85) {
      priority = "Immediate";
      timeline = "Within 24 - 48 hours";
      urgency = 92.5;
    } else if (risk_score >= 60) {
      priority = "High";
      timeline = "Within 7 calendar days";
      urgency = 72.0;
    } else if (risk_score >= 35) {
      priority = "Medium";
      timeline = "Within 30 calendar days";
      urgency = 48.0;
    }

    const actions = [];
    if (pothole_count >= 15 || pothole_depth >= 8.0) {
      actions.push("Full-depth asphalt milling and hot-mix patching (HMA Grade II)");
    } else if (pothole_count > 0) {
      actions.push("Cold-pour bitumen edge-seal and infrared pothole compaction");
    }

    if (crack_length >= 50.0) {
      actions.push("Polymer-modified asphalt crack routing, injection sealing, and micro-surfacing");
    } else if (crack_length > 10.0) {
      actions.push("High-penetration bituminous emulsion crack sealing");
    }

    if (road_age >= 10.0) {
      actions.push("Sub-base core sampling and structural overlay reinforcement");
    }

    if (rainfall === "Heavy" || rainfall === "Torrential") {
      actions.push("Shoulder drainage clearing and storm runoff channelization");
    }

    const actionText = actions.join(" + ") || "Preventive seal coating and standard scheduled monitoring";

    const reason = `Corridor evaluated at ${testRoad.risk_level} (${risk_score}/100). Primary distress includes ${pothole_count} potholes (depths up to ${pothole_depth}cm) and ${crack_length}m structural cracking under ${traffic_density.toLowerCase()} traffic.`;

    const budget = `₹${(road_length * 3.5).toFixed(1)} Lakhs - ₹${(road_length * 7.5).toFixed(1)} Lakhs (INR)`;

    setRecommendationResult({
      priority,
      timeline,
      urgency,
      action: actionText,
      reason,
      budget
    });
  };

  useEffect(() => {
    fetchQueue();
    fetchRules();
    generateSingleRecommendation();
    runOptimizer();
  }, [priorityFilter, locationFilter]);

  const getPriorityBadgeColor = (prio) => {
    if (prio === 'Immediate') return { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', border: '#EF4444' };
    if (prio === 'High') return { bg: 'rgba(249, 115, 22, 0.2)', text: '#F97316', border: '#F97316' };
    if (prio === 'Medium') return { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', border: '#F59E0B' };
    return { bg: 'rgba(16, 185, 129, 0.2)', text: '#10B981', border: '#10B981' };
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header Banner */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#F472B6', border: '1px solid rgba(236, 72, 153, 0.4)' }}>
              MODULE 5 OF 6
            </span>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              Prescriptive Decision Engine
            </span>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Wrench className="text-primary" size={28} />
            AI Maintenance Recommendation Module
          </h1>
          <p className="page-subtitle">
            Synthesizes prescriptive civil engineering repair actions, multi-criteria urgency rankings, itemized INR (₹) costing, and budget optimization algorithms.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchQueue} disabled={loading}>
          <RefreshCw size={16} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
        <button
          className={`btn ${activeTab === 'queue' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('queue')}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          <ListOrdered size={16} />
          <span>Prioritized Repair Queue</span>
        </button>

        <button
          className={`btn ${activeTab === 'optimizer' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('optimizer')}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          <IndianRupee size={16} />
          <span>Municipal Budget Optimizer</span>
        </button>

        <button
          className={`btn ${activeTab === 'synthesizer' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('synthesizer')}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
        >
          <Sparkles size={16} />
          <span>Prescriptive Reasoning Synthesizer</span>
        </button>
      </div>

      {/* TAB 1: Prioritized Maintenance Queue */}
      {activeTab === 'queue' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Urgency-Ranked Corridor Maintenance Queue
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Sorted dynamically in SQLite by Urgency Score and Risk Severity.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Priority:</span>
                <select
                  className="input-field"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="All">All Priorities</option>
                  <option value="Immediate">Immediate (24-48h)</option>
                  <option value="High">High (7 days)</option>
                  <option value="Medium">Medium (30 days)</option>
                  <option value="Routine">Routine (90 days)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>Rank</th>
                  <th>Corridor Name</th>
                  <th>Location</th>
                  <th>Urgency Score</th>
                  <th>Priority Level</th>
                  <th>Prescribed Engineering Action</th>
                  <th>Estimated Budget (INR ₹)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => {
                  const pStyle = getPriorityBadgeColor(item.priority);
                  return (
                    <tr key={item.road_id}>
                      <td>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          color: item.rank <= 3 ? '#EF4444' : 'var(--text-primary)'
                        }}>
                          #{item.rank}
                        </span>
                      </td>
                      <td>
                        <strong>{item.road_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.road_length} km | {item.pothole_count} potholes | {item.crack_length}m cracks
                        </div>
                      </td>
                      <td>{item.location}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.urgency_score}</span>
                          <div style={{ width: '50px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                            <div style={{ width: `${item.urgency_score}%`, height: '100%', background: pStyle.text, borderRadius: '3px' }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: pStyle.bg, color: pStyle.text, border: `1px solid ${pStyle.border}44`, fontWeight: 700 }}>
                          {item.priority}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', maxWidth: '280px' }}>
                        {item.action}
                      </td>
                      <td style={{ fontWeight: 600, color: '#34D399', fontSize: '0.85rem' }}>
                        {item.estimated_budget}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => onOpenReport && onOpenReport(item)}
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Municipal Budget Optimizer */}
      {activeTab === 'optimizer' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Municipal Maintenance Budget Optimizer
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Uses integer linear knapsack prioritization to maximize public safety under constrained municipal fiscal budgets.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                <span className="form-label">Total Allocated Maintenance Budget (Lakhs INR)</span>
                <span style={{ fontWeight: 800, color: '#34D399', fontSize: '1.1rem' }}>₹{budgetLakhs} Lakhs</span>
              </div>
              <input
                type="range"
                min="10.0"
                max="250.0"
                step="5.0"
                className="input-field"
                value={budgetLakhs}
                onChange={(e) => setBudgetLakhs(parseFloat(e.target.value))}
              />
            </div>

            <button className="btn btn-primary" onClick={runOptimizer} disabled={optLoading} style={{ padding: '0.85rem 1.5rem' }}>
              <Sparkles size={16} />
              <span>{optLoading ? "Optimizing..." : "Run Optimization"}</span>
            </button>
          </div>

          {optimizerResult && (
            <div>
              {/* Allocation Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Fiscal Cap</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{optimizerResult.total_budget_limit}</div>
                </div>
                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Allocated Expenditures</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34D399' }}>{optimizerResult.total_allocated}</div>
                </div>
                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Funded Corridors</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60A5FA' }}>{optimizerResult.funded_count} Projects</div>
                </div>
                <div className="glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deferred Projects</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F87171' }}>{optimizerResult.deferred_count} Projects</div>
                </div>
              </div>

              {/* Funded Corridors List */}
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#34D399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} />
                Funded & Approved for Immediate Work Dispatch ({optimizerResult.funded_count})
              </h3>
              <div className="table-responsive" style={{ marginBottom: '1.5rem' }}>
                <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Corridor Name</th>
                      <th>Urgency</th>
                      <th>Prescribed Action</th>
                      <th>Allocated Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optimizerResult.funded_corridors.slice(0, 6).map((r) => (
                      <tr key={r.road_id}>
                        <td><strong>#{r.rank}</strong></td>
                        <td>{r.road_name} ({r.location})</td>
                        <td><span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' }}>{r.urgency_score}</span></td>
                        <td>{r.action}</td>
                        <td style={{ color: '#34D399', fontWeight: 700 }}>{r.allocated_cost_inr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Prescriptive Reasoning Synthesizer */}
      {activeTab === 'synthesizer' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            Prescriptive Civil Engineering Decision Synthesizer
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Explains the step-by-step artificial intelligence civil engineering logic mapping multi-modal telemetry into concrete repair specifications.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Sample Corridor Parameters
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.85rem' }}>
                <div><strong>Corridor:</strong> {testRoad.road_name}</div>
                <div><strong>Risk Level:</strong> {testRoad.risk_level} ({testRoad.risk_score}/100)</div>
                <div><strong>Physical Distress:</strong> {testRoad.pothole_count} potholes ({testRoad.pothole_depth}cm depth), {testRoad.crack_length}m cracks</div>
                <div><strong>Environmental Stress:</strong> {testRoad.traffic_density} traffic, {testRoad.rainfall} rainfall</div>
                <div><strong>Corridor Span:</strong> {testRoad.road_length} km</div>
              </div>
            </div>

            {recommendationResult && (
              <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#60A5FA' }}>
                  AI Prescribed Output
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div><strong>Priority Class:</strong> <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', fontWeight: 700 }}>{recommendationResult.priority}</span></div>
                  <div><strong>Inspection Timeline:</strong> {recommendationResult.timeline}</div>
                  <div><strong>Prescribed Engineering Action:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{recommendationResult.action}</span></div>
                  <div><strong>Estimated Budget:</strong> <span style={{ color: '#34D399', fontWeight: 700 }}>{recommendationResult.budget}</span></div>
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                    <strong>AI Reasoning Narrative:</strong> {recommendationResult.reason}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
