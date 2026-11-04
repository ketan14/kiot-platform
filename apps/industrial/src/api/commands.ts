import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { DeviceCommand } from './types';
import { useOrgStore } from '../stores/orgStore';

export function useDeviceCommands(deviceId: string | null) {
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useQuery({
    queryKey: ['commands', currentOrgId, deviceId],
    queryFn: async () => {
      const res = await apiFetch<{ commands: DeviceCommand[] }>(`/v1/devices/${deviceId}/commands`);
      return res.commands || [];
    },
    enabled: !!deviceId,
    refetchInterval: 3000,
  });
}

export interface SendCommandPayload {
  deviceId: string;
  commandType: string;
  payload: Record<string, unknown>;
}

export function useSendCommand() {
  const queryClient = useQueryClient();
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useMutation({
    mutationFn: async ({ deviceId, commandType, payload }: SendCommandPayload) => {
      const res = await apiFetch<{ command: DeviceCommand }>(`/v1/devices/${deviceId}/commands`, {
        method: 'POST',
        body: JSON.stringify({ commandType, payload }),
      });
      return res.command;
    },
    onSuccess: (_, variables) => {
      // Invalidate commands cache so the UI updates immediately
      void queryClient.invalidateQueries({
        queryKey: ['commands', currentOrgId, variables.deviceId],
      });
    },
  });
}
