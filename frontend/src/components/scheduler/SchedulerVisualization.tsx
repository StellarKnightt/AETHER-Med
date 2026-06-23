import React, { useEffect, useState, useCallback } from 'react';
import { Play, Check, AlertTriangle, User, Calendar, Activity, Loader2, ThumbsUp, ThumbsDown, Database, Cpu } from 'lucide-react';
import { schedulerApi, type SchedulerResult } from '../../services/api/schedulerApi';

interface SchedulerVisualizationProps {
    patientId: string;
    onComplete?: () => void;
}

const STEPS = [
  { icon: Database, label: 'Querying Patient & Pharma DB', delay: 0 },
  { icon: User, label: 'Searching Available Staff', delay: 400 },
  { icon: Cpu, label: 'LLM Orchestration Analysis', delay: 800 },
  { icon: Activity, label: 'Matching Specialization & Workload', delay: 1200 },
];

export const SchedulerVisualization: React.FC<SchedulerVisualizationProps> = ({ patientId, onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SchedulerResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState(-1);
    const [showResult, setShowResult] = useState(false);
    const [workflowPhase, setWorkflowPhase] = useState<'idle' | 'approved' | 'rejected'>('idle');
    const [approving, setApproving] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await schedulerApi.getHistory(patientId);
                if (history && history.length > 0) {
                    setResult(history[0]);
                    setWorkflowPhase(history[0].status as any);
                    setStep(STEPS.length - 1);
                    setShowResult(true);
                }
            } catch (err) {
                console.error("Failed to fetch scheduler history", err);
            }
        };
        fetchHistory();
    }, [patientId]);

    const runScheduler = async () => {
        setLoading(true);
        setError(null);
        setStep(-1);
        setShowResult(false);
        setWorkflowPhase('idle');
        
        STEPS.forEach((s, i) => setTimeout(() => setStep(i), s.delay));

        try {
            const res = await schedulerApi.analyze(patientId);
            setResult(res);
            setStep(STEPS.length - 1);
            setTimeout(() => setShowResult(true), 300);
            if (onComplete) onComplete();
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = useCallback(async () => {
        if (!result?.id) return;
        setApproving(true);
        try {
            await schedulerApi.approve(result.id);
            setWorkflowPhase('approved');
        } catch (err) {
            console.error(err);
        } finally {
            setApproving(false);
        }
    }, [result]);

    const handleReject = useCallback(async () => {
        if (!result?.id) return;
        setApproving(true);
        try {
            await schedulerApi.reject(result.id);
            setWorkflowPhase('rejected');
        } catch (err) {
            console.error(err);
        } finally {
            setApproving(false);
        }
    }, [result]);

    const getPriorityColor = (level: string) => {
        switch (level) {
            case 'EMERGENCY_RESPONSE': return 'bg-red-500/20 text-red-500 border-red-500/50 glow-red';
            case 'CRITICAL_PRIORITY': return 'bg-orange-500/20 text-orange-500 border-orange-500/50 glow-orange';
            case 'HIGH_PRIORITY': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50 glow-yellow';
            default: return 'bg-blue-500/20 text-blue-500 border-blue-500/50 glow-blue';
        }
    };

    return (
        <div style={{ background: 'linear-gradient(145deg, #0f172a, #1e293b)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', overflowY: 'auto', maxHeight: '100%' }}>
            <style>{`
                .glow-red { box-shadow: 0 0 30px rgba(239,68,68,0.4); }
                .glow-orange { box-shadow: 0 0 30px rgba(245,158,11,0.4); }
                .glow-yellow { box-shadow: 0 0 30px rgba(234,179,8,0.4); }
                .glow-blue { box-shadow: 0 0 30px rgba(59,130,246,0.4); }
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
            `}</style>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={22} color="#60a5fa" />
                        Scheduler Orchestrator
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Intelligent Resource & Workflow Allocation</p>
                </div>
                
                <button
                    onClick={runScheduler}
                    disabled={loading || (result != null && workflowPhase === 'idle' && showResult)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                        background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white', borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '13px', fontWeight: 600, boxShadow: '0 4px 15px rgba(59,130,246,0.3)'
                    }}
                >
                    {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={16} />}
                    {loading ? 'Orchestrating...' : (result ? 'Re-Run Scheduler' : 'Run Scheduler')}
                </button>
            </div>

            {error && (
                <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px' }}>
                    <AlertTriangle size={20} />
                    <div>
                        <h4 style={{ fontWeight: 600, margin: 0 }}>Orchestration Error</h4>
                        <p style={{ margin: 0, fontSize: '13px', marginTop: '4px' }}>{error}</p>
                    </div>
                </div>
            )}

            {/* Pipeline Steps */}
            {(loading || (showResult && result)) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const active = i <= step;
                        const current = i === step && loading;
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', borderRadius: '8px', background: active ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${current ? 'rgba(59,130,246,0.4)' : active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)'}`, transition: 'all 0.4s', opacity: active ? 1 : 0.3 }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)' }}>
                                    {current ? <Loader2 size={14} color="#93c5fd" style={{ animation: 'spin 1s linear infinite' }} /> : active ? <Check size={14} color="#60a5fa" /> : <Icon size={14} color="#475569" />}
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: active ? 600 : 400, color: active ? '#e2e8f0' : '#475569' }}>{s.label}</span>
                                {current && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#60a5fa', fontWeight: 500 }}>Processing…</span>}
                            </div>
                        );
                    })}
                </div>
            )}

            {showResult && result && (
                <div style={{ animation: 'fadeIn 0.5s ease forwards' }}>
                    {/* Priority & Assignments */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '20px' }}>
                        <div className={getPriorityColor(result.priority_level)} style={{ padding: '20px', borderRadius: '12px', border: '1px solid', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                            <Activity size={32} style={{ marginBottom: '8px' }} />
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, marginBottom: '4px' }}>Priority Level</div>
                            <div style={{ fontSize: '20px', fontWeight: 800 }}>{result.priority_level.replace('_', ' ')}</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '16px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <User size={14} /> Assigned Doctor
                                </div>
                                <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 600 }}>{result.assigned_doctor_name || 'Pending...'}</div>
                            </div>
                            
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '16px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <User size={14} /> Assigned Nurse
                                </div>
                                <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 600 }}>{result.assigned_nurse_name || 'Pending...'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Reasoning Chain */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', fontWeight: 600 }}>Live Reasoning Chain</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {result.reasoning_chain?.map((r, i) => (
                                <div key={i} style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${i === result.reasoning_chain.length - 1 ? '#60a5fa' : '#475569'}`, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', animation: `fadeIn 0.3s ease ${i * 0.1}s both` }}>
                                    {r}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Workflow Actions */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', fontWeight: 600 }}>Orchestrator Actions</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {result.workflow_actions?.map((action, idx) => (
                                <span key={idx} style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', color: '#93c5fd', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Check size={12} color="#60a5fa" />
                                    {action}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Approve / Reject Flow */}
                    {workflowPhase === 'idle' && (
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <button onClick={handleReject} disabled={approving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: '13px', fontWeight: 600, cursor: approving ? 'not-allowed' : 'pointer' }}>
                                <ThumbsDown size={16} /> Reject Assignment
                            </button>
                            <button onClick={handleApprove} disabled={approving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontSize: '13px', fontWeight: 600, cursor: approving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
                                <ThumbsUp size={16} /> Approve Execution
                            </button>
                        </div>
                    )}

                    {workflowPhase === 'approved' && (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#10b981', fontWeight: 600, background: 'rgba(16,185,129,0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', animation: 'fadeIn 0.3s ease forwards' }}>
                            ✓ Assignment Executed. Doctors and Nurses notified and workloads updated.
                        </div>
                    )}
                    
                    {workflowPhase === 'rejected' && (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#ef4444', fontWeight: 600, background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', animation: 'fadeIn 0.3s ease forwards' }}>
                            ⚠ Assignment Rejected. Awaiting manual override or re-orchestration.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
