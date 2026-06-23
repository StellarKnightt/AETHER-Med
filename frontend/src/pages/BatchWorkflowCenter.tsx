import { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { workflowApi } from '../services/api/workflowApi';
import { motion } from 'framer-motion';
import {
  Users, CheckCircle2, Server, Loader2, AlertTriangle,
  PlayCircle, BarChart3, Clock, XCircle
} from 'lucide-react';
import WorkflowTraceViewer from '../components/patients/WorkflowTraceViewer';

const STAGE_LABELS: Record<string, string> = {
  'triage': 'Triage Agent',
  'approval': 'Approval Gateway',
  'routing': 'Routing Controller',
  'pharma': 'Pharma Agent',
  'scheduler': 'Scheduler Agent',
  'bed': 'Bed Agent',
  'outcome': 'Outcome Report',
  'sentinel': 'Sentinel Security',
  'meta': 'Meta-Agent Recovery'
};

const getStageLabel = (stage: string) => STAGE_LABELS[stage] || stage;

export default function BatchWorkflowCenter() {
  const { activeBatchPatientIds, setActivePage } = useAppStore();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Poll for batch status
  useEffect(() => {
    if (activeBatchPatientIds.length === 0) return;

    const fetchStatus = async () => {
      try {
        const data = await workflowApi.getBatchStatus(activeBatchPatientIds);
        setWorkflows(data);
      } catch (err) {
        console.error("Failed to fetch batch status", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [activeBatchPatientIds]);

  // Derived metrics
  const total = activeBatchPatientIds.length;

  // Return empty state redirection if no active batch is set
  if (total === 0) {
    return (
      <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748b', gap: '20px' }}>
        <Server size={64} color="#334155" />
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#94a3b8' }}>No Active Batch Simulation</h2>
        <p style={{ fontSize: '14px', maxWidth: '400px', textAlign: 'center' }}>
          Please go to the Patients page and click "Batch MAS Workflow" to run a stress-test simulation.
        </p>
        <button
          onClick={() => setActivePage('patients')}
          style={{
            padding: '12px 24px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #14b8a6, #06b6d4)', color: 'white',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(20,184,166,0.3)',
          }}
        >
          Go to Patients
        </button>
      </div>
    );
  }

  const completedCount = workflows.filter(w => w.status === 'completed').length;
  const failedCount = workflows.filter(w => w.status === 'failed').length;
  const activeCount = workflows.filter(w => ['in_progress', 'running'].includes(w.status)).length;

  // Outcome stats
  const criticalCount = workflows.filter(w => w.outcome_report?.triage?.priority === 'CRITICAL').length;
  const highCount = workflows.filter(w => w.outcome_report?.triage?.priority === 'HIGH').length;
  const medCount = workflows.filter(w => w.outcome_report?.triage?.priority === 'MEDIUM').length;
  const lowCount = workflows.filter(w => w.outcome_report?.triage?.priority === 'LOW').length;

  const validDurations = workflows.map(w => w.duration_ms).filter(d => d > 0);
  const avgDurationMs = validDurations.length ? validDurations.reduce((a, b) => a + b, 0) / validDurations.length : 0;

  // Bed utilization mapping (count unique bed allocations)
  const bedAllocations = workflows.map(w => w.outcome_report?.bed?.assigned_bed).filter(Boolean);

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Server size={28} color="#38bdf8" /> MAS Batch Execution Dashboard
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '8px' }}>Tracking auto-approved multi-agent workflows in real-time.</p>
        </div>
        <div style={{ background: '#1e293b', padding: '12px 24px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Total Batch</span>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc' }}>{total}</span>
          </div>
          <div style={{ width: '1px', background: '#334155' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Completed</span>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{completedCount}</span>
          </div>
        </div>
      </div>

      {/* Summary Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <MetricCard label="Active Workflows" value={activeCount} icon={<PlayCircle color="#38bdf8" />} border="#38bdf8" />
        <MetricCard label="Completed" value={completedCount} icon={<CheckCircle2 color="#10b981" />} border="#10b981" />
        <MetricCard label="Failed" value={failedCount} icon={<XCircle color="#ef4444" />} border="#ef4444" />
        <MetricCard label="Critical Priority" value={criticalCount} icon={<AlertTriangle color="#f97316" />} border="#f97316" />
        <MetricCard label="Avg Duration" value={avgDurationMs > 0 ? `${(avgDurationMs / 1000).toFixed(1)}s` : '-'} icon={<Clock color="#a855f7" />} border="#a855f7" />
      </div>

      {/* Execution Board */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 600 }}>Live Patient Pipeline</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '11px', color: '#94a3b8', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> Triage Agent</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} /> Approval Gateway</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9' }} /> Routing Controller</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} /> Pharma Agent</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} /> Scheduler Agent</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> Bed Agent</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} /> Outcome Report</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: '#1e293b' }}>
          {workflows.map(wf => (
            <PatientExecutionRow
              key={wf.patient_id}
              workflow={wf}
              onClick={() => setSelectedPatientId(wf.patient_id)}
            />
          ))}
          {workflows.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 16px auto', color: '#38bdf8' }} />
              Awaiting batch initialization...
            </div>
          )}
        </div>
      </div>

      {/* Post Batch Analytics (Only show if all are completed/failed) */}
      {workflows.length > 0 && (completedCount + failedCount === total) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '32px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', color: '#38bdf8' }}>
            <BarChart3 size={20} /> Batch Results
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Triage Distribution</div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1, background: '#1e293b', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>Critical: {criticalCount}</div>
                <div style={{ flex: 1, background: '#1e293b', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #f97316' }}>High: {highCount}</div>
                <div style={{ flex: 1, background: '#1e293b', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #eab308' }}>Med: {medCount}</div>
                <div style={{ flex: 1, background: '#1e293b', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>Low: {lowCount}</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Resource Utilization</div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1, background: '#1e293b', padding: '12px', borderRadius: '8px' }}>Beds Assigned: <span style={{ color: '#10b981', fontWeight: 600 }}>{bedAllocations.length}</span></div>
                <div style={{ flex: 1, background: '#1e293b', padding: '12px', borderRadius: '8px' }}>Doctors Paged: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{workflows.map(w => w.outcome_report?.scheduler?.assigned_doctor).filter(Boolean).length}</span></div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {selectedPatientId && (
        <WorkflowTraceViewer
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function MetricCard({ label, value, icon, border }: any) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderBottom: `2px solid ${border}`, borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ background: `${border}15`, padding: '12px', borderRadius: '12px' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
      </div>
    </div>
  );
}

function PatientExecutionRow({ workflow, onClick }: { workflow: any, onClick: () => void }) {
  let currentStageClean = workflow.current_stage;
  if (currentStageClean === 'started') currentStageClean = 'triage';

  // Dynamically build pipeline based on routing decision
  let dynamicPipeline = ['triage', 'approval', 'routing', 'pharma', 'scheduler', 'bed', 'outcome'];

  if (workflow.routing_decision && workflow.routing_decision.selected_path) {
    const pathStr = workflow.routing_decision.selected_path.toLowerCase();
    dynamicPipeline = ['triage', 'approval', 'routing'];

    if (pathStr.includes('pharma')) dynamicPipeline.push('pharma');
    if (pathStr.includes('scheduler')) dynamicPipeline.push('scheduler');
    if (pathStr.includes('bed')) dynamicPipeline.push('bed');
    if (pathStr.includes('sentinel')) dynamicPipeline.push('sentinel');
    if (pathStr.includes('meta')) dynamicPipeline.push('meta');

    dynamicPipeline.push('outcome');
  }

  const currentIdx = Math.max(dynamicPipeline.indexOf(currentStageClean), 0);
  const isFailed = workflow.status === 'failed';
  const isCompleted = workflow.status === 'completed';
  const isRejected = workflow.status === 'rejected';
  const isWaiting = workflow.status === 'awaiting_approval';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '24px', padding: '16px 24px',
        background: '#0f172a', cursor: 'pointer', transition: 'background 0.2s'
      }}
      onMouseOver={(e) => e.currentTarget.style.background = '#1e293b'}
      onMouseOut={(e) => e.currentTarget.style.background = '#0f172a'}
    >
      <div style={{ width: '200px', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Users size={16} color="#94a3b8" />
        {workflow.patient_name}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {dynamicPipeline.map((stage, idx) => {
          const isActive = idx === currentIdx && !isFailed && !isCompleted;
          const isDone = idx < currentIdx || isCompleted;

          let color = '#334155'; // default
          if (isDone) color = '#10b981';
          if (isActive) color = '#38bdf8';
          if (isFailed && idx === currentIdx) color = '#ef4444';

          return (
            <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: 1 }} title={getStageLabel(stage)}>
              <div style={{
                height: '8px', flex: 1, borderRadius: '4px',
                background: isActive ? `${color}40` : color,
                position: 'relative', overflow: 'hidden'
              }}>
                {isActive && (
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '50%', height: '100%', background: color, borderRadius: '4px' }}
                  />
                )}
              </div>
              {idx < dynamicPipeline.length - 1 && <div style={{ width: '4px' }} />}
            </div>
          );
        })}
      </div>

      <div style={{ width: '120px', textAlign: 'right' }}>
        {isFailed ? (
          <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600, padding: '4px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px' }}>Failed</span>
        ) : isCompleted ? (
          <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600, padding: '4px 12px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px' }}>Completed</span>
        ) : isRejected ? (
          <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600, padding: '4px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '12px' }}>Rejected</span>
        ) : isWaiting ? (
          <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 600, padding: '4px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: '12px' }}>Waiting</span>
        ) : (
          <span style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 600, padding: '4px 12px', background: 'rgba(56,189,248,0.1)', borderRadius: '12px' }}>
            In Progress
          </span>
        )}
      </div>
    </div>
  );
}
