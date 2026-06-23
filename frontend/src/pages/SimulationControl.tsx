import { useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { simulationApi } from '../services/api/simulationApi';
import { Play, Square, AlertTriangle, Users, Settings2, Activity, RefreshCw } from 'lucide-react';

export default function SimulationControl() {
  const { isRunning, setIsRunning, metrics } = useSimulationStore();
  const [isStarting, setIsStarting] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await simulationApi.startSimulation();
      setIsRunning(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    try {
      await simulationApi.stopSimulation();
      setIsRunning(false);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerEvent = async (eventType: string, severity = 'high') => {
    try {
      const result = await simulationApi.triggerEvent(eventType, { severity });
      setLastEvent(`${result.event?.event_type} triggered (${result.event?.severity})`);
      setTimeout(() => setLastEvent(null), 5000);
    } catch (e) {
      console.error(e);
      setLastEvent('Failed to trigger event — is simulation running?');
    }
  };

  // Correct keys from backend: active_patients, overall_occupancy_rate, icu_occupancy_rate
  const activePatients = metrics?.active_patients ?? 0;
  const overallRate = metrics?.overall_occupancy_rate ?? 0;
  const icuRate = metrics?.icu_occupancy_rate ?? 0;
  const bedStats = metrics?.bed_stats ?? {};

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f1f5f9', marginBottom: '24px' }}>
        Simulation Control Center
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Main Control Panel */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings2 size={20} color="#14b8a6" /> Engine Controls
          </h2>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <button
              onClick={handleStart}
              disabled={isRunning || isStarting}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
                background: isRunning ? 'rgba(255,255,255,0.05)' : '#14b8a6',
                color: isRunning ? '#64748b' : 'white', borderRadius: '8px', fontWeight: 600,
                border: 'none', cursor: isRunning ? 'not-allowed' : 'pointer',
              }}
            >
              <Play size={18} /> {isStarting ? 'Starting…' : 'Start Simulation'}
            </button>

            <button
              onClick={handleStop}
              disabled={!isRunning}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
                background: 'rgba(239,68,68,0.2)', color: isRunning ? '#fca5a5' : '#64748b',
                borderRadius: '8px', fontWeight: 600, border: '1px solid rgba(239,68,68,0.3)',
                cursor: !isRunning ? 'not-allowed' : 'pointer',
              }}
            >
              <Square size={18} /> Stop
            </button>
          </div>

          {/* Live Metrics */}
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Status</span>
              <span style={{ color: isRunning ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                {isRunning ? 'RUNNING' : 'STOPPED'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Active Patients</span>
              <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{activePatients}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Overall Occupancy</span>
              <span style={{ color: overallRate > 80 ? '#fca5a5' : '#4ade80', fontWeight: 600 }}>{overallRate}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>ICU Occupancy</span>
              <span style={{ color: icuRate > 80 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{icuRate}%</span>
            </div>
          </div>
        </div>

        {/* Event Injection */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="#ef4444" /> Event Injection
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
            Trigger manual disaster scenarios. Requires simulation to be running.
          </p>

          {lastEvent && (
            <div style={{ padding: '10px 14px', background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', borderRadius: '8px', color: '#5eead4', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={14} /> {lastEvent}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            <button
              onClick={() => triggerEvent('mass_casualty', 'critical')}
              style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', textAlign: 'left', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <span>🚨 Mass Casualty Incident</span> <Users size={18} />
            </button>
            <button
              onClick={() => triggerEvent('icu_surge', 'high')}
              style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: '#fcd34d', textAlign: 'left', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <span>📈 Sudden ICU Surge</span> <Activity size={18} />
            </button>
            <button
              onClick={() => triggerEvent('code_blue', 'critical')}
              style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', color: '#93c5fd', textAlign: 'left', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <span>💙 Code Blue</span> <Activity size={18} />
            </button>
            <button
              onClick={() => triggerEvent('equipment_failure', 'high')}
              style={{ padding: '12px 16px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', color: '#d8b4fe', textAlign: 'left', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <span>⚙️ Equipment Failure</span> <AlertTriangle size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Bed Stats Breakdown */}
      {Object.keys(bedStats).length > 0 && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '16px' }}>
            Bed Status Breakdown (Live)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {Object.entries(bedStats).map(([type, stats]: [string, any]) => (
              <div key={type} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '12px' }}>{type}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#4ade80', fontSize: '13px' }}>Free</span>
                    <span style={{ color: '#4ade80', fontWeight: 600 }}>{stats.free ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#f87171', fontSize: '13px' }}>Occupied</span>
                    <span style={{ color: '#f87171', fontWeight: 600 }}>{stats.occupied ?? 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#fbbf24', fontSize: '13px' }}>Cleaning</span>
                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>{stats.cleaning ?? 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
