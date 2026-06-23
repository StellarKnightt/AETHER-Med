import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const META_AGENT_API = `${API_BASE_URL}/api/v1/meta-agent`;

export interface MetaAgentSession {
  id: string;
  status: string;
  started_at: string;
  stopped_at: string | null;
  events_processed: number;
  failures_detected: number;
  recoveries_completed: number;
}

export interface MetaAgentHealthScore {
  id: string;
  agent_name: string;
  status: string;
  health_score: number;
  reliability_score: number;
  reasoning_quality: number;
  workflow_compliance: number;
  communication_score: number;
  active_failures: number;
  updated_at: string;
}

export interface MetaAgentIncident {
  id: string;
  event_id: string | null;
  failure_type: string;
  failure_category: string;
  severity: string;
  affected_agent: string;
  root_cause: string;
  recommended_actions: Array<{ action_type: string; description: string }>;
  confidence: number;
  status: string;
  before_health: number | null;
  after_health: number | null;
  created_at: string;
}

export interface MetaAgentRecoveryAction {
  id: string;
  incident_id: string;
  action_type: string;
  description: string;
  status: string;
  execution_result: string | null;
  created_at: string;
  updated_at: string;
}

export const metaAgentApi = {
  getStatus: async (): Promise<MetaAgentSession> => {
    const response = await axios.get(`${META_AGENT_API}/status`);
    return response.data;
  },

  startMonitoring: async (): Promise<MetaAgentSession> => {
    const response = await axios.post(`${META_AGENT_API}/start`);
    return response.data;
  },

  stopMonitoring: async (): Promise<{ status: string }> => {
    const response = await axios.post(`${META_AGENT_API}/stop`);
    return response.data;
  },

  getHealthScores: async (): Promise<MetaAgentHealthScore[]> => {
    const response = await axios.get(`${META_AGENT_API}/health-scores`);
    return response.data;
  },

  getIncidents: async (): Promise<MetaAgentIncident[]> => {
    const response = await axios.get(`${META_AGENT_API}/incidents`);
    return response.data;
  },

  approveIncident: async (id: string): Promise<MetaAgentIncident> => {
    const response = await axios.post(`${META_AGENT_API}/incidents/${id}/approve`);
    return response.data;
  },

  rejectIncident: async (id: string): Promise<MetaAgentIncident> => {
    const response = await axios.post(`${META_AGENT_API}/incidents/${id}/reject`);
    return response.data;
  },

  approveAll: async (): Promise<{ approved_count: number }> => {
    const response = await axios.post(`${META_AGENT_API}/incidents/approve-all`);
    return response.data;
  },

  rejectAll: async (): Promise<{ rejected_count: number }> => {
    const response = await axios.post(`${META_AGENT_API}/incidents/reject-all`);
    return response.data;
  },

  getRecoveryHistory: async (): Promise<MetaAgentRecoveryAction[]> => {
    const response = await axios.get(`${META_AGENT_API}/recovery-history`);
    return response.data;
  }
};
