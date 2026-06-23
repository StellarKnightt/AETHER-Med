import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, UserPlus, Star, Activity, CheckCircle2, Search, MapPin } from 'lucide-react';
import { cleanerApi, type CleanerData, type CleanerMetrics } from '../services/api/cleanerApi';

export default function CleaningStaff() {
  const [cleaners, setCleaners] = useState<CleanerData[]>([]);
  const [metrics, setMetrics] = useState<CleanerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const [cData, mData] = await Promise.all([
        cleanerApi.getCleaners(),
        cleanerApi.getMetrics()
      ]);
      setCleaners(cData);
      setMetrics(mData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await cleanerApi.generateCleaners();
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Available': return '#10b981'; // Green
      case 'Assigned': return '#3b82f6'; // Blue
      case 'Cleaning': return '#f59e0b'; // Amber
      case 'Break': return '#a855f7'; // Purple
      case 'Off Duty': return '#64748b'; // Slate
      default: return '#94a3b8';
    }
  };

  const filteredCleaners = cleaners.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.availability_status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(145deg, #0f172a, #1e293b)', padding: '28px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '12px' }}>
                <Sparkles size={28} color="#10b981" />
            </div>
            Hospital Cleaning Operations
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px', marginLeft: '52px' }}>Supporting workforce pool integrated with the autonomous Bed Agent.</p>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={generating}
          style={{ 
            background: 'linear-gradient(135deg, #10b981, #059669)', 
            border: 'none', 
            borderRadius: '12px', 
            padding: '12px 24px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'white', 
            fontWeight: 600, 
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.7 : 1,
            boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
            transition: 'all 0.2s'
          }}
        >
          {generating ? <RefreshCw size={18} className="animate-spin" /> : <UserPlus size={18} />}
          {generating ? 'Generating...' : 'Generate 5 Cleaners'}
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
        {[
          { label: 'Total Staff', value: metrics?.total || 0, icon: <UserPlus size={20} color="#3b82f6" />, bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
          { label: 'Available', value: metrics?.available || 0, icon: <CheckCircle2 size={20} color="#10b981" />, bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
          { label: 'Active Cleaning', value: metrics?.active || 0, icon: <Activity size={20} color="#f59e0b" />, bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
          { label: 'Tasks Completed', value: metrics?.completed || 0, icon: <Sparkles size={20} color="#a855f7" />, bg: 'rgba(168,85,247,0.1)', color: '#a855f7' }
        ].map((m, i) => (
          <div key={i} style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: m.bg, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {m.icon}
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>{m.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search cleaners..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 10px 10px 40px', color: '#f8fafc', outline: 'none' }}
          />
        </div>
      </div>

      {/* Cleaner Grid */}
      {loading && cleaners.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading cleaning staff...</div>
      ) : filteredCleaners.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'rgba(15,23,42,0.4)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', color: '#94a3b8' }}>
          No cleaning staff found. Click "Generate 5 Cleaners" to populate the database.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredCleaners.map(cleaner => (
            <div key={cleaner.id} style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.8), rgba(30,41,59,0.6))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', transition: 'all 0.3s', cursor: 'pointer' }} className="hover:-translate-y-1 hover:shadow-lg hover:border-slate-600">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>{cleaner.name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{cleaner.gender} • {cleaner.age} years old</div>
                </div>
                <div style={{ background: `${getStatusColor(cleaner.availability_status)}20`, border: `1px solid ${getStatusColor(cleaner.availability_status)}40`, color: getStatusColor(cleaner.availability_status), padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  {cleaner.availability_status}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
                  <Star size={16} color="#94a3b8" />
                  {cleaner.years_of_experience} Years Experience
                </div>
                
                {cleaner.current_location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f8fafc', fontWeight: 600 }}>
                    <MapPin size={16} color="#f59e0b" />
                    Currently at {cleaner.current_location}
                  </div>
                )}
                
                <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ color: '#94a3b8' }}>Shift: <span style={{ color: '#cbd5e1' }}>{cleaner.shift.split('(')[0]}</span></div>
                  <div style={{ color: '#94a3b8' }}>Completed: <span style={{ color: '#a855f7', fontWeight: 700 }}>{cleaner.completed_tasks} Tasks</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
