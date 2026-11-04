import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { AlertRule, Incident } from '@kiot/shared-types';

export function useAlertRules() {
  return useQuery<AlertRule[]>({
    queryKey: ['alert-rules'],
    queryFn: async () => {
      const res = await apiFetch<{ rules: AlertRule[] }>('/v1/alert-rules');
      return res.rules || [];
    },
  });
}

export function useIncidents(status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED') {
  return useQuery<Incident[]>({
    queryKey: ['incidents', status],
    queryFn: async () => {
      const url = status ? `/v1/incidents?status=${status}` : '/v1/incidents';
      const res = await apiFetch<{ incidents: Incident[] }>(url);
      return res.incidents || [];
    },
    refetchInterval: 3000, // Poll every 3s as backup to WebSockets
  });
}

export function useAcknowledgeIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incidentId: string) => {
      return apiFetch(`/v1/incidents/${incidentId}/acknowledge`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}

export function useResolveIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incidentId: string) => {
      return apiFetch(`/v1/incidents/${incidentId}/resolve`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
}
