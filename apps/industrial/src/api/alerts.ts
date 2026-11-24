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

export interface NotificationChannelItem {
  id: string;
  organization_id: string;
  name: string;
  channel_type: 'EMAIL' | 'WEBHOOK' | 'SLACK';
  target: string;
  has_secret: boolean;
  min_severity: 'INFO' | 'WARNING' | 'CRITICAL';
  is_enabled: boolean;
  created_at: string;
}

export interface NotificationDeliveryItem {
  id: string;
  organization_id: string;
  incident_id: string | null;
  channel_id: string | null;
  channel_type: 'EMAIL' | 'WEBHOOK' | 'SLACK';
  channel_name: string;
  recipient: string;
  subject: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'ESCALATED';
  response_code: number | null;
  error_message: string | null;
  attempt_count: number;
  sent_at: string;
  created_at: string;
}

export function useNotificationChannels() {
  return useQuery<NotificationChannelItem[]>({
    queryKey: ['notification-channels'],
    queryFn: async () => {
      const res = await apiFetch<{ channels: NotificationChannelItem[] }>(
        '/v1/notification-channels'
      );
      return res.channels || [];
    },
  });
}

export function useNotificationDeliveries() {
  return useQuery<NotificationDeliveryItem[]>({
    queryKey: ['notification-deliveries'],
    queryFn: async () => {
      const res = await apiFetch<{ deliveries: NotificationDeliveryItem[] }>(
        '/v1/notification-deliveries'
      );
      return res.deliveries || [];
    },
    refetchInterval: 5000,
  });
}

export function useCreateNotificationChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      channelType: 'EMAIL' | 'WEBHOOK' | 'SLACK';
      target: string;
      secretHeader?: string;
      minSeverity: 'INFO' | 'WARNING' | 'CRITICAL';
    }) => {
      return apiFetch('/v1/notification-channels', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

export function useDeleteNotificationChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      return apiFetch(`/v1/notification-channels/${channelId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
  });
}

export function useTestNotificationChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      return apiFetch(`/v1/notification-channels/${channelId}/test`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-deliveries'] });
    },
  });
}
