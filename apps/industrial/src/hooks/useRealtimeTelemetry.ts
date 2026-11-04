import { useEffect, useRef, useCallback } from 'react';
import { useOrgStore } from '../stores/orgStore';
import { useTelemetryStore } from '../stores/telemetryStore';
import { useAlertStore } from '../stores/alertStore';

export function useRealtimeTelemetry() {
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);
  const userId = useOrgStore((s) => s.userId);
  const setStatus = useTelemetryStore((s) => s.setStatus);
  const setLatency = useTelemetryStore((s) => s.setLatency);
  const recordReading = useTelemetryStore((s) => s.recordReading);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const pingTimestampRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef<number>(0);

  const connect = useCallback(() => {
    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setStatus('CONNECTING');

    // Use absolute URL or proxy
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3001?org_id=${currentOrgId}&token=user_${userId}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('CONNECTED');
        reconnectAttemptRef.current = 0;

        // Start ping loop
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            pingTimestampRef.current = performance.now();
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Pong response for latency measurement
          if (data.action === 'pong') {
            if (pingTimestampRef.current) {
              const rtt = Math.round(performance.now() - pingTimestampRef.current);
              setLatency(rtt);
            }
            return;
          }

          // Telemetry stream event
          if (data.type === 'TELEMETRY_UPDATE' || (data.deviceId && data.metric)) {
            recordReading(
              data.deviceId,
              data.metric,
              Number(data.value),
              data.unit || '',
              data.timestamp || new Date().toISOString()
            );
          }

          // Incident triggered or resolved events
          if (data.type === 'INCIDENT_TRIGGERED' && data.incident) {
            useAlertStore.getState().setActiveAlarm(data.incident);
          } else if (data.type === 'INCIDENT_RESOLVED') {
            const currentAlarm = useAlertStore.getState().activeAlarm;
            if (currentAlarm && currentAlarm.id === data.incidentId) {
              useAlertStore.getState().clearAlarm();
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        setStatus('DISCONNECTED');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptRef.current), 10000);
        reconnectAttemptRef.current += 1;
        reconnectTimeoutRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        setStatus('ERROR');
      };
    } catch {
      setStatus('ERROR');
    }
  }, [currentOrgId, userId, setStatus, setLatency, recordReading]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const subscribeDevice = useCallback((deviceId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'subscribe_device', deviceId }));
    }
  }, []);

  const unsubscribeDevice = useCallback((deviceId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'unsubscribe_device', deviceId }));
    }
  }, []);

  return {
    subscribeDevice,
    unsubscribeDevice,
    reconnect: connect,
  };
}

