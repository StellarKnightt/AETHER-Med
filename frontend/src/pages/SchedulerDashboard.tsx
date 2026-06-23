import { useState, useEffect } from 'react';
import { Calendar, Activity, CheckCircle, Clock, XCircle, User, HeartPulse, Cpu, BarChart2 } from 'lucide-react';
import { schedulerApi, type SchedulerResult } from '../services/api/schedulerApi';
import { staffApi, type Doctor, type Nurse } from '../services/api/staffApi';

export default function SchedulerDashboard() {
  const [results, setResults] = useState<SchedulerResult[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resData, docData, nurseData] = await Promise.all([
          schedulerApi.getAll(),
          staffApi.getDoctors(),
          staffApi.getNurses()
        ]);
        setResults(resData || []);
        setDoctors(docData || []);
        setNurses(nurseData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const pendingAssignments = results.filter(r => r.status === 'pending');
  
  const availableDoctors = doctors.filter(d => d.availability_status === 'Available');
  const availableNurses = nurses.filter(n => n.availability_status === 'Available');

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading Dashboard...</div>;
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={28} color="#8b5cf6" /> Operations & Scheduling Center
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
          Live Orchestration of Medical Staff and Workflow Assignments
        </p>
      </div>

      {/* Top Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} color="#8b5cf6" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{results.length}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Assignments</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{pendingAssignments.length}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Approvals</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={24} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{availableDoctors.length} / {doctors.length}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doctors Available</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(236,72,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HeartPulse size={24} color="#ec4899" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{availableNurses.length} / {nurses.length}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nurses Available</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Recent Assignments List */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="#8b5cf6" /> Recent Orchestrations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {results.slice(0, 10).map((res) => (
              <div key={res.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Patient UUID</div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace' }}>{res.patient_id.substring(0,8)}...</div>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Doctor</div>
                    <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 500 }}>{res.assigned_doctor_name || 'Pending'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Nurse</div>
                    <div style={{ fontSize: '13px', color: '#ec4899', fontWeight: 500 }}>{res.assigned_nurse_name || 'Pending'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {res.status === 'approved' && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '12px' }}><CheckCircle size={14}/> Approved</span>}
                  {res.status === 'rejected' && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '12px', background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: '12px' }}><XCircle size={14}/> Rejected</span>}
                  {res.status === 'pending' && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '12px', background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: '12px' }}><Clock size={14}/> Pending</span>}
                </div>
              </div>
            ))}
            {results.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                No orchestrations have been executed yet.
              </div>
            )}
          </div>
        </div>

        {/* Analytics / Status Panel */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="#8b5cf6" /> System Status
          </h3>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Doctor Workload (Avg)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${doctors.length > 0 ? doctors.reduce((acc, d) => acc + d.current_workload_score, 0) / doctors.length : 0}%`, height: '100%', background: '#3b82f6' }}></div>
              </div>
              <span style={{ fontSize: '13px', color: 'white', fontWeight: 600 }}>
                {doctors.length > 0 ? Math.round(doctors.reduce((acc, d) => acc + d.current_workload_score, 0) / doctors.length) : 0}%
              </span>
            </div>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Nurse Workload (Avg)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${nurses.length > 0 ? nurses.reduce((acc, n) => acc + n.current_workload_score, 0) / nurses.length : 0}%`, height: '100%', background: '#ec4899' }}></div>
              </div>
              <span style={{ fontSize: '13px', color: 'white', fontWeight: 600 }}>
                {nurses.length > 0 ? Math.round(nurses.reduce((acc, n) => acc + n.current_workload_score, 0) / nurses.length) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
