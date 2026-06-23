/**
 * WebSocket Client
 * Manages persistent WebSocket connection to the backend.
 */

type MessageHandler = (data: Record<string, unknown>) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private shouldReconnect = true;

  constructor(url?: string) {
    this.url = url || import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
        this.emit('connected', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type || 'message';
          this.emit(type, data);
          this.emit('message', data);
        } catch {
          console.warn('[WS] Invalid message:', event.data);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        this.emit('disconnected', {});
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.connect(), delay);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        this.emit('error', { error });
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WS] Not connected, message not sent');
    }
  }

  subscribe(room: string): void {
    this.send({ action: 'subscribe', room });
  }

  on(event: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return cleanup function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  private emit(event: string, data: Record<string, unknown>): void {
    this.handlers.get(event)?.forEach((handler) => handler(data));
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const wsClient = new WSClient();
export default WSClient;
