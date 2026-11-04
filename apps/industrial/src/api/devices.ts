import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { Device, DeviceLatestTelemetry } from './types';
import { useOrgStore } from '../stores/orgStore';

export function useDevices() {
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useQuery({
    queryKey: ['devices', currentOrgId],
    queryFn: async () => {
      const res = await apiFetch<{ devices: Device[] }>('/v1/devices');
      return res.devices || [];
    },
    refetchInterval: 15000,
  });
}

export function useDeviceLatestTelemetry(deviceId: string | null) {
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useQuery({
    queryKey: ['device-latest', currentOrgId, deviceId],
    queryFn: () => apiFetch<DeviceLatestTelemetry>(`/v1/telemetry/latest?device_id=${deviceId}`),
    enabled: !!deviceId,
    refetchInterval: 5000,
  });
}
