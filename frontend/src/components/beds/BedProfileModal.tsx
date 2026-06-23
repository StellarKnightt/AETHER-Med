import { useEffect, useState } from 'react';
import type { BedData } from '../../services/api/bedApi';
import { patientApi, type PatientData } from '../../services/api/patientApi';
import { bedApi } from '../../services/api/bedApi';
import { 
  Server, Activity, User, Shield, AlertTriangle, 
  Hash, Calendar, HeartPulse, Sparkles, MapPin, Wind, Syringe 
} from 'lucide-react';

interface BedProfileModalProps {
  bed: BedData;
  onClose: () => void;
}

export default function BedProfileModal({ bed, onClose }: BedProfileModalProps) {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  
  const isOccupied = bed.status === 'occupied';
  const isCleaning = bed.status === 'cleaning' || bed.status === 'cleaning_required';

  useEffect(() => {
    if (bed.patient_id) {
      setLoadingPatient(true);
      patientApi.getPatient(bed.patient_id)
        .then(setPatient)
        .catch(console.error)
        .finally(() => setLoadingPatient(false));
    }
  }, [bed.patient_id]);

  const handleRelease = async () => {
    setIsReleasing(true);
    try {
      await bedApi.releaseBed(bed.id);
      onClose(); // Close modal immediately to show the beautiful glowing bed in the grid
    } catch (error) {
      console.error('Failed to release bed:', error);
      setIsReleasing(false);
    }
  };

  // Aesthetic Configs
  const getTheme = () => {
    if (isCleaning) return {
      primary: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.3)',
      gradient: 'from-amber-600/20 to-orange-900/40',
      shadow: '0 0 40px rgba(245, 158, 11, 0.2)',
      icon: <Sparkles size={28} color="#fbbf24" />,
      title: 'CLEANING IN PROGRESS',
      desc: 'Autonomous cleaning workflow engaged.'
    };
    if (isOccupied) return {
      primary: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      border: 'rgba(59, 130, 246, 0.3)',
      gradient: 'from-blue-600/20 to-indigo-900/40',
      shadow: '0 0 40px rgba(59, 130, 246, 0.2)',
      icon: <Activity size={28} color="#60a5fa" />,
      title: 'ACTIVELY OCCUPIED',
      desc: 'Live telemetry and medical monitoring streaming.'
    };
    return {
      primary: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.3)',
      gradient: 'from-emerald-600/20 to-teal-900/40',
      shadow: '0 0 40px rgba(16, 185, 129, 0.1)',
      icon: <Wind size={28} color="#34d399" />,
      title: 'AVAILABLE',
      desc: 'Ready for patient assignment.'
    };
  };

  const theme = getTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(16px)' }}>
      <div 
        className="w-full max-w-4xl rounded-[24px] overflow-hidden relative flex flex-col max-h-[90vh]"
        style={{ 
          background: 'linear-gradient(165deg, rgba(15,23,42,0.95), rgba(2,6,23,0.98))',
          boxShadow: `0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1), ${theme.shadow}`,
          border: `1px solid rgba(255,255,255,0.08)`,
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        <style>{`
            @keyframes modalSlideUp { 
                from { opacity: 0; transform: translateY(30px) scale(0.98); } 
                to { opacity: 1; transform: translateY(0) scale(1); } 
            }
        `}</style>
        
        {/* Ambient Glows */}
        <div className={`absolute top-0 left-0 w-full h-64 bg-gradient-to-b ${theme.gradient} opacity-50 pointer-events-none`}></div>

        {/* ── HEADER ── */}
        <div className="px-8 py-8 relative z-10 flex justify-between items-start border-b border-white/5">
          <div className="flex gap-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
              <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
              <div className="relative z-10">{theme.icon}</div>
            </div>
            
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-4xl font-black tracking-tight text-white m-0 leading-none">{bed.bed_number}</h1>
                <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-300" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {bed.ward} WARD
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-400 tracking-wide uppercase">{bed.bed_type} UNIT</span>
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                <span className="text-sm font-bold tracking-widest uppercase" style={{ color: theme.primary }}>
                  {bed.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          
          <button onClick={onClose} className="w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
            <span className="text-3xl leading-none -mt-1">&times;</span>
          </button>
        </div>

        {/* ── CONTENT ── */}
        <div className="p-8 flex-1 overflow-y-auto relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Column 1: Patient Profile */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <User size={16} className="text-blue-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Patient Profile</h3>
            </div>

            <div className="flex-1 rounded-[20px] border border-white/5 bg-white/[0.02] p-6 relative overflow-hidden group hover:bg-white/[0.03] transition-colors">
              {isOccupied ? (
                loadingPatient ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4 text-slate-500">
                    <Activity className="animate-spin text-blue-500" size={28} />
                    <span className="text-xs font-bold uppercase tracking-widest">Fetching Telemetry...</span>
                  </div>
                ) : patient ? (
                  <div className="space-y-6 h-full flex flex-col">
                    <div className="flex gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-2xl font-black text-white shadow-lg border border-white/10 shrink-0">
                        {patient.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="text-xl font-bold text-white truncate">{patient.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Hash size={12} className="text-slate-500" />
                          <span className="text-xs font-mono text-slate-400">{patient.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-auto">
                      <div className="rounded-xl bg-black/20 p-4 border border-white/5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                          <Calendar size={12} /> Demographics
                        </div>
                        <div className="text-sm font-semibold text-slate-200">
                          {patient.age} yrs • {patient.gender}
                        </div>
                      </div>
                      <div className="rounded-xl bg-black/20 p-4 border border-white/5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                          <HeartPulse size={12} /> Blood Group
                        </div>
                        <div className="text-sm font-semibold text-slate-200">
                          {patient.blood_group || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <AlertTriangle size={32} className="mb-3 text-rose-500/50" />
                    <span className="text-xs font-bold uppercase tracking-widest">Patient Data Error</span>
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                  {isCleaning ? (
                    <>
                      <Sparkles size={40} className="text-amber-500/30" />
                      <span className="text-xs font-bold uppercase tracking-widest text-amber-500/50">Sanitization Required</span>
                    </>
                  ) : (
                    <>
                      <User size={40} className="text-slate-700/50" />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">No Patient Assigned</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Telemetry & Controls */}
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Shield size={16} className="text-indigo-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">System Status</h3>
            </div>

            <div className="flex-1 flex flex-col gap-4">
              <div className="rounded-[20px] border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.03] transition-colors">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0" style={{ background: theme.bg, color: theme.primary, border: `1px solid ${theme.border}` }}>
                    <Server size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{theme.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{theme.desc}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.03] transition-colors flex-1 flex items-center">
                 <div className="flex gap-4 w-full">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50 shrink-0 text-slate-400">
                    <MapPin size={18} />
                  </div>
                  <div className="w-full">
                    <h4 className="text-sm font-bold text-white mb-1">Location Details</h4>
                    <div className="flex justify-between items-center mt-2 w-full">
                      <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">Wing</span>
                      <span className="text-sm text-slate-300 font-medium">North Tower</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 w-full">
                      <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">Floor</span>
                      <span className="text-sm text-slate-300 font-medium">Level 4</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* ── FOOTER ── */}
        <div className="px-8 py-6 relative z-10 border-t border-white/5 bg-white/[0.01] flex justify-between items-center mt-auto">
          <div>
            {isOccupied && (
              <button 
                onClick={handleRelease}
                disabled={isReleasing}
                className="group relative px-6 py-3 rounded-xl overflow-hidden font-bold text-sm transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}
              >
                <div className="absolute inset-0 bg-amber-500/10 w-0 group-hover:w-full transition-all duration-300 ease-out"></div>
                <div className="relative z-10 flex items-center gap-2">
                  <Syringe size={16} /> 
                  {isReleasing ? 'Releasing...' : 'Release Bed to Cleaning Workflow'}
                </div>
              </button>
            )}
          </div>
          
          <button 
            onClick={onClose} 
            className="px-8 py-3 rounded-xl bg-white text-slate-900 font-black tracking-wide text-sm hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
}
