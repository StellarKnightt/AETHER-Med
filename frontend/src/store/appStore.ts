/**
 * AETHER-Med App Store (Zustand)
 * Global state management for the dashboard.
 */

import { create } from 'zustand';
import type { Agent, Patient } from '../types';

interface AppState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Agents
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;

  // Patients
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;

  // Connection
  isBackendConnected: boolean;
  setBackendConnected: (status: boolean) => void;

  // Active page
  activePage: string;
  setActivePage: (page: string) => void;

  // Active Workflow
  activeWorkflowId: string | null;
  setActiveWorkflowId: (id: string | null) => void;

  // Batch Tracking
  activeBatchPatientIds: string[];
  setActiveBatchPatientIds: (ids: string[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Agents
  agents: [],
  setAgents: (agents) => set({ agents }),

  // Patients
  patients: [],
  setPatients: (patients) => set({ patients }),

  // Connection
  isBackendConnected: false,
  setBackendConnected: (status) => set({ isBackendConnected: status }),

  // Active page
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  // Active Workflow
  activeWorkflowId: null,
  setActiveWorkflowId: (id) => set({ activeWorkflowId: id }),

  // Batch Tracking
  activeBatchPatientIds: [],
  setActiveBatchPatientIds: (ids) => set({ activeBatchPatientIds: ids }),
}));
