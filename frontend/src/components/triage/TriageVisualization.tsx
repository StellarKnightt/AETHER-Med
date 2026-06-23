import { useState, useEffect, useCallback } from 'react';
import {
  X, Activity, Brain, FileSearch, BarChart3, Shield, CheckCircle2,
  AlertTriangle, Loader2, ThumbsUp, ThumbsDown, Stethoscope, Zap,
} from 'lucide-react';
import type { TriageResult, WorkflowAction } from '../../store/simulationStore';
import { useSimulationStore } from '../../store/simulationStore';

interface Props {
  result: TriageResult | null;
  isProcessing: boolean;
  onClose: () => void;
}

const PRIO_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  CRITICAL: { bg: 'rgba(239,68,68,0.15)', text: '#fca5a5', border: '#ef4444', glow: '0 0 30px rgba(239,68,68,0.4)' },
  HIGH:     { bg: 'rgba(245,158,11,0.15)', text: '#fcd34d', border: '#f59e0b', glow: '0 0 30px rgba(245,158,11,0.4)' },
  MODERATE: { bg: 'rgba(59,130,246,0.15)',  text: '#93c5fd', border: '#3b82f6', glow: '0 0 30px rgba(59,130,246,0.4)' },
  LOW:      { bg: 'rgba(16,185,129,0.15)',  text: '#6ee7b7', border: '#10b981', glow: '0 0 30px rgba(16,185,129,0.4)' },
};

const VITAL_LABELS: Record<string, string> = { hr: 'Heart Rate', spo2: 'SpO₂', rr: 'Resp Rate', sbp: 'Systolic BP', temp: 'Temp °C' };
const SEV_BADGE: Record<string, { c: string; l: string }> = {
  normal: { c: '#10b981', l: 'Normal' }, warning: { c: '#f59e0b', l: 'Warning' },
  critical: { c: '#ef4444', l: 'Critical' }, critical_low: { c: '#ef4444', l: 'Critical Low' }, critical_high: { c: '#ef4444', l: 'Critical High' },
};

const STEPS = [
  { icon: Activity, label: 'Receiving Patient Data', delay: 0 },
  { icon: BarChart3, label: 'Analyzing Vitals & Diseases', delay: 400 },
  { icon: FileSearch, label: 'Evaluating Clinical Rules', delay: 800 },
  { icon: Brain, label: 'LLM Reasoning (Groq)', delay: 1200 },
  { icon: FileSearch, label: 'Retrieving Protocols', delay: 1600 },
  { icon: Shield, label: 'Final Decision', delay: 2000 },
];

