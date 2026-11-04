import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface HistoryDataPoint {
  time: string;
  metric: string;
  avg_value?: number;
  min_value?: number;
  max_value?: number;
  value?: number;
  sample_count?: string | number;
}

export interface HistoryResponse {
  deviceId: string;
  resolution: string;
  order: string;
  count: number;
  dataPoints: HistoryDataPoint[];
}

export interface MachineAnalyticsResponse {
  machineId: string;
  machineCode: string;
  name: string;
  status: string;
  currentOperatingHours: number;
  availabilityPercent: number;
  telemetryStats: {
    max_vibration: number;
    max_temperature: number;
    avg_speed: number;
    peak_power: number;
    total_energy_kwh: number;
  };
  incidentsPast24h: {
    total: number;
    critical: number;
  };
}

export function useHistoricalTelemetry(params: {
  deviceId: string;
  metric?: string;
  resolution?: 'raw' | '1m' | '1h';
  from?: string;
  to?: string;
  order?: 'ASC' | 'DESC';
  limit?: number;
}) {
  return useQuery<HistoryResponse>({
    queryKey: ['telemetry-history', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      query.set('device_id', params.deviceId);
      if (params.metric) query.set('metric', params.metric);
      if (params.resolution) query.set('resolution', params.resolution);
      if (params.from) query.set('from', params.from);
      if (params.to) query.set('to', params.to);
      if (params.order) query.set('order', params.order || 'ASC');
      if (params.limit) query.set('limit', String(params.limit || 500));

      return apiFetch<HistoryResponse>(`/v1/telemetry/history?${query.toString()}`);
    },
    enabled: !!params.deviceId,
  });
}

export function useMachineAnalytics(machineId?: string) {
  return useQuery<MachineAnalyticsResponse>({
    queryKey: ['machine-analytics', machineId],
    queryFn: async () => {
      return apiFetch<MachineAnalyticsResponse>(`/v1/machines/${machineId}/analytics`);
    },
    enabled: !!machineId,
  });
}

