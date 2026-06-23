import axios from 'axios';

const API_URL = '/api/v1/pharma';

export interface PharmaResult {
  db_id?: string;
  risk_level: string;
  reasoning: string[];
  interactions_detected: string[];
  recommended_actions: string[];
  confidence: number;
}

export const pharmaApi = {
  analyzePatient: async (patientId: string): Promise<PharmaResult> => {
    const res = await axios.post(`${API_URL}/analyze?patient_id=${patientId}`);
    return res.data;
  },
  
  approvePharma: async () => {
    // Mock approve action
    return { status: 'approved' };
  },

  rejectPharma: async () => {
    // Mock reject action
    return { status: 'rejected' };
  }
};
