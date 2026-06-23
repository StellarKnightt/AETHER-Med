import { useEffect, useState } from 'react';

interface Vitals {
  heart_rate: number;
  oxygen_saturation: number;
  systolic_bp: number;
  diastolic_bp: number;
  temperature: number;
}

export function VitalsMonitor() {
  const [vitals, setVitals] = useState<Record<string, Vitals>>({});

  // Connect to simulation WS endpoint (same as socketManager)
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/api/v1/simulation/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'vitals_update') {
        setVitals(prev => ({
          ...prev,
          [data.data.patient_id]: data.data.vitals
        }));
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-full">
      <h2 className="text-xl font-semibold mb-4 text-slate-200">Live Vitals Monitor</h2>
      <div className="space-y-3 overflow-y-auto max-h-[400px]">
        {Object.entries(vitals).map(([id, v]) => (
          <div key={id} className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
            <span className="font-mono text-slate-400">Pt: {id.substring(0, 4)}...</span>
            <div className="flex gap-4">
              <span className={`font-mono ${v.heart_rate > 100 || v.heart_rate < 60 ? 'text-red-400' : 'text-green-400'}`}>
                HR: {Math.round(v.heart_rate)}
              </span>
              <span className={`font-mono ${v.oxygen_saturation < 95 ? 'text-red-400' : 'text-blue-400'}`}>
                SpO2: {Math.round(v.oxygen_saturation)}%
              </span>
              <span className="font-mono text-slate-300">
                BP: {Math.round(v.systolic_bp)}/{Math.round(v.diastolic_bp)}
              </span>
            </div>
          </div>
        ))}
        {Object.keys(vitals).length === 0 && (
          <p className="text-slate-500 italic">Waiting for telemetry...</p>
        )}
      </div>
    </div>
  );
}
