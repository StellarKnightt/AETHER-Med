import { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Search, X, Shuffle, Brain, Loader2, Zap, Calendar, Server, Activity } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { patientApi, type PatientData } from '../services/api/patientApi';
import { simulationApi } from '../services/api/simulationApi';
import TriageVisualization from '../components/triage/TriageVisualization';
import BedAgentVisualization from '../components/beds/BedAgentVisualization';
import { bedApi } from '../services/api/bedApi';
import GlobalTriageModal from '../components/triage/GlobalTriageModal';
import type { TriageResult } from '../store/simulationStore';
import PharmaVisualization from '../components/pharma/PharmaVisualization';
import { pharmaApi, type PharmaResult } from '../services/api/pharmaApi';
import { SchedulerVisualization } from '../components/scheduler/SchedulerVisualization';
import { workflowApi } from '../services/api/workflowApi';
import AddPatientModal from '../components/patients/AddPatientModal';

interface PatientRow {
  id: string;
  name: string;
  age: number;
  gender: string;
  ward: string;
  diseases: string[];
  allergies: string[];
  medications: string[];
  blood_group: string | null;
  weight: number | null;
  height: number | null;
  smoking_status: string | null;
  alcohol_consumption: string | null;
  emergency_contact: string | null;
  risk_factors: string[];
  history: Record<string, any>;
  vitals: any;
}



import { useAppStore } from '../store/appStore';

