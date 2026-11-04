import { create } from 'zustand';

export interface TelemetryPoint {
  time: string;
  value: number;
  unit: string;
}

export interface LatestReading {
  value: number;
  unit: string;
  timestamp: string;
}

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';

interface TelemetryState {
  status: ConnectionStatus;
  latencyMs: number;
  packetsReceived: number;
  lastPacketTime: string | null;
  // Key: `${deviceId}:${metric}` -> LatestReading
  latestMetrics: Record<string, LatestReading>;
  // Key: `${deviceId}:${metric}` -> Array of TelemetryPoint (max 100)
  metricStreams: Record<string, TelemetryPoint[]>;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setLatency: (ms: number) => void;
  recordReading: (deviceId: string, metric: string, value: number, unit: string, timestamp: string) => void;
  resetStream: (deviceId: string, metric: string) => void;
}

const MAX_STREAM_POINTS = 80;

export const useTelemetryStore = create<TelemetryState>((set) => ({
  status: 'DISCONNECTED',
  latencyMs: 0,
  packetsReceived: 0,
  lastPacketTime: null,
  latestMetrics: {},
  metricStreams: {},

  setStatus: (status) => set({ status }),
  setLatency: (latencyMs) => set({ latencyMs }),

  recordReading: (deviceId, metric, value, unit, timestamp) =>
    set((state) => {
      const key = `${deviceId}:${metric}`;
      const existingStream = state.metricStreams[key] || [];

      // Add to ring buffer (capped at MAX_STREAM_POINTS)
      const newPoint: TelemetryPoint = {
        time: timestamp,
        value,
        unit,
      };

      const updatedStream = existingStream.length >= MAX_STREAM_POINTS
        ? [...existingStream.slice(1), newPoint]
        : [...existingStream, newPoint];

      return {
        packetsReceived: state.packetsReceived + 1,
        lastPacketTime: timestamp,
        latestMetrics: {
          ...state.latestMetrics,
          [key]: { value, unit, timestamp },
        },
        metricStreams: {
          ...state.metricStreams,
          [key]: updatedStream,
        },
      };
    }),

  resetStream: (deviceId, metric) =>
    set((state) => {
      const key = `${deviceId}:${metric}`;
      const newStreams = { ...state.metricStreams };
      delete newStreams[key];
      return { metricStreams: newStreams };
    }),
}));

