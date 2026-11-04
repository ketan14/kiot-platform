export type PlatformRole = 'super_admin' | 'platform_admin';

export type OrganizationRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'operator'
  | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  createdAt: string;
}

