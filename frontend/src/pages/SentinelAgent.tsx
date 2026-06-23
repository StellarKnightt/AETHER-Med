import { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Activity, Eye, Database, 
  Play, Square, CheckCircle, XCircle, AlertTriangle,
  ShieldHalf, Clock
} from 'lucide-react';
import { sentinelAgentApi, type SentinelIncident, type SentinelTrustScore, type SentinelSession } from '../services/api/sentinelAgentApi';
import { socketManager } from '../services/websocket/socketManager';

export default function SentinelAgent() {
  const [session, setSession] = useState<SentinelSession | null>(null);
  const [incidents, setIncidents] = useState<SentinelIncident[]>([]);
  const [trustScores, setTrustScores] = useState<SentinelTrustScore[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // Polling as backup to WS
    
    // Setup WS listener
    const unsubscribe = socketManager.subscribe((payload) => {
      if (payload.type === 'sentinel_incident' || payload.type === 'sentinel_incident_update') {
        fetchData();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    try {
      const [sess, incs, scores] = await Promise.all([
        sentinelAgentApi.getStatus(),
        sentinelAgentApi.getIncidents(),
        sentinelAgentApi.getTrustScores()
      ]);
      setSession(sess);
      setIncidents(incs);
      setTrustScores(scores);
    } catch (e) { console.error(e); }
  };

  const handleStart = async () => {
    await sentinelAgentApi.startMonitoring();
    fetchData();
  };

  const handleStop = async () => {
    await sentinelAgentApi.stopMonitoring();
    fetchData();
  };

  const handleApprove = async (id: string) => {
    await sentinelAgentApi.approveIncident(id);
    fetchData();
  };

  const handleReject = async (id: string) => {
    await sentinelAgentApi.rejectIncident(id);
    fetchData();
  };

  const handleApproveAll = async () => {
    await sentinelAgentApi.approveAllIncidents();
    fetchData();
  };

  const handleRejectAll = async () => {
    await sentinelAgentApi.rejectAllIncidents();
    fetchData();
  };

  const getSeverityColor = (sev: string) => {
    switch(sev.toLowerCase()) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#3b82f6';
      default: return '#94a3b8';
    }
  };

  const pendingIncidents = incidents.filter(i => i.status === 'pending');
  const resolvedIncidents = incidents.filter(i => i.status !== 'pending');

  const avgTrust = trustScores.length > 0 ? Math.round(trustScores.reduce((acc, s) => acc + s.trust_score, 0) / trustScores.length) : 100;
  const avgPrivacy = trustScores.length > 0 ? Math.round(trustScores.reduce((acc, s) => acc + s.privacy_score, 0) / trustScores.length) : 100;

  return (
    <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
      
      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg, #020617 0%, #0f172a 100%)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(168,85,247,0.2)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 30px -10px rgba(168,85,247,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}>
            <ShieldCheck size={32} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              Sentinel Agent
              {session?.status === 'active' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <div className="pulse-dot" style={{ width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%' }} /> Active
                </span>
              )}
              {session?.status !== 'active' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'rgba(148,163,184,0.1)', color: '#94a3b8', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(148,163,184,0.2)' }}>
                  <Square fill="currentColor" size={8} /> Offline
                </span>
              )}
            </h1>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '6px' }}>
              Continuous Cybersecurity, Privacy & Compliance Watchdog
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {session?.status === 'active' ? (
            <button onClick={handleStop} style={{ padding: '12px 24px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Square size={16} /> Stop Monitoring
            </button>
          ) : (
            <button onClick={handleStart} style={{ padding: '12px 24px', background: 'linear-gradient(90deg, #a855f7 0%, #7e22ce 100%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(168,85,247,0.3)' }}>
              <Play size={16} /> Launch Sentinel Agent
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Active Threats', value: pendingIncidents.length, color: pendingIncidents.length > 0 ? '#ef4444' : '#4ade80' },
          { label: 'Events Processed', value: session?.events_processed || 0, color: '#3b82f6' },
          { label: 'System Trust Score', value: `${avgTrust}%`, color: avgTrust < 80 ? '#f97316' : '#a855f7' },
          { label: 'Privacy Compliance', value: `${avgPrivacy}%`, color: '#14b8a6' },
          { label: 'Incidents Detected', value: session?.incidents_detected || 0, color: '#f8fafc' },
        ].map((m, i) => (
          <div key={i} style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Threat Detection Pipeline Animation */}
      <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Threat Detection Pipeline</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '2px', background: 'rgba(255,255,255,0.05)', zIndex: 0 }} />
          
          {[
            { label: 'Event Input', active: true, icon: <Activity size={18} /> },
            { label: 'Data Collection', active: true, icon: <Database size={18} /> },
            { label: 'Threat Analysis', active: session?.status === 'active', icon: <Eye size={18} /> },
            { label: 'Risk Classification', active: pendingIncidents.length > 0, icon: <AlertTriangle size={18} /> },
            { label: 'Recommendation', active: pendingIncidents.length > 0, icon: <ShieldHalf size={18} /> },
            { label: 'Awaiting Approval', active: pendingIncidents.length > 0, icon: <CheckCircle size={18} /> },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', zIndex: 1, background: '#0f172a', padding: '0 10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: step.active ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)', border: `2px solid ${step.active ? '#a855f7' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: step.active ? '#d8b4fe' : '#64748b', transition: 'all 0.3s', boxShadow: step.active ? '0 0 15px rgba(168,85,247,0.4)' : 'none' }}>
                {step.icon}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: step.active ? '#e2e8f0' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{step.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '32px' }}>
        
        {/* Left Col: Agent Trust Monitor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ShieldCheck size={20} color="#14b8a6" /> Agent Trust Monitor
          </h2>
          
          {trustScores.map(score => (
            <div key={score.agent_name} style={{ background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontWeight: 600, fontSize: '15px', color: '#f8fafc' }}>{score.agent_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Trust</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: score.trust_score < 70 ? '#ef4444' : (score.trust_score < 90 ? '#eab308' : '#4ade80') }}>
                    {Math.round(score.trust_score)}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Privacy', val: score.privacy_score },
                  { label: 'Security', val: score.security_score },
                  { label: 'Compliance', val: score.compliance_score },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', marginBottom: '4px', textTransform: 'uppercase' }}>
                      <span>{s.label}</span>
                      <span>{Math.round(s.val)}%</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.val}%`, background: s.val < 70 ? '#ef4444' : '#14b8a6', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Col: Incident Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={22} color="#ef4444" /> Incident Center
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setActiveTab('pending')} style={{ padding: '8px 16px', background: activeTab === 'pending' ? 'rgba(239,68,68,0.15)' : 'transparent', color: activeTab === 'pending' ? '#f87171' : '#94a3b8', border: `1px solid ${activeTab === 'pending' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Active Threats ({pendingIncidents.length})
              </button>
              <button onClick={() => setActiveTab('resolved')} style={{ padding: '8px 16px', background: activeTab === 'resolved' ? 'rgba(74,222,128,0.15)' : 'transparent', color: activeTab === 'resolved' ? '#4ade80' : '#94a3b8', border: `1px solid ${activeTab === 'resolved' ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Resolved ({resolvedIncidents.length})
              </button>
            </div>
          </div>

          {activeTab === 'pending' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pendingIncidents.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '12px', background: 'rgba(30,41,59,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <button onClick={handleApproveAll} style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={14}/> Approve All</button>
                  <button onClick={handleRejectAll} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><XCircle size={14}/> Reject All</button>
                </div>
              )}
              
              {pendingIncidents.length === 0 ? (
                <div style={{ padding: '64px', textAlign: 'center', background: 'rgba(30,41,59,0.3)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <ShieldCheck size={48} color="#4ade80" style={{ opacity: 0.5, marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '8px' }}>No Active Threats</h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>Sentinel Agent is actively monitoring the ecosystem. No anomalies detected.</p>
                </div>
              ) : (
                pendingIncidents.map(inc => (
                  <div key={inc.id} style={{ background: 'linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}>
                    {/* Card Header */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '4px', background: `${getSeverityColor(inc.severity)}20`, color: getSeverityColor(inc.severity), fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', border: `1px solid ${getSeverityColor(inc.severity)}40` }}>{inc.severity}</span>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>{inc.threat_type}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {new Date(inc.created_at).toLocaleTimeString()}</div>
                    </div>
                    
                    {/* Card Body */}
                    <div style={{ padding: '24px', display: 'flex', gap: '24px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 600 }}>Affected Agent</div>
                          <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>{inc.affected_agent}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 600 }}>Sentinel Reasoning</div>
                          <div style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.6, background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', borderLeft: '3px solid #a855f7' }}>
                            {inc.reasoning}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '24px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: 600 }}>Recommended Action</div>
                          <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px dashed rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldAlert size={16} color="#ef4444" /> {inc.recommendation.replace(/_/g, ' ').toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 600 }}>Detection Confidence</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${inc.confidence * 100}%`, height: '100%', background: inc.confidence > 0.8 ? '#4ade80' : '#eab308' }} />
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>{Math.round(inc.confidence * 100)}%</div>
                          </div>
                        </div>
                        
                        <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                          <button onClick={() => handleApprove(inc.id)} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}><CheckCircle size={16}/> Approve</button>
                          <button onClick={() => handleReject(inc.id)} style={{ flex: 1, padding: '10px', background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}><XCircle size={16}/> Reject</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'resolved' && (
            <div style={{ background: 'rgba(30,41,59,0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Timestamp</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Threat Type</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Agent</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Response Action</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedIncidents.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>No resolved incidents.</td></tr>
                  ) : (
                    resolvedIncidents.map(inc => (
                      <tr key={inc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#cbd5e1' }}>{new Date(inc.created_at).toLocaleString()}</td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#f8fafc', fontWeight: 500 }}>{inc.threat_type}</td>
                        <td style={{ padding: '16px' }}><span style={{ padding: '4px 8px', background: 'rgba(59,130,246,0.1)', color: '#93c5fd', borderRadius: '4px', fontSize: '11px' }}>{inc.affected_agent}</span></td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: inc.status === 'approved' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: inc.status === 'approved' ? '#10b981' : '#ef4444' }}>
                            {inc.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontSize: '12px', color: '#94a3b8' }}>{inc.response_action}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
      
    </div>
  );
}
