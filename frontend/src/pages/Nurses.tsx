import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, User, Calendar, Mail, Phone, Activity, AlertTriangle, HeartPulse } from 'lucide-react';
import { staffApi, type Nurse } from '../services/api/staffApi';

export default function Nurses() {
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState<Nurse | null>(null);

  const fetchNurses = async () => {
    try {
      const data = await staffApi.getNurses();
      setNurses(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNurses();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await staffApi.generateNurse();
      fetchNurses();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const filtered = nurses.filter((n) => 
    n.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <HeartPulse size={28} color="#ec4899" /> Nurses Management
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            {nurses.length} Nurses | {nurses.filter(n => n.availability_status === 'Available').length} Available
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #ec4899, #be185d)', color: 'white',
              fontSize: '13px', fontWeight: 600, cursor: isGenerating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(236,72,153,0.3)',
            }}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Generate Nurse
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: '400px' }}>
        <Search size={16} color="#64748b" />
        <input type="text" placeholder="Search nurses, departments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: '13px', width: '100%' }} />
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filtered.map(nurse => (
          <div key={nurse.id} onClick={() => setSelectedNurse(nurse)} className="glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #334155)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.1)' }}>
                        <User size={24} color="#94a3b8" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>{nurse.name}</h3>
                        <p style={{ fontSize: '12px', color: '#ec4899', fontWeight: 500 }}>{nurse.qualification}</p>
                    </div>
                </div>
            </div>
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                <div><strong style={{color:'#64748b'}}>Dept:</strong> {nurse.department}</div>
                <div><strong style={{color:'#64748b'}}>Exp:</strong> {nurse.years_of_experience} yrs</div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', background: nurse.availability_status === 'Available' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: nurse.availability_status === 'Available' ? '#10b981' : '#f59e0b' }}>
                    {nurse.availability_status}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Workload: {nurse.current_workload_score}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedNurse && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }} onClick={() => setSelectedNurse(null)}>
            <div className="glass-card" style={{ width: '600px', maxWidth: '90%', padding: '32px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #334155)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(236,72,153,0.3)' }}>
                            <User size={32} color="#94a3b8" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{selectedNurse.name}</h2>
                            <p style={{ color: '#ec4899', fontWeight: 500 }}>{selectedNurse.qualification}</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px' }}>Professional Details</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
                            <div><strong style={{color:'#64748b'}}>Department:</strong> {selectedNurse.department}</div>
                            <div><strong style={{color:'#64748b'}}>Experience:</strong> {selectedNurse.years_of_experience} years</div>
                            <div><strong style={{color:'#64748b'}}>Age/Gender:</strong> {selectedNurse.age} / {selectedNurse.gender}</div>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px' }}>Contact Info</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} color="#64748b" /> {selectedNurse.contact_number}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} color="#64748b" /> {selectedNurse.email}</div>
                        </div>
                    </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                    <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px' }}>Workload & Status</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'white' }}>
                            <Calendar size={16} color="#ec4899" /> {selectedNurse.shift}
                        </div>
                        <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '12px', background: selectedNurse.availability_status === 'Available' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: selectedNurse.availability_status === 'Available' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                            {selectedNurse.availability_status}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Activity size={16} color="#64748b" />
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${selectedNurse.current_workload_score}%`, height: '100%', background: selectedNurse.current_workload_score > 80 ? '#ef4444' : '#ec4899' }}></div>
                        </div>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedNurse.current_workload_score}%</span>
                    </div>
                </div>

                {selectedNurse.emergency_support_capability && (
                    <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} /> Emergency Support Capable
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}
