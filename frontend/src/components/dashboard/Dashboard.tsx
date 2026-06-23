/**
 * AETHER-Med Hospital Command Center Dashboard
 * =============================================
 * Central real-time executive overview of the entire AETHER-Med ecosystem.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import { useSimulationStore } from '../../store/simulationStore';
import { patientApi, type PatientData } from '../../services/api/patientApi';
import { staffApi, type Doctor, type Nurse } from '../../services/api/staffApi';
import { bedApi, type BedData } from '../../services/api/bedApi';
import { cleanerApi, type CleanerMetrics } from '../../services/api/cleanerApi';
import { agentApi, type AgentMetric, type AgentRunHistory } from '../../services/api/agentApi';
import { sentinelAgentApi, type SentinelIncident, type SentinelSession } from '../../services/api/sentinelAgentApi';
import { metaAgentApi, type MetaAgentSession, type MetaAgentHealthScore, type MetaAgentIncident } from '../../services/api/metaAgentApi';
import { sentinelApi, type SecuritySimulation } from '../../services/api/sentinelApi';
import {
  Users, Stethoscope, HeartPulse, BedDouble, Activity, Shield,
  Network, AlertTriangle, Clock, CheckCircle2, Zap,
  SprayCan, Play, ChevronRight, Sparkles, ServerCrash,
  RefreshCcw, Eye, Lock, Bug, Radio, Cpu
} from 'lucide-react';

// ── Interfaces ──
interface DashboardData {
  patients: PatientData[];
  doctors: Doctor[];
  nurses: Nurse[];
  beds: BedData[];
  cleanerMetrics: CleanerMetrics | null;
  agentMetrics: AgentMetric[];
  agentHistory: AgentRunHistory[];
  sentinelStatus: SentinelSession | null;
  sentinelIncidents: SentinelIncident[];
  metaStatus: MetaAgentSession | null;
  metaHealthScores: MetaAgentHealthScore[];
  metaIncidents: MetaAgentIncident[];
  simulations: SecuritySimulation[];
}

// ── Time Formatter ──
function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function Dashboard() {
  const { setActivePage } = useAppStore();
  const { isRunning, events } = useSimulationStore();
  const [data, setData] = useState<DashboardData>({
    patients: [], doctors: [], nurses: [], beds: [],
    cleanerMetrics: null, agentMetrics: [], agentHistory: [],
    sentinelStatus: null, sentinelIncidents: [], metaStatus: null,
    metaHealthScores: [], metaIncidents: [], simulations: []
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const results = await Promise.allSettled([
      patientApi.getPatients(),
      staffApi.getDoctors(),
      staffApi.getNurses(),
      bedApi.getAllBeds(),
      cleanerApi.getMetrics(),
      agentApi.getMetrics(),
      agentApi.getAllHistory(),
      sentinelAgentApi.getStatus(),
      sentinelAgentApi.getIncidents(),
      metaAgentApi.getStatus(),
      metaAgentApi.getHealthScores(),
      metaAgentApi.getIncidents(),
      sentinelApi.getSimulations(),
    ]);
    const val = (i: number) => results[i].status === 'fulfilled' ? (results[i] as any).value : (i === 4 ? null : []);
    setData({
      patients: val(0) || [],
      doctors: val(1) || [],
      nurses: val(2) || [],
      beds: val(3) || [],
      cleanerMetrics: val(4),
      agentMetrics: val(5) || [],
      agentHistory: val(6) || [],
      sentinelStatus: results[7].status === 'fulfilled' ? (results[7] as any).value : null,
      sentinelIncidents: val(8) || [],
      metaStatus: results[9].status === 'fulfilled' ? (results[9] as any).value : null,
      metaHealthScores: val(10) || [],
      metaIncidents: val(11) || [],
      simulations: val(12) || [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 8000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ── Derived Stats ──
  const totalPatients = data.patients.length;
  const criticalPatients = data.patients.filter(p => p.triage_level === 1 || p.triage_level === 2).length;
  const totalDoctors = data.doctors.length;
  const availableDoctors = data.doctors.filter(d => d.availability_status === 'Available').length;
  const totalNurses = data.nurses.length;
  const availableNurses = data.nurses.filter(n => n.availability_status === 'Available').length;
  
  const totalBeds = data.beds.length;
  const occupiedBeds = data.beds.filter(b => b.status === 'occupied').length;
  const availableBeds = data.beds.filter(b => b.status === 'free' || b.status === 'available').length;
  const cleaningBeds = data.beds.filter(b => b.status === 'cleaning' || b.status === 'cleaning_required').length;
  const icuBeds = data.beds.filter(b => b.ward?.toLowerCase().includes('icu'));
  const icuOccupied = icuBeds.filter(b => b.status === 'occupied').length;
  const icuTotal = icuBeds.length;
  const generalBeds = data.beds.filter(b => b.ward?.toLowerCase().includes('general'));
  
  const activeSims = data.simulations.filter(s => s.status === 'running').length;
  
  const securityViolations = data.sentinelIncidents.filter(i => i.category === 'security' || i.threat_type?.includes('security')).length;
  const privacyViolations = data.sentinelIncidents.filter(i => i.category === 'privacy' || i.threat_type?.includes('privacy')).length;
  const pendingIncidents = data.sentinelIncidents.filter(i => i.status === 'pending').length;
  
  const failedAgents = data.metaHealthScores.filter(h => h.health_score < 50).length;
  const recoveredAgents = data.metaIncidents.filter(i => i.status === 'resolved' || i.status === 'executed').length;

  // ── Agent Config Map ──
  const agentConfig: Record<string, { name: string; icon: React.ReactNode; color: string; page: string }> = {
    triage_agent:    { name: 'Triage Agent',    icon: <Zap size={16} />,      color: '#f59e0b', page: 'agents' },
    pharma_agent:    { name: 'Pharma Agent',    icon: <Sparkles size={16} />, color: '#8b5cf6', page: 'agents' },
    scheduler_agent: { name: 'Scheduler Agent', icon: <Clock size={16} />,    color: '#3b82f6', page: 'scheduler' },
    bed_agent:       { name: 'Bed Agent',       icon: <BedDouble size={16} />,color: '#10b981', page: 'beds' },
    sentinel_agent:  { name: 'Sentinel Agent',  icon: <Shield size={16} />,   color: '#ef4444', page: 'sentinel' },
    meta_agent:      { name: 'Meta-Agent',      icon: <Network size={16} />,  color: '#06b6d4', page: 'meta-agent' },
  };

  // ── Build Activity Feed from multiple sources ──
  const activityFeed: { text: string; time: string; icon: React.ReactNode; color: string }[] = [];
  
  // Agent History → Activity
  data.agentHistory.slice(0, 8).forEach(h => {
    const conf = agentConfig[h.agent_id];
    activityFeed.push({
      text: `${conf?.name || h.agent_id} processed ${h.patients_analyzed} patients, ${h.actions_executed} actions`,
      time: h.created_at,
      icon: conf?.icon || <Cpu size={16} />,
      color: conf?.color || '#94a3b8'
    });
  });
  
  // Sentinel Incidents → Activity
  data.sentinelIncidents.slice(0, 4).forEach(i => {
    activityFeed.push({
      text: `Security: ${i.threat_type} — ${i.recommendation?.substring(0, 60)}`,
      time: i.created_at,
      icon: <Shield size={16} />,
      color: i.severity === 'critical' ? '#ef4444' : '#f59e0b'
    });
  });
  
  // Meta Incidents → Activity  
  data.metaIncidents.slice(0, 4).forEach(i => {
    activityFeed.push({
      text: `Meta-Agent: ${i.failure_type} on ${i.affected_agent} — ${i.root_cause?.substring(0, 50)}`,
      time: i.created_at,
      icon: <Network size={16} />,
      color: '#06b6d4'
    });
  });

  // WebSocket events → Activity
  events.slice(0, 4).forEach(ev => {
    activityFeed.push({
      text: `${ev.event_type}: ${ev.description?.substring(0, 70)}`,
      time: ev.created_at,
      icon: <Radio size={16} />,
      color: ev.severity === 'critical' ? '#ef4444' : '#3b82f6'
    });
  });

  // Sort by time descending
  activityFeed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#020617' }}>
        <div style={{ textAlign: 'center' }}>
          <Activity size={48} color="#14b8a6" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#94a3b8', marginTop: '16px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '13px' }}>Initializing Command Center...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px', maxWidth: '1800px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(2,6,23,0.95))', 
        borderRadius: '24px', 
        padding: '32px', 
        border: '1px solid rgba(255,255,255,0.06)', 
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <div style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(20,184,166,0.3)' }}>
                <Zap size={24} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-0.5px' }}>Hospital Command Center</h1>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', letterSpacing: '0.5px' }}>AETHER-Med Autonomous Operations Dashboard</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', background: isRunning ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', border: `1px solid ${isRunning ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}` }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isRunning ? '#10b981' : '#64748b', boxShadow: isRunning ? '0 0 12px rgba(16,185,129,0.6)' : 'none', animation: isRunning ? 'pulse 2s infinite' : 'none' }}></div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: isRunning ? '#10b981' : '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {isRunning ? 'SIMULATION LIVE' : 'SIMULATION OFF'}
              </span>
            </div>
            <div style={{ padding: '8px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>
              <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>

      {/* ═══════════════════════ SECTION 1: HOSPITAL OVERVIEW ═══════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {([
          { label: 'Total Patients',     value: totalPatients,   icon: <Users size={20} />,        color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  click: 'patients', sub: '' },
          { label: 'Critical Patients',  value: criticalPatients,icon: <AlertTriangle size={20} />,color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   click: 'patients', sub: '' },
          { label: 'Doctors',            value: `${availableDoctors}/${totalDoctors}`, icon: <Stethoscope size={20} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', click: 'doctors', sub: 'Available' },
          { label: 'Nurses',             value: `${availableNurses}/${totalNurses}`,   icon: <HeartPulse size={20} />,  color: '#ec4899', bg: 'rgba(236,72,153,0.08)', click: 'nurses', sub: 'Available' },
          { label: 'Available Beds',     value: availableBeds,   icon: <BedDouble size={20} />,    color: '#10b981', bg: 'rgba(16,185,129,0.08)',  click: 'beds', sub: '' },
          { label: 'ICU Occupancy',      value: `${icuOccupied}/${icuTotal}`,icon: <Activity size={20} />, color: '#f43f5e', bg: 'rgba(244,63,94,0.08)', click: 'beds', sub: 'Beds' },
          { label: 'Cleaning Ops',       value: data.cleanerMetrics?.active || 0, icon: <SprayCan size={20} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', click: 'cleaners', sub: '' },
          { label: 'Cleaning Staff',     value: data.cleanerMetrics?.available || 0, icon: <CheckCircle2 size={20} />, color: '#14b8a6', bg: 'rgba(20,184,166,0.08)', click: 'cleaners', sub: 'Available' },
          { label: 'Active Sims',        value: activeSims,      icon: <Play size={20} />,         color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  click: 'simulation', sub: '' },
          { label: 'Emergencies',        value: criticalPatients,icon: <Zap size={20} />,          color: '#dc2626', bg: 'rgba(220,38,38,0.08)',   click: 'patients', sub: '' },
        ]).map((card, i) => (
          <div 
            key={i}
            onClick={() => setActivePage(card.click)}
            style={{
              background: 'rgba(15,23,42,0.6)', 
              border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: '16px', 
              padding: '20px', 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${card.color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${card.color}15`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>
                {card.icon}
              </div>
              <ChevronRight size={14} color="#334155" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#f8fafc', lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {card.sub ? <span style={{ color: card.color, marginRight: '4px' }}>{card.sub}</span> : null}
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════ SECTION 2: AGENT STATUS CENTER ═══════════════════════ */}
      <div style={{ marginBottom: '28px' }}>
        <SectionHeader icon={<Cpu size={18} color="#14b8a6" />} title="Agent Status Center" subtitle="All autonomous agents" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px' }}>
          {Object.entries(agentConfig).map(([agentId, conf]) => {
            const metric = data.agentMetrics.find(m => m.agent_id === agentId);
            const isActive = metric?.last_run_at ? (Date.now() - new Date(metric.last_run_at).getTime() < 300000) : false;
            return (
              <div
                key={agentId}
                onClick={() => setActivePage(conf.page)}
                style={{
                  background: 'linear-gradient(165deg, rgba(15,23,42,0.8), rgba(2,6,23,0.9))',
                  border: `1px solid ${isActive ? `${conf.color}30` : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${conf.color}50`; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isActive ? `${conf.color}30` : 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {isActive && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${conf.color}, transparent)` }}></div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${conf.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: conf.color }}>
                    {conf.icon}
                  </div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isActive ? '#10b981' : '#475569', boxShadow: isActive ? '0 0 8px rgba(16,185,129,0.5)' : 'none' }}></div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>{conf.name}</div>
                <div style={{ fontSize: '11px', color: isActive ? '#10b981' : '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  {isActive ? 'Running' : 'Stopped'}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#64748b' }}>Patients</span>
                    <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{metric?.patients_analyzed ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#64748b' }}>Actions</span>
                    <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{metric?.actions_executed ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#64748b' }}>Last Run</span>
                    <span style={{ color: '#94a3b8', fontWeight: 500 }}>{timeAgo(metric?.last_run_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════ MAIN GRID: 3 COLUMNS ═══════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '28px' }}>

        {/* ── COL 1: Live Operations + Emergency ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* SECTION 3: LIVE HOSPITAL OPERATIONS */}
          <GlassCard>
            <SectionHeader icon={<Radio size={18} color="#3b82f6" />} title="Live Operations" subtitle="Real-time status" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <LiveOpRow icon={<AlertTriangle size={16} />} color="#ef4444" label="Critical Patients" value={criticalPatients} onClick={() => setActivePage('patients')} />
              <LiveOpRow icon={<Stethoscope size={16} />} color="#8b5cf6" label="Doctor Assignments" value={data.doctors.filter(d => d.assigned_patients?.length > 0).length} onClick={() => setActivePage('doctors')} />
              <LiveOpRow icon={<HeartPulse size={16} />} color="#ec4899" label="Nurse Assignments" value={data.nurses.filter(n => n.assigned_patients?.length > 0).length} onClick={() => setActivePage('nurses')} />
              <LiveOpRow icon={<BedDouble size={16} />} color="#10b981" label="Bed Allocations" value={occupiedBeds} onClick={() => setActivePage('beds')} />
              <LiveOpRow icon={<SprayCan size={16} />} color="#f59e0b" label="Active Cleaning" value={data.cleanerMetrics?.active || 0} onClick={() => setActivePage('cleaners')} />
            </div>
          </GlassCard>

          {/* SECTION 4: EMERGENCY COMMAND CENTER */}
          <GlassCard>
            <SectionHeader icon={<AlertTriangle size={18} color="#ef4444" />} title="Emergency Center" subtitle="Critical alerts" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <EmergencyRow label="Critical Patients" value={criticalPatients} severity="critical" />
              <EmergencyRow label="Active Escalations" value={data.sentinelIncidents.filter(i => i.severity === 'critical').length} severity="high" />
              <EmergencyRow label="ICU Transfers" value={icuOccupied} severity={icuOccupied >= icuTotal ? 'critical' : 'normal'} />
              <EmergencyRow label="Pending Reviews" value={pendingIncidents} severity={pendingIncidents > 5 ? 'high' : 'normal'} />
            </div>
          </GlassCard>
        </div>

        {/* ── COL 2: Beds + Security ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* SECTION 5: BED & RESOURCE OVERVIEW */}
          <GlassCard>
            <SectionHeader icon={<BedDouble size={18} color="#10b981" />} title="Bed & Resources" subtitle="Occupancy overview" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <BedBar label="General Beds" occupied={generalBeds.filter(b => b.status === 'occupied').length} total={generalBeds.length} color="#3b82f6" />
              <BedBar label="ICU Beds" occupied={icuOccupied} total={icuTotal} color="#f43f5e" />
              <BedBar label="Occupied" occupied={occupiedBeds} total={totalBeds} color="#f59e0b" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <MiniStat label="Cleaning" value={cleaningBeds} color="#f59e0b" />
                <MiniStat label="Available" value={availableBeds} color="#10b981" />
              </div>
            </div>
          </GlassCard>

          {/* SECTION 6: SECURITY & COMPLIANCE */}
          <GlassCard>
            <SectionHeader icon={<Shield size={18} color="#ef4444" />} title="Security & Compliance" subtitle="Sentinel overview" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <SecurityRow icon={<Play size={14} />} label="Active Simulations" value={activeSims} color="#6366f1" />
              <SecurityRow icon={<Lock size={14} />} label="Security Violations" value={securityViolations} color="#ef4444" />
              <SecurityRow icon={<Eye size={14} />} label="Privacy Violations" value={privacyViolations} color="#f59e0b" />
              <SecurityRow icon={<Bug size={14} />} label="Active Threats" value={data.sentinelIncidents.filter(i => i.status === 'pending' && i.severity === 'critical').length} color="#dc2626" />
              <div style={{ marginTop: '8px' }}>
                <button onClick={() => setActivePage('sentinel')} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#f87171', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }}
                >
                  <Shield size={14} /> Open Sentinel Agent <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ── COL 3: Meta-Agent + Activity Feed ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* SECTION 7: META-AGENT OVERVIEW */}
          <GlassCard>
            <SectionHeader icon={<Network size={18} color="#06b6d4" />} title="Meta-Agent" subtitle="Agent health supervisor" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <MetaRow icon={<Activity size={14} />} label="Avg Health Score" value={
                data.metaHealthScores.length > 0 
                  ? `${Math.round(data.metaHealthScores.reduce((a, h) => a + h.health_score, 0) / data.metaHealthScores.length)}%` 
                  : 'N/A'
              } color="#10b981" />
              <MetaRow icon={<ServerCrash size={14} />} label="Failed Agents" value={failedAgents} color={failedAgents > 0 ? '#ef4444' : '#10b981'} />
              <MetaRow icon={<RefreshCcw size={14} />} label="Recovered Agents" value={recoveredAgents} color="#06b6d4" />
              <MetaRow icon={<Sparkles size={14} />} label="Active Reconfigs" value={data.metaIncidents.filter(i => i.status === 'pending').length} color="#f59e0b" />
              <div style={{ marginTop: '8px' }}>
                <button onClick={() => setActivePage('meta-agent')} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(6,182,212,0.2)', background: 'rgba(6,182,212,0.05)', color: '#22d3ee', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(6,182,212,0.05)'; }}
                >
                  <Network size={14} /> Open Meta-Agent <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </GlassCard>

          {/* SECTION 8: ACTIVITY FEED */}
          <GlassCard>
            <SectionHeader icon={<Activity size={18} color="#14b8a6" />} title="Recent Activity" subtitle="Latest 20 events" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '320px', overflowY: 'auto' }}>
              {activityFeed.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>No recent activity</div>
              ) : (
                activityFeed.slice(0, 20).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 8px', borderRadius: '8px', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0, marginTop: '2px' }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</div>
                      <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', fontWeight: 600 }}>{timeAgo(item.time)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.3px' }}>{title}</div>
        <div style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'linear-gradient(165deg, rgba(15,23,42,0.7), rgba(2,6,23,0.85))',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '20px',
      padding: '24px',
      backdropFilter: 'blur(12px)',
    }}>
      {children}
    </div>
  );
}

function LiveOpRow({ icon, color, label, value, onClick }: { icon: React.ReactNode; color: string; label: string; value: number; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}08`; e.currentTarget.style.borderColor = `${color}20`; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ color, display: 'flex' }}>{icon}</div>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>{value}</span>
    </div>
  );
}

function EmergencyRow({ label, value, severity }: { label: string; value: number; severity: 'critical' | 'high' | 'normal' }) {
  const colors = { critical: '#ef4444', high: '#f59e0b', normal: '#64748b' };
  const c = colors[severity];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: value > 0 ? `${c}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${value > 0 ? `${c}20` : 'transparent'}` }}>
      <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {value > 0 && severity !== 'normal' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}80`, animation: 'pulse 2s infinite' }}></div>}
        <span style={{ fontSize: '16px', fontWeight: 800, color: value > 0 && severity !== 'normal' ? c : '#f8fafc' }}>{value}</span>
      </div>
    </div>
  );
}

function BedBar({ label, occupied, total, color }: { label: string; occupied: number; total: number; color: string }) {
  const pct = total > 0 ? (occupied / total) * 100 : 0;
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700 }}>{occupied}/{total}</span>
      </div>
      <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: `linear-gradient(90deg, ${color}, ${color}aa)`, transition: 'width 0.5s ease', boxShadow: `0 0 8px ${color}30` }}></div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ padding: '12px', borderRadius: '12px', background: `${color}08`, border: `1px solid ${color}15`, textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function SecurityRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ color, display: 'flex' }}>{icon}</div>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: '16px', fontWeight: 800, color: value > 0 ? color : '#f8fafc' }}>{value}</span>
    </div>
  );
}

function MetaRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ color, display: 'flex' }}>{icon}</div>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: '16px', fontWeight: 800, color }}>{value}</span>
    </div>
  );
}
