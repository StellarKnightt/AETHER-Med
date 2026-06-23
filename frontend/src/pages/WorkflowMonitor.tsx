import { useState, useEffect } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { Database, GitMerge, BrainCircuit, Shield, ArrowDown, AlertTriangle } from 'lucide-react';

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#10b981',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MODERATE: '#3b82f6',
  LOW: '#10b981',
};

// All 6 agents in the AETHER-Med MAS
const AGENTS = [
  {
    name: 'Triage Agent',
    id: 'triage',
    icon: '🏥',
    color: '#14b8a6',
    rgb: '20,184,166',
    role: 'Priority classification, vitals analysis, escalation detection',
    status: 'active' as const, // Fully functional
  },
  {
    name: 'Pharma Agent',
    id: 'pharma',
    icon: '💊',
    color: '#8b5cf6',
    rgb: '139,92,246',
    role: 'Medication cross-checking, allergy detection, dosage safety',
    status: 'active' as const,
  },
  {
    name: 'Scheduler Agent',
    id: 'scheduler',
    icon: '📅',
    color: '#f59e0b',
    rgb: '245,158,11',
    role: 'Appointment scheduling, OR allocation, resource planning',
    status: 'active' as const,
  },
  {
    name: 'Bed Agent',
    id: 'bed',
    icon: '🛏️',
    color: '#3b82f6',
    rgb: '59,130,246',
    role: 'Bed allocation, capacity management, transfer coordination',
    status: 'active' as const,
  },
  {
    name: 'Sentinel Agent',
    id: 'sentinel',
    icon: '🛡️',
    color: '#ef4444',
    rgb: '239,68,68',
    role: 'Continuous monitoring, anomaly detection, emergency alerts',
    status: 'active' as const,
  },
];

