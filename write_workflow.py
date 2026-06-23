content = """import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { workflowApi } from '../services/api/workflowApi';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Pill, Calendar, Bed, CheckCircle2, Server, UserCheck, 
  Share2, FileText, Loader2, Network, ChevronRight, X, AlertTriangle, PlayCircle,
  Stethoscope, ShieldCheck, HeartPulse, Clock, FileBarChart, Crosshair, ArrowRight
} from 'lucide-react';

interface TraceNode {
  stage: string;
  status: string;
  output: any;
  duration_ms?: number;
}

const STAGES = [
  { id: 'triage', label: 'Triage Agent', icon: Activity, color: '#ef4444' },
  { id: 'approval', label: 'Approval Gateway', icon: UserCheck, color: '#f59e0b' },
  { id: 'routing', label: 'Routing Controller', icon: Share2, color: '#0ea5e9' },
  { id: 'pharma', label: 'Pharma Agent', icon: Pill, color: '#a855f7' },
  { id: 'scheduler', label: 'Scheduler Agent', icon: Calendar, color: '#3b82f6' },
  { id: 'bed', label: 'Bed Agent', icon: Bed, color: '#10b981' },
  { id: 'outcome', label: 'Outcome Report', icon: FileBarChart, color: '#6366f1' }
];

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const pulseVariants = {
  active: {
    boxShadow: ["0px 0px 0px 0px rgba(var(--tw-color), 0.4)", "0px 0px 0px 10px rgba(var(--tw-color), 0)", "0px 0px 0px 0px rgba(var(--tw-color), 0)"],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  },
  inactive: { boxShadow: "none" }
};

export default function WorkflowCenter() {
  const { activeWorkflowId, setActiveWorkflowId } = useAppStore();
  
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  
  const [traces, setTraces] = useState<TraceNode[]>([]);
  const [activeStage, setActiveStage] = useState('triage');
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<string>('Waiting');
  
  const [isResuming, setIsResuming] = useState(false);
  const [showRagForStage, setShowRagForStage] = useState<string | null>(null);

  // ── 1. Fetch All Workflows for Navigator ──
  const fetchWorkflows = async () => {
    try {
      const data = await workflowApi.getAllWorkflows();
      setWorkflows(data);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
    } finally {
      setLoadingWorkflows(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    const interval = setInterval(fetchWorkflows, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── 2. Fetch Selected Workflow Traces ──
  useEffect(() => {
    if (!activeWorkflowId) {
      setTraces([]);
      setExecutionId(null);
      return;
    }
    
    const fetchHistory = async () => {
      try {
        const data = await workflowApi.getPatientWorkflow(activeWorkflowId);
        if (data && data.traces) {
          setExecutionId(data.execution_id);
          
          let displayStatus = data.status;
          if (data.status === 'awaiting_approval') displayStatus = 'Waiting';
          if (data.status === 'running') displayStatus = 'In Progress';
          if (data.status === 'completed') displayStatus = 'Completed';
          if (data.status === 'failed') displayStatus = 'Failed';
          if (data.status === 'rejected') displayStatus = 'Rejected';
          setWorkflowStatus(displayStatus);
          
          setTraces(data.traces);
          
          if (data.status === 'awaiting_approval') {
            setActiveStage('approval');
          } else if (data.traces.length > 0) {
            const lastTrace = data.traces[data.traces.length - 1];
            setActiveStage(data.status === 'completed' ? 'outcome' : lastTrace.stage);
          } else {
             setActiveStage('triage');
          }
        }
      } catch (err) {
        console.error('Failed to fetch workflow history:', err);
      }
    };
    fetchHistory();
  }, [activeWorkflowId]);

  // ── 3. WebSocket Listener for Live Execution ──
  useEffect(() => {
    const handleTrace = (e: CustomEvent) => {
      const payload = e.detail;
      fetchWorkflows();
      
      if (payload.patient_id === activeWorkflowId) {
        if (payload.execution_id) setExecutionId(payload.execution_id);
        
        let displayStage = payload.stage;
        
        if (displayStage === 'awaiting_approval') {
           displayStage = 'approval';
           setActiveStage('approval');
           setWorkflowStatus('Waiting');
        } else if (!['started', 'failed', 'completed'].includes(displayStage)) {
           setActiveStage(displayStage);
           setWorkflowStatus('In Progress');
           
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
           setWorkflowStatus('Completed');
        } else if (displayStage === 'failed') {
           setWorkflowStatus('Failed');
        }
      }
    };

    window.addEventListener('workflow_execution_trace', handleTrace as EventListener);
    return () => window.removeEventListener('workflow_execution_trace', handleTrace as EventListener);
  }, [activeWorkflowId]);

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!executionId) return;
    setIsResuming(true);
    try {
      await workflowApi.resumeWorkflow(executionId, action);
    } catch (err) {
      console.error('Failed to resume workflow:', err);
      setIsResuming(false);
    }
  };
  
  useEffect(() => {
     if (workflowStatus !== 'Waiting') {
         setIsResuming(false);
     }
  }, [workflowStatus]);

  const activeTrace = traces.find(t => t.stage === activeStage);
  const triageTrace = traces.find(t => t.stage === 'triage');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#0a0e1a', color: '#f1f5f9', overflowY: 'auto', overflowX: 'hidden' }}>
      
      {/* ── TOP SECTION: Live Timeline ── */}
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', background: '#0a0e1a', minHeight: '60vh', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        
        {!activeWorkflowId ? (
          <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#64748b' }}>
            <Network size={64} color="#334155" />
            <h3 style={{ fontSize: '20px', fontWeight: 500, color: '#94a3b8' }}>Select a workflow to monitor</h3>
            <p style={{ fontSize: '14px' }}>Launch a MAS workflow from the Patients tab or select one from the navigator.</p>
          </motion.div>
        ) : (
          <>
            {/* Timeline Header (Horizontal) */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '16px', overflowX: 'auto', background: 'rgba(15,23,42,0.4)' }}>
               {STAGES.map((s, idx) => {
                 const Icon = s.icon;
                 const traceNode = traces.find(t => t.stage === s.id);
                 const isCompleted = !!traceNode && !traceNode.output?.error && s.id !== 'approval';
                 const isFailed = !!traceNode && !!traceNode.output?.error;
                 const isActive = activeStage === s.id;
                 const isAwaitingApproval = s.id === 'approval' && workflowStatus === 'Waiting';
                 
                 let iconColor = '#475569';
                 let bgColor = 'transparent';
                 let borderColor = 'rgba(255,255,255,0.1)';
                 
                 if (isCompleted || (s.id === 'approval' && traceNode?.output?.approval_status === 'approved')) {
                   iconColor = s.color;
                   borderColor = s.color;
                 } else if (isFailed || (s.id === 'approval' && traceNode?.output?.approval_status === 'rejected')) {
                   iconColor = '#ef4444';
                   borderColor = '#ef4444';
                 } else if (isActive || isAwaitingApproval) {
                   iconColor = s.color;
                   bgColor = `${s.color}20`;
                   borderColor = s.color;
                 }

                 return (
                   <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                     <motion.button
                       onClick={() => setActiveStage(s.id)}
                       whileHover={{ scale: 1.05 }}
                       whileTap={{ scale: 0.95 }}
                       style={{
                         display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                         background: 'transparent', border: 'none', cursor: 'pointer', opacity: isActive ? 1 : 0.6,
                         transition: 'opacity 0.3s'
                       }}
                     >
                       <motion.div 
                         style={{ 
                           width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                           background: bgColor, border: `2px solid ${borderColor}`,
                           boxShadow: (isActive || isAwaitingApproval) ? `0 0 20px ${s.color}40` : 'none'
                         }}
                         animate={(isActive && !isCompleted && s.id !== 'approval') ? { scale: [1, 1.1, 1], boxShadow: [`0 0 0px ${s.color}00`, `0 0 20px ${s.color}60`, `0 0 0px ${s.color}00`] } : {}}
                         transition={{ duration: 2, repeat: Infinity }}
                       >
                         <Icon size={20} color={iconColor} />
                       </motion.div>
                       <span style={{ fontSize: '12px', fontWeight: isActive ? 600 : 500, color: isActive ? '#f8fafc' : '#94a3b8', whiteSpace: 'nowrap' }}>
                         {s.label}
                       </span>
                     </motion.button>
                     {idx < STAGES.length - 1 && (
                       <div style={{ width: '50px', height: '2px', background: isCompleted ? s.color : 'rgba(255,255,255,0.1)', margin: '0 12px 20px 12px', transition: 'background 0.5s' }} />
                     )}
                   </div>
                 );
               })}
            </div>

            {/* Stage Execution View */}
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                
                <AnimatePresence mode="wait">
                  {!activeTrace && activeStage !== 'approval' ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px', color: '#64748b' }}
                    >
                      <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', marginBottom: '20px', color: '#3b82f6' }} />
                      <h3 style={{ fontSize: '18px', margin: 0, color: '#94a3b8' }}>Awaiting {STAGES.find(s=>s.id===activeStage)?.label}</h3>
                      <p style={{ fontSize: '14px', marginTop: '10px' }}>Evaluating prerequisites and routing context.</p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key={activeStage}
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, y: -20 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}
                    >
                      
                      {/* ── Triage UI ── */}
                      {activeStage === 'triage' && activeTrace?.output && (
                        <motion.div variants={itemVariants} className="glass-panel triage" style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '20px', padding: '36px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(239,68,68,0.1)', paddingBottom: '24px', marginBottom: '32px' }}>
                            <h2 style={{ margin: 0, color: '#fca5a5', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <Activity size={28} /> Triage Analysis Pipeline
                            </h2>
                            <motion.div 
                              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                              style={{ background: activeTrace.output.priority === 'CRITICAL' ? '#ef4444' : activeTrace.output.priority === 'HIGH' ? '#f97316' : '#eab308', color: 'white', padding: '8px 20px', borderRadius: '24px', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}
                            >
                              {activeTrace.output.priority} PRIORITY
                            </motion.div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', marginBottom: '32px' }}>
                             <motion.div variants={itemVariants}>
                               <h4 style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Analysis Progression</h4>
                               <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                 {activeTrace.output.reasoning?.map((r: string, i: number) => (
                                   <motion.li 
                                     key={i} 
                                     initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                     style={{ display: 'flex', gap: '12px', fontSize: '15px', color: '#cbd5e1', alignItems: 'flex-start', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '10px', borderLeft: '3px solid #ef4444' }}
                                   >
                                     <CheckCircle2 size={18} color="#fca5a5" style={{ marginTop: '2px', flexShrink: 0 }} />
                                     <span>{r}</span>
                                   </motion.li>
                                 ))}
                               </ul>
                             </motion.div>
                             
                             <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                               <div style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))', padding: '24px', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                 <h4 style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                   <Crosshair size={14} color="#fca5a5"/> Final Clinical Decision
                                 </h4>
                                 <div style={{ color: '#f8fafc', fontSize: '18px', fontWeight: 600, lineHeight: '1.5' }}>{activeTrace.output.final_decision}</div>
                               </div>
                               <div>
                                 <h4 style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 12px 0' }}>Protocol Recommendations</h4>
                                 <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                   {activeTrace.output.recommended_actions?.map((act: string, i: number) => (
                                     <motion.span 
                                       whileHover={{ scale: 1.05 }}
                                       key={i} 
                                       style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}
                                     >
                                       {act}
                                     </motion.span>
                                   ))}
                                 </div>
                               </div>
                             </motion.div>
                          </div>
                        </motion.div>
                      )}

                      {/* ── Approval Gateway UI ── */}
                      {activeStage === 'approval' && (
                        <motion.div variants={itemVariants} style={{ 
                          background: 'linear-gradient(145deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))', 
                          border: '1px solid rgba(245,158,11,0.3)', borderRadius: '20px', padding: '48px', textAlign: 'center',
                          boxShadow: workflowStatus === 'Waiting' ? '0 0 50px rgba(245,158,11,0.1)' : 'none'
                        }}>
                          <UserCheck size={56} color="#fbbf24" style={{ marginBottom: '24px' }} />
                          
                          {activeTrace?.output ? (
                              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                <h2 style={{ margin: '0 0 16px 0', color: '#fcd34d', fontSize: '32px' }}>Workflow {activeTrace.output.approval_status === 'approved' ? 'Approved' : 'Rejected'}</h2>
                                <p style={{ color: '#cbd5e1', fontSize: '18px', margin: 0 }}>The human supervisor has {activeTrace.output.approval_status} the execution sequence.</p>
                              </motion.div>
                          ) : (
                              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <h2 style={{ margin: '0 0 20px 0', color: '#fcd34d', fontSize: '32px', fontWeight: 600 }}>Human Authorization Required</h2>
                                <p style={{ color: '#cbd5e1', fontSize: '16px', marginBottom: '40px', maxWidth: '650px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.7' }}>
                                  The Triage Agent has completed its assessment. Based on the 
                                  <strong style={{ color: '#fca5a5', padding: '2px 8px', background: 'rgba(239,68,68,0.2)', borderRadius: '4px', margin: '0 6px' }}> {triageTrace?.output?.priority || 'assessed'} </strong> 
                                  priority designation, clinical oversight is mandatory before the Routing Controller dispatches the workflow to automated resource agents.
                                </p>
                                
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => handleApproval('reject')}
                                    disabled={isResuming}
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '2px solid #ef4444', color: '#fca5a5', padding: '16px 40px', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: isResuming ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                                    Reject & Abort
                                  </motion.button>
                                  <motion.button 
                                    whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(245,158,11,0.4)' }} whileTap={{ scale: 0.95 }}
                                    onClick={() => handleApproval('approve')}
                                    disabled={isResuming}
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', color: 'white', padding: '16px 40px', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: isResuming ? 'not-allowed' : 'pointer', boxShadow: '0 8px 20px rgba(245,158,11,0.3)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {isResuming ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }}/> : <PlayCircle size={20} />}
                                    Approve & Execute
                                  </motion.button>
                                </div>
                              </motion.div>
                          )}
                        </motion.div>
                      )}

                      {/* ── Routing Controller UI ── */}
                      {activeStage === 'routing' && activeTrace?.output && (
                        <motion.div variants={itemVariants} className="glass-panel" style={{ background: 'rgba(14,165,233,0.03)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: '20px', padding: '36px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#38bdf8', fontSize: '24px', fontWeight: 600, marginBottom: '32px', borderBottom: '1px solid rgba(14,165,233,0.1)', paddingBottom: '24px' }}>
                            <Share2 size={28} /> Network Routing Dispatch
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                            <motion.div variants={itemVariants} style={{ background: 'rgba(0,0,0,0.3)', padding: '28px', borderRadius: '16px', borderLeft: '4px solid #0ea5e9' }}>
                              <h4 style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 16px 0', letterSpacing: '1px' }}>Decision Algorithm Output</h4>
                              <div style={{ color: '#bae6fd', fontSize: '16px', lineHeight: '1.7', background: 'rgba(14,165,233,0.05)', padding: '20px', borderRadius: '12px' }}>
                                {activeTrace.output.reason}
                              </div>
                            </motion.div>
                            
                            <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ background: 'rgba(14,165,233,0.15)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(14,165,233,0.3)', flex: 1 }}>
                                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Selected Route</div>
                                  <div style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 600 }}>{activeTrace.output.selected_route}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <ArrowRight size={24} color="#0ea5e9" style={{ transform: 'rotate(90deg)' }} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ background: 'rgba(168,85,247,0.15)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(168,85,247,0.3)', flex: 1 }}>
                                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Next Sequence Node</div>
                                  <div style={{ color: '#d8b4fe', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Cpu size={18} /> {activeTrace.output.next_node.replace('_node', ' Agent')}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        </motion.div>
                      )}

                      {/* ── Pharma Agent UI ── */}
                      {activeStage === 'pharma' && activeTrace?.output && (
                        <motion.div variants={itemVariants} className="glass-panel" style={{ background: 'rgba(168,85,247,0.03)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '20px', padding: '36px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(168,85,247,0.1)', paddingBottom: '24px', marginBottom: '32px' }}>
                            <h2 style={{ margin: 0, color: '#c084fc', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <ShieldCheck size={28} /> Pharma Interaction Screening
                            </h2>
                            <motion.div 
                              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                              style={{ background: activeTrace.output.risk_level?.includes('CRITICAL') || activeTrace.output.risk_level?.includes('HIGH') ? '#ef4444' : activeTrace.output.risk_level?.includes('MODERATE') ? '#f97316' : '#10b981', color: 'white', padding: '8px 20px', borderRadius: '24px', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', boxShadow: '0 4px 12px rgba(168,85,247,0.3)' }}
                            >
                              {activeTrace.output.risk_level || 'SAFE'} RISK
                            </motion.div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', marginBottom: '32px' }}>
                             <motion.div variants={itemVariants}>
                               <h4 style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Validation Checks</h4>
                               <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                 {Array.isArray(activeTrace.output.reasoning) ? activeTrace.output.reasoning.map((r: string, i: number) => (
                                   <motion.li 
                                     key={i} 
                                     initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                     style={{ display: 'flex', gap: '12px', fontSize: '15px', color: '#e2e8f0', alignItems: 'flex-start', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '10px', borderLeft: '3px solid #a855f7' }}
                                   >
                                     <CheckCircle2 size={18} color="#c084fc" style={{ marginTop: '2px', flexShrink: 0 }} />
                                     <span>{r}</span>
                                   </motion.li>
                                 )) : (
                                   <li style={{ color: '#e2e8f0', fontSize: '15px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px' }}>{activeTrace.output.reasoning}</li>
                                 )}
                               </ul>
                             </motion.div>
                             <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                               <div style={{ background: activeTrace.output.interactions_detected?.length > 0 ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)', padding: '24px', borderRadius: '16px', border: activeTrace.output.interactions_detected?.length > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)' }}>
                                 <h4 style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                   {activeTrace.output.interactions_detected?.length > 0 ? <AlertTriangle size={16} color="#fca5a5" /> : <ShieldCheck size={16} color="#34d399" />} 
                                   Interaction Flag
                                 </h4>
                                 {activeTrace.output.interactions_detected && activeTrace.output.interactions_detected.length > 0 ? (
                                   <ul style={{ margin: 0, paddingLeft: '20px', color: '#fca5a5', fontSize: '14px', lineHeight: '1.6' }}>
                                     {activeTrace.output.interactions_detected.map((inter: string, i: number) => <li key={i} style={{marginBottom:'6px'}}>{inter}</li>)}
                                   </ul>
                                 ) : (
                                   <div style={{ color: '#34d399', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                     <CheckCircle2 size={20} /> Zero conflicts detected in cross-reference.
                                   </div>
                                 )}
                               </div>
                             </motion.div>
                          </div>

                          <motion.div variants={itemVariants} style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px' }}>
                            <h4 style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 16px 0', letterSpacing: '1px' }}>Prescription Directives</h4>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              {activeTrace.output.recommended_actions?.map((act: string, i: number) => (
                                <motion.span 
                                  whileHover={{ scale: 1.05 }}
                                  key={i} 
                                  style={{ background: 'rgba(168,85,247,0.15)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.3)', padding: '10px 18px', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}
                                >
                                  {act}
                                </motion.span>
                              ))}
                            </div>
                          </motion.div>
                        </motion.div>
                      )}

                      {/* ── Scheduler Agent UI ── */}
                      {activeStage === 'scheduler' && activeTrace?.output && (
                        <motion.div variants={itemVariants} className="glass-panel" style={{ background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '20px', padding: '36px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(59,130,246,0.1)', paddingBottom: '24px', marginBottom: '32px' }}>
                            <h2 style={{ margin: 0, color: '#60a5fa', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <Calendar size={28} /> Autonomous Staff Assignment
                            </h2>
                            <motion.div 
                              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                              style={{ background: activeTrace.output.priority_level?.includes('CRITICAL') || activeTrace.output.priority_level?.includes('EMERGENCY') ? '#ef4444' : '#3b82f6', color: 'white', padding: '8px 20px', borderRadius: '24px', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}
                            >
                              {activeTrace.output.priority_level?.replace('_', ' ') || 'NORMAL'}
                            </motion.div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                            <motion.div variants={itemVariants} style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))', padding: '28px', borderRadius: '16px', borderLeft: '4px solid #60a5fa', borderTop: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <Stethoscope size={20} color="#60a5fa" />
                                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Assigned Physician</div>
                              </div>
                              <div style={{ color: '#f8fafc', fontSize: '22px', fontWeight: 600 }}>
                                {activeTrace.output.assigned_doctor_name || 'Processing...'}
                              </div>
                            </motion.div>
                            <motion.div variants={itemVariants} style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))', padding: '28px', borderRadius: '16px', borderLeft: '4px solid #38bdf8', borderTop: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <HeartPulse size={20} color="#38bdf8" />
                                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Assigned RN</div>
                              </div>
                              <div style={{ color: '#f8fafc', fontSize: '22px', fontWeight: 600 }}>
                                {activeTrace.output.assigned_nurse_name || 'Processing...'}
                              </div>
                            </motion.div>
                          </div>

                          <motion.div variants={itemVariants}>
                             <h4 style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Algorithmic Selection Matrix</h4>
                             <ul style={{ margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.1)' }}>
                               {Array.isArray(activeTrace.output.reasoning_chain) ? activeTrace.output.reasoning_chain.map((r: string, i: number) => (
                                 <motion.li 
                                   key={i}
                                   initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                   style={{ display: 'flex', gap: '12px', fontSize: '15px', color: '#bfdbfe', alignItems: 'flex-start', background: 'rgba(59,130,246,0.05)', padding: '12px', borderRadius: '8px' }}
                                 >
                                   <ChevronRight size={18} color="#60a5fa" style={{ marginTop: '2px', flexShrink: 0 }} />
                                   <span>{r}</span>
                                 </motion.li>
                               )) : (
                                 <li style={{ color: '#bfdbfe', fontSize: '15px' }}>{activeTrace.output.reasoning_chain}</li>
                               )}
                             </ul>
                          </motion.div>
                        </motion.div>
                      )}

                      {/* ── Bed Agent UI ── */}
                      {activeStage === 'bed' && activeTrace?.output && (
                        <motion.div variants={itemVariants} className="glass-panel" style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '36px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(16,185,129,0.1)', paddingBottom: '24px', marginBottom: '32px' }}>
                            <h2 style={{ margin: 0, color: '#34d399', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <Bed size={28} /> Facility Allocation Pipeline
                            </h2>
                            <motion.div 
                              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                              style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)', padding: '8px 20px', borderRadius: '24px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}
                            >
                              {activeTrace.output.bed_type_needed || 'GENERAL'} REQUIRED
                            </motion.div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                             <motion.div variants={itemVariants} style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))', padding: '28px', borderRadius: '16px', borderLeft: activeTrace.output.assigned_bed_number ? '4px solid #10b981' : '4px solid #ef4444', borderTop: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>Allocated Unit</div>
                                <div style={{ color: activeTrace.output.assigned_bed_number ? '#f8fafc' : '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>
                                  {activeTrace.output.assigned_bed_number || 'WAITLISTED'}
                                </div>
                             </motion.div>
                             <motion.div variants={itemVariants} style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))', padding: '28px', borderRadius: '16px', borderLeft: '4px solid #34d399', borderTop: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>Target Ward Configuration</div>
                                <div style={{ color: '#f8fafc', fontSize: '24px', fontWeight: 600 }}>
                                  {activeTrace.output.recommended_ward || 'General Ward'}
                                </div>
                             </motion.div>
                          </div>
                          
                          <motion.div variants={itemVariants}>
                             <h4 style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Occupancy Evaluation Logic</h4>
                             <ul style={{ margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.1)' }}>
                               {Array.isArray(activeTrace.output.reasoning) ? activeTrace.output.reasoning.map((r: string, i: number) => (
                                 <motion.li 
                                   key={i}
                                   initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                   style={{ display: 'flex', gap: '12px', fontSize: '15px', color: '#a7f3d0', alignItems: 'flex-start', background: 'rgba(16,185,129,0.05)', padding: '12px 16px', borderRadius: '10px' }}
                                 >
                                   <CheckCircle2 size={18} color="#34d399" style={{ marginTop: '2px', flexShrink: 0 }} />
                                   <span>{r}</span>
                                 </motion.li>
                               )) : (
                                 <li style={{ color: '#a7f3d0', fontSize: '15px' }}>{activeTrace.output.reasoning}</li>
                               )}
                             </ul>
                          </motion.div>
                        </motion.div>
                      )}

                      {/* ── Outcome Report UI (Executive Summary) ── */}
                      {activeStage === 'outcome' && activeTrace?.output && (
                        <motion.div variants={itemVariants} className="glass-panel" style={{ background: 'linear-gradient(145deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px', padding: '48px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                            <div>
                              <h2 style={{ margin: 0, color: '#818cf8', fontSize: '32px', display: 'flex', alignItems: 'center', gap: '16px', fontWeight: 700 }}>
                                <FileBarChart size={32} /> MAS Executive Summary
                              </h2>
                              <p style={{ margin: '10px 0 0 0', color: '#94a3b8', fontSize: '16px' }}>End-to-end multi-agent orchestration results</p>
                            </div>
                            <motion.div 
                              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                              style={{ background: activeTrace.output.final_status === 'Success' ? '#10b981' : '#ef4444', color: 'white', padding: '10px 24px', borderRadius: '30px', fontSize: '15px', fontWeight: 700, letterSpacing: '1px', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' }}
                            >
                              {activeTrace.output.final_status || 'COMPLETE'}
                            </motion.div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
                            {/* Triage summary */}
                            <motion.div whileHover={{ y: -5 }} style={{ background: 'rgba(0,0,0,0.4)', padding: '28px', borderRadius: '16px', borderTop: '4px solid #ef4444', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600, letterSpacing: '1px' }}>Clinical Assessment</div>
                              <div style={{ color: '#f8fafc', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                                Priority: <span style={{ color: '#fca5a5' }}>{activeTrace.output.triage?.priority || 'UNKNOWN'}</span>
                              </div>
                              <div style={{ color: '#cbd5e1', fontSize: '15px' }}>Severity Index: {activeTrace.output.triage?.severity_score || 'N/A'}</div>
                            </motion.div>

                            {/* Pharma summary */}
                            <motion.div whileHover={{ y: -5 }} style={{ background: 'rgba(0,0,0,0.4)', padding: '28px', borderRadius: '16px', borderTop: '4px solid #a855f7', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600, letterSpacing: '1px' }}>Pharmacological Safety</div>
                              <div style={{ color: '#f8fafc', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                                Target Risk: <span style={{ color: '#d8b4fe' }}>{activeTrace.output.pharma?.risk_level || 'UNKNOWN'}</span>
                              </div>
                              <div style={{ color: '#cbd5e1', fontSize: '15px' }}>Conflict Flags: {activeTrace.output.pharma?.conflicts_detected?.length || 0}</div>
                            </motion.div>

                            {/* Staff summary */}
                            <motion.div whileHover={{ y: -5 }} style={{ background: 'rgba(0,0,0,0.4)', padding: '28px', borderRadius: '16px', borderTop: '4px solid #3b82f6', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600, letterSpacing: '1px' }}>Human Resources</div>
                              <div style={{ color: '#cbd5e1', fontSize: '15px', marginBottom: '10px' }}>
                                Physician: <strong style={{ color: '#f8fafc', fontSize: '16px' }}>{activeTrace.output.scheduler?.assigned_doctor || 'None'}</strong>
                              </div>
                              <div style={{ color: '#cbd5e1', fontSize: '15px' }}>
                                Registered Nurse: <strong style={{ color: '#f8fafc', fontSize: '16px' }}>{activeTrace.output.scheduler?.assigned_nurse || 'None'}</strong>
                              </div>
                            </motion.div>

                            {/* Bed summary */}
                            <motion.div whileHover={{ y: -5 }} style={{ background: 'rgba(0,0,0,0.4)', padding: '28px', borderRadius: '16px', borderTop: '4px solid #10b981', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600, letterSpacing: '1px' }}>Facility Logistics</div>
                              <div style={{ color: '#cbd5e1', fontSize: '15px', marginBottom: '10px' }}>
                                Target Unit: <strong style={{ color: '#f8fafc', fontSize: '16px' }}>{activeTrace.output.bed?.assigned_bed || 'None'}</strong>
                              </div>
                              <div style={{ color: '#cbd5e1', fontSize: '15px' }}>
                                Ward Class: <strong style={{ color: '#f8fafc', fontSize: '16px' }}>{activeTrace.output.bed?.ward || 'General'}</strong>
                              </div>
                            </motion.div>
                          </div>

                          {/* Error logging in outcome */}
                          {activeTrace.output.workflow?.errors && activeTrace.output.workflow.errors.length > 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px' }}>
                              <h4 style={{ margin: '0 0 16px 0', color: '#fca5a5', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={18}/> Critical Exceptions Handled</h4>
                              <ul style={{ margin: 0, paddingLeft: '24px', color: '#cbd5e1', fontSize: '15px', lineHeight: '1.6' }}>
                                {activeTrace.output.workflow.errors.map((err: string, idx: number) => <li key={idx} style={{marginBottom:'8px'}}>{err}</li>)}
                              </ul>
                            </motion.div>
                          )}
                        </motion.div>
                      )}

                      {/* ── Collapsible RAG Context ── */}
                      {activeTrace?.output?.retrieved_context && (
                        <motion.div variants={itemVariants} style={{ marginTop: '16px' }}>
                          <button 
                            onClick={() => setShowRagForStage(showRagForStage === activeStage ? null : activeStage)}
                            style={{ 
                              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              background: showRagForStage === activeStage ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)', 
                              border: showRagForStage === activeStage ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.05)', 
                              padding: '20px 24px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s', color: showRagForStage === activeStage ? '#93c5fd' : '#94a3b8' 
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 600 }}>
                              <Server size={20} /> Medical Knowledge Context Integration
                            </div>
                            {showRagForStage === activeStage ? <X size={20} /> : <ChevronRight size={20} />}
                          </button>
                          
                          <AnimatePresence>
                            {showRagForStage === activeStage && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                style={{ overflow: 'hidden', marginTop: '16px' }}
                              >
                                <div style={{ padding: '28px', background: 'rgba(15,23,42,0.8)', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.2)' }}>
                                  {activeTrace.output.retrieval_status === 'failed' && (
                                    <div style={{ color: '#ef4444', marginBottom: '20px', fontSize: '14px', background: 'rgba(239,68,68,0.1)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <AlertTriangle size={18} /> Retrieval failure recorded. Agent fallback to baseline model architecture utilized.
                                    </div>
                                  )}
                                  {activeTrace.output.retrieved_documents && activeTrace.output.retrieved_documents.length > 0 && (
                                    <div style={{ marginBottom: '24px' }}>
                                      <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Vectordb Source Documents</span>
                                      <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                                        {activeTrace.output.retrieved_documents.map((doc: any, i: number) => (
                                          <span key={i} style={{ fontSize: '13px', background: 'rgba(59,130,246,0.15)', color: '#93c5fd', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)' }}>
                                            📄 {typeof doc === 'string' ? doc : (doc.metadata?.source || 'Unknown Directory')}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '12px' }}>Synthesized Excerpts</span>
                                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.8', fontFamily: 'monospace', background: 'rgba(0,0,0,0.4)', padding: '24px', borderRadius: '12px', borderLeft: '3px solid #38bdf8' }}>
                                      {activeTrace.output.retrieved_context}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── BOTTOM SECTION: Navigator & Intelligence ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', padding: '32px', background: 'linear-gradient(180deg, rgba(15,23,42,0.4) 0%, rgba(10,14,26,0.8) 100%)' }}>
        
        {/* ── Navigator ── */}
        <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', display: 'flex', flexDirection: 'column', maxHeight: '500px', overflow: 'hidden' }}>
          <div style={{ padding: '24px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc' }}>
              <Network size={22} color="#38bdf8" /> Orchestration Log
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b' }}>Live MAS Executions</p>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {loadingWorkflows ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'40px', color:'#64748b' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : workflows.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#64748b', fontSize:'14px' }}>
                No active routines.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {workflows.map(wf => {
                  const isActive = activeWorkflowId === wf.patient_id;
                  
                  let statusColor = '#64748b';
                  let statusLabel = wf.status;
                  if (wf.status === 'completed') { statusColor = '#10b981'; statusLabel = 'Completed'; }
                  if (wf.status === 'failed' || wf.status === 'rejected') { statusColor = '#ef4444'; statusLabel = wf.status.charAt(0).toUpperCase() + wf.status.slice(1); }
                  if (wf.status === 'running') { statusColor = '#3b82f6'; statusLabel = 'In Progress'; }
                  if (wf.status === 'awaiting_approval') { statusColor = '#f59e0b'; statusLabel = 'Waiting'; }
                  
                  return (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={wf.execution_id}
                      onClick={() => setActiveWorkflowId(wf.patient_id)}
                      style={{ 
                        display: 'flex', flexDirection: 'column', padding: '16px', borderRadius: '12px', 
                        background: isActive ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.02)',
                        border: isActive ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: isActive ? '#f8fafc' : '#cbd5e1' }}>{wf.patient_name}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: `${statusColor}20`, color: statusColor, textTransform: 'uppercase' }}>
                          {statusLabel}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                        <span>Stage: {wf.current_stage?.replace('_node', '') || 'Initialization'}</span>
                        <span style={{ fontFamily: 'monospace' }}>ID: {wf.execution_id.substring(0, 8)}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Intelligence Panel ── */}
        <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', display: 'flex', flexDirection: 'column', maxHeight: '500px', overflow: 'hidden' }}>
          <div style={{ padding: '24px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} color="#818cf8"/> Telemetry & Intelligence
            </h2>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {activeWorkflowId ? (
              <>
                {/* Patient Quick Info */}
                <div>
                  <h3 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', margin: '0 0 12px 0', letterSpacing: '1px' }}>Active Target</h3>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '16px', color: '#f8fafc', fontWeight: 600, marginBottom: '6px' }}>
                      {workflows.find(w => w.patient_id === activeWorkflowId)?.patient_name || 'Anonymous Subject'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      UUID: {activeWorkflowId}
                    </div>
                  </div>
                </div>

                {/* Execution Status */}
                <div>
                  <h3 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', margin: '0 0 12px 0', letterSpacing: '1px' }}>Subsystem Health</h3>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>Global Trajectory</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: workflowStatus === 'Completed' ? '#10b981' : workflowStatus === 'Failed' || workflowStatus === 'Rejected' ? '#ef4444' : '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {workflowStatus}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>Sentinel Defense SOC</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={14}/> Active</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>Meta-Agent Watchdog</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14}/> Stable</span>
                    </div>

                  </div>
                </div>

                {/* Metrics */}
                <div>
                  <h3 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', margin: '0 0 12px 0', letterSpacing: '1px' }}>Performance Analytics</h3>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>Autonomous Cycles Executed</span>
                      <span style={{ fontSize: '16px', color: '#e2e8f0', fontWeight: 600 }}>{traces.length}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: '#94a3b8' }}>Cumulative Compute Duration</span>
                      <span style={{ fontSize: '16px', color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace' }}>
                        {(traces.reduce((acc, t) => acc + (t.duration_ms || 0), 0) / 1000).toFixed(2)}s
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', marginTop: '60px' }}>
                Select an orchestration routine to stream intelligence data.
              </div>
            )}

          </div>
        </div>
        
      </div>

    </div>
  );
}
"""

with open('frontend/src/pages/WorkflowCenter.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
