import axios from 'axios';

const API_BASE_URL = '/api/v1';

export interface AgentMetric {
    id: string;
    agent_id: string;
    patients_analyzed: number;
    actions_executed: number;
    last_run_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface AgentRunHistory {
    id: string;
    agent_id: string;
    patients_analyzed: number;
    recommendations_generated: number;
    approvals: number;
    rejections: number;
    actions_executed: number;
    execution_duration_ms: number;
    created_at: string;
    updated_at: string;
}

export interface AgentRunHistoryCreate {
    patients_analyzed: number;
    recommendations_generated: number;
    approvals: number;
    rejections: number;
    actions_executed: number;
    execution_duration_ms: number;
}

export const agentApi = {
    getMetrics: async (): Promise<AgentMetric[]> => {
        const response = await axios.get(`${API_BASE_URL}/agents/metrics`);
        return response.data;
    },

    updateMetrics: async (agentId: string, patientsAnalyzed: number, actionsExecuted: number): Promise<AgentMetric> => {
        const response = await axios.post(`${API_BASE_URL}/agents/${agentId}/metrics/update?patients_analyzed=${patientsAnalyzed}&actions_executed=${actionsExecuted}`);
        return response.data;
    },

    saveHistory: async (agentId: string, payload: AgentRunHistoryCreate): Promise<AgentRunHistory> => {
        const response = await axios.post(`${API_BASE_URL}/agents/${agentId}/history`, payload);
        return response.data;
    },

    getHistory: async (agentId: string): Promise<AgentRunHistory[]> => {
        const response = await axios.get(`${API_BASE_URL}/agents/${agentId}/history`);
        return response.data;
    },

    getAllHistory: async (): Promise<AgentRunHistory[]> => {
        const response = await axios.get(`${API_BASE_URL}/agents/history/all`);
        return response.data;
    }
};
