import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const PATIENTS_API = `${API_BASE_URL}/api/v1/patients`;

export interface PatientData {
  id?: string;
  name: string;
  age: number;
  gender: string;
  status: string;
  triage_level?: number | null;
  ward?: string | null;
  medical_history?: Record<string, any> | null;
  allergies?: string[] | null;
  medications?: string[] | null;
  diseases?: string[] | null;
  symptoms?: string[] | null;
  blood_group?: string | null;
  weight?: number | null;
  height?: number | null;
  smoking_status?: string | null;
  alcohol_consumption?: string | null;
  emergency_contact?: string | null;
  previous_hospitalizations?: number | null;
  risk_factors?: string[] | null;
  notes?: string | null;
  vitals?: Record<string, any> | null;
}

export const patientApi = {
  getPatients: async () => {
    try {
      const response = await axios.get(`${PATIENTS_API}/`);
      return response.data;
    } catch (error) {
      console.error('Failed to get patients', error);
      throw error;
    }
  },

  getPatient: async (id: string) => {
    try {
      const response = await axios.get(`${PATIENTS_API}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get patient ${id}`, error);
      throw error;
    }
  },

  createPatient: async (patient: PatientData) => {
    try {
      const response = await axios.post(`${PATIENTS_API}/`, patient);
      return response.data;
    } catch (error) {
      console.error('Failed to create patient', error);
      throw error;
    }
  },

  updatePatient: async (id: string, patient: Partial<PatientData>) => {
    try {
      const response = await axios.patch(`${PATIENTS_API}/${id}`, patient);
      return response.data;
    } catch (error) {
      console.error(`Failed to update patient ${id}`, error);
      throw error;
    }
  }
};
