import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { useOrgStore } from '../stores/orgStore';
import { Device } from './types';

export interface Gateway {
  id: string;
  name: string;
  model: string;
  ip_address?: string;
  status: string;
  last_heartbeat_at?: string;
  location_id?: string;
  created_at: string;
}

export interface LocationItem {
  id: string;
  organization_id: string;
  parent_id?: string | null;
  name: string;
  code?: string | null;
  type: 'site' | 'building' | 'floor' | 'line' | 'room';
  address?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  children?: LocationItem[];
  stats?: {
    devices: number;
    gateways: number;
    machines: number;
  };
}

export interface OrgMember {
  id: string;
  role: 'owner' | 'admin' | 'manager' | 'operator' | 'viewer';
  status: 'active' | 'suspended';
  created_at: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface DeviceOnboardInput {
  id: string;
  name: string;
  productId: 'industrial' | 'cold' | 'home' | 'energy';
  hardwareType: 'esp32' | 'linux_gateway' | 'third_party';
  hardwareSerial: string;
  firmwareVersion?: string;
  locationId?: string | null;
  gatewayId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DeviceProvisioningResult {
  device: Device;
  provisioning: {
    mqtt: {
      brokerUrl: string;
      clientId: string;
      telemetryTopic: string;
      commandsTopic: string;
      shadowGetTopic: string;
      shadowUpdateTopic: string;
    };
  };
}

// ----------------- Devices API Hooks -----------------

export function useDeviceFleet() {
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useQuery({
    queryKey: ['devices-fleet', currentOrgId],
    queryFn: async () => {
      const res = await apiFetch<{ devices: Device[] }>('/v1/devices');
      return res.devices || [];
    },
    refetchInterval: 10000,
  });
}

export function useDeviceDetails(id?: string) {
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useQuery({
    queryKey: ['device-details', currentOrgId, id],
    queryFn: async () => {
      const res = await apiFetch<{ device: Device & { desired?: any; reported?: any; delta?: any; shadow_version?: number } }>(
        `/v1/devices/${id}`
      );
      return res.device;
    },
    enabled: !!id,
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useMutation({
    mutationFn: (data: DeviceOnboardInput) =>
      apiFetch<DeviceProvisioningResult>('/v1/devices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['devices-fleet', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['locations', currentOrgId] });
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DeviceOnboardInput> & { status?: string } }) =>
      apiFetch<{ device: Device }>(`/v1/devices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['devices-fleet', currentOrgId] });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/v1/devices/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['devices-fleet', currentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['locations', currentOrgId] });
    },
  });
}

export function useGateways() {
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useQuery({
    queryKey: ['gateways', currentOrgId],
    queryFn: async () => {
      const res = await apiFetch<{ gateways: Gateway[] }>('/v1/gateways');
      return res.gateways || [];
    },
    staleTime: 30000,
  });
}

// ----------------- Locations API Hooks -----------------

export function useLocations(tree = false) {
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useQuery({
    queryKey: ['locations', currentOrgId, tree],
    queryFn: async () => {
      const res = await apiFetch<{ locations: LocationItem[] }>(`/v1/locations?tree=${tree}`);
      return res.locations || [];
    },
    staleTime: 15000,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useMutation({
    mutationFn: (data: {
      name: string;
      code?: string;
      type: 'site' | 'building' | 'floor' | 'line' | 'room';
      parentId?: string | null;
      address?: Record<string, unknown>;
    }) =>
      apiFetch<{ location: LocationItem }>('/v1/locations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', currentOrgId] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/v1/locations/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations', currentOrgId] });
    },
  });
}

// ----------------- Organization Members API Hooks -----------------

export function useOrgMembers() {
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useQuery({
    queryKey: ['org-members', currentOrgId],
    queryFn: async () => {
      const res = await apiFetch<{ members: OrgMember[] }>(`/v1/organizations/${currentOrgId}/members`);
      return res.members || [];
    },
    staleTime: 15000,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useMutation({
    mutationFn: (data: { email: string; role: string; fullName?: string }) =>
      apiFetch<{ member: OrgMember }>(`/v1/organizations/${currentOrgId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', currentOrgId] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<{ success: boolean; message: string }>(
        `/v1/organizations/${currentOrgId}/members/${userId}`,
        {
          method: 'DELETE',
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', currentOrgId] });
    },
  });
}

