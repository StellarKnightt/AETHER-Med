import { create } from 'zustand';

// ── Vitals type matches backend field names exactly ─────────────────────────
export interface PatientVitals {
  heart_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  oxygen_saturation: number;
  temperature: number;
  respiratory_rate: number;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  triage_level: number;
  current_location: string;
  vitals: PatientVitals;
  diseases?: string[];
  allergies?: string[];
  medications?: string[];
  blood_group?: string;
  weight?: number;
  height?: number;
  smoking_status?: string;
  alcohol_consumption?: string;
  emergency_contact?: string;
  risk_factors?: string[];
  history?: Record<string, any>;
}

export interface Bed {
  id: string;
  bed_type: 'general' | 'icu' | 'er' | 'or';
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  patient_id?: string;
}

export interface HospitalEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string;
  created_at: string;
}

export interface MetricsSnapshot {
  time: string;
  active_patients: number;
  overall_occupancy_rate: number;
  icu_occupancy_rate: number;
}

export interface WorkflowAction {
  agent: string;
  action: string;
  icon: string;
}

export interface BedResult {
  bed_result_id: string;
  patient_id: string;
  patient_name?: string;
  triage_priority: number;
  recommended_ward: string;
  bed_type_needed: string;
  assigned_bed_id: string | null;
  assigned_bed_number: string | null;
  reasoning: string[];
  status: 'pending' | 'approved' | 'rejected';
  timestamp?: string;
}

export interface TriageResult {
  triage_id: string;
  patient_id: string;
  patient_name: string;
  age: number;
  gender: string;
  priority: string;
  severity_score: number;
  confidence: number;
  reasoning: string[];
  retrieved_context: string[];
  escalation_required: boolean;
  vitals_analysis: {
    raw: Record<string, number>;
    mapped: Record<string, number>;
    severity_indicators: Record<string, string>;
  };
  diseases: string[];
  symptoms: string[];
  final_decision: string;
  recommended_actions: string[];
  status: 'pending' | 'approved' | 'rejected';
  workflow_actions: WorkflowAction[];
  timestamp: string;
  execution_id?: string;
}

export interface SimulationState {
  isRunning: boolean;
  setIsRunning: (isRunning: boolean) => void;

  patients: Record<string, Patient>;
  beds: Record<string, Bed>;
  metrics: any;
  events: HospitalEvent[];
  metricsHistory: MetricsSnapshot[];

  triageResult: TriageResult | null;
  triageHistory: TriageResult[];
  
  bedResult: BedResult | null;
  bedHistory: BedResult[];
  lastBedCleaningEvent: any;

  setPatients: (patients: Record<string, Patient>) => void;
  updatePatientVitals: (patientId: string, vitals: PatientVitals) => void;
  setBeds: (beds: Record<string, Bed>) => void;
  setMetrics: (metrics: any) => void;
  addEvent: (event: HospitalEvent) => void;
  
  setTriageResult: (result: TriageResult | null) => void;
  addTriageResult: (result: TriageResult) => void;
  updateTriageStatus: (triageId: string, status: 'approved' | 'rejected', actions: WorkflowAction[]) => void;
  
  setBedResult: (result: BedResult | null) => void;
  addBedResult: (result: BedResult) => void;
  updateBedStatus: (bedResultId: string, status: 'approved' | 'rejected') => void;
  
  setLastBedCleaningEvent: (event: any) => void;
}

const MAX_HISTORY = 60;

export const useSimulationStore = create<SimulationState>((set) => ({
  isRunning: false,
  setIsRunning: (isRunning) => set({ isRunning }),

  patients: {},
  beds: {},
  metrics: {},
  events: [],
  metricsHistory: [],
  triageResult: null,
  triageHistory: [],
  bedResult: null,
  bedHistory: [],
  lastBedCleaningEvent: null,

  setPatients: (patients) => set({ patients }),

  updatePatientVitals: (patientId, vitals) =>
    set((state) => {
      if (!state.patients[patientId]) return state;
      return {
        patients: {
          ...state.patients,
          [patientId]: { ...state.patients[patientId], vitals },
        },
      };
    }),

  setBeds: (beds) => set({ beds }),

  setMetrics: (metrics) =>
    set((state) => {
      const snapshot: MetricsSnapshot = {
        time: new Date().toLocaleTimeString(),
        active_patients: metrics.active_patients ?? 0,
        overall_occupancy_rate: metrics.overall_occupancy_rate ?? 0,
        icu_occupancy_rate: metrics.icu_occupancy_rate ?? 0,
      };
      const newHistory = [...state.metricsHistory, snapshot].slice(-MAX_HISTORY);
      return { metrics, metricsHistory: newHistory };
    }),

  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, 100),
    })),

  setTriageResult: (result) => set({ triageResult: result }),

  addTriageResult: (result) =>
    set((state) => ({
      triageResult: result,
      triageHistory: [result, ...state.triageHistory].slice(0, 50),
    })),

  updateTriageStatus: (triageId, status, actions) =>
    set((state) => {
      const updated = state.triageHistory.map((t) =>
        t.triage_id === triageId ? { ...t, status, workflow_actions: actions } : t
      );
      const current = state.triageResult?.triage_id === triageId
        ? { ...state.triageResult, status, workflow_actions: actions }
        : state.triageResult;
      return { triageHistory: updated, triageResult: current };
    }),

  setBedResult: (result) => set({ bedResult: result }),
  
  addBedResult: (result) =>
    set((state) => ({
      bedResult: result,
      bedHistory: [result, ...state.bedHistory].slice(0, 50),
    })),
    
  updateBedStatus: (bedResultId, status) =>
    set((state) => {
      const updated = state.bedHistory.map((b) =>
        b.bed_result_id === bedResultId ? { ...b, status } : b
      );
      const current = state.bedResult?.bed_result_id === bedResultId
        ? { ...state.bedResult, status }
        : state.bedResult;
      return { bedHistory: updated, bedResult: current };
    }),
    
  setLastBedCleaningEvent: (event) => set({ lastBedCleaningEvent: event }),
}));
