import { create } from 'zustand';
import { OrganizationRole } from '@kiot/shared-types';
import { Permission, ROLE_PERMISSIONS, hasPermission } from '@kiot/permissions';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: string;
  role?: OrganizationRole;
  permissions?: Permission[];
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
}

interface StoredSession {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
  currentOrg: Organization;
  availableOrgs: Organization[];
}

const STORAGE_KEY = 'kiot_auth_session_v1';

const DEFAULT_ORG: Organization = {
  id: '00000000-0000-4000-a000-000000000001',
  name: 'Apex Precision Manufacturing Ltd.',
  slug: 'apex-manufacturing',
  tier: 'enterprise',
  role: 'owner',
  permissions: ROLE_PERMISSIONS.owner,
};

function loadStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.accessToken || !parsed.user || !parsed.currentOrg) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredSession(session: StoredSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // ignore storage errors
  }
}

const initialSession = loadStoredSession();

interface OrgState {
  isAuthenticated: boolean;
  accessToken: string | null;
  expiresAt: string | null;
  user: AuthUser | null;
  currentOrg: Organization;
  availableOrgs: Organization[];
  userId: string;
  userRole: OrganizationRole;
  permissions: Permission[];
  setSession: (payload: {
    accessToken: string;
    expiresAt: string;
    user: AuthUser;
    activeOrganization: Organization;
    organizations: Organization[];
  }) => void;
  setCurrentOrg: (org: Organization, newAccessToken?: string, newExpiresAt?: string) => void;
  logout: () => void;
  can: (permission: Permission) => boolean;
}

export const useOrgStore = create<OrgState>((set, get) => ({
  isAuthenticated: !!initialSession,
  accessToken: initialSession?.accessToken || null,
  expiresAt: initialSession?.expiresAt || null,
  user: initialSession?.user || null,
  currentOrg: initialSession?.currentOrg || DEFAULT_ORG,
  availableOrgs: initialSession?.availableOrgs || [DEFAULT_ORG],
  userId: initialSession?.user.id || '00000000-0000-4000-b000-000000000001',
  userRole: (initialSession?.currentOrg.role || 'owner') as OrganizationRole,
  permissions:
    initialSession?.currentOrg.permissions ||
    ROLE_PERMISSIONS[(initialSession?.currentOrg.role || 'owner') as OrganizationRole],

  setSession: ({ accessToken, expiresAt, user, activeOrganization, organizations }) => {
    const role = (activeOrganization.role || 'viewer') as OrganizationRole;
    const permissions = activeOrganization.permissions || ROLE_PERMISSIONS[role] || [];
    const normalizedOrg: Organization = {
      ...activeOrganization,
      role,
      permissions,
    };

    const sessionToSave: StoredSession = {
      accessToken,
      expiresAt,
      user,
      currentOrg: normalizedOrg,
      availableOrgs: organizations,
    };
    saveStoredSession(sessionToSave);

    set({
      isAuthenticated: true,
      accessToken,
      expiresAt,
      user,
      currentOrg: normalizedOrg,
      availableOrgs: organizations,
      userId: user.id,
      userRole: role,
      permissions,
    });
  },

  setCurrentOrg: (org, newAccessToken, newExpiresAt) => {
    const state = get();
    const role = (org.role || state.userRole || 'viewer') as OrganizationRole;
    const permissions = org.permissions || ROLE_PERMISSIONS[role] || [];
    const normalizedOrg: Organization = {
      ...org,
      role,
      permissions,
    };
    const accessToken = newAccessToken || state.accessToken;
    const expiresAt = newExpiresAt || state.expiresAt;

    if (state.user && accessToken && expiresAt) {
      saveStoredSession({
        accessToken,
        expiresAt,
        user: state.user,
        currentOrg: normalizedOrg,
        availableOrgs: state.availableOrgs,
      });
    }

    set({
      currentOrg: normalizedOrg,
      userRole: role,
      permissions,
      ...(newAccessToken ? { accessToken: newAccessToken } : {}),
      ...(newExpiresAt ? { expiresAt: newExpiresAt } : {}),
    });
  },

  logout: () => {
    saveStoredSession(null);
    set({
      isAuthenticated: false,
      accessToken: null,
      expiresAt: null,
      user: null,
      currentOrg: DEFAULT_ORG,
      availableOrgs: [DEFAULT_ORG],
      userId: '00000000-0000-4000-b000-000000000001',
      userRole: 'owner',
      permissions: ROLE_PERMISSIONS.owner,
    });
  },

  can: (permission: Permission) => {
    const role = get().userRole;
    return hasPermission(role, permission);
  },
}));
