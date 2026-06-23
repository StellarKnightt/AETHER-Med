import { useState, useEffect, useCallback } from 'react';
import {
  X, Activity, Brain, FileSearch, Shield, CheckCircle2,
  AlertTriangle, Loader2, ThumbsUp, ThumbsDown, Pill, Zap
} from 'lucide-react';
import { pharmaApi, type PharmaResult } from '../../services/api/pharmaApi';

interface Props {
  patientId: string;
  patientName: string;
  result: PharmaResult | null;
  isProcessing: boolean;
  onClose: () => void;
}

const RISK_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  CRITICAL_RISK: { bg: 'rgba(239,68,68,0.15)', text: '#fca5a5', border: '#ef4444', glow: '0 0 30px rgba(239,68,68,0.4)' },
  HIGH_RISK:     { bg: 'rgba(245,158,11,0.15)', text: '#fcd34d', border: '#f59e0b', glow: '0 0 30px rgba(245,158,11,0.4)' },
  MODERATE_RISK: { bg: 'rgba(59,130,246,0.15)',  text: '#93c5fd', border: '#3b82f6', glow: '0 0 30px rgba(59,130,246,0.4)' },
  LOW_RISK:      { bg: 'rgba(16,185,129,0.15)',  text: '#6ee7b7', border: '#10b981', glow: '0 0 30px rgba(16,185,129,0.4)' },
  SAFE:          { bg: 'rgba(16,185,129,0.15)',  text: '#6ee7b7', border: '#10b981', glow: '0 0 30px rgba(16,185,129,0.4)' },
};

const STEPS = [
  { icon: Activity, label: 'Retrieving Medications & Allergies', delay: 0 },
  { icon: FileSearch, label: 'RAG Knowledge Retrieval', delay: 400 },
  { icon: Brain, label: 'LLM Safety Analysis (Groq)', delay: 800 },
  { icon: Shield, label: 'Risk Classification', delay: 1200 },
];

