import { useState, useEffect } from 'react';
import { Brain, Pill, Calendar, BedDouble, Shield, Network, Cpu, Zap, History } from 'lucide-react';
import AgentCard, { type AgentCardData } from '../components/agents/AgentCard';
import AgentExecutionModal from '../components/agents/AgentExecutionModal';
import AgentHistoryModal from '../components/agents/AgentHistoryModal';
import { agentApi } from '../services/api/agentApi';
import { sentinelAgentApi } from '../services/api/sentinelAgentApi';
import { metaAgentApi } from '../services/api/metaAgentApi';

const DEFAULT_AGENTS: AgentCardData[] = [
  {
    id: 'triage_agent',
    name: 'Triage Agent',
    description: 'Patient triage, severity detection & emergency assessment',
    icon: Brain,
    color: '#a855f7',
    status: 'idle',
    lastRun: null,
    patientsAnalyzed: 0,
    actionsCompleted: 0,
    isImplemented: true,
  },
  {
    id: 'pharma_agent',
    name: 'Pharma Agent',
    description: 'Allergy scanning, medication review & interaction detection',
    icon: Pill,
    color: '#14b8a6',
    status: 'idle',
    lastRun: null,
    patientsAnalyzed: 0,
    actionsCompleted: 0,
    isImplemented: true,
  },
  {
    id: 'scheduler_agent',
    name: 'Scheduler Agent',
    description: 'Doctor & nurse assignment, workload balancing',
    icon: Calendar,
    color: '#3b82f6',
    status: 'idle',
    lastRun: null,
    patientsAnalyzed: 0,
    actionsCompleted: 0,
    isImplemented: true,
  },
  {
    id: 'bed_agent',
    name: 'Bed Agent',
    description: 'Ward allocation, bed assignment & capacity management',
    icon: BedDouble,
    color: '#f43f5e',
    status: 'idle',
    lastRun: null,
    patientsAnalyzed: 0,
    actionsCompleted: 0,
    isImplemented: true,
  },
  {
    id: 'sentinel_agent',
    name: 'Sentinel Agent',
    description: 'Cybersecurity monitoring, anomaly detection & access control',
    icon: Shield,
    color: '#f59e0b',
    status: 'idle',
    lastRun: null,
    patientsAnalyzed: 0,
    actionsCompleted: 0,
    isImplemented: true,
  },
  {
    id: 'meta_agent',
    name: 'Meta-Agent',
    description: 'Agent coordination, conflict resolution & adaptive routing',
    icon: Network,
    color: '#6366f1',
    status: 'idle',
    lastRun: null,
    patientsAnalyzed: 0,
    actionsCompleted: 0,
    isImplemented: true,
  },
];

const PIPELINE_FLOW = [
  { label: 'Triage', color: '#a855f7', icon: Brain },
  { label: 'Pharma', color: '#14b8a6', icon: Pill },
  { label: 'Scheduler', color: '#3b82f6', icon: Calendar },
  { label: 'Bed', color: '#f43f5e', icon: BedDouble },
  { label: 'Sentinel', color: '#f59e0b', icon: Shield },
  { label: 'Meta', color: '#6366f1', icon: Network },
];

