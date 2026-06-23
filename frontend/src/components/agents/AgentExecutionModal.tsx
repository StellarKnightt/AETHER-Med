import { useState, useRef, useEffect } from 'react';
import { X, Users, CheckCircle, AlertTriangle, Loader2, ChevronRight, ThumbsUp, ThumbsDown, CheckSquare, Zap, Server, Database as DatabaseIcon, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { patientApi, type PatientData } from '../../services/api/patientApi';
import { simulationApi } from '../../services/api/simulationApi';
import { pharmaApi } from '../../services/api/pharmaApi';
import { schedulerApi } from '../../services/api/schedulerApi';
import { bedApi } from '../../services/api/bedApi';
import { agentApi } from '../../services/api/agentApi';
import HorizontalPipeline, { type PipelineStep } from './HorizontalPipeline';
import AgentResultsSummary, { type AgentRunSummary } from './AgentResultsSummary';
import { Brain, HeartPulse, Search, Shield, Pill, Stethoscope, BedDouble, Calendar, User, Cpu } from 'lucide-react';

const AGENT_PIPELINES: Record<string, PipelineStep[]> = {
  triage_agent: [
    { icon: HeartPulse, label: 'Vitals Analysis' },
    { icon: Brain, label: 'Disease Review' },
    { icon: Search, label: 'Severity Detection' },
    { icon: Shield, label: 'Emergency Assessment' },
    { icon: Activity, label: 'Decision' },
  ],
  pharma_agent: [
    { icon: Shield, label: 'Allergy Scan' },
    { icon: Pill, label: 'Medication Review' },
    { icon: Search, label: 'Interaction Detection' },
    { icon: AlertTriangle, label: 'Risk Evaluation' },
    { icon: Stethoscope, label: 'Recommendation' },
  ],
  scheduler_agent: [
    { icon: DatabaseIcon, label: 'Patient DB Query' },
    { icon: User, label: 'Staff Search' },
    { icon: Cpu, label: 'Workload Balancing' },
    { icon: Search, label: 'Specialization Match' },
    { icon: Calendar, label: 'Assignment' },
  ],
  bed_agent: [
    { icon: HeartPulse, label: 'Clinical Evaluation' },
    { icon: BedDouble, label: 'Capacity Scan' },
    { icon: Shield, label: 'Infection/Triage Risk' },
    { icon: Search, label: 'Ward Allocation' },
    { icon: BedDouble, label: 'Bed Assignment' },
  ],
};

const EXECUTION_PIPELINE: PipelineStep[] = [
  { icon: ThumbsUp, label: 'Approved' },
  { icon: Zap, label: 'Action Started' },
  { icon: Loader2, label: 'Processing' },
  { icon: DatabaseIcon, label: 'DB Updated' },
  { icon: Server, label: 'Workflow Updated' },
  { icon: CheckCircle, label: 'Action Completed' },
];

interface PatientResult {
  patientId: string;
  patientName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  reasoning: string[];
  actions: string[]; // recommended actions
  result: any;
  error?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  executionStatus: 'pending' | 'executing' | 'completed' | 'error';
  priority?: string;
  confidence?: number;
}

interface AgentExecutionModalProps {
  agentId: string;
  agentName: string;
  agentColor: string;
  agentIcon: LucideIcon;
  onClose: () => void;
  onComplete: (summary: AgentRunSummary) => void;
}

export default function AgentExecutionModal({
  agentId, agentName, agentColor, agentIcon: AgentIcon, onClose, onComplete,
}: AgentExecutionModalProps) {
  const [phase, setPhase] = useState<'loading' | 'processing' | 'review' | 'executing' | 'results' | 'error'>('loading');
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentPipelineStep, setCurrentPipelineStep] = useState(-1);
  const [isPipelineProcessing, setIsPipelineProcessing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [summary, setSummary] = useState<AgentRunSummary | null>(null);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Start timer for processing and executing phases
  useEffect(() => {
    if (phase === 'processing' || phase === 'executing') {
      if (phase === 'processing') startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Phase 1: Load patients and start processing
  useEffect(() => {
    const init = async () => {
      try {
        const data = await patientApi.getPatients();
        setPatients(data);
        setPatientResults(data.map((p: PatientData) => ({
          patientId: p.id!,
          patientName: p.name,
          status: 'pending' as const,
          reasoning: [],
          actions: [],
          result: null,
          approvalStatus: 'pending',
          executionStatus: 'pending',
        })));
        setPhase('processing');
      } catch (err) {
        console.error(err);
        setPhase('error');
      }
    };
    init();
  }, []);

  // Phase 2: Process patients sequentially (Analysis only)
  useEffect(() => {
    if (phase !== 'processing' || patients.length === 0) return;

    const processAll = async () => {
      const results = [...patientResults];

      for (let i = 0; i < patients.length; i++) {
        if (abortRef.current) break;
        
        const patient = patients[i];
        setCurrentIndex(i);
        results[i].status = 'processing';
        setPatientResults([...results]);

        // Animate pipeline steps
        const steps = AGENT_PIPELINES[agentId] || AGENT_PIPELINES.triage_agent;
        setIsPipelineProcessing(true);

        for (let s = 0; s < steps.length; s++) {
          if (abortRef.current) break;
          setCurrentPipelineStep(s);
          await new Promise(resolve => setTimeout(resolve, 350));
        }

        // Call actual API
        try {
          let apiResult: any = null;
          
          switch (agentId) {
            case 'triage_agent':
              apiResult = await simulationApi.runTriage(patient.id!);
              results[i].reasoning = apiResult.reasoning || [];
              results[i].actions = apiResult.recommended_actions || [];
              results[i].priority = apiResult.priority;
              results[i].confidence = apiResult.confidence;
              break;

            case 'pharma_agent':
              apiResult = await pharmaApi.analyzePatient(patient.id!);
              results[i].reasoning = apiResult.reasoning || [];
              results[i].actions = apiResult.recommended_actions || [];
              results[i].priority = apiResult.risk_level;
              results[i].confidence = apiResult.confidence;
              break;

            case 'scheduler_agent':
              apiResult = await schedulerApi.analyze(patient.id!);
              results[i].reasoning = apiResult.reasoning_chain || [];
              results[i].actions = apiResult.workflow_actions || [];
              results[i].priority = apiResult.priority_level;
              results[i].confidence = apiResult.confidence;
              break;

            case 'bed_agent':
              apiResult = await bedApi.runBedAgent(patient.id!);
              results[i].reasoning = apiResult.reasoning || [];
              results[i].actions = [`Allocate ${apiResult.recommended_ward || 'General'} ward bed`];
              results[i].priority = apiResult.patient_acuity;
              results[i].confidence = apiResult.confidence;
              break;
          }

          results[i].result = apiResult;
          results[i].status = 'completed';
        } catch (err: any) {
          results[i].status = 'error';
          results[i].error = err?.response?.data?.detail || err.message || 'Unknown error';
        }

        setCurrentPipelineStep(steps.length - 1);
        setIsPipelineProcessing(false);
        setPatientResults([...results]);

        if (i < patients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('review');
    };

    processAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, patients]);

  const setApproval = (index: number, status: 'approved' | 'rejected') => {
    const updated = [...patientResults];
    updated[index].approvalStatus = status;
    setPatientResults(updated);
  };

  const setBulkApproval = (status: 'approved' | 'rejected') => {
    const updated = patientResults.map(p => p.status === 'completed' ? { ...p, approvalStatus: status } : p);
    setPatientResults(updated);
  };

  const handleExecute = async () => {
    setPhase('executing');
    if (timerRef.current) clearInterval(timerRef.current);
    
    const results = [...patientResults];
    let executedCount = 0;
    const finalActions: string[] = [];

    for (let i = 0; i < results.length; i++) {
      if (abortRef.current) break;
      if (results[i].approvalStatus !== 'approved' || results[i].status !== 'completed') continue;

      setCurrentIndex(i);
      results[i].executionStatus = 'executing';
      setPatientResults([...results]);
      setIsPipelineProcessing(true);

      try {
        // Animate execution pipeline
        for (let s = 0; s < EXECUTION_PIPELINE.length; s++) {
          if (abortRef.current) break;
          setCurrentPipelineStep(s);
          
          if (s === 3) {
            // "DB Updated" step -> Call the actual approve endpoint
            const res = results[i].result;
            switch (agentId) {
              case 'triage_agent':
                if (res.id) await simulationApi.approveTriage(res.id);
                finalActions.push(`${results[i].patientName}: Triage Approved (${res.priority})`);
                break;
              case 'pharma_agent':
                await pharmaApi.approvePharma();
                finalActions.push(`${results[i].patientName}: Pharma Review Approved`);
                break;
              case 'scheduler_agent':
                if (res.id) await schedulerApi.approve(res.id);
                finalActions.push(`${results[i].patientName}: Assigned ${res.assigned_doctor_name}`);
                break;
              case 'bed_agent':
                const bedResultId = res.id || res.bed_result_id;
                if (bedResultId) await bedApi.approveBedAssignment(bedResultId);
                finalActions.push(`${results[i].patientName}: Bed Allocated (${res.recommended_ward})`);
                break;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 400));
        }

        results[i].executionStatus = 'completed';
        executedCount++;
      } catch (err: any) {
        results[i].executionStatus = 'error';
        results[i].error = err.message || 'Execution failed';
        finalActions.push(`${results[i].patientName}: EXECUTION ERROR`);
      }

      setIsPipelineProcessing(false);
      setPatientResults([...results]);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (timerRef.current) clearInterval(timerRef.current);
    const finalElapsed = Date.now() - startTimeRef.current;
    
    const approvals = results.filter(r => r.approvalStatus === 'approved').length;
    const rejections = results.filter(r => r.approvalStatus === 'rejected').length;
    
    const runSummary: AgentRunSummary = {
      totalPatients: patients.length,
      processed: results.filter(r => r.status === 'completed' || r.status === 'error').length,
      successful: executedCount,
      warnings: rejections,
      errors: results.filter(r => r.status === 'error' || r.executionStatus === 'error').length,
      executionTimeMs: finalElapsed,
      actions: finalActions,
    };
    
    setSummary(runSummary);
    setPhase('results');

    // Persist to DB
    try {
      await agentApi.saveHistory(agentId, {
        patients_analyzed: runSummary.processed,
        recommendations_generated: results.filter(r => r.status === 'completed').length,
        approvals,
        rejections,
        actions_executed: executedCount,
        execution_duration_ms: finalElapsed
      });
      await agentApi.updateMetrics(agentId, runSummary.processed, executedCount);
    } catch (dbErr) {
      console.error("Failed to persist agent metrics", dbErr);
    }

    onComplete(runSummary);
  };

  const formatTime = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    abortRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  const steps = AGENT_PIPELINES[agentId] || AGENT_PIPELINES.triage_agent;
  const currentPatient = currentIndex >= 0 ? patientResults[currentIndex] : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 15px ${hexToRgba(agentColor, 0.3)}; }
          50% { box-shadow: 0 0 35px ${hexToRgba(agentColor, 0.6)}; }
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '1200px',
        maxHeight: '92vh',
        background: 'linear-gradient(145deg, #0b1120, #0f172a)',
        border: `1px solid ${hexToRgba(agentColor, 0.2)}`,
        borderRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: `0 40px 100px rgba(0,0,0,0.8), 0 0 60px ${hexToRgba(agentColor, 0.1)}`,
        animation: 'fadeIn 0.3s ease forwards',
      }}>

        {/* === TOP BAR === */}
        <div style={{
          padding: '20px 28px',
          borderBottom: `1px solid ${hexToRgba(agentColor, 0.15)}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: `linear-gradient(90deg, ${hexToRgba(agentColor, 0.08)}, transparent)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '14px',
              background: hexToRgba(agentColor, 0.2),
              border: `1px solid ${hexToRgba(agentColor, 0.4)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: (phase === 'processing' || phase === 'executing') ? 'pulseGlow 2s ease-in-out infinite' : 'none',
            }}>
              <AgentIcon size={22} color={agentColor} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '-0.3px' }}>
                {agentName} — Orchestration
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>
                {phase === 'loading' ? 'Initializing...' :
                 phase === 'processing' ? `Analyzing patient ${currentIndex + 1} of ${patients.length}` :
                 phase === 'review' ? 'Awaiting Human-in-the-Loop Approval' :
                 phase === 'executing' ? `Executing actions for patient ${currentIndex + 1}` :
                 phase === 'results' ? 'Execution Complete' : 'Error'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {(phase === 'processing' || phase === 'executing') && (
              <div style={{
                padding: '8px 16px', borderRadius: '10px',
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
                fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, color: agentColor,
                letterSpacing: '2px',
              }}>
                {formatTime(elapsedMs)}
              </div>
            )}
            <button onClick={handleClose} style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#94a3b8',
            }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* === MAIN CONTENT === */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {phase === 'loading' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <Loader2 size={40} color={agentColor} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '15px' }}>Loading patient database...</span>
            </div>
          )}

          {(phase === 'processing' || phase === 'executing') && (
            <>
              {/* Left: Patient Queue */}
              <div style={{
                width: '280px',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                overflowY: 'auto',
                background: 'rgba(0,0,0,0.15)',
                flexShrink: 0,
              }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} /> Patient Queue ({patientResults.length})
                  </span>
                </div>
                {patientResults.map((pr, i) => {
                  const isActive = i === currentIndex;
                  const isProcessing = phase === 'processing' ? pr.status === 'processing' : pr.executionStatus === 'executing';
                  const isDone = phase === 'processing' ? pr.status === 'completed' : pr.executionStatus === 'completed';
                  const isError = phase === 'processing' ? pr.status === 'error' : pr.executionStatus === 'error';
                  const isSkipped = phase === 'executing' && pr.approvalStatus !== 'approved';

                  return (
                    <div key={pr.patientId} style={{
                      padding: '12px 20px',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      background: isActive ? hexToRgba(agentColor, 0.08) : 'transparent',
                      borderLeft: isActive ? `3px solid ${agentColor}` : '3px solid transparent',
                      opacity: isSkipped ? 0.5 : 1,
                      transition: 'all 0.3s ease',
                      animation: isActive ? 'slideIn 0.3s ease forwards' : 'none',
                    }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700,
                        background: isDone ? 'rgba(16,185,129,0.2)' :
                                    isProcessing ? hexToRgba(agentColor, 0.2) :
                                    isError ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                        color: isDone ? '#10b981' :
                               isProcessing ? agentColor :
                               isError ? '#ef4444' : '#475569',
                        border: `1px solid ${
                          isDone ? 'rgba(16,185,129,0.3)' :
                          isProcessing ? hexToRgba(agentColor, 0.4) :
                          isError ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'
                        }`,
                      }}>
                        {isDone ? <CheckCircle size={14} /> :
                         isProcessing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> :
                         isError ? <AlertTriangle size={14} /> :
                         <span>{i + 1}</span>}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: '13px', fontWeight: 600,
                          color: isActive ? '#f1f5f9' : isDone ? '#94a3b8' : '#64748b',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {pr.patientName}
                        </div>
                        {isProcessing && (
                          <div style={{ fontSize: '10px', color: agentColor, fontWeight: 500, marginTop: '2px' }}>
                            {phase === 'processing' ? 'Analyzing...' : 'Executing...'}
                          </div>
                        )}
                        {isSkipped && (
                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                            Skipped
                          </div>
                        )}
                      </div>
                      {isActive && <ChevronRight size={14} color={agentColor} />}
                    </div>
                  );
                })}
              </div>

              {/* Right: Pipeline & Reasoning */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    {phase === 'processing' ? 'Reasoning Pipeline' : 'Execution Pipeline'}
                  </div>
                  <HorizontalPipeline
                    steps={phase === 'processing' ? steps : EXECUTION_PIPELINE}
                    currentStep={currentPipelineStep}
                    isProcessing={isPipelineProcessing}
                    agentColor={agentColor}
                  />
                </div>

                {currentPatient && phase === 'processing' && (
                  <div style={{ padding: '20px 28px', flex: 1, overflowY: 'auto' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                      {currentPatient.patientName} — Live Reasoning
                    </div>
                    {currentPatient.reasoning.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {currentPatient.reasoning.map((r, i) => (
                          <div key={i} style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.02)',
                            borderLeft: `3px solid ${i === currentPatient.reasoning.length - 1 ? agentColor : '#334155'}`,
                            fontSize: '13px',
                            color: '#cbd5e1',
                            lineHeight: '1.6',
                            animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
                          }}>
                            {r}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#475569', fontSize: '13px', fontStyle: 'italic' }}>
                        Awaiting LLM response...
                      </div>
                    )}
                    
                    {currentPatient.actions.length > 0 && (
                      <div style={{ marginTop: '20px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                          Recommended Actions
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {currentPatient.actions.map((a, i) => (
                            <span key={i} style={{
                              padding: '6px 14px', borderRadius: '8px',
                              background: hexToRgba(agentColor, 0.1),
                              border: `1px solid ${hexToRgba(agentColor, 0.3)}`,
                              color: agentColor, fontSize: '12px', fontWeight: 600,
                              display: 'flex', alignItems: 'center', gap: '6px',
                              animation: `fadeIn 0.3s ease ${i * 0.08}s both`,
                            }}>
                              <CheckCircle size={12} /> {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Review Phase */}
          {phase === 'review' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Recommendations Review</h3>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>Approve or reject agent recommendations before execution.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setBulkApproval('rejected')} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <ThumbsDown size={14} /> Reject All
                  </button>
                  <button onClick={() => setBulkApproval('approved')} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <ThumbsUp size={14} /> Approve All
                  </button>
                </div>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {patientResults.map((pr, i) => {
                    if (pr.status !== 'completed' && pr.status !== 'error') return null;
                    if (pr.status === 'error') return (
                      <div key={pr.patientId} style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '20px', borderRadius: '16px' }}>
                        <div style={{ color: '#ef4444', fontWeight: 600 }}>{pr.patientName} - Error</div>
                        <div style={{ color: '#fca5a5', fontSize: '13px', marginTop: '4px' }}>{pr.error}</div>
                      </div>
                    );

                    const isApproved = pr.approvalStatus === 'approved';
                    const isRejected = pr.approvalStatus === 'rejected';

                    return (
                      <div key={pr.patientId} style={{ 
                        background: 'rgba(255,255,255,0.02)', 
                        border: `1px solid ${isApproved ? '#10b981' : isRejected ? '#ef4444' : 'rgba(255,255,255,0.08)'}`, 
                        padding: '20px', borderRadius: '16px', display: 'flex', gap: '20px',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>{pr.patientName}</div>
                            {pr.priority && (
                              <div style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>
                                {pr.priority}
                              </div>
                            )}
                            {pr.confidence !== undefined && (
                              <div style={{ padding: '4px 8px', borderRadius: '6px', background: hexToRgba(agentColor, 0.1), color: agentColor, fontSize: '11px', fontWeight: 600 }}>
                                {Math.round(pr.confidence * 100)}% Confidence
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontStyle: 'italic' }}>
                            "{pr.reasoning[pr.reasoning.length - 1] || 'Analysis complete'}"
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Recommended Action:</div>
                            {pr.actions.map((a, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>
                                <CheckSquare size={14} color={agentColor} /> {a}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', minWidth: '120px' }}>
                          <button onClick={() => setApproval(i, 'approved')} style={{ 
                            padding: '10px', borderRadius: '8px', 
                            background: isApproved ? '#10b981' : 'transparent', 
                            border: `1px solid ${isApproved ? '#10b981' : 'rgba(255,255,255,0.1)'}`, 
                            color: isApproved ? 'white' : '#94a3b8', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s ease'
                          }}>
                            <ThumbsUp size={14} /> Approve
                          </button>
                          <button onClick={() => setApproval(i, 'rejected')} style={{ 
                            padding: '10px', borderRadius: '8px', 
                            background: isRejected ? '#ef4444' : 'transparent', 
                            border: `1px solid ${isRejected ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, 
                            color: isRejected ? 'white' : '#94a3b8', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s ease'
                          }}>
                            <ThumbsDown size={14} /> Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Results Phase */}
          {phase === 'results' && summary && (
            <div style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
              <AgentResultsSummary summary={summary} agentColor={agentColor} agentName={agentName} />
            </div>
          )}

          {/* Error Phase */}
          {phase === 'error' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <AlertTriangle size={40} color="#ef4444" />
              <span style={{ color: '#fca5a5', fontWeight: 600, fontSize: '15px' }}>Failed to load patient data</span>
            </div>
          )}
        </div>

        {/* === BOTTOM BAR === */}
        {(phase === 'processing' || phase === 'executing') && (
          <div style={{
            padding: '16px 28px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
              <span>✓ {patientResults.filter(r => (phase === 'processing' ? r.status : r.executionStatus) === 'completed').length} completed</span>
              <span>✗ {patientResults.filter(r => (phase === 'processing' ? r.status : r.executionStatus) === 'error').length} errors</span>
              <span>⏳ {patientResults.filter(r => (phase === 'processing' ? r.status : r.executionStatus) === 'pending').length} pending</span>
            </div>
            <div style={{ width: '300px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${((currentIndex + 1) / patients.length) * 100}%`,
                borderRadius: '3px', background: `linear-gradient(90deg, ${agentColor}, ${hexToRgba(agentColor, 0.6)})`,
                transition: 'width 0.5s ease', boxShadow: `0 0 10px ${hexToRgba(agentColor, 0.4)}`,
              }} />
            </div>
          </div>
        )}

        {phase === 'review' && (
          <div style={{
            padding: '20px 32px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
              {patientResults.filter(p => p.approvalStatus === 'approved').length} Approved • {patientResults.filter(p => p.approvalStatus === 'rejected').length} Rejected • {patientResults.filter(p => p.approvalStatus === 'pending' && p.status === 'completed').length} Pending Review
            </div>
            <button 
              onClick={handleExecute}
              disabled={patientResults.some(p => p.status === 'completed' && p.approvalStatus === 'pending')}
              style={{
                padding: '12px 32px', borderRadius: '12px',
                background: patientResults.some(p => p.status === 'completed' && p.approvalStatus === 'pending') ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${agentColor}, ${hexToRgba(agentColor, 0.7)})`,
                border: 'none', color: patientResults.some(p => p.status === 'completed' && p.approvalStatus === 'pending') ? '#64748b' : 'white', 
                fontSize: '14px', fontWeight: 700, cursor: patientResults.some(p => p.status === 'completed' && p.approvalStatus === 'pending') ? 'not-allowed' : 'pointer', 
                boxShadow: patientResults.some(p => p.status === 'completed' && p.approvalStatus === 'pending') ? 'none' : `0 4px 20px ${hexToRgba(agentColor, 0.4)}`,
                transition: 'all 0.3s ease'
              }}
            >
              Confirm & Execute
            </button>
          </div>
        )}

        {(phase === 'results' || phase === 'error') && (
          <div style={{
            padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.2)',
          }}>
            <button onClick={handleClose} style={{
              padding: '10px 28px', borderRadius: '10px',
              background: `linear-gradient(135deg, ${agentColor}, ${hexToRgba(agentColor, 0.7)})`,
              border: 'none', color: 'white', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', boxShadow: `0 4px 20px ${hexToRgba(agentColor, 0.4)}`,
            }}>
              Close Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
