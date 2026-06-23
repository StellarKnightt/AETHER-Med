import { useEffect, useState } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import type { BedData, BedMetrics } from '../services/api/bedApi';
import { bedApi } from '../services/api/bedApi';
import { BedDouble, Activity, Server, AlertTriangle } from 'lucide-react';
import BedProfileModal from '../components/beds/BedProfileModal';

export default function Beds() {
  const [beds, setBeds] = useState<BedData[]>([]);
  const [metrics, setMetrics] = useState<BedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState<BedData | null>(null);
  
  // Real-time synchronization
  const { bedHistory, triageHistory, lastBedCleaningEvent } = useSimulationStore();

  const fetchBeds = async () => {
    try {
      const bedsData = await bedApi.getAllBeds();
      const metricsData = await bedApi.getBedMetrics();
      setBeds(bedsData);
      setMetrics(metricsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
    
    // Poll metrics lightly or rely entirely on WebSocket
    const interval = setInterval(fetchBeds, 5000);
    return () => clearInterval(interval);
  }, [bedHistory, triageHistory, lastBedCleaningEvent]); // Re-fetch if events change

  const renderBeds = (filteredBeds: BedData[], type: string) => {
    return filteredBeds.map((bed) => {
      const isOccupied = bed.status === 'occupied';
      let isCleaning = bed.status === 'cleaning' || bed.status === 'cleaning_required';
      
      let baseColor = '#3b82f6';
      let iconColor = '#93c5fd';
      let bgActive = 'rgba(59, 130, 246, 0.2)';
      let shadowColor = 'rgba(59, 130, 246, 0.4)';
      let label = isOccupied ? 'OCCUPIED' : 'AVAILABLE';
      let fontColor = isOccupied ? '#f8fafc' : '#94a3b8';
      let labelColor = isOccupied ? iconColor : '#475569';
      
      if (isCleaning) {
        baseColor = '#f59e0b';
        iconColor = '#fcd34d';
        bgActive = 'rgba(245, 158, 11, 0.2)';
        shadowColor = 'rgba(245, 158, 11, 0.4)';
        label = 'CLEANING';
        fontColor = '#fef3c7';
        labelColor = '#fcd34d';
      } else if (type === 'icu') {
        baseColor = '#f43f5e';
        iconColor = '#fda4af';
        bgActive = 'rgba(244, 63, 94, 0.2)';
        shadowColor = 'rgba(244, 63, 94, 0.4)';
      } else if (type === 'isolation') {
        baseColor = '#f59e0b'; // Or purple
        iconColor = '#fcd34d';
        bgActive = 'rgba(245, 158, 11, 0.2)';
        shadowColor = 'rgba(245, 158, 11, 0.4)';
      } else if (type === 'emergency') {
        baseColor = '#10b981';
        iconColor = '#6ee7b7';
        bgActive = 'rgba(16, 185, 129, 0.2)';
        shadowColor = 'rgba(16, 185, 129, 0.4)';
      }
      
      const isActive = isOccupied || isCleaning;

      return (
        <div 
          key={bed.id}
          onClick={() => setSelectedBed(bed)}
          className={`cursor-pointer transition-all duration-300 transform hover:-translate-y-1`}
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: isActive ? bgActive : 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${isActive ? baseColor : 'rgba(255, 255, 255, 0.08)'}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            boxShadow: isActive ? `0 0 15px ${shadowColor}` : 'inset 0 2px 4px rgba(255,255,255,0.02)'
          }}
        >
          <div style={{ padding: '12px', background: isActive ? baseColor : 'rgba(255,255,255,0.05)', borderRadius: '50%', color: isActive ? '#fff' : '#64748b' }}>
            <BedDouble size={24} />
          </div>
          <span style={{ fontSize: '13px', color: fontColor, fontWeight: isActive ? 700 : 500, letterSpacing: '0.5px' }}>
            {bed.bed_number}
          </span>
          <span style={{ fontSize: '10px', color: labelColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {label}
          </span>
        </div>
      );
    });
  };

  if (loading) {
    return <div className="p-8 text-slate-300 flex items-center justify-center h-[50vh] gap-3 text-lg"><Activity className="animate-spin text-blue-500" size={28} /> Initializing Bed Operations Center...</div>;
  }

  const icuBeds = beds.filter(b => b.bed_type === 'icu');
  const generalBeds = beds.filter(b => b.bed_type === 'general');
  const isolationBeds = beds.filter(b => b.bed_type === 'isolation');
  const erBeds = beds.filter(b => b.bed_type === 'emergency');

  return (
    <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Header & Metrics */}
      <div style={{ background: 'linear-gradient(145deg, #0f172a, #1e293b)', padding: '28px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <div style={{ background: 'rgba(59,130,246,0.2)', padding: '10px', borderRadius: '12px' }}>
                <Server size={28} color="#60a5fa" />
            </div>
            Hospital Capacity Operations
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px', marginLeft: '52px' }}>Intelligent Real-time Ward Allocation & Bed Management.</p>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '150px' }}>
            <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Total Occupancy</span>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'baseline' }}>
              {metrics && metrics.total > 0 ? Math.round((metrics.occupied / metrics.total) * 100) : 0}<span style={{ fontSize: '18px', color: '#64748b', marginLeft: '2px' }}>%</span>
            </span>
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '150px' }}>
            <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>ICU Load</span>
            <span style={{ fontSize: '32px', fontWeight: 800, color: metrics && metrics.icu.occupied >= metrics.icu.total ? '#f43f5e' : '#60a5fa', display: 'flex', alignItems: 'baseline', textShadow: metrics && metrics.icu.occupied >= metrics.icu.total ? '0 0 20px rgba(244,63,94,0.5)' : 'none' }}>
              {metrics && metrics.icu.total > 0 ? Math.round((metrics.icu.occupied / metrics.icu.total) * 100) : 0}<span style={{ fontSize: '18px', color: '#64748b', marginLeft: '2px' }}>%</span>
            </span>
          </div>
        </div>
      </div>

      {metrics && metrics.icu.occupied >= metrics.icu.total && metrics.icu.total > 0 && (
        <div style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.4)', borderRadius: '12px', padding: '16px 24px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px', color: '#fecdd3', boxShadow: '0 0 30px rgba(244,63,94,0.1)' }}>
          <AlertTriangle size={28} color="#fb7185" /> 
          <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '2px' }}>CRITICAL SHORTAGE: Intensive Care Unit at Maximum Capacity!</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>The Bed Agent is currently rerouting critical cases to Emergency Observation overflow beds.</div>
          </div>
        </div>
      )}

      {/* Bed Cleaning Workflow Notification */}
      {lastBedCleaningEvent && lastBedCleaningEvent.status !== 'cleaning_completed' && (
        <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '12px', padding: '16px 24px', marginBottom: '32px', color: '#fef3c7', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Activity size={24} color="#fbbf24" />
            <div style={{ fontWeight: 700, fontSize: '16px' }}>Bed Agent: Autonomous Cleaning Workflow</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', marginLeft: '36px' }}>
            <span style={{ color: lastBedCleaningEvent.status === 'cleaning_required' ? '#fbbf24' : '#64748b', fontWeight: lastBedCleaningEvent.status === 'cleaning_required' ? 700 : 400 }}>1. Bed Released</span>
            <span>→</span>
            <span style={{ color: lastBedCleaningEvent.status === 'cleaning_started' ? '#fbbf24' : '#64748b', fontWeight: lastBedCleaningEvent.status === 'cleaning_started' ? 700 : 400 }}>2. Cleaner Assigned ({lastBedCleaningEvent.cleaner_name || '...'})</span>
            <span>→</span>
            <span style={{ color: '#64748b' }}>3. Cleaning in Progress</span>
          </div>
          {lastBedCleaningEvent.reasoning && (
             <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '12px', color: '#fbbf24', fontStyle: 'italic', borderLeft: '2px solid #fbbf24' }}>
               " {lastBedCleaningEvent.reasoning} "
             </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        {/* ICU Section */}
        <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 12px #f43f5e' }} /> 
                Intensive Care Unit (ICU)
              </h2>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>
                  {metrics?.icu.occupied} / {metrics?.icu.total} Occupied
              </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
            {renderBeds(icuBeds, 'icu')}
          </div>
        </div>

        {/* Isolation Section */}
        <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 12px #f59e0b' }} /> 
                Infectious Disease (Isolation)
              </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
            {renderBeds(isolationBeds, 'isolation')}
          </div>
        </div>

        {/* ER / OBS */}
        <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px #10b981' }} /> 
                Emergency Observation (ER-OBS)
              </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
            {renderBeds(erBeds, 'emergency')}
          </div>
        </div>

        {/* General Wards */}
        <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 12px #3b82f6' }} /> 
                General Wards
              </h2>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>
                  {metrics?.general.occupied} / {metrics?.general.total} Occupied
              </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
            {renderBeds(generalBeds, 'general')}
          </div>
        </div>
      </div>

      {selectedBed && (
        <BedProfileModal 
          bed={selectedBed} 
          onClose={() => setSelectedBed(null)} 
        />
      )}
    </div>
  );
}
