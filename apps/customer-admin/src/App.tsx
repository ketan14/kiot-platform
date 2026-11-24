import React, { useState, useEffect } from 'react';
import {
  Building2,
  Cpu,
  FolderTree,
  Users,
  CreditCard,
  FileText,
  Plus,
  Trash2,
  Shield,
  CheckCircle2,
  KeyRound,
  LogOut,
  ChevronDown,
  Check,
  MapPin,
  Lock,
  Mail,
  ArrowRight,
  Package,
  Sliders,
} from 'lucide-react';
import { createKiotApiClient, PortalOrganization, PortalUser } from '@kiot/api-client';
import { PortalSwitcherBar, StatusBadge } from '@kiot/ui';
import { hasPermission, Permission, ROLE_PERMISSIONS } from '@kiot/permissions';
import { OrganizationRole } from '@kiot/shared-types';

const STORAGE_KEY = 'kiot_auth_session_v1';

interface StoredSession {
  accessToken: string;
  expiresAt: string;
  user: PortalUser;
  currentOrg: PortalOrganization;
  availableOrgs: PortalOrganization[];
}

function loadSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

type CustomerAdminTab = 'devices' | 'locations' | 'team' | 'subscriptions' | 'audit';

export const App: React.FC = () => {
  const [session, setSession] = useState<StoredSession | null>(() => loadSession());
  const [activeTab, setActiveTab] = useState<CustomerAdminTab>('subscriptions');
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  // Login states
  const [loginEmail, setLoginEmail] = useState('admin@apex.kiot.io');
  const [loginPassword, setLoginPassword] = useState('kiot12345');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Portal data states
  const [devices, setDevices] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [usage, setUsage] = useState<{ devices: number; users: number; locations: number }>({
    devices: 0,
    users: 0,
    locations: 0,
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  // Forms
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('operator');

  const [newLocName, setNewLocName] = useState('');
  const [newLocCode, setNewLocCode] = useState('');
  const [newLocType, setNewLocType] = useState('site');

  const [newDevId, setNewDevId] = useState('');
  const [newDevName, setNewDevName] = useState('');
  const [newDevProduct, setNewDevProduct] = useState('industrial');
  const [newDevSerial, setNewDevSerial] = useState('');

  const apiClient = createKiotApiClient({
    getAccessToken: () => session?.accessToken || null,
    getOrganizationId: () => session?.currentOrg.id || null,
    onUnauthorized: () => {
      window.localStorage.removeItem(STORAGE_KEY);
      setSession(null);
    },
  });

  const userRole = (session?.currentOrg.role || 'owner') as OrganizationRole;
  const can = (perm: Permission) => hasPermission(userRole, perm);

  const fetchAllTenantData = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const orgId = session.currentOrg.id;
      const [devRes, locRes, memRes, subRes] = await Promise.all([
        apiClient.request<{ devices: any[] }>('/v1/devices'),
        apiClient.request<{ locations: any[] }>('/v1/locations'),
        apiClient.request<{ members: any[] }>(`/v1/organizations/${orgId}/members`),
        apiClient.request<{
          subscriptions: any[];
          catalogue: any[];
          usage: { devices: number; users: number; locations: number };
        }>(`/v1/organizations/${orgId}/subscriptions`),
      ]);
      setDevices(devRes.devices || []);
      setLocations(locRes.locations || []);
      setMembers(memRes.members || []);
      setSubscriptions(subRes.subscriptions || []);
      setCatalogue(subRes.catalogue || []);
      setUsage(subRes.usage || { devices: 0, users: 0, locations: 0 });

      if (hasPermission(userRole, 'audit:read')) {
        const audRes = await apiClient.request<{ auditLogs: any[] }>(
          `/v1/organizations/${orgId}/audit-logs`
        );
        setAuditLogs(audRes.auditLogs || []);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Error loading customer admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      void fetchAllTenantData();
    }
  }, [session?.currentOrg.id, session?.accessToken]);

  const handleLogin = async (emailToUse = loginEmail, passToUse = loginPassword) => {
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      const res = await apiClient.request<{
        accessToken: string;
        expiresAt: string;
        user: PortalUser;
        activeOrganization: PortalOrganization;
        organizations: PortalOrganization[];
      }>('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: emailToUse, password: passToUse }),
      });

      const nextSession: StoredSession = {
        accessToken: res.accessToken,
        expiresAt: res.expiresAt,
        user: res.user,
        currentOrg: res.activeOrganization,
        availableOrgs: res.organizations,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSwitchOrg = async (org: PortalOrganization) => {
    setIsOrgDropdownOpen(false);
    if (!session || org.id === session.currentOrg.id) return;
    try {
      const res = await apiClient.request<{
        accessToken: string;
        expiresAt: string;
        activeOrganization: PortalOrganization;
      }>('/v1/auth/switch-organization', {
        method: 'POST',
        body: JSON.stringify({ organizationId: org.id }),
      });

      const nextSession: StoredSession = {
        ...session,
        accessToken: res.accessToken,
        expiresAt: res.expiresAt,
        currentOrg: res.activeOrganization,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
    } catch {
      const nextSession: StoredSession = { ...session, currentOrg: org };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  const showNotice = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(null), 4000);
  };

  const handleUpdateSubscription = async (productId: string, planTier: string, status = 'active') => {
    if (!session) return;
    await apiClient.request(`/v1/organizations/${session.currentOrg.id}/subscriptions`, {
      method: 'POST',
      body: JSON.stringify({ productId, planTier, status }),
    });
    showNotice(`Updated ${productId.toUpperCase()} subscription to ${planTier.toUpperCase()} tier.`);
    await fetchAllTenantData();
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !inviteEmail) return;
    await apiClient.request(`/v1/organizations/${session.currentOrg.id}/members`, {
      method: 'POST',
      body: JSON.stringify({
        email: inviteEmail,
        fullName: inviteName || undefined,
        role: inviteRole,
      }),
    });
    setInviteEmail('');
    setInviteName('');
    showNotice(`Invited ${inviteEmail} as ${inviteRole.toUpperCase()}.`);
    await fetchAllTenantData();
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName) return;
    await apiClient.request('/v1/locations', {
      method: 'POST',
      body: JSON.stringify({
        name: newLocName,
        code: newLocCode || undefined,
        type: newLocType,
      }),
    });
    setNewLocName('');
    setNewLocCode('');
    showNotice(`Created factory location '${newLocName}'.`);
    await fetchAllTenantData();
  };

  const handleOnboardDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevId || !newDevName || !newDevSerial) return;
    await apiClient.request('/v1/devices', {
      method: 'POST',
      body: JSON.stringify({
        id: newDevId.trim().toUpperCase(),
        name: newDevName.trim(),
        productId: newDevProduct,
        hardwareType: 'esp32',
        hardwareSerial: newDevSerial.trim().toUpperCase(),
      }),
    });
    setNewDevId('');
    setNewDevName('');
    setNewDevSerial('');
    showNotice(`Onboarded device '${newDevId.toUpperCase()}' and initialized Device Shadow.`);
    await fetchAllTenantData();
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-grid-pattern">
        <PortalSwitcherBar activePortal="customer-admin" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-7 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white">KIOT Customer Admin Portal</h1>
                <p className="text-xs text-slate-400">Tenant Subscriptions, Locations, Team & Fleet</p>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Quick Demo Tenant Accounts
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Rajesh (Owner)', email: 'admin@apex.kiot.io', role: 'OWNER' },
                  { label: 'Priya (Manager)', email: 'manager@apex.kiot.io', role: 'MANAGER' },
                ].map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => {
                      setLoginEmail(demo.email);
                      setLoginPassword('kiot12345');
                      void handleLogin(demo.email, 'kiot12345');
                    }}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-left transition"
                  >
                    <div className="text-xs font-bold text-white">{demo.label}</div>
                    <div className="text-[10px] font-mono text-cyan-400">{demo.email}</div>
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleLogin();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-2 transition"
              >
                <span>{isLoggingIn ? 'Signing In...' : 'Sign In to Customer Admin'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-grid-pattern">
      <PortalSwitcherBar activePortal="customer-admin" />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
              <Building2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base text-white">CUSTOMER ADMIN</span>
              </div>
              <p className="text-[11px] text-cyan-400 font-semibold uppercase tracking-wider">
                Tenant Workspace Portal
              </p>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {[
              { id: 'subscriptions', label: 'Products & Subscriptions', icon: CreditCard },
              { id: 'devices', label: 'Device Onboarding & Fleet', icon: Cpu },
              { id: 'locations', label: 'Site & Plant Hierarchy', icon: FolderTree },
              { id: 'team', label: 'Team & RBAC Members', icon: Users },
              { id: 'audit', label: 'Security & Audit Logs', icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as CustomerAdminTab)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Active Role:</span>
              <StatusBadge status={userRole} variant="blue" />
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Granted Scopes:</span>
              <span className="font-mono text-slate-200 font-bold">
                {(ROLE_PERMISSIONS[userRole] || []).length}
              </span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="h-16 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsOrgDropdownOpen((v) => !v)}
                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-left"
              >
                <Building2 className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-white">{session.currentOrg.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Slug: {session.currentOrg.slug}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isOrgDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50">
                  {session.availableOrgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => void handleSwitchOrg(org)}
                      className="w-full px-3.5 py-2 text-left text-xs hover:bg-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white">{org.name}</div>
                        <div className="text-[10px] text-cyan-400 uppercase font-mono">
                          Role: {org.role}
                        </div>
                      </div>
                      {org.id === session.currentOrg.id && (
                        <Check className="w-4 h-4 text-cyan-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white">{session.user.fullName}</div>
                <div className="text-[10px] font-mono text-slate-400">{session.user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </header>

          {/* Body */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              {bannerMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{bannerMsg}</span>
                </div>
              )}

              {/* KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">
                    Active Subscriptions
                  </span>
                  <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
                    {subscriptions.length} / {catalogue.length || 4}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">
                    Provisioned Devices
                  </span>
                  <div className="text-2xl font-black text-white font-mono mt-1">
                    {usage.devices}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">
                    Plant Locations
                  </span>
                  <div className="text-2xl font-black text-white font-mono mt-1">
                    {usage.locations}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">
                    Organization Members
                  </span>
                  <div className="text-2xl font-black text-white font-mono mt-1">
                    {usage.users}
                  </div>
                </div>
              </div>

              {/* TAB 1: SUBSCRIPTIONS & PRODUCT ENTITLEMENTS */}
              {activeTab === 'subscriptions' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      Product Catalogue & Subscription Entitlements
                    </h2>
                    <p className="text-xs text-slate-400">
                      Manage active KIOT product lines (Industrial, Energy, Cold, Home), device quota limits, and plan tiers.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catalogue.map((prod) => {
                      const activeSub = subscriptions.find((s) => s.product_id === prod.id);
                      const canManageBilling = can('billing:manage');

                      return (
                        <div
                          key={prod.id}
                          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2.5">
                                <Package className="w-5 h-5 text-cyan-400" />
                                <span className="font-extrabold text-base text-white">
                                  {prod.name}
                                </span>
                              </div>
                              {activeSub ? (
                                <StatusBadge
                                  status={`${activeSub.status} • ${activeSub.plan_tier}`}
                                  variant="emerald"
                                  pulse
                                />
                              ) : (
                                <StatusBadge status="Not Subscribed" variant="slate" />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">{prod.description}</p>

                            {activeSub && (
                              <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 grid grid-cols-2 gap-2 text-xs font-mono">
                                <div>
                                  <span className="text-slate-500 block text-[10px]">
                                    DEVICE QUOTA
                                  </span>
                                  <span className="text-slate-200 font-bold">
                                    Up to {activeSub.device_limit} Nodes
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block text-[10px]">
                                    SEAT LIMIT
                                  </span>
                                  <span className="text-slate-200 font-bold">
                                    Up to {activeSub.user_limit} Users
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Select Plan Tier:</span>
                            <div className="flex items-center space-x-1.5">
                              {(['starter', 'standard', 'enterprise'] as const).map((tier) => {
                                const isCurrent = activeSub?.plan_tier === tier;
                                return (
                                  <button
                                    key={tier}
                                    disabled={!canManageBilling || isLoading}
                                    onClick={() => void handleUpdateSubscription(prod.id, tier)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition ${
                                      isCurrent
                                        ? 'bg-cyan-500 text-slate-950'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50'
                                    }`}
                                  >
                                    {tier}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: DEVICES */}
              {activeTab === 'devices' && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-extrabold text-white">
                        Tenant Device Registry & Hardware Onboarding
                      </h2>
                      <p className="text-xs text-slate-400">
                        Register ESP32 sensor nodes and industrial gateways with automatic Device Shadow initialization.
                      </p>
                    </div>
                  </div>

                  {can('devices:create') && (
                    <form
                      onSubmit={handleOnboardDevice}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-3"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Device ID (e.g. DEV-ESP32-09)"
                        value={newDevId}
                        onChange={(e) => setNewDevId(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Display Name"
                        value={newDevName}
                        onChange={(e) => setNewDevName(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                      <select
                        value={newDevProduct}
                        onChange={(e) => setNewDevProduct(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      >
                        <option value="industrial">KIOT Industrial</option>
                        <option value="energy">KIOT Energy</option>
                        <option value="cold">KIOT Cold</option>
                        <option value="home">KIOT Home</option>
                      </select>
                      <input
                        type="text"
                        required
                        placeholder="Hardware Serial (SN-...)"
                        value={newDevSerial}
                        onChange={(e) => setNewDevSerial(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Onboard Device</span>
                      </button>
                    </form>
                  )}

                  <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/70 text-slate-400 uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Device ID</th>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Product Domain</th>
                          <th className="py-3 px-4">Serial</th>
                          <th className="py-3 px-4">Firmware</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {devices.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-mono font-bold text-white">{d.id}</td>
                            <td className="py-3 px-4 text-slate-200">{d.name}</td>
                            <td className="py-3 px-4 uppercase font-mono text-cyan-400">
                              {d.product_id}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">
                              {d.hardware_serial}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              v{d.firmware_version}
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge
                                status={d.status}
                                variant={d.status === 'online' ? 'emerald' : 'slate'}
                                pulse={d.status === 'online'}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: LOCATIONS */}
              {activeTab === 'locations' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      Site, Building & Production Line Hierarchy
                    </h2>
                    <p className="text-xs text-slate-400">
                      Organize physical facilities for location-scoped telemetry and access control.
                    </p>
                  </div>

                  {can('locations:manage') && (
                    <form
                      onSubmit={handleCreateLocation}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Location Name (e.g. Chakan Plant 02)"
                        value={newLocName}
                        onChange={(e) => setNewLocName(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Code (e.g. CHK-02)"
                        value={newLocCode}
                        onChange={(e) => setNewLocCode(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                      <select
                        value={newLocType}
                        onChange={(e) => setNewLocType(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      >
                        <option value="site">Site / Plant</option>
                        <option value="building">Building</option>
                        <option value="floor">Floor</option>
                        <option value="line">Production Line</option>
                        <option value="room">Chamber / Room</option>
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Location</span>
                      </button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {locations.map((loc) => (
                      <div
                        key={loc.id}
                        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <MapPin className="w-5 h-5 text-cyan-400 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-white">{loc.name}</div>
                            <div className="text-[10px] font-mono text-slate-400 uppercase">
                              {loc.type} {loc.code ? `• ${loc.code}` : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: TEAM & RBAC */}
              {activeTab === 'team' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      Organization Team & RBAC Memberships
                    </h2>
                    <p className="text-xs text-slate-400">
                      Invite engineers, plant managers, and operators with granular RBAC role assignments.
                    </p>
                  </div>

                  {can('members:manage') && (
                    <form
                      onSubmit={handleInviteMember}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3"
                    >
                      <input
                        type="email"
                        required
                        placeholder="colleague@company.kiot.io"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="operator">Operator</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Invite Member</span>
                      </button>
                    </form>
                  )}

                  <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/70 text-slate-400 uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Full Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">RBAC Role</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {members.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-bold text-white">{m.full_name}</td>
                            <td className="py-3 px-4 font-mono text-slate-400">{m.email}</td>
                            <td className="py-3 px-4">
                              <StatusBadge status={m.role} variant="blue" />
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={m.status} variant="emerald" />
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {new Date(m.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIT LOGS */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      Organization Security & Compliance Audit Trail
                    </h2>
                    <p className="text-xs text-slate-400">
                      Immutable record of authentication events, subscription updates, and configuration changes.
                    </p>
                  </div>

                  {!can('audit:read') ? (
                    <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                      Your role (<strong>{userRole.toUpperCase()}</strong>) does not have{' '}
                      <code>audit:read</code> permission to inspect security audit logs.
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/70 text-slate-400 uppercase border-b border-slate-800">
                          <tr>
                            <th className="py-3 px-4">Timestamp</th>
                            <th className="py-3 px-4">Actor</th>
                            <th className="py-3 px-4">Action</th>
                            <th className="py-3 px-4">Entity</th>
                            <th className="py-3 px-4">Metadata</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/40">
                              <td className="py-3 px-4 text-slate-400">
                                {new Date(log.created_at).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-slate-200">
                                {log.user_email || 'system'}
                              </td>
                              <td className="py-3 px-4 text-cyan-400 font-bold">{log.action}</td>
                              <td className="py-3 px-4 text-slate-300">
                                {log.entity_type} ({log.entity_id?.slice(0, 8)})
                              </td>
                              <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                                {JSON.stringify(log.details)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
export default App;
