import { OrganizationRole, PlatformRole } from '@kiot/shared-types';

export type Permission =
  | 'org:read'
  | 'org:update'
  | 'org:delete'
  | 'members:read'
  | 'members:manage'
  | 'locations:read'
  | 'locations:manage'
  | 'products:read'
  | 'products:activate'
  | 'devices:read'
  | 'devices:create'
  | 'devices:update'
  | 'devices:delete'
  | 'commands:read'
  | 'commands:write'
  | 'telemetry:read'
  | 'alerts:read'
  | 'alerts:manage'
  | 'billing:read'
  | 'billing:manage'
  | 'audit:read';

export const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  owner: [
    'org:read',
    'org:update',
    'org:delete',
    'members:read',
    'members:manage',
    'locations:read',
    'locations:manage',
    'products:read',
    'products:activate',
    'devices:read',
    'devices:create',
    'devices:update',
    'devices:delete',
    'commands:read',
    'commands:write',
    'telemetry:read',
    'alerts:read',
    'alerts:manage',
    'billing:read',
    'billing:manage',
    'audit:read',
  ],
  admin: [
    'org:read',
    'org:update',
    'members:read',
    'members:manage',
    'locations:read',
    'locations:manage',
    'products:read',
    'products:activate',
    'devices:read',
    'devices:create',
    'devices:update',
    'devices:delete',
    'commands:read',
    'commands:write',
    'telemetry:read',
    'alerts:read',
    'alerts:manage',
    'billing:read',
    'audit:read',
  ],
  manager: [
    'org:read',
    'members:read',
    'locations:read',
    'products:read',
    'devices:read',
    'devices:create',
    'devices:update',
    'commands:read',
    'commands:write',
    'telemetry:read',
    'alerts:read',
    'alerts:manage',
  ],
  operator: [
    'org:read',
    'locations:read',
    'products:read',
    'devices:read',
    'commands:read',
    'commands:write',
    'telemetry:read',
    'alerts:read',
    'alerts:manage',
  ],
  viewer: [
    'org:read',
    'locations:read',
    'products:read',
    'devices:read',
    'commands:read',
    'telemetry:read',
    'alerts:read',
  ],
};

export function hasPermission(role: OrganizationRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

