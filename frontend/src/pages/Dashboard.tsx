/**
 * Dashboard Page
 * Main overview — all metrics are live from the backend simulation.
 */

import { useEffect, useState } from 'react';
import DashboardCard from '../components/DashboardCard';
import { healthAPI } from '../services/api';
import { useSimulationStore } from '../store/simulationStore';
import { simulationApi } from '../services/api/simulationApi';
import {
  Users,
  Activity,
  Bed,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  Square,
} from 'lucide-react';

const severityIcon = (severity: string) => {
  if (severity === 'critical' || severity === 'high') return 'warning';
  return 'info';
};

export default function Dashboard() {
  const [systemStatus, setSystemStatus] = useState<string>('checking...');
  const { isRunning, setIsRunning, metrics, events } = useSimulationStore();
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    healthAPI.check()
      .then((data) => setSystemStatus(String(data.status) || 'healthy'))
      .catch(() => setSystemStatus('offline'));
  }, []);

  // Poll metrics via REST as a fallback when WS hasn't connected yet
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await simulationApi.getMetrics();
        useSimulationStore.getState().setMetrics(data);
      } catch { /* backend may be down */ }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await simulationApi.startSimulation();
      setIsRunning(true);
    } catch (e) { console.error(e); }
    finally { setIsStarting(false); }
  };

  const handleStop = async () => {
    try {
      await simulationApi.stopSimulation();
      setIsRunning(false);
    } catch (e) { console.error(e); }
  };

  // Derived live metrics
  const activePatients = metrics?.active_patients ?? 0;
  const bedOccupancy = metrics?.overall_occupancy_rate != null
    ? `${metrics.overall_occupancy_rate}%`
    : '—';
  const icuOccupancy = metrics?.icu_occupancy_rate != null
    ? `${metrics.icu_occupancy_rate}%`
    : '—';

  return (
    <div style={{ padding: '32px', maxWidth: '1400px' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
            Command Center
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            Real-time overview of the AETHER-Med hospital digital twin
          </p>
        </div>

        {/* Simulation Toggle */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleStart}
            disabled={isRunning || isStarting}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '10px', border: 'none',
              background: isRunning ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #14b8a6, #06b6d4)',
              color: isRunning ? '#64748b' : 'white', fontSize: '13px', fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            <Play size={15} /> {isStarting ? 'Starting…' : 'Start Simulation'}
          </button>
          <button
            onClick={handleStop}
            disabled={!isRunning}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '10px',
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              color: isRunning ? '#fca5a5' : '#64748b', fontSize: '13px', fontWeight: 600,
              cursor: isRunning ? 'pointer' : 'not-allowed',
            }}
          >
            <Square size={15} /> Stop
          </button>
        </div>
      </div>

      {/* System Status Banner */}
      <div
        className="glass-card"
        style={{
          padding: '16px 24px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: systemStatus === 'healthy' ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
          borderColor: systemStatus === 'healthy' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="pulse-glow"
            style={{ width: '10px', height: '10px', borderRadius: '50%', background: systemStatus === 'healthy' ? '#10b981' : '#f59e0b' }}
          />
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>
            System Status: <span style={{ color: systemStatus === 'healthy' ? '#10b981' : '#f59e0b', textTransform: 'capitalize' }}>{systemStatus}</span>
          </span>
          <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '16px' }}>
            Simulation: <span style={{ color: isRunning ? '#10b981' : '#f87171', fontWeight: 600 }}>{isRunning ? 'RUNNING' : 'STOPPED'}</span>
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Digital Twin — Live</span>
      </div>

      {/* Metric Cards — all driven by live store */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <DashboardCard
          label="Active Patients"
          value={String(activePatients)}
          change={isRunning ? 'Live' : 'Simulation off'}
          trend={activePatients > 0 ? 'up' : 'neutral'}
          icon={<Users size={22} color="white" />}
          gradient="teal"
          delay={100}
        />
        <DashboardCard
          label="Bed Occupancy"
          value={bedOccupancy}
          change={isRunning ? 'Real-time' : '—'}
          trend="neutral"
          icon={<Bed size={22} color="white" />}
          gradient="amber"
          delay={200}
        />
        <DashboardCard
          label="ICU Occupancy"
          value={icuOccupancy}
          change={metrics?.icu_occupancy_rate > 80 ? '⚠ Critical' : 'Normal range'}
          trend={metrics?.icu_occupancy_rate > 80 ? 'down' : 'up'}
          icon={<Activity size={22} color="white" />}
          gradient="pink"
          delay={300}
        />
        <DashboardCard
          label="Events (Total)"
          value={String(events.length)}
          change={events[0]?.severity ?? '—'}
          trend="neutral"
          icon={<AlertTriangle size={22} color="white" />}
          gradient="purple"
          delay={400}
        />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Agent Pipeline Status */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px', opacity: 0, animationDelay: '500ms' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#14b8a6" /> Agent Pipeline
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { name: 'Triage Agent', icon: '🏥' },
              { name: 'Pharma Agent', icon: '💊' },
              { name: 'Scheduler Agent', icon: '📅' },
              { name: 'Bed Agent', icon: '🛏️' },
              { name: 'Sentinel Agent', icon: '🛡️' },
            ].map((agent) => (
              <div
                key={agent.name}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px' }}>{agent.icon}</span>
                  <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 500 }}>{agent.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isRunning ? '#10b981' : '#64748b' }} />
                  <span style={{ fontSize: '12px', color: isRunning ? '#10b981' : '#64748b', fontWeight: 500 }}>
                    {isRunning ? 'Active' : 'Standby'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Event Feed — driven by store events */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px', opacity: 0, animationDelay: '600ms' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#8b5cf6" /> Live Hospital Events
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
            {events.length === 0 && (
              <p style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>
                {isRunning ? 'Waiting for events…' : 'Start simulation to see live events.'}
              </p>
            )}
            {events.slice(0, 8).map((evt, i) => (
              <div
                key={evt.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '10px 0',
                  borderBottom: i < 7 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                {severityIcon(evt.severity) === 'warning'
                  ? <AlertTriangle size={16} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
                  : <CheckCircle2 size={16} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#e2e8f0' }}>{evt.description}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {evt.event_type} · {new Date(evt.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
