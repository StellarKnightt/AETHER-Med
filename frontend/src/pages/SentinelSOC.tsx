import { useState, useEffect } from 'react';
import { 
  Shield, ShieldAlert, Activity, Server, Eye, Database, 
  Network, Lock, Play, Square, Settings2, AlertTriangle, 
  ChevronDown, ChevronUp, Bot, BrainCircuit, ActivitySquare
} from 'lucide-react';
import { sentinelApi, type SecurityScenario, type MetaAgentScenario, type SecuritySimulation, type SecurityEvent } from '../services/api/sentinelApi';

export default function SentinelSOC() {
  const [scenarios, setScenarios] = useState<SecurityScenario[]>([]);
  const [metaScenarios, setMetaScenarios] = useState<MetaAgentScenario[]>([]);
  const [simulations, setSimulations] = useState<SecuritySimulation[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  
  const [selectedScenario, setSelectedScenario] = useState<SecurityScenario | MetaAgentScenario | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  
  const [activeLibraryTab, setActiveLibraryTab] = useState<'sentinel' | 'meta_agent'>('sentinel');
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);

  // Config state
  const [configSeverity, setConfigSeverity] = useState('high');
  const [configIntensity, setConfigIntensity] = useState(5);
  const [configDuration, setConfigDuration] = useState(60);
  const [configAgents, setConfigAgents] = useState<string[]>([]);
  const [configFailureFreq, setConfigFailureFreq] = useState(5);

  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(fetchDynamicData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async () => {
    try {
      const [data, metaData] = await Promise.all([
        sentinelApi.getScenarios(),
        sentinelApi.getMetaScenarios()
      ]);
      setScenarios(data);
      setMetaScenarios(metaData);
      fetchDynamicData();
    } catch (e) { console.error(e); }
  };

  const fetchDynamicData = async () => {
    try {
      const [simData, eventData] = await Promise.all([
        sentinelApi.getSimulations(),
        sentinelApi.getRecentEvents(100) // fetch more to populate timeline
      ]);
      setSimulations(simData);
      setEvents(eventData.reverse()); // Chronological for timeline
    } catch (e) { console.error(e); }
  };

  const openConfig = (scenario: SecurityScenario | MetaAgentScenario) => {
    setSelectedScenario(scenario);
    setConfigSeverity(scenario.default_severity);
    setConfigIntensity(scenario.default_intensity);
    setConfigDuration(60);
    // Meta-agent scenarios generally target one agent at a time
    setConfigAgents(scenario.affected_agents_default.slice(0, 1));
    setConfigFailureFreq(5);
    setConfigModalOpen(true);
  };

  const handleLaunch = async () => {
    if (!selectedScenario) return;
    try {
      await sentinelApi.launchSimulation({
        scenario_id: selectedScenario.id,
        severity: configSeverity,
        intensity: configIntensity,
        duration: configDuration,
        target_agents: configAgents,
        violation_count: 0,
        failure_frequency: configFailureFreq
      });
      setConfigModalOpen(false);
      fetchDynamicData();
    } catch (e) { console.error(e); }
  };

  const handleStop = async (simId: string) => {
    try {
      await sentinelApi.stopSimulation(simId);
      fetchDynamicData();
    } catch (e) { console.error(e); }
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

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'privacy': return <Eye size={18} />;
      case 'security': return <Lock size={18} />;
      case 'network': return <Network size={18} />;
      case 'agent_misbehavior': return <BotIcon />;
      case 'orchestration': return <Database size={18} />;
      
      // Meta-agent failure categories
      case 'decision_failure': return <BrainCircuit size={18} />;
      case 'reasoning_failure': return <Server size={18} />;
      case 'confusion_state': return <AlertTriangle size={18} />;
      case 'workflow_failure': return <ActivitySquare size={18} />;
      case 'communication_failure': return <Network size={18} />;
      case 'performance_failure': return <Activity size={18} />;
      
      default: return <Shield size={18} />;
    }
  };

  const BotIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
  );

  return (
    <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg, #0f172a 0%, #1e1b4b 100%)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <ShieldAlert size={32} color="#818cf8" /> Sentinel SOC
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '6px', marginLeft: '44px' }}>
            Security Operations Center & Adversarial Simulation Engine
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Scenarios</div>
            <div style={{ color: '#4ade80', fontSize: '24px', fontWeight: 700 }}>
              {simulations.filter(s => s.status === 'running').length}
            </div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Events</div>
            <div style={{ color: '#f8fafc', fontSize: '24px', fontWeight: 700 }}>
              {events.length}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Active Simulations */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="#4ade80" /> Active Simulations
            </h2>
            {simulations.filter(s => s.status === 'running').length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                No active simulations. Launch a scenario from the library below.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {simulations.filter(s => s.status === 'running').map(sim => (
                  <div key={sim.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', alignItems: 'center', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: 'white' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getSeverityColor(sim.severity), boxShadow: `0 0 10px ${getSeverityColor(sim.severity)}` }} />
                        {sim.scenario_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Intensity: {sim.intensity}/10</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Targeted Agents</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {sim.target_agents.map(ag => (
                          <span key={ag} style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: '#cbd5e1' }}>{ag}</span>
                        ))}
                      </div>
                      
                      {sim.simulation_type === 'meta_agent' && (
                        <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', padding: '2px 6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <AlertTriangle size={10} className="pulse-icon" /> 
                          {sim.failure_category ? sim.failure_category.replace('_', ' ').toUpperCase() : 'FAILURE INJECTED'}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Violations Gen.</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#f87171' }}>{sim.violation_count}</div>
                    </div>
                    <button 
                      onClick={() => handleStop(sim.id)}
                      style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}
                    >
                      <Square size={14} /> Stop
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scenario Library */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '16px' }}>
                <Server size={20} color="#8b5cf6" /> Scenario Library
              </h2>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                  onClick={() => setActiveLibraryTab('sentinel')} 
                  style={{ background: 'transparent', border: 'none', color: activeLibraryTab === 'sentinel' ? '#8b5cf6' : '#94a3b8', fontSize: '14px', fontWeight: 600, paddingBottom: '16px', borderBottom: `2px solid ${activeLibraryTab === 'sentinel' ? '#8b5cf6' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Sentinel Scenarios
                </button>
                <button 
                  onClick={() => setActiveLibraryTab('meta_agent')} 
                  style={{ background: 'transparent', border: 'none', color: activeLibraryTab === 'meta_agent' ? '#ec4899' : '#94a3b8', fontSize: '14px', fontWeight: 600, paddingBottom: '16px', borderBottom: `2px solid ${activeLibraryTab === 'meta_agent' ? '#ec4899' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Meta-Agent Scenarios
                </button>
              </div>
            </div>
            
            {activeLibraryTab === 'sentinel' && (
              ['privacy', 'security', 'network', 'agent_misbehavior', 'orchestration'].map(category => (
              <div key={category} style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getCategoryIcon(category)} {category.replace('_', ' ')}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {scenarios.filter(s => s.category === category).map(scen => (
                    <div key={scen.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s', cursor: 'pointer' }}
                         onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                         onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px', lineHeight: '1.4' }}>{scen.name}</div>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: `${getSeverityColor(scen.default_severity)}20`, color: getSeverityColor(scen.default_severity), textTransform: 'uppercase', fontWeight: 700 }}>
                          {scen.default_severity}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', flex: 1 }}>{scen.description}</div>
                      <button onClick={() => openConfig(scen)} style={{ width: '100%', padding: '8px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Settings2 size={14} /> Configure & Launch
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
            )}
            
            {activeLibraryTab === 'meta_agent' && (
              ['decision_failure', 'reasoning_failure', 'confusion_state', 'workflow_failure', 'communication_failure', 'performance_failure'].map(category => (
                <div key={category} style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', borderBottom: '1px solid rgba(236,72,153,0.1)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getCategoryIcon(category)} {category.replace('_', ' ')}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {metaScenarios.filter(s => s.failure_category === category).map(scen => (
                      <div key={scen.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(236,72,153,0.1)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px', lineHeight: '1.4' }}>{scen.name}</div>
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: `${getSeverityColor(scen.default_severity)}20`, color: getSeverityColor(scen.default_severity), textTransform: 'uppercase', fontWeight: 700 }}>
                            {scen.default_severity}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', flex: 1 }}>{scen.description}</div>
                        
                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <button 
                            onClick={() => setExpandedPreview(expandedPreview === scen.id ? null : scen.id)}
                            style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: 'none', color: '#cbd5e1', fontSize: '11px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          >
                            Failure Preview {expandedPreview === scen.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                          
                          {expandedPreview === scen.id && scen.failure_examples && (
                            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              {Object.entries(scen.failure_examples).map(([agent, ex]) => (
                                <div key={agent}>
                                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Bot size={10} /> {agent}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(74,222,128,0.05)', padding: '6px', borderRadius: '4px', borderLeft: '2px solid #4ade80' }}>
                                      <span style={{ fontWeight: 600, display: 'block', marginBottom: '2px' }}>Normal:</span>
                                      "{ex.normal}"
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#f87171', background: 'rgba(239,68,68,0.05)', padding: '6px', borderRadius: '4px', borderLeft: '2px solid #f87171' }}>
                                      <span style={{ fontWeight: 600, display: 'block', marginBottom: '2px' }}>Failure Injection:</span>
                                      "{ex.failure}"
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button onClick={() => openConfig(scen)} style={{ width: '100%', padding: '8px', background: 'rgba(236,72,153,0.1)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.3)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <Settings2 size={14} /> Configure Meta-Agent Test
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>



      </div>

      {/* Config Modal */}
      {configModalOpen && selectedScenario && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px', width: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Launch Scenario</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>{selectedScenario.name}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>Severity</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['low', 'medium', 'high', 'critical'].map(sev => (
                    <button key={sev} onClick={() => setConfigSeverity(sev)} style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', background: configSeverity === sev ? `${getSeverityColor(sev)}20` : 'rgba(255,255,255,0.05)', color: configSeverity === sev ? getSeverityColor(sev) : '#64748b', border: `1px solid ${configSeverity === sev ? getSeverityColor(sev) : 'transparent'}`, cursor: 'pointer' }}>
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>Intensity (1-10)</label>
                <input type="range" min="1" max="10" value={configIntensity} onChange={e => setConfigIntensity(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#8b5cf6' }} />
                <div style={{ textAlign: 'right', fontSize: '12px', color: '#8b5cf6', fontWeight: 600 }}>{configIntensity}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>Duration (Seconds)</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[30, 60, 300].map(dur => (
                    <button key={dur} onClick={() => setConfigDuration(dur)} style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: configDuration === dur ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)', color: configDuration === dur ? '#c4b5fd' : '#64748b', border: `1px solid ${configDuration === dur ? '#8b5cf6' : 'transparent'}`, cursor: 'pointer' }}>
                      {dur >= 60 ? `${dur/60} min` : `${dur} sec`}
                    </button>
                  ))}
                </div>
              </div>

              {selectedScenario && 'scenario_type' in selectedScenario && selectedScenario.scenario_type === 'meta_agent' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#f472b6', marginBottom: '8px' }}>Failure Frequency (Events per Minute)</label>
                  <input type="range" min="1" max="20" value={configFailureFreq} onChange={e => setConfigFailureFreq(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#ec4899' }} />
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#f472b6', fontWeight: 600 }}>{configFailureFreq} / min</div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>Target Agents</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['TriageAgent', 'PharmaAgent', 'SchedulerAgent', 'BedAgent'].map(ag => {
                    const isSelected = configAgents.includes(ag);
                    return (
                      <button key={ag} onClick={() => setConfigAgents(isSelected ? configAgents.filter(a => a !== ag) : [...configAgents, ag])} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: isSelected ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', color: isSelected ? '#93c5fd' : '#64748b', border: `1px solid ${isSelected ? '#3b82f6' : 'transparent'}`, cursor: 'pointer' }}>
                        {ag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfigModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#94a3b8', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleLaunch} style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: 'white', background: '#8b5cf6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}>
                <Play size={16} /> Launch Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
