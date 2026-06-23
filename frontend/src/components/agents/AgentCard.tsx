import type { LucideIcon } from 'lucide-react';
import { Play, Lock, Activity } from 'lucide-react';

export interface AgentCardData {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  lastRun: string | null;
  patientsAnalyzed: number;
  actionsCompleted: number;
  isImplemented: boolean;
  futureCapabilities?: string[];
}

interface AgentCardProps {
  agent: AgentCardData;
  onLaunch: () => void;
}

export default function AgentCard({ agent, onLaunch }: AgentCardProps) {
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const Icon = agent.icon;
  const isRunning = agent.status === 'running';
  const isError = agent.status === 'error';

  const statusConfig: Record<string, { label: string; color: string }> = {
    idle: { label: 'STANDBY', color: '#475569' },
    running: { label: 'EXECUTING', color: agent.color },
    completed: { label: 'COMPLETED', color: '#10b981' },
    error: { label: 'ERROR', color: '#ef4444' },
  };
  const statusInfo = statusConfig[agent.status];

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(145deg, rgba(15,23,42,0.8), rgba(30,41,59,0.6))',
      border: `1px solid ${isRunning ? hexToRgba(agent.color, 0.5) : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '20px',
      padding: '28px',
      backdropFilter: 'blur(12px)',
      transition: 'all 0.4s ease',
      cursor: agent.isImplemented ? 'pointer' : 'default',
      overflow: 'hidden',
      boxShadow: isRunning
        ? `0 0 40px ${hexToRgba(agent.color, 0.2)}, inset 0 1px 0 ${hexToRgba(agent.color, 0.1)}`
        : '0 8px 32px rgba(0,0,0,0.3)',
    }}
    onMouseEnter={(e) => {
      if (agent.isImplemented) {
        e.currentTarget.style.borderColor = hexToRgba(agent.color, 0.4);
        e.currentTarget.style.boxShadow = `0 0 30px ${hexToRgba(agent.color, 0.15)}, 0 12px 40px rgba(0,0,0,0.4)`;
        e.currentTarget.style.transform = 'translateY(-4px)';
      }
    }}
    onMouseLeave={(e) => {
      if (agent.isImplemented && !isRunning) {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
        e.currentTarget.style.transform = 'translateY(0)';
      }
    }}
    >
      <style>{`
        @keyframes agentPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes agentGlow {
          0%, 100% { box-shadow: 0 0 12px ${hexToRgba(agent.color, 0.3)}; }
          50% { box-shadow: 0 0 28px ${hexToRgba(agent.color, 0.6)}; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Background Glow */}
      <div style={{
        position: 'absolute',
        top: '-40px', right: '-40px',
        width: '160px', height: '160px',
        borderRadius: '50%',
        background: hexToRgba(agent.color, 0.08),
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />

      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '52px', height: '52px',
            borderRadius: '16px',
            background: hexToRgba(agent.color, 0.15),
            border: `1px solid ${hexToRgba(agent.color, 0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: isRunning ? 'agentGlow 2s ease-in-out infinite' : 'none',
          }}>
            {isRunning ? (
              <Activity size={24} color={agent.color} style={{ animation: 'spin 2s linear infinite' }} />
            ) : (
              <Icon size={24} color={agent.color} />
            )}
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' }}>{agent.name}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: '1.4', maxWidth: '200px' }}>{agent.description}</div>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', borderRadius: '20px',
          background: `${statusInfo.color}15`,
          border: `1px solid ${statusInfo.color}40`,
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: statusInfo.color,
            animation: isRunning ? 'agentPulse 1.2s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: statusInfo.color, letterSpacing: '0.8px' }}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px', marginBottom: '20px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: agent.isImplemented ? '#e2e8f0' : '#475569' }}>
            {agent.patientsAnalyzed}
          </div>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
            Analyzed
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: agent.isImplemented ? '#e2e8f0' : '#475569' }}>
            {agent.actionsCompleted}
          </div>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
            Actions
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: agent.lastRun ? '#94a3b8' : '#475569', lineHeight: '1.6' }}>
            {agent.lastRun || '—'}
          </div>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
            Last Run
          </div>
        </div>
      </div>

      {/* Health Bar */}
      <div style={{ marginBottom: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>System Health</span>
          <span style={{ fontSize: '10px', color: agent.isImplemented ? '#10b981' : '#475569', fontWeight: 600 }}>
            {agent.isImplemented ? (isError ? 'DEGRADED' : 'OPTIMAL') : 'OFFLINE'}
          </span>
        </div>
        <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: agent.isImplemented ? (isError ? '40%' : '100%') : '0%',
            borderRadius: '2px',
            background: isError
              ? 'linear-gradient(90deg, #ef4444, #f97316)'
              : `linear-gradient(90deg, ${agent.color}, ${hexToRgba(agent.color, 0.6)})`,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Launch Button or Coming Soon */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {agent.isImplemented ? (
          <button
            onClick={(e) => { e.stopPropagation(); onLaunch(); }}
            disabled={isRunning}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: isRunning
                ? hexToRgba(agent.color, 0.3)
                : `linear-gradient(135deg, ${agent.color}, ${hexToRgba(agent.color, 0.7)})`,
              color: 'white',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isRunning ? 'none' : `0 4px 20px ${hexToRgba(agent.color, 0.4)}`,
              transition: 'all 0.3s ease',
            }}
          >
            <Play size={16} />
            {isRunning ? 'Agent Running...' : 'Launch Agent'}
          </button>
        ) : (
          <div style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            border: '1px dashed rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.02)',
            color: '#475569',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}>
            <Lock size={14} />
            Coming Soon
          </div>
        )}
      </div>

      {/* Future Agent Overlay */}
      {!agent.isImplemented && agent.futureCapabilities && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.04)',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Planned Capabilities
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {agent.futureCapabilities.map((cap, i) => (
              <span key={i} style={{
                padding: '3px 8px',
                borderRadius: '4px',
                background: hexToRgba(agent.color, 0.08),
                border: `1px solid ${hexToRgba(agent.color, 0.15)}`,
                color: hexToRgba(agent.color, 0.6),
                fontSize: '10px',
                fontWeight: 500,
              }}>
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
