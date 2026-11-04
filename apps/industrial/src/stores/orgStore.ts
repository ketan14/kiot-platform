import { create } from 'zustand';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: string;
}

interface OrgState {
  currentOrg: Organization;
  availableOrgs: Organization[];
  userId: string;
  userRole: string;
  setCurrentOrg: (org: Organization) => void;
}

export const useOrgStore = create<OrgState>((set) => ({
  currentOrg: {
    id: '00000000-0000-4000-a000-000000000001',
    name: 'Apex Precision Manufacturing Ltd.',
    slug: 'apex-manufacturing',
    tier: 'enterprise',
  },
  availableOrgs: [
    {
      id: '00000000-0000-4000-a000-000000000001',
      name: 'Apex Precision Manufacturing Ltd.',
      slug: 'apex-manufacturing',
      tier: 'enterprise',
    },
  ],
  userId: '00000000-0000-4000-b000-000000000001',
  userRole: 'owner',
  setCurrentOrg: (org) => set({ currentOrg: org }),
}));

