import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Wifi,
  Zap,
  ChevronDown,
  LogOut,
  Check,
  Shield,
  KeyRound,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrgStore, Organization } from '../../stores/orgStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { switchActiveOrganization } from '../../api/auth';

export const Header: React.FC = () => {
  const queryClient = useQueryClient();
  const currentOrg = useOrgStore((s) => s.currentOrg);
  const availableOrgs = useOrgStore((s) => s.availableOrgs);
  const user = useOrgStore((s) => s.user);
  const userRole = useOrgStore((s) => s.userRole);
  const permissions = useOrgStore((s) => s.permissions);
  const setCurrentOrg = useOrgStore((s) => s.setCurrentOrg);
  const logout = useOrgStore((s) => s.logout);

  const status = useTelemetryStore((s) => s.status);
  const latency = useTelemetryStore((s) => s.latencyMs);

  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);

  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target as Node)) {
        setIsOrgMenuOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOrganization = async (org: Organization) => {
    setIsOrgMenuOpen(false);
    if (org.id === currentOrg.id) return;

    setIsSwitchingOrg(true);
    try {
      const res = await switchActiveOrganization(org.id);
      setCurrentOrg(res.activeOrganization, res.accessToken, res.expiresAt);
      queryClient.invalidateQueries();
    } catch {
      setCurrentOrg(org);
      queryClient.invalidateQueries();
    } finally {
      setIsSwitchingOrg(false);
    }
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    queryClient.clear();
    logout();
  };

  const displayName = user?.fullName || 'Rajesh Sharma';
  const displayEmail = user?.email || 'admin@apex.kiot.io';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-30">
      {/* Active Organization Switcher */}
      <div className="flex items-center space-x-4">
        <div className="relative" ref={orgDropdownRef}>
          <button
            type="button"
            onClick={() => setIsOrgMenuOpen((v) => !v)}
            disabled={isSwitchingOrg}
            className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 cursor-pointer transition-colors group"
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <div className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                {currentOrg.name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                TENANT: {currentOrg.id.slice(0, 8)}... ({currentOrg.tier?.toUpperCase() || 'ENTERPRISE'})
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {isOrgMenuOpen && (
            <div className="absolute left-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50">
              <div className="px-3.5 py-1.5 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Organization Workspace ({availableOrgs.length})
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                {availableOrgs.map((org) => {
                  const isSelected = org.id === currentOrg.id;
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => handleSelectOrganization(org)}
                      className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between hover:bg-slate-800/70 transition ${
                        isSelected ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      <div className="pr-2">
                        <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                          <span>{org.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Role: <span className="text-amber-400 uppercase font-bold">{org.role || userRole}</span> • Slug: {org.slug}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/40 px-2.5 py-1 rounded-md border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>
            RBAC Role: <strong className="text-amber-400 uppercase">{userRole}</strong>
          </span>
        </div>
      </div>

      {/* Right Controls: Telemetry Latency & User Profile Menu */}
      <div className="flex items-center space-x-4">
        {/* Real-Time WebSocket Latency Badge */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
          <Wifi className={`w-3.5 h-3.5 ${status === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="text-slate-300 font-medium">Gateway:</span>
          <span className="font-mono text-emerald-400 font-semibold">
            {status === 'CONNECTED' ? `${latency > 0 ? latency : '<1'}ms` : 'Offline'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          <span className="text-[11px] text-amber-400/90 font-mono flex items-center">
            <Zap className="w-3 h-3 mr-0.5 inline" /> Pub/Sub
          </span>
        </div>

        {/* User Badge & Dropdown */}
        <div className="relative pl-2 border-l border-slate-800" ref={userDropdownRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((v) => !v)}
            className="flex items-center space-x-2.5 px-2 py-1 rounded-lg hover:bg-slate-800/70 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-xs text-slate-950 shadow-md">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-200">{displayName}</div>
              <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
                {userRole}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50">
              <div className="px-4 py-2.5 border-b border-slate-800">
                <div className="text-xs font-bold text-white">{displayName}</div>
                <div className="text-[11px] font-mono text-slate-400">{displayEmail}</div>
                <div className="mt-2 flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                    <Shield className="w-3 h-3 mr-1" />
                    {userRole}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {permissions.length} permissions granted
                  </span>
                </div>
              </div>

              <div className="px-4 py-2 border-b border-slate-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center space-x-1">
                  <KeyRound className="w-3 h-3 text-amber-400" />
                  <span>Active RBAC Scopes</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {permissions.slice(0, 10).map((perm) => (
                    <span
                      key={perm}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      {perm}
                    </span>
                  ))}
                  {permissions.length > 10 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-amber-400">
                      +{permissions.length - 10} more
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-1 px-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-2 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/15 flex items-center space-x-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out / Switch Demo Role</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