export default function TriageVisualization({ result, isProcessing, onClose }: Props) {
  const [step, setStep] = useState(-1);
  const [showResult, setShowResult] = useState(false);
  const [workflowPhase, setWorkflowPhase] = useState<'idle' | 'approved' | 'rejected'>('idle');
  const [workflowActions, setWorkflowActions] = useState<WorkflowAction[]>([]);
  const [visibleActions, setVisibleActions] = useState(0);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (isProcessing) {
      setStep(-1); setShowResult(false); setWorkflowPhase('idle'); setWorkflowActions([]); setVisibleActions(0);
      STEPS.forEach((s, i) => setTimeout(() => setStep(i), s.delay));
    }
  }, [isProcessing]);

  useEffect(() => {
    if (result && !isProcessing) {
      setStep(STEPS.length - 1);
      setTimeout(() => setShowResult(true), 300);
    }
  }, [result, isProcessing]);

  // Animate workflow actions one-by-one
  useEffect(() => {
    if (workflowActions.length > 0 && visibleActions < workflowActions.length) {
      const t = setTimeout(() => setVisibleActions((v) => v + 1), 600);
      return () => clearTimeout(t);
    }
  }, [workflowActions, visibleActions]);

  const handleApprove = useCallback(async () => {
    if (!result || !result.execution_id) return;
    setApproving(true);
    try {
      const { workflowApi } = await import('../../services/api/workflowApi');
      await workflowApi.resumeWorkflow(result.execution_id, 'approve');
      // For now, UI action log can just be generic, trace viewer will show real events
      const actionMock = [{ agent: 'Routing Controller', action: 'Route approved, forwarding to Pharma Agent.', icon: 'Share2' }];
      setWorkflowActions(actionMock as any);
      setWorkflowPhase('approved');
      setVisibleActions(0);
      useSimulationStore.getState().updateTriageStatus(result.triage_id, 'approved', actionMock as any);
    } catch { /* ignore */ }
    setApproving(false);
  }, [result]);

  const handleReject = useCallback(async () => {
    if (!result || !result.execution_id) return;
    setApproving(true);
    try {
      const { workflowApi } = await import('../../services/api/workflowApi');
      await workflowApi.resumeWorkflow(result.execution_id, 'reject');
      const actionMock = [{ agent: 'Routing Controller', action: 'Route rejected, workflow halted.', icon: 'XCircle' }];
      setWorkflowActions(actionMock as any);
      setWorkflowPhase('rejected');
      setVisibleActions(0);
      useSimulationStore.getState().updateTriageStatus(result.triage_id, 'rejected', actionMock as any);
    } catch { /* ignore */ }
    setApproving(false);
  }, [result]);

  const prio = result ? (PRIO_COLORS[result.priority] ?? PRIO_COLORS.LOW) : null;

  return (
    <div style={{ position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2100,backdropFilter:'blur(10px)' }}>
      <div style={{ width:'880px',maxHeight:'92vh',overflowY:'auto',background:'linear-gradient(145deg,#0f172a,#1e293b)',borderRadius:'16px',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 25px 60px rgba(0,0,0,0.6)' }}>
        {/* Header */}
        <div style={{ padding:'24px 28px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <h2 style={{ fontSize:'20px',fontWeight:700,color:'#f1f5f9',display:'flex',alignItems:'center',gap:'10px' }}>
              <Brain size={22} color="#a855f7" /> Triage Agent — Live Processing
            </h2>
            {result && (
              <p style={{ fontSize:'13px',color:'#64748b',marginTop:'4px' }}>
                Patient: <strong style={{color:'#e2e8f0'}}>{result.patient_name}</strong> · Age {result.age} · {result.gender}
              </p>
            )}
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
                <div key={i} style={{ display:'flex',alignItems:'center',gap:'14px',padding:'10px 14px',borderRadius:'8px',background:active?'rgba(168,85,247,0.08)':'rgba(255,255,255,0.02)',border:`1px solid ${current?'rgba(168,85,247,0.4)':active?'rgba(168,85,247,0.12)':'rgba(255,255,255,0.03)'}`,transition:'all 0.4s',opacity:active?1:0.3 }}>
                  <div style={{ width:'28px',height:'28px',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',background:active?'rgba(168,85,247,0.2)':'rgba(255,255,255,0.05)' }}>
                    {current ? <Loader2 size={14} color="#c084fc" style={{animation:'spin 1s linear infinite'}}/> : active ? <CheckCircle2 size={14} color="#a855f7"/> : <Icon size={14} color="#475569"/>}
                  </div>
                  <span style={{ fontSize:'13px',fontWeight:active?600:400,color:active?'#e2e8f0':'#475569' }}>{s.label}</span>
                  {current && <span style={{ marginLeft:'auto',fontSize:'11px',color:'#a855f7',fontWeight:500 }}>Processing…</span>}
                </div>
              );
            })}
          </div>

          {/* Result */}
          {showResult && result && prio && (
            <div style={{ animation:'fadeIn 0.5s ease forwards' }}>
              {/* Diseases & Symptoms */}
              {(result.diseases.length > 0 || result.symptoms.length > 0) && (
                <div style={{ display:'flex',gap:'16px',marginBottom:'20px',flexWrap:'wrap' }}>
                  {result.diseases.length > 0 && (
                    <div style={{ flex:1,minWidth:'200px' }}>
                      <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px' }}>Diseases / Conditions</div>
                      <div style={{ display:'flex',flexWrap:'wrap',gap:'6px' }}>
                        {result.diseases.map((d, i) => (
                          <span key={i} style={{ padding:'4px 10px',borderRadius:'6px',fontSize:'11px',fontWeight:600,color:'#fca5a5',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)' }}>{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.symptoms.length > 0 && (
                    <div style={{ flex:1,minWidth:'200px' }}>
                      <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px' }}>Presenting Symptoms</div>
                      <div style={{ display:'flex',flexWrap:'wrap',gap:'6px' }}>
                        {result.symptoms.map((s, i) => (
                          <span key={i} style={{ padding:'4px 10px',borderRadius:'6px',fontSize:'11px',fontWeight:500,color:'#fcd34d',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.15)' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Priority Banner */}
              <div style={{ padding:'20px 24px',borderRadius:'12px',marginBottom:'20px',background:prio.bg,border:`1px solid ${prio.border}`,boxShadow:prio.glow,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'16px' }}>
                <div>
                  <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'4px' }}>Priority</div>
                  <div style={{ fontSize:'28px',fontWeight:800,color:prio.text }}>{result.priority}</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'11px',color:'#94a3b8',marginBottom:'4px' }}>Confidence</div>
                  <div style={{ fontSize:'22px',fontWeight:700,color:'#f1f5f9' }}>{Math.round(result.confidence*100)}%</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'11px',color:'#94a3b8',marginBottom:'4px' }}>Severity</div>
                  <div style={{ fontSize:'22px',fontWeight:700,color:prio.text }}>{result.severity_score}</div>
                </div>
                {result.escalation_required && (
                  <div style={{ display:'flex',alignItems:'center',gap:'6px',padding:'6px 12px',borderRadius:'20px',background:'rgba(239,68,68,0.2)',border:'1px solid rgba(239,68,68,0.4)' }}>
                    <AlertTriangle size={14} color="#fca5a5"/> <span style={{ fontSize:'12px',color:'#fca5a5',fontWeight:600 }}>ESCALATION</span>
                  </div>
                )}
              </div>

              {/* Final Decision */}
              {result.final_decision && (
                <div style={{ padding:'16px 20px',borderRadius:'10px',marginBottom:'20px',background:'rgba(168,85,247,0.08)',border:'1px solid rgba(168,85,247,0.2)',display:'flex',alignItems:'center',gap:'12px' }}>
                  <Stethoscope size={20} color="#c084fc"/>
                  <div>
                    <div style={{ fontSize:'10px',color:'#a855f7',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'2px' }}>Final Decision</div>
                    <div style={{ fontSize:'14px',fontWeight:600,color:'#e2e8f0',lineHeight:'1.4' }}>{result.final_decision}</div>
                  </div>
                </div>
              )}

              {/* Vitals Grid */}
              <div style={{ marginBottom:'20px' }}>
                <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px',fontWeight:600 }}>Vitals Analysis</div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'8px' }}>
                  {Object.entries(result.vitals_analysis.mapped).map(([k,v]) => {
                    const ind = result.vitals_analysis.severity_indicators[k];
                    const b = SEV_BADGE[ind] ?? SEV_BADGE.normal;
                    return (
                      <div key={k} style={{ padding:'12px',borderRadius:'8px',background:'rgba(0,0,0,0.2)',border:`1px solid ${b.c}30`,textAlign:'center' }}>
                        <div style={{ fontSize:'10px',color:'#64748b',marginBottom:'4px' }}>{VITAL_LABELS[k]??k}</div>
                        <div style={{ fontSize:'18px',fontWeight:700,color:b.c }}>{typeof v==='number'?Math.round(v*10)/10:v}</div>
                        <div style={{ fontSize:'9px',fontWeight:600,color:b.c,marginTop:'2px',textTransform:'uppercase' }}>{b.l}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reasoning */}
              <div style={{ marginBottom:'20px' }}>
                <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'10px',fontWeight:600 }}>Reasoning Chain</div>
                <div style={{ display:'flex',flexDirection:'column',gap:'6px' }}>
                  {result.reasoning.map((r,i) => (
                    <div key={i} style={{ padding:'10px 14px',borderRadius:'8px',background:'rgba(255,255,255,0.02)',borderLeft:`3px solid ${i===0?prio.border:'#14b8a6'}`,fontSize:'13px',color:'#cbd5e1',lineHeight:'1.5',animation:`fadeIn 0.3s ease ${i*0.1}s both` }}>{r}</div>
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
              {workflowPhase === 'idle' && result.status === 'pending' && (
                <div style={{ display:'flex',gap:'12px',justifyContent:'center',padding:'20px 0',borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={handleApprove} disabled={approving} style={{ display:'flex',alignItems:'center',gap:'8px',padding:'12px 28px',borderRadius:'10px',border:'none',background:'linear-gradient(135deg,#10b981,#14b8a6)',color:'white',fontSize:'14px',fontWeight:700,cursor:approving?'not-allowed':'pointer',boxShadow:'0 4px 15px rgba(16,185,129,0.3)' }}>
                    <ThumbsUp size={18}/> Approve & Execute
                  </button>
                  <button onClick={handleReject} disabled={approving} style={{ display:'flex',alignItems:'center',gap:'8px',padding:'12px 28px',borderRadius:'10px',border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.1)',color:'#fca5a5',fontSize:'14px',fontWeight:700,cursor:approving?'not-allowed':'pointer' }}>
                    <ThumbsDown size={18}/> Reject & Review
                  </button>
                </div>
              )}

              {/* Workflow Actions Timeline */}
              {workflowPhase !== 'idle' && workflowActions.length > 0 && (
                <div style={{ padding:'20px 0',borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px' }}>
                    <div style={{ width:'8px',height:'8px',borderRadius:'50%',background:workflowPhase==='approved'?'#10b981':'#f59e0b',animation:'pulse 1.5s infinite' }}/>
                    <span style={{ fontSize:'13px',fontWeight:600,color:workflowPhase==='approved'?'#6ee7b7':'#fcd34d',textTransform:'uppercase',letterSpacing:'0.5px' }}>
                      {workflowPhase === 'approved' ? 'Workflow Executing' : 'Alternative Workflow'}
                    </span>
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',gap:'8px',position:'relative',paddingLeft:'20px' }}>
                    <div style={{ position:'absolute',left:'7px',top:'0',bottom:'0',width:'2px',background:'rgba(168,85,247,0.2)' }}/>
                    {workflowActions.slice(0, visibleActions).map((wa, i) => (
                      <div key={i} style={{ display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderRadius:'10px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(168,85,247,0.12)',animation:'slideIn 0.4s ease both',position:'relative' }}>
                        <div style={{ position:'absolute',left:'-17px',width:'10px',height:'10px',borderRadius:'50%',background:'#a855f7',border:'2px solid #0f172a' }}/>
                        <span style={{ fontSize:'18px' }}>{wa.icon}</span>
                        <div>
                          <div style={{ fontSize:'10px',color:'#a855f7',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px' }}>{wa.agent}</div>
                          <div style={{ fontSize:'13px',color:'#e2e8f0',fontWeight:500,lineHeight:'1.4' }}>{wa.action}</div>
                        </div>
                      </div>
                    ))}
                    {visibleActions < workflowActions.length && (
                      <div style={{ display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',color:'#a855f7',fontSize:'12px' }}>
                        <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> Coordinating agents…
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing spinner */}
          {isProcessing && !showResult && (
            <div style={{ padding:'40px',textAlign:'center',background:'rgba(168,85,247,0.05)',borderRadius:'12px',border:'1px dashed rgba(168,85,247,0.2)' }}>
              <Loader2 size={32} color="#a855f7" style={{animation:'spin 1s linear infinite',margin:'0 auto 16px'}}/>
              <p style={{ color:'#c084fc',fontSize:'14px',fontWeight:500 }}>Running Triage Agent via Groq LLM…</p>
              <p style={{ color:'#64748b',fontSize:'12px',marginTop:'4px' }}>Analyzing vitals, diseases, symptoms, and generating dynamic reasoning</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
