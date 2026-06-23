import { useState, useEffect } from 'react';
import { Plus, Search, Loader2, Stethoscope, User, Calendar, Mail, Phone, Activity, AlertTriangle } from 'lucide-react';
import { staffApi, type Doctor } from '../services/api/staffApi';

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const fetchDoctors = async () => {
    try {
      const data = await staffApi.getDoctors();
      setDoctors(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await staffApi.generateDoctor();
      fetchDoctors();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const filtered = doctors.filter((d) => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Stethoscope size={28} color="#3b82f6" /> Doctors Management
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
            {doctors.length} Doctors | {doctors.filter(d => d.availability_status === 'Available').length} Available
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white',
              fontSize: '13px', fontWeight: 600, cursor: isGenerating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Generate Doctor
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: '400px' }}>
        <Search size={16} color="#64748b" />
        <input type="text" placeholder="Search doctors, specializations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: '13px', width: '100%' }} />
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filtered.map(doc => (
          <div key={doc.id} onClick={() => setSelectedDoctor(doc)} className="glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #334155)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.1)' }}>
                        <User size={24} color="#94a3b8" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>{doc.name}</h3>
                        <p style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 500 }}>{doc.specialization}</p>
                    </div>
                </div>
            </div>
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                <div><strong style={{color:'#64748b'}}>Dept:</strong> {doc.department}</div>
                <div><strong style={{color:'#64748b'}}>Exp:</strong> {doc.years_of_experience} yrs</div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', background: doc.availability_status === 'Available' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: doc.availability_status === 'Available' ? '#10b981' : '#f59e0b' }}>
                    {doc.availability_status}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Workload: {doc.current_workload_score}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedDoctor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }} onClick={() => setSelectedDoctor(null)}>
            <div className="glass-card" style={{ width: '600px', maxWidth: '90%', padding: '32px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #334155)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(59,130,246,0.3)' }}>
                            <User size={32} color="#94a3b8" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{selectedDoctor.name}</h2>
                            <p style={{ color: '#3b82f6', fontWeight: 500 }}>{selectedDoctor.qualification} | {selectedDoctor.specialization}</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px' }}>Professional Details</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
                            <div><strong style={{color:'#64748b'}}>Department:</strong> {selectedDoctor.department}</div>
                            <div><strong style={{color:'#64748b'}}>Experience:</strong> {selectedDoctor.years_of_experience} years</div>
                            <div><strong style={{color:'#64748b'}}>Age/Gender:</strong> {selectedDoctor.age} / {selectedDoctor.gender}</div>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px' }}>Contact Info</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} color="#64748b" /> {selectedDoctor.contact_number}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} color="#64748b" /> {selectedDoctor.email}</div>
                        </div>
                    </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                    <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px' }}>Workload & Status</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'white' }}>
                            <Calendar size={16} color="#3b82f6" /> {selectedDoctor.shift}
                        </div>
                        <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '12px', background: selectedDoctor.availability_status === 'Available' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: selectedDoctor.availability_status === 'Available' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                            {selectedDoctor.availability_status}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Activity size={16} color="#64748b" />
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${selectedDoctor.current_workload_score}%`, height: '100%', background: selectedDoctor.current_workload_score > 80 ? '#ef4444' : '#3b82f6' }}></div>
                        </div>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{selectedDoctor.current_workload_score}%</span>
                    </div>
                </div>

                {selectedDoctor.emergency_response_capability && (
                    <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={16} /> Emergency Response Capable
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}
