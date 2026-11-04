import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { Machine } from './types';
import { useOrgStore } from '../stores/orgStore';

export function useMachines() {
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useQuery({
    queryKey: ['machines', currentOrgId],
    queryFn: async () => {
      const res = await apiFetch<{ machines: Machine[] }>('/v1/machines');
      return res.machines || [];
    },
    refetchInterval: 10000,
  });
}

export function useMachine(id: string | null) {
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useQuery({
    queryKey: ['machines', currentOrgId, id],
    queryFn: async () => {
      const res = await apiFetch<{ machine: Machine }>(`/v1/machines/${id}`);
      return res.machine;
    },
    enabled: !!id,
  });
}