export default function WorkflowMonitor() {
  const { events, isRunning, triageHistory } = useSimulationStore();
  const [activeStage, setActiveStage] = useState<string | null>(null);

  useEffect(() => {
    const handleTrace = (e: CustomEvent) => {
      const payload = e.detail;
      setActiveStage(payload.stage);
      
      if (payload.stage === 'completed') {
        setTimeout(() => setActiveStage(null), 3000);
      }
    };

    window.addEventListener('workflow_execution_trace', handleTrace as EventListener);
    return () => window.removeEventListener('workflow_execution_trace', handleTrace as EventListener);
  }, []);

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f1f5f9' }}>
          MAS Workflow Monitor
        </h1>
        <p style={{ color: '#94a3b8', maxWidth: '800px' }}>
          Visualization of the Multi-Agent System (MAS) routing and conflict resolution via the Meta-Agent.
          Shows active LangGraph execution paths and live event history.
        </p>
      </div>

      {/* Three-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '24px' }}>

        {/* ── Column 1: Orchestration Flow ── */}
        <div className="glass-card" style={{ padding: '24px', minHeight: '600px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '24px' }}>
            Live LangGraph Orchestration
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            {/* Input Node */}
            <div style={{
              padding: '16px', borderRadius: '10px', width: '280px', textAlign: 'center',
              background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
            }}>
              <Database size={22} style={{ margin: '0 auto 8px', color: '#60a5fa' }} />
              <div style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>Event Ingestion</div>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>Vitals Stream · ER Admissions · Alerts</div>
            </div>

            <ArrowDown size={18} color="#475569" />

            {/* Meta-Agent Supervisor */}
            <div style={{
              padding: '20px', borderRadius: '12px', width: '320px', textAlign: 'center',
              background: 'rgba(168,85,247,0.12)', border: `1px solid ${isRunning ? 'rgba(168,85,247,0.5)' : 'rgba(100,116,139,0.3)'}`,
              boxShadow: isRunning ? '0 0 25px rgba(168,85,247,0.2)' : 'none',
              transition: 'all 0.3s ease',
            }}>
              <BrainCircuit size={28} style={{ margin: '0 auto 10px', color: '#c084fc' }} />
              <div style={{ color: 'white', fontWeight: 700, fontSize: '16px' }}>Meta-Agent Supervisor</div>
              <div style={{ color: '#d8b4fe', fontSize: '12px', marginTop: '4px' }}>Conflict Detection · Routing · Consensus</div>
              <div style={{
                marginTop: '10px', fontSize: '11px', fontWeight: 600,
                color: isRunning ? '#4ade80' : '#64748b',
              }}>
                {isRunning ? '● ORCHESTRATING' : '○ STANDBY'}
              </div>
            </div>

            <ArrowDown size={18} color="#475569" />

            {/* Agent Cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
              {AGENTS.map((agent) => {
                const isActive = agent.status === 'active' && isRunning;
                const isCurrentlyExecuting = activeStage === agent.id;
                const isPlaceholder = agent.status !== 'active';
                return (
                  <div
                    key={agent.name}
                    style={{
                      padding: '14px', textAlign: 'center', width: '140px',
                      borderRadius: '10px', position: 'relative',
                      background: isCurrentlyExecuting 
                        ? `rgba(${agent.rgb},0.25)` 
                        : isActive
                          ? `rgba(${agent.rgb},0.12)`
                          : isPlaceholder
                            ? 'rgba(100,116,139,0.08)'
                            : `rgba(${agent.rgb},0.06)`,
                      border: `1px solid ${isCurrentlyExecuting ? '#fff' : isActive ? agent.color : isPlaceholder ? 'rgba(100,116,139,0.2)' : `rgba(${agent.rgb},0.15)`}`,
                      boxShadow: isCurrentlyExecuting ? `0 0 25px ${agent.color}` : isActive ? `0 0 15px rgba(${agent.rgb},0.15)` : 'none',
                      transform: isCurrentlyExecuting ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      zIndex: isCurrentlyExecuting ? 10 : 1,
                    }}
                  >
                    {isPlaceholder && (
                      <div style={{
                        position: 'absolute', top: '6px', right: '6px',
                        fontSize: '8px', fontWeight: 700, color: '#64748b',
                        background: 'rgba(100,116,139,0.2)', padding: '2px 6px',
                        borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        Soon
                      </div>
                    )}
                    <div style={{ fontSize: '24px', marginBottom: '8px', animation: isCurrentlyExecuting ? 'pulse 1s infinite' : 'none' }}>{agent.icon}</div>
                    <div style={{ color: isPlaceholder ? '#94a3b8' : 'white', fontWeight: 600, fontSize: '12px' }}>
                      {agent.name}
                    </div>
                    <div style={{
                      color: isCurrentlyExecuting ? '#fff' : isActive ? agent.color : '#64748b',
                      fontSize: '10px', marginTop: '4px', fontWeight: 500,
                    }}>
                      {isCurrentlyExecuting ? '⚡ EXECUTING' : isActive ? '● Active' : isPlaceholder ? '○ Planned' : '○ Standby'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <style>{`@keyframes pulse { 0% {transform:scale(1)} 50% {transform:scale(1.2)} 100% {transform:scale(1)} }`}</style>

        {/* ── Column 2: Triage History ── */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="#14b8a6" /> Triage Agent Results
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
            Real-time results from the LLM-powered Triage Agent (Groq)
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
            {triageHistory.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
                No triage results yet. Go to Patients → click "Run Triage" on a patient.
              </p>
            ) : (
              triageHistory.map((t, i) => {
                const prioColor = PRIORITY_COLORS[t.priority] ?? '#64748b';
                return (
                  <div key={`${t.patient_id}-${i}`} style={{
                    padding: '14px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${prioColor}25`,
                    borderLeft: `3px solid ${prioColor}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                        {t.patient_name}
                      </span>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, color: prioColor,
                        padding: '2px 8px', borderRadius: '4px',
                        background: `${prioColor}15`,
                      }}>
                        {t.priority}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#94a3b8' }}>
                      <span>Score: <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{t.severity_score}</span></span>
                      <span>Confidence: <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{Math.round(t.confidence * 100)}%</span></span>
                      {t.escalation_required && (
                        <span style={{ color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <AlertTriangle size={10} /> Escalation
                        </span>
                      )}
                    </div>
                    {t.reasoning.length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                        {t.reasoning[0].substring(0, 120)}{t.reasoning[0].length > 120 ? '…' : ''}
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: '#475569', marginTop: '6px' }}>
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Column 3: Live Event Log ── */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitMerge size={20} color="#a855f7" /> Live Event Log
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
            {events.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>
                {isRunning ? 'Waiting for events…' : 'Start simulation to see live execution log.'}
              </p>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    padding: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${SEVERITY_COLOR[evt.severity] ?? '#64748b'}`,
                  }}
                >
                  <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
                    {new Date(evt.created_at).toLocaleTimeString()} · <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: SEVERITY_COLOR[evt.severity] ?? '#64748b' }}>{evt.severity}</span>
                  </div>
                  <div style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 500 }}>{evt.event_type}</div>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{evt.description}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Agent Role Descriptions */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '20px' }}>
          Agent Pipeline Architecture
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Meta-Agent first */}
          <div style={{
            padding: '16px', borderRadius: '10px',
            background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <BrainCircuit size={18} color="#c084fc" />
              <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '14px' }}>Meta-Agent</span>
              <span style={{
                fontSize: '9px', fontWeight: 700, color: '#c084fc',
                background: 'rgba(168,85,247,0.15)', padding: '2px 6px',
                borderRadius: '4px', marginLeft: 'auto',
              }}>
                SUPERVISOR
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
              Orchestrates all agents using LangGraph. Handles conflict resolution,
              consensus building, and adaptive routing between specialists.
            </p>
          </div>

          {AGENTS.map((agent) => (
            <div key={agent.name} style={{
              padding: '16px', borderRadius: '10px',
              background: agent.status === 'active'
                ? `rgba(${agent.rgb},0.08)`
                : 'rgba(100,116,139,0.05)',
              border: `1px solid ${agent.status === 'active' ? `rgba(${agent.rgb},0.2)` : 'rgba(100,116,139,0.15)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '18px' }}>{agent.icon}</span>
                <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '14px' }}>{agent.name}</span>
                <span style={{
                  fontSize: '9px', fontWeight: 700, marginLeft: 'auto',
                  color: agent.status === 'active' ? agent.color : '#64748b',
                  background: agent.status === 'active' ? `rgba(${agent.rgb},0.15)` : 'rgba(100,116,139,0.15)',
                  padding: '2px 6px', borderRadius: '4px',
                }}>
                  {agent.status === 'active' ? 'ACTIVE' : 'PLANNED'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                {agent.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
