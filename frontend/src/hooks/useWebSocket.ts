/**
 * useWebSocket React Hook
 * Provides WebSocket connectivity and message handling.
 */

import { useEffect, useState, useCallback } from 'react';
import { wsClient } from '../websocket/wsClient';

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: Record<string, unknown> | null;
  send: (data: Record<string, unknown>) => void;
  subscribe: (room: string) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const cleanups: (() => void)[] = [];

    cleanups.push(
      wsClient.on('connected', () => setIsConnected(true))
    );
    cleanups.push(
      wsClient.on('disconnected', () => setIsConnected(false))
    );
    cleanups.push(
      wsClient.on('message', (data) => setLastMessage(data))
    );

    wsClient.connect();

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  const send = useCallback((data: Record<string, unknown>) => {
    wsClient.send(data);
  }, []);

  const subscribe = useCallback((room: string) => {
    wsClient.subscribe(room);
  }, []);

  return { isConnected, lastMessage, send, subscribe };
}
