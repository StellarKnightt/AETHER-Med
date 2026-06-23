import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit, Play, Square, Activity, ShieldAlert,
  Server, Network, CheckCircle2, History, AlertTriangle, ArrowRight, ActivitySquare
} from 'lucide-react';
import {
  metaAgentApi, type MetaAgentSession, type MetaAgentHealthScore,
  type MetaAgentIncident
} from '../services/api/metaAgentApi';
import { socketManager } from '../services/websocket/socketManager';

export default function MetaAgent() {
  const [session, setSession] = useState<MetaAgentSession | null>(null);
  const [healthScores, setHealthScores] = useState<MetaAgentHealthScore[]>([]);
  const [incidents, setIncidents] = useState<MetaAgentIncident[]>([]);
  const [pipelineState, setPipelineState] = useState<{ step: string; agent: string | null; incidentId: string | null }>({ step: 'idle', agent: null, incidentId: null });
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'recovered' | 'all'>('active');
  const [liveFeed, setLiveFeed] = useState<Array<{ id: string; time: Date; message: string; type: string }>>([]);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialData();

    const unsubscribeHealth = socketManager.subscribe((data) => {
      if (data.type === 'meta_agent_health_update') {
        fetchHealthScores();
        addFeedItem(`Health updated for ${data.agent}`, 'info');
      }
      else if (data.type === 'meta_agent_incident_update') {
        fetchIncidents();
        addFeedItem(`Incident status changed: ${data.status || data.action}`, 'warning');
      }
      else if (data.type === 'meta_agent_monitoring_update') {
        fetchInitialData();
        addFeedItem(`Meta-Agent Monitoring: ${data.action}`, 'info');
      }
      else if (data.type === 'meta_agent_pipeline') {
        setPipelineState({ step: data.step, agent: data.agent, incidentId: data.incident_id || null });
        addFeedItem(`[Pipeline] ${data.step.replace('_', ' ').toUpperCase()} - ${data.agent}`, 'pipeline');
      }
      else if (data.type === 'meta_agent_recovery') {
        addFeedItem(`[Recovery] ${data.step} for ${data.agent}`, 'success');
        if (data.step === 'completed') fetchIncidents();
      }
    });

    const interval = setInterval(() => {
      if (session?.status === 'active') {
        fetchInitialData(); // Periodic full sync
      }
    }, 5000);

    return () => {
      unsubscribeHealth();
      clearInterval(interval);
    };
  }, [session?.status]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveFeed]);

  const addFeedItem = (message: string, type: string) => {
    setLiveFeed(prev => [...prev.slice(-49), { id: Math.random().toString(), time: new Date(), message, type }]);
  };

  const fetchInitialData = async () => {
    try {
      const [sess, scores, incs] = await Promise.all([
        metaAgentApi.getStatus(),
        metaAgentApi.getHealthScores(),
        metaAgentApi.getIncidents()
      ]);
      setSession(sess);
      setHealthScores(scores);
      setIncidents(incs);

      // Initialize pipeline state from pending incidents
      const pending = incs.find(i => i.status === 'pending_approval');
      if (pending) {
        setPipelineState({ step: 'awaiting_approval', agent: pending.affected_agent, incidentId: pending.id });
      }

      // Populate feed with recent incidents if empty
      setLiveFeed(prev => {
        if (prev.length > 0) return prev;
        return incs.slice(0, 5).reverse().map(inc => ({
          id: inc.id,
          time: new Date(inc.created_at || new Date()),
          message: `Incident detected: ${inc.failure_type.replace('_', ' ')} on ${inc.affected_agent}`,
          type: 'warning'
        }));
      });

    } catch (e) { console.error(e); }
  };

  const fetchHealthScores = async () => {
    try {
      const scores = await metaAgentApi.getHealthScores();
      setHealthScores(scores);
    } catch (e) { console.error(e); }
  };

  const fetchIncidents = async () => {
    try {
      const incs = await metaAgentApi.getIncidents();
      setIncidents(incs);
    } catch (e) { console.error(e); }
  };

  const handleStart = async () => {
    try {
      const sess = await metaAgentApi.startMonitoring();
      setSession(sess);
      setPipelineState({ step: 'idle', agent: null, incidentId: null });
      setLiveFeed([]);
      addFeedItem("Meta-Agent initialization complete. Continuous monitoring active.", 'info');
    } catch (e) { console.error(e); }
  };

  const handleStop = async () => {
    try {
      await metaAgentApi.stopMonitoring();
      setSession(prev => prev ? { ...prev, status: 'stopped' } : null);
      setPipelineState({ step: 'idle', agent: null, incidentId: null });
      addFeedItem("Meta-Agent monitoring suspended.", 'warning');
    } catch (e) { console.error(e); }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 50) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Healthy</span>;
      case 'degraded': return <span style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Degraded</span>;
      case 'critical': return <span style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Critical</span>;
      case 'recovering': return <span style={{ background: 'rgba(56,187,248,0.2)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }} className="pulse-icon">Recovering</span>;
      default: return null;
    }
  };

  const renderPipelineNode = (key: string, label: string, icon: React.ReactNode, isFirst: boolean = false) => {
    const isActive = pipelineState.step === key;
    const isPast = ['activity_detected', 'behavior_analysis', 'root_cause_analysis', 'awaiting_approval'].indexOf(pipelineState.step) > ['activity_detected', 'behavior_analysis', 'root_cause_analysis', 'awaiting_approval'].indexOf(key);

    return (
      <React.Fragment key={key}>
        {!isFirst && (
          <div style={{ flex: 1, height: '2px', background: isActive || isPast ? '#ec4899' : 'rgba(255,255,255,0.1)', transition: 'all 0.5s', position: 'relative' }}>
            {(isActive || isPast) && <div className="meta-pipeline-flow" style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '100%', background: 'linear-gradient(90deg, transparent, rgba(236,72,153,0.8), transparent)' }}></div>}
          </div>
        )}
        <div className={`meta-pipeline-node ${isActive ? 'active' : isPast ? 'past' : ''}`} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2,
          opacity: isActive || isPast ? 1 : 0.5
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isActive ? 'rgba(236,72,153,0.2)' : isPast ? 'rgba(236,72,153,0.1)' : 'rgba(255,255,255,0.05)',
            border: `2px solid ${isActive ? '#ec4899' : isPast ? 'rgba(236,72,153,0.5)' : 'rgba(255,255,255,0.1)'}`,
            color: isActive || isPast ? '#ec4899' : '#94a3b8',
            transition: 'all 0.3s'
          }}>
            {icon}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: isActive ? '#f8fafc' : '#94a3b8', textAlign: 'center', width: '80px' }}>{label}</div>
        </div>
      </React.Fragment>
    );
  };

  const filteredIncidents = incidents.filter(i => {
    if (activeTab === 'active') return ['detected', 'analyzing', 'recovering', 'pending_approval'].includes(i.status);
    if (activeTab === 'pending') return i.status === 'pending_approval';
    if (activeTab === 'recovered') return i.status === 'recovered';
    return true;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header & Command Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BrainCircuit size={32} color="#ec4899" />
            Meta-Agent Supervisor
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>Autonomous ecosystem self-healing and orchestration</p>
        </div>

        <div className="glass-card" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: session?.status === 'active' ? '#4ade80' : '#ef4444', boxShadow: session?.status === 'active' ? '0 0 10px #4ade80' : 'none' }}></div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: session?.status === 'active' ? '#4ade80' : '#ef4444' }}>
                {session?.status === 'active' ? 'MONITORING ACTIVE' : 'SYSTEM OFFLINE'}
              </span>
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)' }}></div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {session?.status === 'active' ? (
              <button onClick={handleStop} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                <Square size={16} /> Stop Monitoring
              </button>
            ) : (
              <button onClick={handleStart} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(236,72,153,0.2)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.5)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                <Play size={16} /> Launch Meta-Agent
              </button>
            )}
          </div>
        </div>
      </div>

      {session?.status === 'active' && (
        <>
          {/* Agent Health Dashboard */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ActivitySquare size={18} color="#ec4899" /> Live Agent Health Dashboard
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
              {healthScores.map(score => (
                <div key={score.agent_name} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
                  {score.status === 'recovering' && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#38bdf8', animation: 'recovery-glow 2s infinite' }}></div>}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>{score.agent_name.replace('Agent', '')} Agent</div>
                    {getStatusBadge(score.status)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div className="meta-health-gauge" style={{ width: '64px', height: '64px', borderRadius: '50%', background: `conic-gradient(${getHealthColor(score.health_score)} ${score.health_score}%, rgba(255,255,255,0.1) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: getHealthColor(score.health_score) }}>{Math.round(score.health_score)}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                        <span>Reliability</span>
                        <span style={{ color: getHealthColor(score.reliability_score) }}>{Math.round(score.reliability_score)}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                        <span>Reasoning</span>
                        <span style={{ color: getHealthColor(score.reasoning_quality) }}>{Math.round(score.reasoning_quality)}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                        <span>Workflow</span>
                        <span style={{ color: getHealthColor(score.workflow_compliance) }}>{Math.round(score.workflow_compliance)}%</span>
                      </div>
                    </div>
                  </div>

                  {score.active_failures > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '6px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={12} /> {score.active_failures} Active Failure{score.active_failures > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>

            {/* Left Column: Pipeline & Incidents */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Detection Pipeline */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Network size={18} color="#ec4899" /> Live Detection Pipeline {pipelineState.agent && <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 400 }}>Analyzing {pipelineState.agent}</span>}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
                  {renderPipelineNode('activity_detected', 'Activity Detected', <Activity size={18} />, true)}
                  {renderPipelineNode('behavior_analysis', 'Behavior Analysis', <BrainCircuit size={18} />)}
                  {renderPipelineNode('root_cause_analysis', 'Root Cause Analysis', <ShieldAlert size={18} />)}
                  {renderPipelineNode('awaiting_approval', 'Awaiting Approval', <CheckCircle2 size={18} />)}
                </div>
              </div>

              {/* Incident Center */}
              <div className="glass-card" style={{ padding: '24px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Server size={20} color="#ec4899" /> Incident Center
                  </h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['active', 'pending', 'recovered', 'all'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        style={{ padding: '6px 12px', background: activeTab === tab ? 'rgba(236,72,153,0.2)' : 'transparent', color: activeTab === tab ? '#ec4899' : '#94a3b8', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredIncidents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>No incidents found in this category.</div>
                  ) : (
                    filteredIncidents.map(inc => (
                      <div key={inc.id} className="meta-incident-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{inc.affected_agent}</span>
                              <span style={{ fontSize: '12px', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>{inc.failure_type.replace('_', ' ')}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700 }}>{inc.severity}</span>
                              <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '4px', background: inc.status === 'recovered' ? 'rgba(16,185,129,0.1)' : inc.status === 'pending_approval' ? 'rgba(245,158,11,0.1)' : 'rgba(56,187,248,0.1)', color: inc.status === 'recovered' ? '#10b981' : inc.status === 'pending_approval' ? '#f59e0b' : '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>
                                {inc.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #ec4899' }}>
                            <div style={{ fontSize: '11px', color: '#ec4899', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>Root Cause Analysis</div>
                            <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>{inc.root_cause}</div>
                          </div>

                          {inc.status === 'pending_approval' && (
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>Recommended Actions</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {inc.recommended_actions.map((act, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '12px', color: '#e2e8f0' }}>{act.description}</div>
                                    <span style={{ fontSize: '10px', color: '#64748b' }}>{act.action_type}</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button onClick={() => metaAgentApi.approveIncident(inc.id)} style={{ flex: 1, padding: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                  <CheckCircle2 size={14} /> Approve Recovery
                                </button>
                                <button onClick={() => metaAgentApi.rejectIncident(inc.id)} style={{ padding: '10px 20px', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}

                          {inc.status === 'recovered' && inc.before_health !== null && inc.after_health !== null && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(16,185,129,0.05)', padding: '12px', borderRadius: '8px' }}>
                              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>Recovery Successful</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Before</span>
                                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>{Math.round(inc.before_health)}</span>
                                </div>
                                <ArrowRight size={16} color="#64748b" />
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>After</span>
                                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>{Math.round(inc.after_health)}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Live Feed & Analytics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '400px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={18} color="#ec4899" /> Past Observation Feed
                </h2>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
                  {liveFeed.map(item => (
                    <div key={item.id} style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                      <div style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{item.time.toLocaleTimeString()}</div>
                      <div style={{
                        color: item.type === 'success' ? '#10b981' : item.type === 'warning' ? '#f59e0b' : item.type === 'pipeline' ? '#ec4899' : '#cbd5e1',
                        lineHeight: 1.4
                      }}>
                        {item.message}
                      </div>
                    </div>
                  ))}
                  <div ref={feedEndRef} />
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px', flex: 1 }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="#ec4899" /> Ecosystem Analytics
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>Total Failures Detected</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>{session?.failures_detected || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>Successful Recoveries</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{session?.recoveries_completed || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>Events Analyzed</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#38bdf8' }}>{session?.events_processed || 0}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