export default function Agents() {
  const [agents, setAgents] = useState<AgentCardData[]>(DEFAULT_AGENTS);
  const [executingAgent, setExecutingAgent] = useState<AgentCardData | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const [metrics, sentinelStatus, metaStatus] = await Promise.all([
        agentApi.getMetrics().catch(() => []),
        sentinelAgentApi.getStatus().catch(() => null),
        metaAgentApi.getStatus().catch(() => null)
      ]);
      
      setAgents(prev => prev.map(a => {
        if (a.id === 'sentinel_agent' && sentinelStatus) {
          return {
            ...a,
            status: sentinelStatus.status === 'active' ? 'running' as const : 'idle' as const,
            patientsAnalyzed: sentinelStatus.events_processed || 0,
            actionsCompleted: sentinelStatus.incidents_detected || 0,
            lastRun: sentinelStatus.started_at ? new Date(sentinelStatus.started_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : a.lastRun
          };
        }
        
        if (a.id === 'meta_agent' && metaStatus) {
          return {
            ...a,
            status: metaStatus.status === 'active' ? 'running' as const : 'idle' as const,
            patientsAnalyzed: metaStatus.events_processed || 0,
            actionsCompleted: metaStatus.recoveries_completed || 0,
            lastRun: metaStatus.started_at ? new Date(metaStatus.started_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : a.lastRun
          };
        }
        
        const metric = metrics.find(m => m.agent_id === a.id);
        if (metric) {
          return {
            ...a,
            patientsAnalyzed: metric.patients_analyzed,
            actionsCompleted: metric.actions_executed,
            lastRun: metric.last_run_at ? new Date(metric.last_run_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : null
          };
        }
        return a;
      }));
    } catch (err) {
      console.error("Failed to fetch agent metrics", err);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleLaunch = async (agent: AgentCardData) => {
    if (agent.id === 'sentinel_agent') {
      try {
        await sentinelAgentApi.startMonitoring();
        setToastMessage('Sentinel Agent launched successfully.');
        setTimeout(() => setToastMessage(null), 3000);
        fetchMetrics();
      } catch (err) {
        console.error(err);
      }
      return;
    }
    
    if (agent.id === 'meta_agent') {
      try {
        await metaAgentApi.startMonitoring();
        setToastMessage('Meta-Agent launched successfully.');
        setTimeout(() => setToastMessage(null), 3000);
        fetchMetrics();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: 'running' as const } : a));
    setExecutingAgent(agent);
  };

  const handleComplete = (agentId: string) => {
    fetchMetrics(); // Refresh metrics from DB
    
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, status: 'completed' as const } : a
    ));

    setTimeout(() => {
      setAgents(prev => prev.map(a =>
        a.id === agentId ? { ...a, status: 'idle' as const } : a
      ));
    }, 8000);
  };

  const handleClose = () => {
    if (executingAgent) {
      setAgents(prev => prev.map(a =>
        a.id === executingAgent.id && a.status === 'running' ? { ...a, status: 'idle' as const } : a
      ));
    }
    setExecutingAgent(null);
  };

  const onlineAgents = agents.filter(a => a.isImplemented).length;

  return (
    <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      <style>{`
        @keyframes pipelineFlow {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes headerGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div style={{
        background: 'linear-gradient(145deg, #0b1120, #0f172a)',
        padding: '32px',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '32px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(99,102,241,0.08)', filter: 'blur(60px)', pointerEvents: 'none', animation: 'headerGlow 4s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(168,85,247,0.06)', filter: 'blur(60px)', pointerEvents: 'none', animation: 'headerGlow 4s ease-in-out infinite 2s' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(99,102,241,0.2)',
            }}>
              <Cpu size={32} color="#818cf8" />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.5px' }}>
                Agent Orchestration Center
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '6px 0 0', fontWeight: 500 }}>
                AETHER-Med Multi-Agent Intelligence System
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => setShowHistory(true)}
              style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '0 24px',
                display: 'flex', alignItems: 'center', gap: '10px',
                cursor: 'pointer', color: '#e2e8f0', fontSize: '14px', fontWeight: 700,
                transition: 'all 0.3s ease',
              }}
            >
              <History size={18} color="#94a3b8" />
              Execution History
            </button>

            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '14px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc' }}>{onlineAgents}</span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Agents Online</span>
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '14px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>OPERATIONAL</span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '6px' }}>System Status</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== AGENT CARDS GRID ===== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        marginBottom: '32px',
      }}>
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onLaunch={() => handleLaunch(agent)}
          />
        ))}
      </div>

      {/* ===== CLINICAL WORKFLOW PIPELINE ===== */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(15,23,42,0.8), rgba(30,41,59,0.6))',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        padding: '28px',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Zap size={18} color="#f59e0b" />
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.3px' }}>
            Clinical Workflow Pipeline
          </h2>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginLeft: '8px' }}>
            Agent execution order in the AETHER-Med pipeline
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', padding: '8px 0' }}>
          {PIPELINE_FLOW.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                  padding: '16px 24px',
                  borderRadius: '14px',
                  background: `linear-gradient(145deg, ${step.color}15, ${step.color}08)`,
                  border: `1px solid ${step.color}30`,
                  minWidth: '100px',
                  transition: 'all 0.3s ease',
                  cursor: 'default',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px',
                    background: `${step.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={20} color={step.color} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: step.color, letterSpacing: '0.3px' }}>
                    {step.label}
                  </span>
                </div>
                {i < PIPELINE_FLOW.length - 1 && (
                  <div style={{
                    width: '40px', height: '2px',
                    background: `linear-gradient(90deg, ${step.color}60, ${PIPELINE_FLOW[i+1].color}60)`,
                    backgroundSize: '200% 100%',
                    animation: 'pipelineFlow 3s linear infinite',
                    margin: '0 4px',
                    boxShadow: `0 0 8px ${step.color}30`,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== EXECUTION MODAL ===== */}
      {executingAgent && (
        <AgentExecutionModal
          agentId={executingAgent.id}
          agentName={executingAgent.name}
          agentColor={executingAgent.color}
          agentIcon={executingAgent.icon}
          onClose={handleClose}
          onComplete={() => handleComplete(executingAgent.id)}
        />
      )}
      
      {/* ===== HISTORY MODAL ===== */}
      {showHistory && (
        <AgentHistoryModal onClose={() => setShowHistory(false)} />
      )}
      
      {/* ===== TOAST MESSAGE ===== */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          background: 'rgba(16, 185, 129, 0.9)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          animation: 'fade-in-up 0.3s ease-out forwards',
          fontWeight: 600
        }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✓
          </div>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
