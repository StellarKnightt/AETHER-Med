import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const BEDS_API = `${API_BASE_URL}/api/v1/beds`;

export interface BedData {
  id: string;
  bed_number: string;
  bed_type: string;
  ward: string;
  status: string;
  patient_id: string | null;
}

export interface BedMetrics {
  total: number;
  occupied: number;
  icu: { total: number; occupied: number };
  general: { total: number; occupied: number };
}

export const bedApi = {
  getAllBeds: async (): Promise<BedData[]> => {
    try {
      const response = await axios.get(`${BEDS_API}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching beds:', error);
      throw error;
    }
  },
  
  getBedMetrics: async (): Promise<BedMetrics> => {
    try {
      const response = await axios.get(`${BEDS_API}/metrics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching bed metrics:', error);
      throw error;
    }
  },

  runBedAgent: async (patientId: string) => {
    try {
      const response = await axios.post(`${BEDS_API}/agent/${patientId}`);
      return response.data;
    } catch (error) {
      console.error('Error running bed agent:', error);
      throw error;
    }
  },
  
  approveBedAssignment: async (bedResultId: string) => {
    try {
      const response = await axios.post(`${BEDS_API}/agent/${bedResultId}/approve`);
      return response.data;
    } catch (error) {
      console.error('Error approving bed assignment:', error);
      throw error;
    }
  },
  
  rejectBedAssignment: async (bedResultId: string) => {
    try {
      const response = await axios.post(`${BEDS_API}/agent/${bedResultId}/reject`);
      return response.data;
    } catch (error) {
      console.error('Error rejecting bed assignment:', error);
      throw error;
    }
  },

  releaseBed: async (bedId: string) => {
    try {
      const response = await axios.post(`${BEDS_API}/${bedId}/release`);
      return response.data;
    } catch (error) {
      console.error('Error releasing bed:', error);
      throw error;
    }
  }
};