export default function Patients() {
  const { setActivePage, setActiveWorkflowId, setActiveBatchPatientIds } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const { patients: livePatients } = useSimulationStore();
  const [dbPatients, setDbPatients] = useState<PatientData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);

  // Triage visualization state
  const [triageOpen, setTriageOpen] = useState(false);
  const [triageProcessing, setTriageProcessing] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [globalTriageOpen, setGlobalTriageOpen] = useState(false);

  // Pharma state
  const [pharmaOpen, setPharmaOpen] = useState(false);
  const [pharmaProcessing, setPharmaProcessing] = useState(false);
  const [pharmaResult, setPharmaResult] = useState<PharmaResult | null>(null);
  const [pharmaPatient, setPharmaPatient] = useState<PatientRow | null>(null);
  
  // Bed state
  const [showBedAgent, setShowBedAgent] = useState(false);

  // Scheduler state
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [schedulerPatientId, setSchedulerPatientId] = useState<string | null>(null);

  // Trace state removed

  const [devMode, setDevMode] = useState(false);
  const [startingWorkflowId, setStartingWorkflowId] = useState<string | null>(null);

  // MAS Workflow Launch
  const handleLaunchMasWorkflow = async (e: React.MouseEvent, patientId: string) => {
    e.stopPropagation();
    if (startingWorkflowId) return; // Prevent double clicks
    
    setStartingWorkflowId(patientId);
    
    try {
      await workflowApi.startWorkflow(patientId);
      setActiveWorkflowId(patientId);
      setActivePage('workflow-center');
      setStartingWorkflowId(null);
    } catch (err) {
      console.error('Failed to launch MAS workflow:', err);
      setStartingWorkflowId(null);
    }
  };

  const [isBatching, setIsBatching] = useState(false);

  const handleBatchMasWorkflow = async () => {
    if (isBatching) return;
    setIsBatching(true);
    try {
      const response = await workflowApi.batchWorkflow(null, true); // Auto approve mode only
      if (response && response.patient_ids) {
        setActiveBatchPatientIds(response.patient_ids);
        setActivePage('batch-workflow-center');
      }
      setIsBatching(false);
    } catch (err) {
      console.error('Failed to launch Batch MAS workflow:', err);
      setIsBatching(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await patientApi.getPatients();
      setDbPatients(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPatients();

    // triage_result listener removed to prevent TriageVisualization from auto-opening
    // The Workflow Trace Viewer now handles the MAS workflow entirely.
  }, []);

  const allPatients = useMemo(() => {
    const liveList = Object.values(livePatients).map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      ward: p.current_location || 'General',
      diseases: p.diseases || [],
      allergies: p.allergies || [],
      medications: p.medications || [],
      blood_group: p.blood_group || null,
      weight: p.weight || null,
      height: p.height || null,
      smoking_status: p.smoking_status || null,
      alcohol_consumption: p.alcohol_consumption || null,
      emergency_contact: p.emergency_contact || null,
      risk_factors: p.risk_factors || [],
      history: p.history || {},
      vitals: p.vitals || {}
    }));

    const dbList = dbPatients.map(p => ({
      id: p.id!,
      name: p.name,
      age: p.age,
      gender: p.gender,
      ward: p.ward || 'General',
      diseases: p.diseases || [],
      allergies: p.allergies || [],
      medications: p.medications || [],
      blood_group: p.blood_group || null,
      weight: p.weight || null,
      height: p.height || null,
      smoking_status: p.smoking_status || null,
      alcohol_consumption: p.alcohol_consumption || null,
      emergency_contact: p.emergency_contact || null,
      risk_factors: p.risk_factors || [],
      history: p.medical_history || {},
      vitals: {}
    }));

    const mergedMap = new Map<string, PatientRow>();
    dbList.forEach(p => mergedMap.set(p.id, p));
    liveList.forEach(p => mergedMap.set(p.id, p));

    return Array.from(mergedMap.values());
  }, [livePatients, dbPatients]);

  const filtered = allPatients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  const openEditModal = (patientRow: PatientRow) => {
    setEditingPatient({
      id: patientRow.id,
      name: patientRow.name,
      age: patientRow.age,
      gender: patientRow.gender,
      status: (patientRow as any).status || 'Registered',
      triage_level: (patientRow as any).priority || 3,
      ward: patientRow.ward,
      blood_group: patientRow.blood_group,
      weight: patientRow.weight,
      height: patientRow.height,
      smoking_status: patientRow.smoking_status,
      alcohol_consumption: patientRow.alcohol_consumption,
      emergency_contact: patientRow.emergency_contact,
      risk_factors: patientRow.risk_factors,
      diseases: patientRow.diseases,
      allergies: patientRow.allergies,
      medications: patientRow.medications,
    });
    setIsModalOpen(true);
  };



  // ── Generate Random Patients ──
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateMsg(null);
    try {
      const result = await simulationApi.generatePatients(5);
      setGenerateMsg(`✓ Generated ${result.count} patients`);
      fetchPatients(); // refresh table
      setTimeout(() => setGenerateMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setGenerateMsg('✗ Generation failed — ensure backend is running');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Run Triage on Patient ──
  const handleRunTriage = async (e: React.MouseEvent, patientId: string) => {
    e.stopPropagation(); // don't open edit modal
    setTriageResult(null);
    setTriageProcessing(true);
    setTriageOpen(true);

    try {
      const result = await simulationApi.runTriage(patientId);
      setTriageResult(result);
      useSimulationStore.getState().addTriageResult(result);
    } catch (err) {
      console.error('Triage failed:', err);
      setTriageResult(null);
    } finally {
      setTriageProcessing(false);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={28} color="#8b5cf6" /> Patient Records
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>{allPatients.length} patients in system</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {generateMsg && (
            <span style={{
              fontSize: '12px', fontWeight: 500, padding: '6px 12px', borderRadius: '8px',
              color: generateMsg.startsWith('✓') ? '#4ade80' : '#fca5a5',
              background: generateMsg.startsWith('✓') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            }}>
              {generateMsg}
            </span>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              borderRadius: '10px', border: '1px solid rgba(168,85,247,0.3)',
              background: 'rgba(168,85,247,0.1)', color: '#d8b4fe', fontSize: '13px',
              fontWeight: 600, cursor: isGenerating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(168,85,247,0.15)',
            }}
          >
            {isGenerating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Shuffle size={16} />}
            {isGenerating ? 'Generating…' : 'Generate Random Patients'}
          </button>
          {devMode && (
            <button
              onClick={() => setGlobalTriageOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                borderRadius: '10px', border: '1px solid rgba(168,85,247,0.3)',
                background: 'rgba(168,85,247,0.1)', color: '#d8b4fe',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Zap size={16} /> Dev: Global Triage
            </button>
          )}

          <button
            onClick={() => setDevMode(!devMode)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              borderRadius: '10px', border: '1px solid rgba(148,163,184,0.3)',
              background: devMode ? 'rgba(148,163,184,0.2)' : 'transparent', color: '#cbd5e1',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {devMode ? 'Disable Dev Mode' : 'Enable Dev Mode'}
          </button>

          <button
            onClick={handleBatchMasWorkflow}
            disabled={isBatching}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white',
              fontSize: '13px', fontWeight: 600, 
              cursor: isBatching ? 'not-allowed' : 'pointer',
              opacity: isBatching ? 0.8 : 1,
              boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
            }}
          >
            {isBatching ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Activity size={16} />}
            {isBatching ? 'Starting Batch...' : 'Batch MAS Workflow'}
          </button>
          <button
            onClick={openAddModal}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #14b8a6, #06b6d4)', color: 'white',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(20,184,166,0.3)',
            }}
          >
            <Plus size={16} /> Add Patient
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: '400px' }}>
        <Search size={16} color="#64748b" />
        <input type="text" placeholder="Search by name or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: '13px', width: '100%' }} />
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['ID', 'Name', 'Age', 'Gender', 'Diseases', 'Allergies', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((patient) => {
              return (
                <tr key={patient.id}
                  onClick={() => openEditModal(patient)}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>{patient.id.substring(0, 8)}</td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: '#f1f5f9', fontWeight: 500 }}>{patient.name}</td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: '#94a3b8' }}>{patient.age}</td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: '#94a3b8' }}>{patient.gender}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {patient.diseases.slice(0, 2).map((d, i) => (
                        <span key={i} style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: '11px' }}>{d}</span>
                      ))}
                      {patient.diseases.length > 2 && <span style={{ color: '#94a3b8', fontSize: '11px' }}>+{patient.diseases.length - 2} more</span>}
                      {patient.diseases.length === 0 && <span style={{ color: '#64748b', fontSize: '12px' }}>None</span>}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {patient.allergies.map((a, i) => (
                        <span key={i} style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(245,158,11,0.1)', color: '#fcd34d', fontSize: '11px' }}>{a}</span>
                      ))}
                      {patient.allergies.length === 0 && <span style={{ color: '#64748b', fontSize: '12px' }}>None known</span>}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={(e) => handleLaunchMasWorkflow(e, patient.id)}
                        disabled={startingWorkflowId === patient.id}
                        title="Launch Multi-Agent System Workflow"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '6px 12px', borderRadius: '6px',
                          background: 'linear-gradient(135deg, #3b82f6, #2dd4bf)', border: 'none',
                          color: 'white', fontSize: '11px', fontWeight: 600, 
                          cursor: startingWorkflowId === patient.id ? 'not-allowed' : 'pointer',
                          opacity: startingWorkflowId === patient.id ? 0.7 : 1,
                          whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(59,130,246,0.3)'
                        }}
                      >
                        {startingWorkflowId === patient.id ? (
                           <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                           <Activity size={13} />
                        )}
                        Launch MAS Workflow
                      </button>
                      
                      {devMode && (
                        <>
                          <button
                            onClick={(e) => handleRunTriage(e, patient.id)}
                            title="Run Triage Agent on this patient"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '6px 12px', borderRadius: '6px',
                              background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
                              color: '#c084fc', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Brain size={13} /> Run Triage
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setPharmaPatient(patient);
                              setPharmaProcessing(true);
                              setPharmaOpen(true);
                              try {
                                const res = await pharmaApi.analyzePatient(patient.id);
                                setPharmaResult(res);
                              } catch (err) {
                                console.error(err);
                                setPharmaResult(null);
                              } finally {
                                setPharmaProcessing(false);
                              }
                            }}
                            title="Run Pharma Agent on this patient"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '6px 12px', borderRadius: '6px',
                              background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)',
                              color: '#5eead4', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Zap size={13} /> Run Pharma
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSchedulerPatientId(patient.id);
                              setSchedulerOpen(true);
                            }}
                            title="Run Scheduler Agent on this patient"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '6px 12px', borderRadius: '6px',
                              background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
                              color: '#60a5fa', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Calendar size={13} /> Run Scheduler
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setShowBedAgent(true);
                              useSimulationStore.getState().setBedResult(null); // Clear previous result
                              try {
                                const result = await bedApi.runBedAgent(patient.id);
                                useSimulationStore.getState().setBedResult(result as any);
                              } catch (err) {
                                console.error(err);
                                setShowBedAgent(false);
                              }
                            }}
                            title="Run Bed Agent on this patient"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '6px 12px', borderRadius: '6px',
                              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                              color: '#fca5a5', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Server size={13} /> Bed Agent
                          </button>
                        </>
                      )}

                      {/* Trace Workflow button removed as it now opens automatically */}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit/Profile Modal */}
      {isModalOpen && editingPatient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div className="glass-card" style={{ width: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', position: 'relative' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
                {editingPatient.name.charAt(0)}
              </div>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>{editingPatient.name}</h2>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '14px', color: '#94a3b8' }}>
                  <span>{editingPatient.gender}, {editingPatient.age} yrs</span>
                  <span>•</span>
                  <span>ID: {editingPatient.id}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Demographics & Physical */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} color="#3b82f6"/> Demographics & Body</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Blood Group:</span> <strong style={{ color: '#f8fafc' }}>{editingPatient.blood_group || 'N/A'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Height / Weight:</span> <strong style={{ color: '#f8fafc' }}>{editingPatient.height ? `${editingPatient.height}cm` : 'N/A'} / {editingPatient.weight ? `${editingPatient.weight}kg` : 'N/A'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Emergency Contact:</span> <strong style={{ color: '#f8fafc', textAlign: 'right', maxWidth: '60%' }}>{editingPatient.emergency_contact || 'N/A'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Assigned Ward:</span> <strong style={{ color: '#f8fafc' }}>{editingPatient.ward}</strong></div>
                </div>
              </div>

              {/* Habits & Risks */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={18} color="#f59e0b"/> Habits & Risks</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Smoking:</span> <strong style={{ color: '#f8fafc' }}>{editingPatient.smoking_status || 'Unknown'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Alcohol:</span> <strong style={{ color: '#f8fafc' }}>{editingPatient.alcohol_consumption || 'Unknown'}</strong></div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Risk Factors:</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {editingPatient.risk_factors?.map((rf, i) => <span key={i} style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{rf}</span>) || <span style={{ color: '#64748b', fontSize: '13px' }}>None</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Conditions */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Brain size={18} color="#ef4444"/> Clinical Information</h3>
                
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Active Diseases/Conditions:</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {editingPatient.diseases?.map((d, i) => <span key={i} style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>{d}</span>) || <span style={{ color: '#64748b', fontSize: '13px' }}>None</span>}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <span style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Known Allergies:</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {editingPatient.allergies?.map((a, i) => <span key={i} style={{ background: 'rgba(245,158,11,0.1)', color: '#fcd34d', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>{a}</span>) || <span style={{ color: '#64748b', fontSize: '13px' }}>No known allergies</span>}
                  </div>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Current Medications:</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {editingPatient.medications?.map((m, i) => <span key={i} style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>{m}</span>) || <span style={{ color: '#64748b', fontSize: '13px' }}>None prescribed</span>}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Triage Visualization Modal */}
      {triageOpen && (
        <TriageVisualization
          result={triageResult}
          isProcessing={triageProcessing}
          onClose={() => { setTriageOpen(false); setTriageResult(null); }}
        />
      )}

      {/* Global Triage Modal */}
      {globalTriageOpen && (
        <GlobalTriageModal onClose={() => setGlobalTriageOpen(false)} />
      )}

      {/* Pharma Visualization Modal */}
      {pharmaOpen && pharmaPatient && (
        <PharmaVisualization
          patientId={pharmaPatient.id}
          patientName={pharmaPatient.name}
          result={pharmaResult}
          isProcessing={pharmaProcessing}
          onClose={() => { setPharmaOpen(false); setPharmaResult(null); setPharmaPatient(null); }}
        />
      )}

      {/* Scheduler Modal */}
      {schedulerOpen && schedulerPatientId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => setSchedulerOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', zIndex: 1001 }}>
                  <X size={24} />
                </button>
                <SchedulerVisualization patientId={schedulerPatientId} />
            </div>
        </div>
      )}

      {/* Bed Agent Visualization */}
      {showBedAgent && (
        <BedAgentVisualization onClose={() => setShowBedAgent(false)} />
      )}

      {/* Add Patient Modal */}
      <AddPatientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={() => fetchPatients()} 
      />

      {/* Keyframe for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
