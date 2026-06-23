import axios from 'axios';

const API_BASE_URL = '/api/v1';

export interface Doctor {
    id: string;
    name: string;
    age: number;
    gender: string;
    qualification: string;
    specialization: string;
    years_of_experience: number;
    department: string;
    availability_status: string;
    shift: string;
    contact_number: string;
    email: string;
    emergency_response_capability: boolean;
    current_workload_score: number;
    assigned_patients: any[];
}

export interface Nurse {
    id: string;
    name: string;
    age: number;
    gender: string;
    qualification: string;
    years_of_experience: number;
    department: string;
    availability_status: string;
    shift: string;
    contact_number: string;
    email: string;
    emergency_support_capability: boolean;
    current_workload_score: number;
    assigned_patients: any[];
}

export const staffApi = {
    getDoctors: async (): Promise<Doctor[]> => {
        const response = await axios.get(`${API_BASE_URL}/staff/doctors`);
        return response.data;
    },
    
    generateDoctor: async (): Promise<Doctor> => {
        const response = await axios.post(`${API_BASE_URL}/staff/doctors/generate`);
        return response.data;
    },
    
    getNurses: async (): Promise<Nurse[]> => {
        const response = await axios.get(`${API_BASE_URL}/staff/nurses`);
        return response.data;
    },
    
    generateNurse: async (): Promise<Nurse> => {
        const response = await axios.post(`${API_BASE_URL}/staff/nurses/generate`);
        return response.data;
    }
};
