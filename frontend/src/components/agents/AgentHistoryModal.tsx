import { useState, useEffect } from 'react';
import { X, History, Clock, Users, Zap, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';
import { agentApi, type AgentRunHistory } from '../../services/api/agentApi';

interface AgentHistoryModalProps {
  onClose: () => void;
}

export default function AgentHistoryModal({ onClose }: AgentHistoryModalProps) {
  const [history, setHistory] = useState<AgentRunHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await agentApi.getAllHistory();
        setHistory(data);
      } catch (error) {
        console.error("Failed to fetch agent history", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getAgentColor = (agentId: string) => {
    switch (agentId) {
      case 'triage_agent': return '#a855f7';
      case 'pharma_agent': return '#14b8a6';
      case 'scheduler_agent': return '#3b82f6';
      case 'bed_agent': return '#f43f5e';
      default: return '#64748b';
    }
  };

  const getAgentName = (agentId: string) => {
    switch (agentId) {
      case 'triage_agent': return 'Triage Agent';
      case 'pharma_agent': return 'Pharma Agent';
      case 'scheduler_agent': return 'Scheduler Agent';
      case 'bed_agent': return 'Bed Agent';
      default: return agentId;
    }
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{
        width: '100%',
        maxWidth: '900px',
        maxHeight: '85vh',
        background: 'linear-gradient(145deg, #0b1120, #0f172a)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
        animation: 'fadeIn 0.3s ease forwards',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <History size={24} color="#e2e8f0" />
            </div>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.5px' }}>
                Agent Execution History
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0', fontWeight: 500 }}>
                Chronological record of all Human-in-the-Loop agent executions
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#94a3b8',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isLoading ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Loading history...</div>
          ) : history.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px', fontSize: '15px' }}>
              No agent executions found. Run an agent to generate history.
            </div>
          ) : (
            history.map((record, index) => {
              const color = getAgentColor(record.agent_id);
              return (
                <div key={record.id} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${hexToRgba(color, 0.2)}`,
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>{getAgentName(record.agent_id)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
                      <Clock size={14} /> {formatDate(record.created_at)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                      <Users size={16} color="#60a5fa" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#e2e8f0' }}>{record.patients_analyzed}</div>
                      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Analyzed</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                      <Zap size={16} color="#c084fc" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#e2e8f0' }}>{record.recommendations_generated}</div>
                      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Generated</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                      <ThumbsUp size={16} color="#10b981" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>{record.approvals}</div>
                      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Approved</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                      <ThumbsDown size={16} color="#ef4444" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '18px', fontWeight: 800, color: record.rejections > 0 ? '#ef4444' : '#64748b' }}>{record.rejections}</div>
                      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Rejected</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                      <CheckCircle size={16} color={color} style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '18px', fontWeight: 800, color: color }}>{record.actions_executed}</div>
                      <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Executed</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
