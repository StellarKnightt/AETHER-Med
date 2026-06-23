import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const SIMULATION_API = `${API_BASE_URL}/api/v1/simulation`;
const TRIAGE_API = `${API_BASE_URL}/api/v1/triage`;

export const simulationApi = {
  startSimulation: async () => {
    const response = await axios.post(`${SIMULATION_API}/start`);
    return response.data;
  },

  stopSimulation: async () => {
    const response = await axios.post(`${SIMULATION_API}/stop`);
    return response.data;
  },

  getMetrics: async () => {
    const response = await axios.get(`${SIMULATION_API}/metrics`);
    return response.data;
  },

  triggerEvent: async (event_type: string, payload: Record<string, unknown> = {}) => {
    const response = await axios.post(`${SIMULATION_API}/events/trigger`, {
      event_type,
      ...payload,
    });
    return response.data;
  },

  generatePatients: async (count: number = 5) => {
    const response = await axios.post(`${SIMULATION_API}/patients/generate`, { count });
    return response.data;
  },

  runTriage: async (patientId: string, symptoms: string[] = [], history: string[] = []) => {
    const response = await axios.post(`${TRIAGE_API}/run`, {
      patient_id: patientId,
      symptoms,
      history,
    });
    return response.data;
  },

  batchTriage: async (patientIds: string[] = []) => {
    const response = await axios.post(`${TRIAGE_API}/batch`, { patient_ids: patientIds });
    return response.data;
  },

  approveTriage: async (triageId: string) => {
    const response = await axios.post(`${TRIAGE_API}/approve`, { triage_id: triageId });
    return response.data;
  },

  rejectTriage: async (triageId: string) => {
    const response = await axios.post(`${TRIAGE_API}/reject`, { triage_id: triageId });
    return response.data;
  },
};
