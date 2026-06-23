import { useEffect, useState } from 'react';

interface HospitalEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string;
  created_at: string;
}

export function EventFeed() {
  const [events, setEvents] = useState<HospitalEvent[]>([]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/api/v1/simulation/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'event_update') {
        setEvents(prev => [data.event, ...prev].slice(0, 50));
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-full">
      <h2 className="text-xl font-semibold mb-4 text-slate-200">Hospital Event Feed</h2>
      <div className="space-y-3 overflow-y-auto max-h-[400px]">
        {events.map((evt) => (
          <div key={evt.id} className={`p-3 rounded-lg border flex flex-col gap-1 ${
            evt.severity === 'critical' ? 'bg-red-900/30 border-red-800' :
            evt.severity === 'high' ? 'bg-orange-900/30 border-orange-800' :
            'bg-slate-900 border-slate-700'
          }`}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm uppercase tracking-wider text-slate-300">{evt.event_type}</span>
              <span className="text-xs text-slate-500">{new Date(evt.created_at).toLocaleTimeString()}</span>
            </div>
            <p className="text-sm text-slate-300">{evt.description}</p>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-slate-500 italic">No recent events.</p>
        )}
      </div>
    </div>
  );
}
