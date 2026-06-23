import axios from 'axios';

const API_BASE_URL = '/api/v1';

export interface SchedulerResult {
    id: string;
    patient_id: string;
    priority_level: string;
    confidence: number;
    assigned_doctor_id: string;
    assigned_nurse_id: string;
    assigned_doctor_name: string;
    assigned_nurse_name: string;
    reasoning_chain: string[];
    workflow_actions: string[];
    status: string;
    created_at: string;
}

export const schedulerApi = {
    analyze: async (patientId: string): Promise<SchedulerResult> => {
        const response = await axios.post(`${API_BASE_URL}/scheduler/assign?patient_id=${patientId}`);
        return response.data;
    },
    
    getHistory: async (patientId: string): Promise<SchedulerResult[]> => {
        const response = await axios.get(`${API_BASE_URL}/scheduler/history?patient_id=${patientId}`);
        return response.data;
    },

    getAll: async (): Promise<SchedulerResult[]> => {
        const response = await axios.get(`${API_BASE_URL}/scheduler/results`);
        return response.data;
    },

    approve: async (dbId: string): Promise<any> => {
        const response = await axios.post(`${API_BASE_URL}/scheduler/approve?db_id=${dbId}`);
        return response.data;
    },

    reject: async (dbId: string): Promise<any> => {
        const response = await axios.post(`${API_BASE_URL}/scheduler/reject?db_id=${dbId}`);
        return response.data;
    }
};
