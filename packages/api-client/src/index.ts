import { OrganizationRole, ProductType } from '@kiot/shared-types';
import { Permission } from '@kiot/permissions';

export interface ApiClientConfig {
  baseUrl?: string;
  getAccessToken?: () => string | null;
  getOrganizationId?: () => string | null;
  onUnauthorized?: () => void;
}

export interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export interface PortalOrganization {
  id: string;
  name: string;
  slug: string;
  tier: string;
  role: OrganizationRole;
  permissions: Permission[];
}

export interface PortalUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface AuthLoginResponse {
  accessToken: string;
  expiresAt: string;
  expiresIn: number;
  user: PortalUser;
  activeOrganization: PortalOrganization;
  organizations: PortalOrganization[];
}

export interface FirmwareReleaseItem {
  id: string;
  version: string;
  hardware_type: string;
  product_id: ProductType;
  release_notes: string | null;
  checksum_sha256: string;
  binary_size_bytes: number;
  is_stable: boolean;
  is_mandatory: boolean;
  rollout_percentage: number;
  released_at: string;
  created_at: string;
}

export interface PlatformOverviewMetrics {
  totals: {
    organizations: number;
    activeOrganizations: number;
    users: number;
    devices: number;
    onlineDevices: number;
    gateways: number;
    openIncidents: number;
    firmwareReleases: number;
    subscriptions: number;
  };
  recentAuditLogs: Array<{
    id: string;
    organization_id: string | null;
    organization_name: string | null;
    user_id: string | null;
    user_email: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: Record<string, unknown>;
    created_at: string;
  }>;
}

export class KiotApiClient {
  private readonly config: ApiClientConfig;

  constructor(config: ApiClientConfig = {}) {
    this.config = config;
  }

  public async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { params, headers, ...customConfig } = options;
    const baseUrl = this.config.baseUrl ?? '';

    let url = `${baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined) {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.config.getAccessToken?.();
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    const orgId = this.config.getOrganizationId?.();
    if (orgId) {
      reqHeaders['X-KIOT-Organization-Id'] = orgId;
    }

    const response = await fetch(url, {
      ...customConfig,
      headers: {
        ...reqHeaders,
        ...(headers as Record<string, string>),
      },
    });

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/v1/auth/')) {
        this.config.onUnauthorized?.();
      }
      let errorDetail = 'API request failed';
      try {
        const errJson = await response.json();
        errorDetail = errJson.message || errJson.error || JSON.stringify(errJson);
      } catch {
        errorDetail = `HTTP ${response.status} ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }

    return response.json() as Promise<T>;
  }
}

export function createKiotApiClient(config?: ApiClientConfig): KiotApiClient {
  return new KiotApiClient(config);
}
