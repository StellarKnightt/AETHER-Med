import { useEffect } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { simulationApi } from '../services/api/simulationApi';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Activity, TrendingUp } from 'lucide-react';

export default function Telemetry() {
  const { metrics, metricsHistory, isRunning } = useSimulationStore();

  // Poll metrics via REST as a fallback when WS hasn't pushed data yet
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await simulationApi.getMetrics();
        useSimulationStore.getState().setMetrics(data);
        // Sync isRunning from backend
        if (typeof data.is_running === 'boolean') {
          useSimulationStore.getState().setIsRunning(data.is_running);
        }
      } catch { /* backend may be down */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  const activePatients = metrics?.active_patients ?? 0;
  const icuRate = metrics?.icu_occupancy_rate ?? 0;
  const overallRate = metrics?.overall_occupancy_rate ?? 0;
  const bedStats = metrics?.bed_stats ?? {};

  // Use real accumulated history; fall back to a single point if empty
  const chartData = metricsHistory.length > 0
    ? metricsHistory
    : [{ time: '--', active_patients: 0, icu_occupancy_rate: 0, overall_occupancy_rate: 0 }];

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f1f5f9' }}>
          Telemetry & Analytics
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          {isRunning
            ? `Live data — ${metricsHistory.length} metric snapshots recorded`
            : 'Start the simulation to begin recording telemetry.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Patient Load Chart */}
        <div className="glass-card" style={{ padding: '24px', height: '380px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="#14b8a6" /> Live Patient Load
          </h2>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
              <Line
                type="monotone" dataKey="active_patients"
                stroke="#14b8a6" strokeWidth={2} dot={false}
                name="Active Patients" isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Current Metrics Panel */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} color="#8b5cf6" /> Current Metrics
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>Active Patients</p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: '#f1f5f9' }}>{activePatients}</p>
            </div>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>ICU Occupancy</p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: icuRate > 80 ? '#fca5a5' : '#4ade80' }}>{icuRate}%</p>
            </div>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>Overall Occupancy</p>
              <p style={{ fontSize: '32px', fontWeight: 700, color: overallRate > 80 ? '#fca5a5' : '#93c5fd' }}>{overallRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Occupancy Rate Chart */}
      <div className="glass-card" style={{ padding: '24px', height: '340px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '16px' }}>
          Occupancy Rate History
        </h2>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
              formatter={(value: number) => `${value}%`}
            />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
            <Line type="monotone" dataKey="overall_occupancy_rate" stroke="#3b82f6" strokeWidth={2} dot={false} name="Overall %" isAnimationActive={false} />
            <Line type="monotone" dataKey="icu_occupancy_rate" stroke="#ef4444" strokeWidth={2} dot={false} name="ICU %" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-ward bed stats */}
      {Object.keys(bedStats).length > 0 && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '16px' }}>
            Ward-Level Bed Breakdown
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {Object.entries(bedStats).map(([ward, stats]: [string, any]) => {
              const total = (stats.free ?? 0) + (stats.occupied ?? 0) + (stats.cleaning ?? 0);
              const pct = total > 0 ? Math.round((stats.occupied / total) * 100) : 0;
              return (
                <div key={ward} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', textTransform: 'uppercase', fontSize: '13px', marginBottom: '12px' }}>{ward}</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: pct > 80 ? '#ef4444' : '#14b8a6', marginBottom: '8px' }}>{pct}%</div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                    <span style={{ color: '#4ade80' }}>✓ {stats.free ?? 0}</span>
                    <span style={{ color: '#f87171' }}>✗ {stats.occupied ?? 0}</span>
                    <span style={{ color: '#fbbf24' }}>~ {stats.cleaning ?? 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
