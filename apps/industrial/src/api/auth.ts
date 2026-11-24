import { apiFetch } from './client';
import { AuthUser, Organization } from '../stores/orgStore';

export interface AuthSessionResponse {
  accessToken: string;
  expiresAt: string;
  expiresIn: number;
  user: AuthUser;
  activeOrganization: Organization;
  organizations: Organization[];
}

export async function loginWithEmail(email: string, password: string): Promise<AuthSessionResponse> {
  return apiFetch<AuthSessionResponse>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerAccount(input: {
  fullName: string;
  email: string;
  password: string;
  organizationName?: string;
}): Promise<AuthSessionResponse> {
  return apiFetch<AuthSessionResponse>('/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function switchActiveOrganization(organizationId: string): Promise<{
  accessToken: string;
  expiresAt: string;
  expiresIn: number;
  activeOrganization: Organization;
}> {
  return apiFetch('/v1/auth/switch-organization', {
    method: 'POST',
    body: JSON.stringify({ organizationId }),
  });
}

export async function fetchCurrentUser(): Promise<{
  user: AuthUser;
  activeOrganization: Organization | null;
  organizations: Organization[];
}> {
  return apiFetch('/v1/auth/me');
}
