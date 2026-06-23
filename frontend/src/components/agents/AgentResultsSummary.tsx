import { CheckCircle, AlertTriangle, Clock, Users, Zap, XCircle } from 'lucide-react';

export interface AgentRunSummary {
  totalPatients: number;
  processed: number;
  successful: number;
  warnings: number;
  errors: number;
  executionTimeMs: number;
  actions: string[];           // e.g. ["3 patients escalated", "2 beds allocated"]
}

interface AgentResultsSummaryProps {
  summary: AgentRunSummary;
  agentColor: string;
  agentName: string;
}

export default function AgentResultsSummary({ summary, agentColor, agentName }: AgentResultsSummaryProps) {
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const stats = [
    { icon: Users, label: 'Patients Processed', value: `${summary.processed}/${summary.totalPatients}`, color: '#60a5fa' },
    { icon: CheckCircle, label: 'Actions Completed', value: summary.successful.toString(), color: '#10b981' },
    { icon: AlertTriangle, label: 'Warnings', value: summary.warnings.toString(), color: '#f59e0b' },
    { icon: XCircle, label: 'Errors', value: summary.errors.toString(), color: summary.errors > 0 ? '#ef4444' : '#475569' },
    { icon: Clock, label: 'Execution Time', value: formatTime(summary.executionTimeMs), color: '#8b5cf6' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.5s ease forwards' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes countUp { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* Success Banner */}
      <div style={{
        padding: '20px 24px',
        background: `linear-gradient(135deg, ${hexToRgba(agentColor, 0.15)}, ${hexToRgba(agentColor, 0.05)})`,
        border: `1px solid ${hexToRgba(agentColor, 0.3)}`,
        borderRadius: '16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: `0 0 30px ${hexToRgba(agentColor, 0.1)}`,
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: hexToRgba(agentColor, 0.2),
          border: `2px solid ${agentColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={24} color={agentColor} />
        </div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
            {agentName} Execution Complete
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
            {summary.processed} patient{summary.processed !== 1 ? 's' : ''} analyzed • {summary.successful} action{summary.successful !== 1 ? 's' : ''} generated
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              animation: `countUp 0.4s ease ${i * 0.1}s both`,
            }}>
              <Icon size={18} color={stat.color} />
              <div style={{ fontSize: '24px', fontWeight: 800, color: stat.color, letterSpacing: '-1px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions Breakdown */}
      {summary.actions.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '12px' }}>
            Completed Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {summary.actions.map((action, i) => (
              <div key={i} style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.02)',
                borderLeft: `3px solid ${agentColor}`,
                fontSize: '13px',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                animation: `fadeIn 0.3s ease ${i * 0.08}s both`,
              }}>
                <CheckCircle size={14} color={agentColor} />
                {action}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
