import { useEffect, useState, useCallback } from 'react';
import { Check, Server, Activity, Loader2, ThumbsUp, ThumbsDown, Shield, BedDouble, PlusCircle } from 'lucide-react';
import { useSimulationStore } from '../../store/simulationStore';
import { bedApi } from '../../services/api/bedApi';

interface BedAgentVisualizationProps {
    onClose: () => void;
}

const STEPS = [
  { icon: Activity, label: 'Evaluating Patient Clinical State', delay: 0 },
  { icon: BedDouble, label: 'Scanning Live Bed Capacity', delay: 500 },
  { icon: Shield, label: 'Cross-Referencing Infection/Triage Risks', delay: 1000 },
  { icon: Server, label: 'LLM Ward Allocation Logic', delay: 1500 },
];

export default function BedAgentVisualization({ onClose }: BedAgentVisualizationProps) {
    const { bedResult } = useSimulationStore();
    const result = bedResult;
    
    // We recreate the Scheduler-like pipeline effect purely visually
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(-1);
    const [showResult, setShowResult] = useState(false);
    const [approving, setApproving] = useState(false);

    // Initial load animation
    useEffect(() => {
        if (!result) return;
        
        // If result already approved/rejected, skip animation
        if (result.status && result.status !== 'pending') {
            setLoading(false);
            setStep(STEPS.length - 1);
            setShowResult(true);
            return;
        }

        // Animate the pipeline
        setLoading(true);
        setStep(-1);
        setShowResult(false);
        
        const timers = STEPS.map((s, i) => setTimeout(() => setStep(i), s.delay));
        const finalTimer = setTimeout(() => {
            setLoading(false);
            setStep(STEPS.length - 1);
            setShowResult(true);
        }, 2000);

        return () => {
            timers.forEach(clearTimeout);
            clearTimeout(finalTimer);
        };
    }, [result]);

    const handleApprove = useCallback(async () => {
        if (!result?.bed_result_id) return;
        setApproving(true);
        try {
            await bedApi.approveBedAssignment(result.bed_result_id);
            // We rely on WebSockets to update the store and change status
            setTimeout(onClose, 1500); // Auto close after a moment
        } catch (err) {
            console.error(err);
        } finally {
            setApproving(false);
        }
    }, [result, onClose]);

    const handleReject = useCallback(async () => {
        if (!result?.bed_result_id) return;
        setApproving(true);
        try {
            await bedApi.rejectBedAssignment(result.bed_result_id);
            setTimeout(onClose, 1500);
        } catch (err) {
            console.error(err);
        } finally {
            setApproving(false);
        }
    }, [result, onClose]);

    if (!result) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-8 max-w-lg w-full text-center shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
                    <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={32} />
                    <h2 className="text-xl font-bold text-slate-100 mb-2">Initializing Bed Agent...</h2>
                    <p className="text-slate-400">Please wait while the orchestrator prepares.</p>
                </div>
            </div>
        );
    }

    const getWardColor = (ward: string) => {
        if (ward.toLowerCase().includes('icu')) return 'bg-rose-500/20 text-rose-500 border-rose-500/50 glow-rose';
        if (ward.toLowerCase().includes('isolation')) return 'bg-amber-500/20 text-amber-500 border-amber-500/50 glow-amber';
        if (ward.toLowerCase().includes('emergency')) return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50 glow-emerald';
        return 'bg-blue-500/20 text-blue-500 border-blue-500/50 glow-blue';
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <style>{`
                .glow-rose { box-shadow: 0 0 30px rgba(244,63,94,0.4); }
                .glow-amber { box-shadow: 0 0 30px rgba(245,158,11,0.4); }
                .glow-emerald { box-shadow: 0 0 30px rgba(16,185,129,0.4); }
                .glow-blue { box-shadow: 0 0 30px rgba(59,130,246,0.4); }
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
            `}</style>
            
            <div style={{ background: 'linear-gradient(145deg, #0f172a, #1e293b)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', overflowY: 'auto', maxHeight: '90vh', maxWidth: '800px', width: '100%' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                    <div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Server size={22} color="#60a5fa" />
                            Bed Operations Agent
                        </h3>
                        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Intelligent Ward & Capacity Allocation</p>
                    </div>
                    
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl font-bold transition-colors">&times;</button>
                </div>

                {/* Pipeline Steps */}
                {(loading || (showResult)) && (
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

                {showResult && (
                    <div style={{ animation: 'fadeIn 0.5s ease forwards' }}>
                        {/* Allocation Display */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '20px' }}>
                            <div className={getWardColor(result.recommended_ward)} style={{ padding: '20px', borderRadius: '12px', border: '1px solid', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                                <Shield size={32} style={{ marginBottom: '8px' }} />
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, marginBottom: '4px' }}>Recommended Ward</div>
                                <div style={{ fontSize: '20px', fontWeight: 800 }}>{result.recommended_ward.toUpperCase()}</div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '16px', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <PlusCircle size={14} /> Triage Priority
                                    </div>
                                    <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 600 }}>Level {result.triage_priority}</div>
                                </div>
                                
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '16px', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <BedDouble size={14} /> Assigned Bed
                                    </div>
                                    <div className={result.assigned_bed_number ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"} style={{ fontSize: '18px' }}>
                                        {result.assigned_bed_number || 'WAITLISTED'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reasoning Chain */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', fontWeight: 600 }}>Live Reasoning Chain</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {result.reasoning?.map((r, i) => (
                                    <div key={i} style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${i === result.reasoning.length - 1 ? '#60a5fa' : '#475569'}`, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', animation: `fadeIn 0.3s ease ${i * 0.1}s both` }}>
                                        {r}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Approve / Reject Flow */}
                        {(!result.status || result.status === 'pending') && (
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <button onClick={handleReject} disabled={approving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: '13px', fontWeight: 600, cursor: approving ? 'not-allowed' : 'pointer' }}>
                                    <ThumbsDown size={16} /> Reject Bed
                                </button>
                                <button onClick={handleApprove} disabled={approving || !result.assigned_bed_number} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '8px', border: 'none', background: !result.assigned_bed_number ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontSize: '13px', fontWeight: 600, cursor: (approving || !result.assigned_bed_number) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
                                    <ThumbsUp size={16} /> Approve Allocation
                                </button>
                            </div>
                        )}

                        {result.status === 'approved' && (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#10b981', fontWeight: 600, background: 'rgba(16,185,129,0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', animation: 'fadeIn 0.3s ease forwards' }}>
                                ✓ Bed Allocated. Medical staff updated.
                            </div>
                        )}
                        
                        {result.status === 'rejected' && (
                            <div style={{ padding: '16px', textAlign: 'center', color: '#ef4444', fontWeight: 600, background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', animation: 'fadeIn 0.3s ease forwards' }}>
                                ⚠ Allocation Rejected.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
