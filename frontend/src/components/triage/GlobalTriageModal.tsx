import { useState, useEffect } from 'react';
import { X, Brain, Loader2, AlertTriangle, CheckCircle2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { simulationApi } from '../../services/api/simulationApi';
import { useSimulationStore } from '../../store/simulationStore';
import type { TriageResult, WorkflowAction } from '../../store/simulationStore';

interface Props {
  onClose: () => void;
}

const PRIO_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f59e0b', MODERATE: '#3b82f6', LOW: '#10b981',
};

export default function GlobalTriageModal({ onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<TriageResult[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [actionsMap, setActionsMap] = useState<Record<string, WorkflowAction[]>>({});
  const [visibleActionsMap, setVisibleActionsMap] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await simulationApi.batchTriage();
        setResults(res.results || []);
        setSummary(res.summary || {});
        res.results?.forEach((r: TriageResult) => {
          useSimulationStore.getState().addTriageResult(r);
        });
      } catch (e) {
        console.error('Batch triage failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Animate workflow actions
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleActionsMap((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(next)) {
          const max = actionsMap[id]?.length ?? 0;
          if (next[id] < max) next[id] = next[id] + 1;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [actionsMap]);

  const handleApprove = async (triageId: string) => {
    try {
      const res = await simulationApi.approveTriage(triageId);
      setApprovedIds((s) => new Set([...s, triageId]));
      setActionsMap((m) => ({ ...m, [triageId]: res.workflow_actions || [] }));
      setVisibleActionsMap((m) => ({ ...m, [triageId]: 0 }));
      useSimulationStore.getState().updateTriageStatus(triageId, 'approved', res.workflow_actions || []);
    } catch { /* ignore */ }
  };

  const handleReject = async (triageId: string) => {
    try {
      const res = await simulationApi.rejectTriage(triageId);
      setApprovedIds((s) => new Set([...s, triageId]));
      setActionsMap((m) => ({ ...m, [triageId]: res.workflow_actions || [] }));
      setVisibleActionsMap((m) => ({ ...m, [triageId]: 0 }));
      useSimulationStore.getState().updateTriageStatus(triageId, 'rejected', res.workflow_actions || []);
    } catch { /* ignore */ }
  };

  const handleApproveAll = async () => {
    for (const r of results) {
      if (!approvedIds.has(r.triage_id)) {
        await handleApprove(r.triage_id);
        await new Promise((res) => setTimeout(res, 200));
      }
    }
  };

  return (
    <div style={{ position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,backdropFilter:'blur(10px)' }}>
      <div style={{ width:'1000px',maxHeight:'92vh',overflowY:'auto',background:'linear-gradient(145deg,#0f172a,#1e293b)',borderRadius:'16px',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 25px 60px rgba(0,0,0,0.6)' }}>
        {/* Header */}
        <div style={{ padding:'24px 28px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <h2 style={{ fontSize:'20px',fontWeight:700,color:'#f1f5f9',display:'flex',alignItems:'center',gap:'10px' }}>
              <Brain size={22} color="#a855f7"/> Global Triage — Batch Processing
            </h2>
            <p style={{ fontSize:'13px',color:'#64748b',marginTop:'4px' }}>
              Analyzing all active patients through the Triage Agent pipeline
            </p>
          </div>
          <button onClick={onClose} style={{ background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer' }}><X size={22}/></button>
        </div>

        <div style={{ padding:'24px 28px' }}>
          {loading ? (
            <div style={{ padding:'60px',textAlign:'center' }}>
              <Loader2 size={40} color="#a855f7" style={{animation:'spin 1s linear infinite',margin:'0 auto 20px'}}/>
              <p style={{ color:'#c084fc',fontSize:'16px',fontWeight:600 }}>Running batch triage on all patients…</p>
              <p style={{ color:'#64748b',fontSize:'13px',marginTop:'6px' }}>Analyzing vitals, diseases, and generating reasoning via Groq LLM</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div style={{ display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'12px',marginBottom:'24px' }}>
                {[
                  { label: 'Total', value: summary.total ?? 0, color: '#a855f7' },
                  { label: 'Critical', value: summary.critical ?? 0, color: '#ef4444' },
                  { label: 'High', value: summary.high ?? 0, color: '#f59e0b' },
                  { label: 'Moderate', value: summary.moderate ?? 0, color: '#3b82f6' },
                  { label: 'Escalations', value: summary.escalations ?? 0, color: '#ef4444' },
                ].map((c) => (
                  <div key={c.label} style={{ padding:'16px',borderRadius:'10px',background:`${c.color}10`,border:`1px solid ${c.color}25`,textAlign:'center' }}>
                    <div style={{ fontSize:'24px',fontWeight:800,color:c.color }}>{c.value}</div>
                    <div style={{ fontSize:'11px',color:'#94a3b8',marginTop:'4px',textTransform:'uppercase',letterSpacing:'0.5px' }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Summary sentences */}
              <div style={{ padding:'16px 20px',borderRadius:'10px',background:'rgba(168,85,247,0.06)',border:'1px solid rgba(168,85,247,0.15)',marginBottom:'24px',display:'flex',flexDirection:'column',gap:'6px' }}>
                {(summary.critical ?? 0) > 0 && (
                  <p style={{ fontSize:'13px',color:'#fca5a5',fontWeight:500 }}>
                    ⚠️ {summary.critical} patient{(summary.critical??0)>1?'s are':' is'} currently in critical condition.
                  </p>
                )}
                {(summary.escalations ?? 0) > 0 && (
                  <p style={{ fontSize:'13px',color:'#fcd34d',fontWeight:500 }}>
                    🚨 {summary.escalations} ICU escalation{(summary.escalations??0)>1?'s':''} recommended.
                  </p>
                )}
                {(summary.high ?? 0) > 0 && (
                  <p style={{ fontSize:'13px',color:'#fcd34d',fontWeight:500 }}>
                    ⚡ {summary.high} patient{(summary.high??0)>1?'s require':' requires'} urgent physician consultation.
                  </p>
                )}
                {results.some(r => r.diseases.length > 0) && (
                  <p style={{ fontSize:'13px',color:'#93c5fd',fontWeight:500 }}>
                    🔬 Multiple patients have pre-existing conditions affecting triage severity.
                  </p>
                )}
              </div>

              {/* Approve All button */}
              <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:'16px' }}>
                <button onClick={handleApproveAll} style={{ display:'flex',alignItems:'center',gap:'8px',padding:'10px 20px',borderRadius:'8px',border:'none',background:'linear-gradient(135deg,#10b981,#14b8a6)',color:'white',fontSize:'13px',fontWeight:600,cursor:'pointer',boxShadow:'0 4px 12px rgba(16,185,129,0.3)' }}>
                  <ThumbsUp size={14}/> Approve All
                </button>
              </div>

              {/* Per-patient results */}
              <div style={{ display:'flex',flexDirection:'column',gap:'12px' }}>
                {results.map((r) => {
                  const pc = PRIO_COLORS[r.priority] ?? '#64748b';
                  const isHandled = approvedIds.has(r.triage_id);
                  const wActions = actionsMap[r.triage_id] ?? [];
                  const visCount = visibleActionsMap[r.triage_id] ?? 0;
                  return (
                    <div key={r.triage_id} style={{ padding:'16px 20px',borderRadius:'12px',background:'rgba(255,255,255,0.02)',border:`1px solid ${pc}20`,borderLeft:`4px solid ${pc}` }}>
                      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
                        <div>
                          <span style={{ fontSize:'14px',fontWeight:600,color:'#f1f5f9' }}>{r.patient_name}</span>
                          <span style={{ fontSize:'12px',color:'#64748b',marginLeft:'8px' }}>Age {r.age}</span>
                          {r.diseases.length > 0 && r.diseases.map((d, i) => (
                            <span key={i} style={{ marginLeft:'6px',padding:'2px 8px',borderRadius:'4px',fontSize:'10px',fontWeight:600,color:'#fca5a5',background:'rgba(239,68,68,0.1)' }}>{d}</span>
                          ))}
                        </div>
                        <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
                          <span style={{ padding:'4px 12px',borderRadius:'6px',fontSize:'12px',fontWeight:700,color:pc,background:`${pc}15` }}>{r.priority}</span>
                          <span style={{ fontSize:'12px',color:'#94a3b8' }}>{Math.round(r.confidence*100)}%</span>
                          {r.escalation_required && <AlertTriangle size={14} color="#ef4444"/>}
                        </div>
                      </div>

                      {/* Final decision */}
                      {r.final_decision && (
                        <p style={{ fontSize:'12px',color:'#c084fc',fontStyle:'italic',marginBottom:'8px' }}>"{r.final_decision}"</p>
                      )}

                      {/* First reasoning line */}
                      {r.reasoning.length > 0 && (
                        <p style={{ fontSize:'12px',color:'#94a3b8',marginBottom:'10px' }}>{r.reasoning[0]}</p>
                      )}

                      {/* Actions or Approve/Reject */}
                      {!isHandled ? (
                        <div style={{ display:'flex',gap:'8px' }}>
                          <button onClick={() => handleApprove(r.triage_id)} style={{ display:'flex',alignItems:'center',gap:'4px',padding:'6px 14px',borderRadius:'6px',border:'none',background:'rgba(16,185,129,0.15)',color:'#6ee7b7',fontSize:'11px',fontWeight:600,cursor:'pointer' }}>
                            <CheckCircle2 size={12}/> Approve
                          </button>
                          <button onClick={() => handleReject(r.triage_id)} style={{ display:'flex',alignItems:'center',gap:'4px',padding:'6px 14px',borderRadius:'6px',border:'1px solid rgba(239,68,68,0.2)',background:'transparent',color:'#fca5a5',fontSize:'11px',fontWeight:600,cursor:'pointer' }}>
                            <ThumbsDown size={12}/> Reject
                          </button>
                        </div>
                      ) : (
                        <div style={{ display:'flex',flexDirection:'column',gap:'6px',marginTop:'8px' }}>
                          {wActions.slice(0, visCount).map((wa, i) => (
                            <div key={i} style={{ display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',borderRadius:'6px',background:'rgba(168,85,247,0.06)',border:'1px solid rgba(168,85,247,0.1)',animation:'slideIn 0.3s ease both' }}>
                              <span style={{ fontSize:'14px' }}>{wa.icon}</span>
                              <span style={{ fontSize:'10px',color:'#a855f7',fontWeight:600,minWidth:'80px' }}>{wa.agent}</span>
                              <span style={{ fontSize:'12px',color:'#e2e8f0' }}>{wa.action}</span>
                            </div>
                          ))}
                          {visCount < wActions.length && (
                            <div style={{ display:'flex',alignItems:'center',gap:'6px',color:'#a855f7',fontSize:'11px',padding:'4px 12px' }}>
                              <Loader2 size={12} style={{animation:'spin 1s linear infinite'}}/> Processing…
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}
