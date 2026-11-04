export type LocationType = 'site' | 'building' | 'floor' | 'line' | 'room';

export interface Location {
  id: string;
  organizationId: string;
  parentId?: string | null;
  name: string;
  code?: string | null;
  type: LocationType;
  address?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  children?: Location[];
}

export interface CreateLocationInput {
  name: string;
  code?: string;
  type?: LocationType;
  parentId?: string | null;
  address?: Record<string, unknown>;
}

export interface UpdateLocationInput {
  name?: string;
  code?: string | null;
  type?: LocationType;
  parentId?: string | null;
  address?: Record<string, unknown> | null;
}

