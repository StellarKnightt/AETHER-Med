/**
 * AETHER-Med Type Definitions
 * Shared TypeScript types for the frontend.
 */

// ── Patient Types ──
export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientCreate {
  name: string;
  age: number;
  gender: string;
  status?: string;
  notes?: string;
}

// ── Agent Types ──
export interface Agent {
  name: string;
  status: 'idle' | 'running' | 'error' | 'completed';
  description: string;
}

export interface AgentLog {
  id: string;
  agent_name: string;
  action: string;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

// ── Dashboard Types ──
export interface DashboardMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
  color?: 'teal' | 'purple' | 'pink' | 'amber';
}

// ── WebSocket Types ──
export interface WSMessage {
  type: string;
  data?: unknown;
  room?: string;
  message?: string;
}

// ── Health Check Types ──
export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface ReadinessStatus {
  status: string;
  checks: {
    api: boolean;
    database: boolean;
    langgraph: boolean;
    rag: boolean;
  };
  timestamp: string;
}

// ── Workflow Types ──
export interface WorkflowState {
  patient_id: string;
  current_step: string;
  is_complete: boolean;
  triage_priority?: number;
  assigned_ward?: string;
  bed_number?: string;
  messages: string[];
}

// ── Bed Availability ──
export interface WardAvailability {
  ward: string;
  total_beds: number;
  occupied: number;
  available: number;
  occupancy_rate: number;
}
