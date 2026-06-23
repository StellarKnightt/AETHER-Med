import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface CleanerData {
  id: string;
  name: string;
  age: number;
  gender: string;
  years_of_experience: number;
  shift: string;
  availability_status: 'Available' | 'Assigned' | 'Cleaning' | 'Break' | 'Off Duty';
  assigned_tasks: any[];
  completed_tasks: number;
  current_location: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CleanerMetrics {
  total: number;
  available: number;
  active: number;
  completed: number;
}

export const cleanerApi = {
  getCleaners: async (): Promise<CleanerData[]> => {
    const res = await axios.get(`${API_BASE_URL}/api/v1/cleaners`);
    return res.data;
  },
  
  getMetrics: async (): Promise<CleanerMetrics> => {
    const res = await axios.get(`${API_BASE_URL}/api/v1/cleaners/metrics`);
    return res.data;
  },

  generateCleaners: async (): Promise<CleanerData[]> => {
    const res = await axios.post(`${API_BASE_URL}/api/v1/cleaners/generate`);
    return res.data;
  }
};
