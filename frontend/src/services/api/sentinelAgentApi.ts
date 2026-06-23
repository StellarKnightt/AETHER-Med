import axios from 'axios';

const API_BASE_URL = '/api/v1/sentinel-agent';

export interface SentinelIncident {
  id: string;
  event_id: string;
  threat_type: string;
  category: string;
  severity: string;
  affected_agent: string;
  reasoning: string;
  recommendation: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  response_action: string | null;
  created_at: string;
}

export interface SentinelTrustScore {
  agent_name: string;
  trust_score: number;
  privacy_score: number;
  security_score: number;
  compliance_score: number;
  incident_count: number;
}

export interface SentinelSession {
  status: 'active' | 'stopped';
  started_at: string | null;
  stopped_at: string | null;
  events_processed: number;
  incidents_detected: number;
}

export const sentinelAgentApi = {
  getStatus: async (): Promise<SentinelSession> => {
    const res = await axios.get(`${API_BASE_URL}/status`);
    return res.data;
  },
  startMonitoring: async (): Promise<SentinelSession> => {
    const res = await axios.post(`${API_BASE_URL}/start`);
    return res.data;
  },
  stopMonitoring: async (): Promise<{ status: string }> => {
    const res = await axios.post(`${API_BASE_URL}/stop`);
    return res.data;
  },
  getIncidents: async (): Promise<SentinelIncident[]> => {
    const res = await axios.get(`${API_BASE_URL}/incidents`);
    return res.data;
  },
  approveIncident: async (id: string): Promise<SentinelIncident> => {
    const res = await axios.post(`${API_BASE_URL}/incidents/${id}/approve`);
    return res.data;
  },
  rejectIncident: async (id: string): Promise<SentinelIncident> => {
    const res = await axios.post(`${API_BASE_URL}/incidents/${id}/reject`);
    return res.data;
  },
  approveAllIncidents: async (): Promise<{ approved_count: number }> => {
    const res = await axios.post(`${API_BASE_URL}/incidents/approve-all`);
    return res.data;
  },
  rejectAllIncidents: async (): Promise<{ rejected_count: number }> => {
    const res = await axios.post(`${API_BASE_URL}/incidents/reject-all`);
    return res.data;
  },
  getTrustScores: async (): Promise<SentinelTrustScore[]> => {
    const res = await axios.get(`${API_BASE_URL}/trust-scores`);
    return res.data;
  }
};
