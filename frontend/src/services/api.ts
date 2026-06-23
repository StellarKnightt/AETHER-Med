/**
 * AETHER-Med API Service
 * Centralized API client for backend communication.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';
const API_PREFIX = '/api/v1';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${API_PREFIX}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ── Health ──
export const healthAPI = {
  check: () => request<Record<string, unknown>>('/health'),
  ready: () => request<Record<string, unknown>>('/health/ready'),
};

// ── Patients ──
export const patientsAPI = {
  list: (skip = 0, limit = 50) =>
    request<Record<string, unknown>[]>(`/patients/?skip=${skip}&limit=${limit}`),
  get: (id: string) =>
    request<Record<string, unknown>>(`/patients/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Record<string, unknown>>('/patients/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/patients/${id}`, { method: 'DELETE' }),
};

// ── Agents ──
export const agentsAPI = {
  list: () => request<Record<string, unknown>>('/agents/'),
  status: (name: string) =>
    request<Record<string, unknown>>(`/agents/${name}/status`),
  trigger: (name: string, payload = {}) =>
    request<Record<string, unknown>>(`/agents/${name}/trigger`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logs: (agentName?: string) =>
    request<Record<string, unknown>[]>(
      `/agents/logs/${agentName ? `?agent_name=${agentName}` : ''}`
    ),
};
