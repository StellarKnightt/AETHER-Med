import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const SENTINEL_API = `${API_BASE_URL}/api/v1/sentinel-sim`;

export interface SecurityScenario {
  id: string;
  name: string;
  category: string;
  description: string;
  default_severity: string;
  default_intensity: number;
  affected_agents_default: string[];
}

export interface MetaAgentScenario extends SecurityScenario {
  scenario_type: 'meta_agent';
  failure_category: string;
  failure_examples: Record<string, { normal: string; failure: string }>;
}

export interface SecuritySimulation {
  id: string;
  scenario_category: string;
  scenario_name: string;
  severity: string;
  intensity: number;
  duration_seconds: number;
  target_agents: string[];
  violation_count: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  config: any;
  simulation_type: 'sentinel' | 'meta_agent';
  failure_category?: string;
  failure_frequency?: number;
}

export interface SecurityEvent {
  id: string;
  simulation_id: string;
  event_type: string;
  category: string;
  severity: string;
  affected_agent: string;
  target_entity: string;
  description: string;
  risk_score: number;
  status: string;
  created_at: string;
}

export const sentinelApi = {
  getScenarios: async (): Promise<SecurityScenario[]> => {
    const response = await axios.get(`${SENTINEL_API}/scenarios`);
    return response.data;
  },

  getMetaScenarios: async (): Promise<MetaAgentScenario[]> => {
    const response = await axios.get(`${SENTINEL_API}/meta-scenarios`);
    return response.data;
  },

  getSimulations: async (): Promise<SecuritySimulation[]> => {
    const response = await axios.get(`${SENTINEL_API}/simulations`);
    return response.data;
  },

  launchSimulation: async (config: any): Promise<SecuritySimulation> => {
    const response = await axios.post(`${SENTINEL_API}/simulations`, config);
    return response.data;
  },

  getSimulation: async (id: string): Promise<SecuritySimulation> => {
    const response = await axios.get(`${SENTINEL_API}/simulations/${id}`);
    return response.data;
  },

  stopSimulation: async (id: string): Promise<SecuritySimulation> => {
    const response = await axios.post(`${SENTINEL_API}/simulations/${id}/stop`);
    return response.data;
  },

  getSimulationEvents: async (id: string): Promise<SecurityEvent[]> => {
    const response = await axios.get(`${SENTINEL_API}/simulations/${id}/events`);
    return response.data;
  },

  getRecentEvents: async (limit: number = 50): Promise<SecurityEvent[]> => {
    const response = await axios.get(`${SENTINEL_API}/events/recent?limit=${limit}`);
    return response.data;
  }
};
