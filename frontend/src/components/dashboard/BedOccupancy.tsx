import { useEffect, useState } from 'react';

interface BedStats {
  free: number;
  occupied: number;
  cleaning: number;
}

interface Metrics {
  active_patients: number;
  overall_occupancy_rate: number;
  icu_occupancy_rate: number;
  bed_stats: Record<string, BedStats>;
}

export function BedOccupancy() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/v1/simulation/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error("Failed to fetch metrics", e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) return <div className="p-4 text-slate-500">Loading metrics...</div>;

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-full flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-slate-200">Hospital Occupancy</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 p-4 rounded-lg text-center">
          <p className="text-sm text-slate-400 uppercase tracking-wider">Overall Occupancy</p>
          <p className="text-3xl font-bold text-blue-400">{metrics.overall_occupancy_rate}%</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-lg text-center">
          <p className="text-sm text-slate-400 uppercase tracking-wider">ICU Occupancy</p>
          <p className={`text-3xl font-bold ${metrics.icu_occupancy_rate > 90 ? 'text-red-400' : 'text-orange-400'}`}>
            {metrics.icu_occupancy_rate}%
          </p>
        </div>
      </div>

      <div className="space-y-3 mt-2">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Bed Status Breakdown</h3>
        {Object.entries(metrics.bed_stats).map(([type, stats]) => {
          const bedStats = stats as any;
          return (
            <div key={type} className="flex items-center justify-between bg-slate-900 p-2 rounded">
              <span className="font-medium text-slate-300 uppercase">{type}</span>
              <div className="flex gap-3 text-sm">
                <span className="text-green-400">Free: {bedStats.free}</span>
                <span className="text-red-400">Occ: {bedStats.occupied}</span>
                <span className="text-yellow-400">Cln: {bedStats.cleaning}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
