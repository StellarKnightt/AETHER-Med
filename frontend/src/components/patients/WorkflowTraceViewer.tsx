import { useState, useEffect } from 'react';
import { X, Activity, Pill, Calendar, Bed, CheckCircle2, Server, UserCheck, Share2, FileText, Loader2, Network } from 'lucide-react';
import { workflowApi } from '../../services/api/workflowApi';
import ReactMarkdown from 'react-markdown';

interface Props {
  patientId: string;
  onClose: () => void;
}

const STAGES = [
  { id: 'triage', label: 'Triage Agent', icon: Activity, color: '#ef4444' },
  { id: 'approval', label: 'Approval Gateway', icon: UserCheck, color: '#f59e0b' },
  { id: 'routing', label: 'Routing Controller', icon: Share2, color: '#0ea5e9' },
  { id: 'pharma', label: 'Pharma Agent', icon: Pill, color: '#a855f7' },
  { id: 'scheduler', label: 'Scheduler Agent', icon: Calendar, color: '#3b82f6' },
  { id: 'bed', label: 'Bed Agent', icon: Bed, color: '#10b981' },
  { id: 'outcome', label: 'Outcome Report', icon: FileText, color: '#6366f1' }
];

export default function WorkflowTraceViewer({ patientId, onClose }: Props) {
  const [activeStage, setActiveStage] = useState('triage');
  const [traces, setTraces] = useState<any[]>([]);
  const [showRag, setShowRag] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  // Fetch execution history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await workflowApi.getPatientWorkflow(patientId);
        if (data) {
          if (data.execution_id) setExecutionId(data.execution_id);
          if (data.traces && data.traces.length > 0) {
            setTraces(data.traces);
            
            // Set active stage logic based on history
            if (data.status === 'awaiting_approval') {
              setActiveStage('approval');
            } else {
              const lastTrace = data.traces[data.traces.length - 1];
              if (lastTrace && lastTrace.stage) {
                setActiveStage(lastTrace.stage);
              }
            }
          } else if (data.status === 'awaiting_approval') {
             setActiveStage('approval');
          }
        }
      } catch (err) {
        console.error('Failed to fetch workflow history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [patientId]);

  // Dynamically compute stages
  const routingTrace = traces.find(t => t.stage === 'routing');
  let dynamicStages = STAGES; // default to full static pipeline
  
  if (routingTrace && routingTrace.output && routingTrace.output.selected_path) {
    const pathStr = routingTrace.output.selected_path.toLowerCase();
    
    const dynamicIds = ['triage', 'approval', 'routing'];
    if (pathStr.includes('pharma')) dynamicIds.push('pharma');
    if (pathStr.includes('scheduler')) dynamicIds.push('scheduler');
    if (pathStr.includes('bed')) dynamicIds.push('bed');
    
    // Support Sentinel and Meta
    if (pathStr.includes('sentinel')) dynamicIds.push('sentinel');
    if (pathStr.includes('meta')) dynamicIds.push('meta');
    
    dynamicIds.push('outcome');
    
    const ALL_AVAILABLE_STAGES = [
      ...STAGES,
      { id: 'sentinel', label: 'Sentinel Security', icon: Server, color: '#a855f7' },
      { id: 'meta', label: 'Meta-Agent Recovery', icon: Server, color: '#f59e0b' }
    ];
    
    dynamicStages = dynamicIds.map(id => ALL_AVAILABLE_STAGES.find(s => s.id === id)).filter(Boolean) as any;
  }

  // Listen to websocket trace events
  useEffect(() => {
    const handleTrace = (e: CustomEvent) => {
      const payload = e.detail;
      if (payload.patient_id === patientId) {
        if (payload.execution_id) setExecutionId(payload.execution_id);
        
        let displayStage = payload.stage;
        if (displayStage === 'awaiting_approval') {
           displayStage = 'approval';
           setActiveStage('approval');
        } else if (!['started', 'failed', 'completed'].includes(displayStage)) {
           setActiveStage(displayStage);
           
           setTraces(prev => {
             const newTraces = [...prev];
             const existingIdx = newTraces.findIndex(t => t.stage === displayStage);
             if (existingIdx >= 0) {
               newTraces[existingIdx] = payload;
             } else {
               newTraces.push(payload);
             }
             return newTraces;
           });
        } else if (displayStage === 'completed') {
           setActiveStage('outcome');
        }
      }
    };

    window.addEventListener('workflow_execution_trace', handleTrace as EventListener);
    return () => window.removeEventListener('workflow_execution_trace', handleTrace as EventListener);
  }, [patientId]);

  const activeTrace = traces.find(t => t.stage === activeStage);

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!executionId) return;
    setIsResuming(true);
    try {
      await workflowApi.resumeWorkflow(executionId, action);
    } catch (err) {
      console.error('Failed to resume workflow:', err);
    } finally {
      setIsResuming(false);
    }
  };

  return (
    <div style={{ position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,backdropFilter:'blur(10px)' }}>
      <div className="trace-modal-body" style={{ width:'95vw',maxWidth:'1000px',height:'90vh',display:'flex',flexDirection:'column',background:'linear-gradient(145deg,#0f172a,#1e293b)',borderRadius:'16px',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 25px 60px rgba(0,0,0,0.6)' }}>
        
        {/* Header */}
        <div style={{ padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <h2 style={{ fontSize:'18px',fontWeight:700,color:'#f1f5f9',display:'flex',alignItems:'center',gap:'8px' }}>
              <Server size={20} color="#10b981" /> Patient MAS Workflow
            </h2>
            <p style={{ fontSize:'12px',color:'#64748b',marginTop:'4px' }}>Live End-to-End Execution Trace & Gateway Approval</p>
          </div>
          <button onClick={onClose} style={{ background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer' }}><X size={22}/></button>
        </div>

        <div className="trace-container" style={{ display:'flex',flex:1,overflow:'hidden' }}>
          {/* Sidebar */}
          <div className="trace-sidebar" style={{ width:'280px',minWidth:'280px',borderRight:'1px solid rgba(255,255,255,0.06)',background:'rgba(0,0,0,0.2)',padding:'20px',overflowY:'auto' }}>
            <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'16px' }}>LangGraph Execution Map</div>
            <div style={{ display:'flex',flexDirection:'column',gap:'4px' }}>
              
              {/* START Node */}
              <div style={{ display:'flex',alignItems:'center',gap:'12px',padding:'8px 12px',borderRadius:'8px',color:'#94a3b8' }}>
                 <div style={{ width:'12px',height:'12px',borderRadius:'50%',background:'#475569',border:'2px solid #334155' }} />
                 <span style={{ fontSize:'13px',fontWeight:600 }}>START</span>
              </div>
              <div style={{ width:'2px',height:'12px',background:'#334155',marginLeft:'17px' }} />

              {dynamicStages.map((s) => {
                const Icon = s.icon;
                const traceNode = traces.find(t => t.stage === s.id);
                const isCompleted = !!traceNode && !traceNode.output?.error && s.id !== 'approval';
                const isFailed = !!traceNode && !!traceNode.output?.error;
                const isActive = activeStage === s.id;
                
                let statusColor = '#475569'; // pending
                if (isCompleted || (s.id === 'approval' && traceNode?.output?.approval_status === 'approved')) statusColor = '#10b981';
                if (isFailed || (s.id === 'approval' && traceNode?.output?.approval_status === 'rejected')) statusColor = '#ef4444';
                
                return (
                  <div key={s.id} style={{ display:'flex',flexDirection:'column' }}>
                    <button
                      onClick={() => setActiveStage(s.id)}
                      style={{ 
                        flex:1,display:'flex',alignItems:'center',gap:'12px',padding:'12px',borderRadius:'8px',border:'1px solid',
                        background:isActive?`${s.color}15`:'transparent',
                        borderColor:isActive?`${s.color}40`:'transparent',
                        color:isActive?'#f1f5f9':'#94a3b8',
                        cursor:'pointer',textAlign:'left',transition:'all 0.2s'
                      }}
                    >
                      <Icon size={16} color={isActive?s.color:statusColor} />
                      <div style={{ display:'flex',flexDirection:'column',flex:1 }}>
                        <span style={{ fontSize:'14px',fontWeight:isActive?600:500 }}>{s.label}</span>
                        {traceNode?.duration_ms && (
                           <span style={{ fontSize:'11px',color:'#64748b' }}>{traceNode.duration_ms.toFixed(0)}ms</span>
                        )}
                      </div>
                      {statusColor === '#10b981' && <CheckCircle2 size={14} color="#10b981" />}
                      {statusColor === '#ef4444' && <X size={14} color="#ef4444" />}
                    </button>
                    <div style={{ width:'2px',height:'12px',background:'#334155',marginLeft:'17px' }} />
                  </div>
                );
              })}

              {/* END Node */}
              <div style={{ display:'flex',alignItems:'center',gap:'12px',padding:'8px 12px',borderRadius:'8px',color:'#94a3b8' }}>
                 <div style={{ width:'12px',height:'12px',borderRadius:'50%',background:traces.some(t=>t.stage==='completed')?'#10b981':'#475569',border:'2px solid #334155' }} />
                 <span style={{ fontSize:'13px',fontWeight:600 }}>END</span>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="trace-content" style={{ flex:1,minWidth:0,padding:'24px',overflowY:'auto',overflowX:'hidden' }}>
            {isLoadingHistory ? (
              <div style={{ height:'100%',display:'flex',flexDirection:'column',gap:'16px',alignItems:'center',justifyContent:'center',color:'#94a3b8',fontSize:'14px' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#38bdf8' }} />
                Fetching Execution Telemetry...
              </div>
            ) : !activeTrace && activeStage !== 'approval' ? (
              <div style={{ height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#475569',fontSize:'14px' }}>
                Waiting for {activeStage} execution...
              </div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:'24px',animation:'fadeIn 0.3s ease' }}>
                
                {/* Stage-Specific Structured Cards */}
                
                {/* Triage UI */}
                {activeStage === 'triage' && activeTrace?.output && (
                  <div style={{ background:'rgba(239,68,68,0.05)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'12px',padding:'24px' }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
                      <h3 style={{ margin:0,color:'#fca5a5',fontSize:'18px',display:'flex',alignItems:'center',gap:'8px' }}>
                        <Activity size={20}/> Clinical Triage Assessment
                      </h3>
                      <span style={{ background: activeTrace.output.priority === 'CRITICAL' ? '#ef4444' : activeTrace.output.priority === 'HIGH' ? '#f97316' : '#eab308',color:'white',padding:'6px 16px',borderRadius:'16px',fontSize:'13px',fontWeight:'bold',letterSpacing:'1px' }}>
                        {activeTrace.output.priority} PRIORITY
                      </span>
                    </div>
                    
                    <div style={{ marginBottom:'20px' }}>
                      <div style={{ fontSize:'12px',color:'#94a3b8',textTransform:'uppercase',marginBottom:'8px' }}>Clinical Reasoning</div>
                      <ul style={{ margin:0,paddingLeft:'20px',color:'#cbd5e1',fontSize:'14px',lineHeight:'1.6' }}>
                        {activeTrace.output.reasoning?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                    
                    <div style={{ background:'rgba(0,0,0,0.2)',padding:'16px',borderRadius:'8px',marginBottom:'20px' }}>
                      <div style={{ fontSize:'12px',color:'#94a3b8',textTransform:'uppercase',marginBottom:'8px' }}>Final Decision</div>
                      <div style={{ color:'#f8fafc',fontSize:'15px',fontWeight:500 }}>{activeTrace.output.final_decision}</div>
                    </div>
                    
                    <div>
                      <div style={{ fontSize:'12px',color:'#94a3b8',textTransform:'uppercase',marginBottom:'12px' }}>Recommended Actions</div>
                      <div style={{ display:'flex',gap:'10px',flexWrap:'wrap' }}>
                        {activeTrace.output.recommended_actions?.map((act: string, i: number) => (
                          <span key={i} style={{ background:'rgba(239,68,68,0.1)',color:'#fca5a5',border:'1px solid rgba(239,68,68,0.2)',padding:'8px 16px',borderRadius:'8px',fontSize:'13px',fontWeight:500 }}>
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Approval Gateway UI */}
                {activeStage === 'approval' && (
                  <div style={{ background:'rgba(245,158,11,0.05)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:'12px',padding:'32px',textAlign:'center' }}>
                    <UserCheck size={40} color="#fbbf24" style={{ marginBottom:'16px' }} />
                    
                    {activeTrace?.output ? (
                        <>
                          <h3 style={{ margin:'0 0 12px 0',color:'#fcd34d',fontSize:'20px' }}>Workflow {activeTrace.output.approval_status === 'approved' ? 'Approved' : 'Rejected'}</h3>
                          <p style={{ color:'#cbd5e1',fontSize:'15px',marginBottom:'0' }}>
                            The human supervisor has {activeTrace.output.approval_status} the workflow execution.
                          </p>
                        </>
                    ) : (
                        <>
                          <h3 style={{ margin:'0 0 12px 0',color:'#fcd34d',fontSize:'20px' }}>Human-in-the-Loop Approval Required</h3>
                          <p style={{ color:'#cbd5e1',fontSize:'15px',marginBottom:'32px',maxWidth:'500px',marginLeft:'auto',marginRight:'auto' }}>
                            The Triage Agent has completed its assessment. Please review the recommendations in the Triage tab and approve the workflow to proceed.
                          </p>
                          
                          {executionId ? (
                              <div style={{ display:'flex',justifyContent:'center',gap:'20px' }}>
                                <button 
                                  onClick={() => handleApproval('reject')}
                                  disabled={isResuming}
                                  style={{ background:'transparent',border:'2px solid #ef4444',color:'#ef4444',padding:'12px 32px',borderRadius:'8px',fontSize:'15px',fontWeight:600,cursor:isResuming?'not-allowed':'pointer',transition:'all 0.2s' }}>
                                  Reject & Stop
                                </button>
                                <button 
                                  onClick={() => handleApproval('approve')}
                                  disabled={isResuming}
                                  style={{ background:'#10b981',border:'none',color:'white',padding:'12px 32px',borderRadius:'8px',fontSize:'15px',fontWeight:600,cursor:isResuming?'not-allowed':'pointer',boxShadow:'0 4px 12px rgba(16,185,129,0.3)',transition:'all 0.2s' }}>
                                  {isResuming ? <Loader2 size={18} style={{ animation:'spin 1s linear infinite' }}/> : 'Approve & Execute MAS Workflow'}
                                </button>
                              </div>
                          ) : (
                              <div style={{ color:'#94a3b8',fontSize:'14px' }}>Awaiting execution ID...</div>
                          )}
                        </>
                    )}
                  </div>
                )}

                {/* Routing Controller UI */}
                {activeStage === 'routing' && activeTrace?.output && (
                  <div style={{ background:'linear-gradient(145deg, rgba(14,165,233,0.08), rgba(14,165,233,0.02))',border:'1px solid rgba(14,165,233,0.3)',borderRadius:'16px',padding:'28px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(14,165,233,0.1)', paddingBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '20px', fontWeight: 600 }}>
                        <Network size={24} /> Adaptive Routing Decision
                      </div>
                      <span style={{ background: '#0284c7', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>
                        {activeTrace.output.selected_route || 'STANDARD ROUTE'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ background:'rgba(0,0,0,0.3)',padding:'20px',borderRadius:'12px',borderLeft:'3px solid #0ea5e9' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                           <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',marginBottom:'8px' }}>Routing Rationale</div>
                           <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>CONFIDENCE: {activeTrace.output.confidence || '99%'}</div>
                         </div>
                         <div style={{ color: '#bae6fd', fontSize: '14px', lineHeight: '1.6' }}>
                           {activeTrace.output.reason || 'Standard priority execution path selected.'}
                         </div>
                      </div>

                      {activeTrace.output.factors_evaluated && (
                        <div>
                           <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',marginBottom:'8px' }}>Factors Evaluated</div>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             {activeTrace.output.factors_evaluated.map((factor: string, i: number) => (
                               <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#e0f2fe', background: 'rgba(14,165,233,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(14,165,233,0.1)' }}>
                                 <CheckCircle2 size={16} color="#38bdf8" />
                                 <span>{factor}</span>
                               </div>
                             ))}
                           </div>
                        </div>
                      )}

                      <div style={{ background:'rgba(14,165,233,0.1)',padding:'16px',borderRadius:'12px',border:'1px solid rgba(14,165,233,0.2)' }}>
                        <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',marginBottom:'12px', textAlign: 'center' }}>Visual Route Map</div>
                        <div style={{ color:'#f1f5f9',fontSize:'13px',fontFamily:'monospace',textAlign:'center', fontWeight: 600 }}>
                           {(activeTrace.output.selected_path || 'Triage → Routing → Pharma → Scheduler → Bed').split('→').map((node: string, i: number, arr: any[]) => (
                             <span key={i}>
                               <span style={{ color: node.trim() === 'Routing' ? '#38bdf8' : '#cbd5e1' }}>{node.trim()}</span>
                               {i < arr.length - 1 && <span style={{ color: '#64748b', margin: '0 6px' }}>→</span>}
                             </span>
                           ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pharma Agent UI */}
                {activeStage === 'pharma' && activeTrace?.output && (
                  <div style={{ background:'rgba(168,85,247,0.05)',border:'1px solid rgba(168,85,247,0.2)',borderRadius:'12px',padding:'24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: '#c084fc', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Pill size={20} /> Pharma Agent Verification
                      </h3>
                      <span style={{ 
                        background: activeTrace.output.risk_level?.includes('CRITICAL') || activeTrace.output.risk_level?.includes('HIGH') ? '#ef4444' : activeTrace.output.risk_level?.includes('MODERATE') ? '#f97316' : '#10b981',
                        color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' 
                      }}>
                        {activeTrace.output.risk_level || 'UNKNOWN'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Interactions Detected</div>
                        {activeTrace.output.interactions_detected && activeTrace.output.interactions_detected.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: '16px', color: '#fca5a5', fontSize: '13px', lineHeight: '1.5' }}>
                            {activeTrace.output.interactions_detected.map((inter: string, i: number) => <li key={i}>{inter}</li>)}
                          </ul>
                        ) : (
                          <div style={{ color: '#10b981', fontSize: '13px', fontWeight: 500 }}>No drug-drug or drug-allergy interactions detected.</div>
                        )}
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Confidence Score</div>
                        <div style={{ color: '#f8fafc', fontSize: '20px', fontWeight: 'bold' }}>
                          {activeTrace.output.confidence ? `${(activeTrace.output.confidence * 100).toFixed(0)}%` : 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Clinical Reasoning</div>
                      {Array.isArray(activeTrace.output.reasoning) ? (
                        <ul style={{ margin: 0, paddingLeft: '16px', color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5' }}>
                          {activeTrace.output.reasoning.map((r: string, i: number) => <li key={i}>{r}</li>)}
                        </ul>
                      ) : (
                        <div style={{ color: '#cbd5e1', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{activeTrace.output.reasoning || 'No specific notes provided.'}</div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Recommended Actions</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {activeTrace.output.recommended_actions?.map((act: string, i: number) => (
                          <span key={i} style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Scheduler Agent UI */}
                {activeStage === 'scheduler' && activeTrace?.output && (
                  <div style={{ background:'rgba(59,130,246,0.05)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:'12px',padding:'24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: '#60a5fa', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={20} /> Scheduler Assignment
                      </h3>
                      <span style={{ 
                        background: activeTrace.output.priority_level?.includes('CRITICAL') || activeTrace.output.priority_level?.includes('EMERGENCY') ? '#ef4444' : '#3b82f6',
                        color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' 
                      }}>
                        {activeTrace.output.priority_level?.replace('_', ' ') || 'NORMAL'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Assigned Doctor</div>
                        <div style={{ color: '#f8fafc', fontSize: '15px', fontWeight: 600 }}>
                          {activeTrace.output.assigned_doctor_name || 'Pending...'}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Assigned Nurse</div>
                        <div style={{ color: '#f8fafc', fontSize: '15px', fontWeight: 600 }}>
                          {activeTrace.output.assigned_nurse_name || 'Pending...'}
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Optimization Reasoning</div>
                      {Array.isArray(activeTrace.output.reasoning_chain) ? (
                        <ul style={{ margin: 0, paddingLeft: '16px', color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5' }}>
                          {activeTrace.output.reasoning_chain.map((r: string, i: number) => <li key={i}>{r}</li>)}
                        </ul>
                      ) : (
                        <div style={{ color: '#cbd5e1', fontSize: '13px' }}>{activeTrace.output.reasoning_chain || 'Standard scheduling applied.'}</div>
                      )}
                    </div>

                    {activeTrace.output.workflow_actions && activeTrace.output.workflow_actions.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Workflow Actions</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {activeTrace.output.workflow_actions.map((act: string, i: number) => (
                            <span key={i} style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>
                              {act}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bed Agent UI */}
                {activeStage === 'bed' && activeTrace?.output && (
                  <div style={{ background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:'12px',padding:'24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: '#34d399', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bed size={20} /> Bed Allocation
                      </h3>
                      <span style={{ 
                        background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)',
                        padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' 
                      }}>
                        {activeTrace.output.bed_type_needed || 'general'}
                      </span>
                    </div>

                    <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:'20px',marginBottom:'20px' }}>
                       <div style={{ background:'rgba(0,0,0,0.2)',padding:'16px',borderRadius:'8px',border:activeTrace.output.assigned_bed_number ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)' }}>
                          <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',marginBottom:'6px' }}>Assigned Bed Number</div>
                          <div style={{ color: activeTrace.output.assigned_bed_number ? '#6ee7b7' : '#ef4444',fontSize:'18px',fontWeight:'bold' }}>
                            {activeTrace.output.assigned_bed_number || 'No Bed Assigned'}
                          </div>
                       </div>
                       <div style={{ background:'rgba(0,0,0,0.2)',padding:'16px',borderRadius:'8px' }}>
                          <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',marginBottom:'6px' }}>Recommended Ward</div>
                          <div style={{ color:'#f8fafc',fontSize:'16px',fontWeight:600 }}>
                            {activeTrace.output.recommended_ward || 'General'}
                          </div>
                       </div>
                    </div>
                    
                    <div style={{ background:'rgba(0,0,0,0.2)',padding:'16px',borderRadius:'8px' }}>
                       <div style={{ fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',marginBottom:'8px' }}>Allocation Reasoning</div>
                       {Array.isArray(activeTrace.output.reasoning) ? (
                         <ul style={{ margin: 0, paddingLeft: '16px', color: '#a7f3d0', fontSize: '13px', lineHeight: '1.5' }}>
                           {activeTrace.output.reasoning.map((r: string, i: number) => <li key={i}>{r}</li>)}
                         </ul>
                       ) : (
                         <div style={{ color: '#a7f3d0', fontSize: '13px' }}>{activeTrace.output.reasoning || 'Not specified'}</div>
                       )}
                    </div>
                  </div>
                )}

                {/* Outcome UI */}
                {activeStage === 'outcome' && activeTrace?.output && (
                  <div style={{ background:'rgba(99,102,241,0.05)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:'12px',padding:'24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <h3 style={{ margin: 0, color: '#818cf8', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={20} /> Final Patient Outcome Report
                      </h3>
                      <span style={{ 
                        background: activeTrace.output.final_status === 'Success' ? '#10b981' : '#ef4444',
                        color: 'white', padding: '6px 16px', borderRadius: '16px', fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px'
                      }}>
                        {activeTrace.output.final_status || 'COMPLETE'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                      {/* Triage Summary */}
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Triage Class</div>
                        <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>
                          Priority: <span style={{ color: '#fca5a5' }}>{activeTrace.output.triage?.priority || 'UNKNOWN'}</span>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                          Severity Score: {activeTrace.output.triage?.severity_score || 'N/A'}
                        </div>
                      </div>

                      {/* Pharma Risk Summary */}
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', borderLeft: '3px solid #a855f7' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Pharma Audit</div>
                        <div style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>
                          Risk: <span style={{ color: '#d8b4fe' }}>{activeTrace.output.pharma?.risk_level || 'UNKNOWN'}</span>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                          {activeTrace.output.pharma?.conflicts_detected?.length || 0} Contraindications
                        </div>
                      </div>

                      {/* Staffing Assignment */}
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Staff Assigned</div>
                        <div style={{ color: '#cbd5e1', fontSize: '12px' }}>
                          Dr: <strong style={{ color: '#f8fafc' }}>{activeTrace.output.scheduler?.assigned_doctor || 'None'}</strong>
                        </div>
                        <div style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '4px' }}>
                          Nurse: <strong style={{ color: '#f8fafc' }}>{activeTrace.output.scheduler?.assigned_nurse || 'None'}</strong>
                        </div>
                      </div>

                      {/* Bed & Location */}
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Bed Allocation</div>
                        <div style={{ color: '#cbd5e1', fontSize: '12px' }}>
                          Bed: <strong style={{ color: '#f8fafc' }}>{activeTrace.output.bed?.assigned_bed || 'None'}</strong>
                        </div>
                        <div style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '4px' }}>
                          Ward: <strong style={{ color: '#f8fafc' }}>{activeTrace.output.bed?.ward || 'General'}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Workflow Execution Log</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                        <div>Status: <span style={{ color: activeTrace.output.workflow?.status === 'completed' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{activeTrace.output.workflow?.status}</span></div>
                        <div>Human Approval: <span style={{ color: activeTrace.output.workflow?.approval_status === 'approved' ? '#10b981' : '#ef4444', fontWeight: 600 }}>{activeTrace.output.workflow?.approval_status}</span></div>
                        {activeTrace.output.workflow?.errors && activeTrace.output.workflow.errors.length > 0 && (
                          <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px' }}>
                            <strong>Errors during execution:</strong>
                            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                              {activeTrace.output.workflow.errors.map((err: string, idx: number) => <li key={idx}>{err}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}


                {/* Collapsible RAG Context */}
                {activeTrace?.output?.retrieved_context && (
                  <div style={{ marginTop:'8px' }}>
                    <button 
                      onClick={() => setShowRag(!showRag)}
                      style={{ fontSize: '12px', background: showRag ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', color: showRag ? '#93c5fd' : '#94a3b8', border: showRag ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', transition:'all 0.2s', display:'flex', alignItems:'center', gap:'8px' }}
                    >
                      <Server size={14}/> {showRag ? 'Hide Retrieved Knowledge Context' : 'Show Retrieved Knowledge Context'}
                    </button>
                    
                    {showRag && (
                      <div style={{ animation:'fadeIn 0.3s ease', marginTop:'12px', padding:'20px', background:'rgba(15,23,42,0.6)', borderRadius:'8px', border:'1px solid rgba(59,130,246,0.2)' }}>
                        {activeTrace.output.retrieval_status === 'failed' && (
                          <div style={{ color: '#ef4444', marginBottom: '12px', fontSize: '13px', background:'rgba(239,68,68,0.1)', padding:'8px 12px', borderRadius:'6px' }}>⚠️ Retrieval failed. Agent used prompt-only reasoning.</div>
                        )}
                        {activeTrace.output.retrieved_documents && activeTrace.output.retrieved_documents.length > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform:'uppercase' }}>Source Documents:</span>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                              {activeTrace.output.retrieved_documents.map((doc: any, i: number) => (
                                <span key={i} style={{ fontSize: '11px', background: 'rgba(59,130,246,0.2)', color: '#93c5fd', padding: '4px 8px', borderRadius: '4px', border:'1px solid rgba(59,130,246,0.3)' }}>
                                  📄 {typeof doc === 'string' ? doc : (doc.metadata?.source || 'Unknown')}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <span style={{ fontSize: '12px', color: '#94a3b8', textTransform:'uppercase' }}>Source Documents:</span>
                            <div className="prose prose-sm prose-invert max-w-none" style={{ background: 'rgba(0,0,0,0.4)', padding: '24px', borderRadius: '12px', borderLeft: '3px solid #38bdf8' }}>
                              <ReactMarkdown>{activeTrace.output.retrieved_context}</ReactMarkdown>
                            </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media (max-width: 768px) {
          .trace-container {
            flex-direction: column !important;
            overflow-y: auto !important;
          }
          .trace-sidebar {
            width: 100% !important;
            min-width: 100% !important;
            max-height: 220px !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.06) !important;
            overflow-y: auto !important;
          }
          .trace-modal-body {
            height: 95vh !important;
            width: 98vw !important;
          }
          .trace-content {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