export default function PharmaVisualization({ patientId, patientName, result, isProcessing, onClose }: Props) {
  const [step, setStep] = useState(-1);
  const [showResult, setShowResult] = useState(false);
  const [workflowPhase, setWorkflowPhase] = useState<'idle' | 'approved' | 'rejected'>('idle');
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (isProcessing) {
      setStep(-1); setShowResult(false); setWorkflowPhase('idle');
      STEPS.forEach((s, i) => setTimeout(() => setStep(i), s.delay));
    }
  }, [isProcessing]);

  useEffect(() => {
    if (result && !isProcessing) {
      setStep(STEPS.length - 1);
      setTimeout(() => setShowResult(true), 300);
    }
  }, [result, isProcessing]);

  const handleApprove = useCallback(async () => {
    if (!result?.db_id) return;
    setApproving(true);
    try {
      await pharmaApi.approvePharma();
      setWorkflowPhase('approved');
    } catch { /* ignore */ }
    setApproving(false);
  }, [result]);

  const handleReject = useCallback(async () => {
    if (!result?.db_id) return;
    setApproving(true);
    try {
      await pharmaApi.rejectPharma();
      setWorkflowPhase('rejected');
    } catch { /* ignore */ }
    setApproving(false);
  }, [result]);

  const risk = result ? (RISK_COLORS[result.risk_level] ?? RISK_COLORS.MODERATE_RISK) : null;

  return (
    <div style={{ position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,backdropFilter:'blur(10px)' }}>
      <div style={{ width:'880px',maxHeight:'92vh',overflowY:'auto',background:'linear-gradient(145deg,#0f172a,#1e293b)',borderRadius:'16px',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 25px 60px rgba(0,0,0,0.6)' }}>
        {/* Header */}
        <div style={{ padding:'24px 28px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <h2 style={{ fontSize:'20px',fontWeight:700,color:'#f1f5f9',display:'flex',alignItems:'center',gap:'10px' }}>
              <Pill size={22} color="#14b8a6" /> Pharma Agent — Safety Review
            </h2>
            <p style={{ fontSize:'13px',color:'#64748b',marginTop:'4px' }}>
              Patient: <strong style={{color:'#e2e8f0'}}>{patientName}</strong> ({patientId.substring(0,8)})
            </p>
          </div>
          <button onClick={onClose} style={{ background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer' }}><X size={22}/></button>
        </div>

        <div style={{ padding:'24px 28px' }}>
          {/* Pipeline Steps */}
          <div style={{ display:'flex',flexDirection:'column',gap:'6px',marginBottom:'24px' }}>
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i <= step;
              const current = i === step && isProcessing;
              return (
                <div key={i} style={{ display:'flex',alignItems:'center',gap:'14px',padding:'10px 14px',borderRadius:'8px',background:active?'rgba(20,184,166,0.08)':'rgba(255,255,255,0.02)',border:`1px solid ${current?'rgba(20,184,166,0.4)':active?'rgba(20,184,166,0.12)':'rgba(255,255,255,0.03)'}`,transition:'all 0.4s',opacity:active?1:0.3 }}>
                  <div style={{ width:'28px',height:'28px',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',background:active?'rgba(20,184,166,0.2)':'rgba(255,255,255,0.05)' }}>
                    {current ? <Loader2 size={14} color="#5eead4" style={{animation:'spin 1s linear infinite'}}/> : active ? <CheckCircle2 size={14} color="#14b8a6"/> : <Icon size={14} color="#475569"/>}
                  </div>
                  <span style={{ fontSize:'13px',fontWeight:active?600:400,color:active?'#e2e8f0':'#475569' }}>{s.label}</span>
                  {current && <span style={{ marginLeft:'auto',fontSize:'11px',color:'#14b8a6',fontWeight:500 }}>Processing…</span>}
                </div>
              );
            })}
          </div>

          {/* Result */}
          {showResult && result && risk && (
            <div style={{ animation:'fadeIn 0.5s ease forwards' }}>
              
              {/* Risk Banner */}
              <div style={{ padding:'20px 24px',borderRadius:'12px',marginBottom:'20px',background:risk.bg,border:`1px solid ${risk.border}`,boxShadow:risk.glow,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'16px' }}>
                <div>
                  <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'4px' }}>Safety Status</div>
                  <div style={{ fontSize:'28px',fontWeight:800,color:risk.text }}>{result.risk_level.replace('_', ' ')}</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'11px',color:'#94a3b8',marginBottom:'4px' }}>Confidence</div>
                  <div style={{ fontSize:'22px',fontWeight:700,color:'#f1f5f9' }}>{Math.round(result.confidence*100)}%</div>
                </div>
                {result.risk_level === 'CRITICAL_RISK' && (
                  <div style={{ display:'flex',alignItems:'center',gap:'6px',padding:'6px 12px',borderRadius:'20px',background:'rgba(239,68,68,0.2)',border:'1px solid rgba(239,68,68,0.4)' }}>
                    <AlertTriangle size={14} color="#fca5a5"/> <span style={{ fontSize:'12px',color:'#fca5a5',fontWeight:600 }}>INTERACTION DETECTED</span>
                  </div>
                )}
              </div>

              {/* Interactions */}
              {result.interactions_detected.length > 0 && (
                <div style={{ marginBottom:'20px' }}>
                  <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px',fontWeight:600 }}>Detected Interactions</div>
                  <div style={{ display:'flex',flexDirection:'column',gap:'6px' }}>
                    {result.interactions_detected.map((r,i) => (
                      <div key={i} style={{ padding:'10px 14px',borderRadius:'8px',background:'rgba(239,68,68,0.1)',borderLeft:`3px solid #ef4444`,fontSize:'13px',color:'#fca5a5',lineHeight:'1.5' }}>{r}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reasoning */}
              <div style={{ marginBottom:'20px' }}>
                <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px',fontWeight:600 }}>Reasoning Chain</div>
                <div style={{ display:'flex',flexDirection:'column',gap:'6px' }}>
                  {result.reasoning.map((r,i) => (
                    <div key={i} style={{ padding:'10px 14px',borderRadius:'8px',background:'rgba(255,255,255,0.02)',borderLeft:`3px solid ${i===0?risk.border:'#14b8a6'}`,fontSize:'13px',color:'#cbd5e1',lineHeight:'1.5',animation:`fadeIn 0.3s ease ${i*0.1}s both` }}>{r}</div>
                  ))}
                </div>
              </div>

              {/* Recommended Actions */}
              {result.recommended_actions.length > 0 && (
                <div style={{ marginBottom:'20px' }}>
                  <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px',fontWeight:600 }}>Recommended Actions</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:'8px' }}>
                    {result.recommended_actions.map((a,i) => (
                      <div key={i} style={{ padding:'8px 14px',borderRadius:'8px',background:'rgba(20,184,166,0.08)',border:'1px solid rgba(20,184,166,0.2)',fontSize:'12px',color:'#5eead4',fontWeight:500,display:'flex',alignItems:'center',gap:'6px' }}>
                        <Zap size={12}/> {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approve / Reject Buttons */}
              {workflowPhase === 'idle' && (
                <div style={{ display:'flex',gap:'12px',justifyContent:'center',padding:'20px 0',borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={handleApprove} disabled={approving} style={{ display:'flex',alignItems:'center',gap:'8px',padding:'12px 28px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg,#10b981,#14b8a6)',color:'white',fontSize:'14px',fontWeight:700,cursor:approving?'not-allowed':'pointer',boxShadow:'0 4px 15px rgba(16,185,129,0.3)' }}>
                    <ThumbsUp size={18}/> Approve Safety
                  </button>
                  <button onClick={handleReject} disabled={approving} style={{ display:'flex',alignItems:'center',gap:'8px',padding:'12px 28px',borderRadius:'10px',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.1)',color:'#fca5a5',fontSize:'14px',fontWeight:700,cursor:approving?'not-allowed':'pointer' }}>
                    <ThumbsDown size={18}/> Escalate / Reject
                  </button>
                </div>
              )}

              {workflowPhase === 'approved' && (
                <div style={{ padding:'20px',textAlign:'center',color:'#10b981',fontWeight:600 }}>✓ Safety Approved. Workflow continuing...</div>
              )}
              {workflowPhase === 'rejected' && (
                <div style={{ padding:'20px',textAlign:'center',color:'#ef4444',fontWeight:600 }}>⚠ Review Escalated. Check pending actions.</div>
              )}
            </div>
          )}

          {/* Processing spinner */}
          {isProcessing && !showResult && (
            <div style={{ padding:'40px',textAlign:'center',background:'rgba(20,184,166,0.05)',borderRadius:'12px',border:'1px dashed rgba(20,184,166,0.2)' }}>
              <Loader2 size={32} color="#14b8a6" style={{animation:'spin 1s linear infinite',margin:'0 auto 16px'}}/>
              <p style={{ color:'#5eead4',fontSize:'14px',fontWeight:500 }}>Running Pharma Agent Analysis…</p>
              <p style={{ color:'#64748b',fontSize:'12px',marginTop:'4px' }}>Cross-referencing medications with allergies via RAG</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
