import { useSimulationStore } from '../../store/simulationStore';
import type { PatientVitals, HospitalEvent } from '../../store/simulationStore';

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/api/v1/simulation/ws`;

export class SocketManager {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: ((payload: any) => void)[] = [];

  constructor() {
    this.url = WS_URL;
  }

  public connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('[WS] Connected to simulation stream:', this.url);
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (err) {
        console.error('[WS] Failed to parse message', err);
      }
    };

    this.socket.onclose = () => {
      console.log('[WS] Disconnected. Reconnecting in 5s...');
      this.socket = null;
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    };

    this.socket.onerror = (error) => {
      console.error('[WS] Error:', error);
      this.socket?.close();
    };
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public subscribe(callback: (payload: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private handleMessage(data: Record<string, unknown>) {
    // Notify general listeners first
    this.listeners.forEach(listener => listener(data));

    // Dispatch global CustomEvent for UI components to listen to
    if (data.type) {
      window.dispatchEvent(new CustomEvent(data.type as string, { detail: data.data || data }));
    }

    const store = useSimulationStore.getState();

    switch (data.type) {
      // ── Vitals tick: { type: "vitals_update", data: { patient_id, vitals } }
      case 'vitals_update': {
        const payload = data.data as { patient_id: string; vitals: PatientVitals } | undefined;
        if (payload?.patient_id && payload.vitals) {
          store.updatePatientVitals(payload.patient_id, payload.vitals);
        }
        break;
      }

      // ── Hospital event: { type: "event_update", event: {...} }
      case 'event_update': {
        const event = data.event as HospitalEvent | undefined;
        if (event) {
          store.addEvent(event);
        }
        break;
      }

      // ── Aggregated metrics: { type: "metrics_update", data: { active_patients, ... } }
      case 'metrics_update': {
        const payload = data.data as Record<string, unknown> | undefined;
        if (payload) {
          store.setMetrics(payload);
          // Sync simulation running state from backend
          if (typeof payload.is_running === 'boolean') {
            store.setIsRunning(payload.is_running);
          }
        }
        break;
      }

      case 'simulation_stopped': {
        store.setIsRunning(false);
        break;
      }

      // ── Triage result: { type: "triage_result", data: { patient_id, priority, ... } }
      case 'triage_result': {
        const payload = data.data as Record<string, unknown> | undefined;
        if (payload) {
          store.addTriageResult(payload as any);
        }
        break;
      }

      // ── Triage workflow update (approve/reject)
      case 'triage_workflow': {
        const payload = data.data as { triage_id: string; status: string; workflow_actions: any[] } | undefined;
        if (payload) {
          store.updateTriageStatus(payload.triage_id, payload.status as any, payload.workflow_actions || []);
        }
        break;
      }

      // ── Bed Agent events
      case 'bed_result': {
        const payload = data.data as Record<string, unknown> | undefined;
        if (payload) {
          store.addBedResult(payload as any);
        }
        break;
      }
      
      case 'bed_workflow': {
        const payload = data.data as { bed_result_id: string; status: string } | undefined;
        if (payload) {
          store.updateBedStatus(payload.bed_result_id, payload.status as any);
        }
        break;
      }
      
      case 'bed_cleaning': {
        store.setLastBedCleaningEvent(data);
        break;
      }

      default:
        break;
    }
  }

  public sendCommand(command: string, payload: Record<string, unknown> = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ command, payload }));
    } else {
      console.warn('[WS] Cannot send command — socket not open.');
    }
  }
}

export const socketManager = new SocketManager();
