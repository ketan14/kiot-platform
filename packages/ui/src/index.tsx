import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Radio,
  Shield,
  Building2,
  Cpu,
  Snowflake,
  Zap,
  Home,
  ExternalLink,
} from 'lucide-react';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type PortalId =
  | 'industrial'
  | 'cold'
  | 'energy'
  | 'home'
  | 'customer-admin'
  | 'platform-admin';

export interface PortalLinkItem {
  id: PortalId;
  name: string;
  subtitle: string;
  devPort: number;
  proxyPath: string;
  accentColor: string;
}

export const KIOT_PORTALS: PortalLinkItem[] = [
  {
    id: 'industrial',
    name: 'KIOT Industrial',
    subtitle: 'Factory Telemetry & CNC Control',
    devPort: 5175,
    proxyPath: '/',
    accentColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  },
  {
    id: 'cold',
    name: 'KIOT Cold',
    subtitle: 'Cold-Chain & HACCP Compliance',
    devPort: 5177,
    proxyPath: '/cold/',
    accentColor: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
  },
  {
    id: 'energy',
    name: 'KIOT Energy',
    subtitle: '3-Phase Grid & Tariff Analytics',
    devPort: 5178,
    proxyPath: '/energy/',
    accentColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  },
  {
    id: 'home',
    name: 'KIOT Home',
    subtitle: 'Smart Relays & Automation Scenes',
    devPort: 5179,
    proxyPath: '/home/',
    accentColor: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
  },
  {
    id: 'customer-admin',
    name: 'Customer Admin',
    subtitle: 'Tenant Fleet, Team & Billing',
    devPort: 5174,
    proxyPath: '/customer-admin/',
    accentColor: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  },
  {
    id: 'platform-admin',
    name: 'Platform Admin',
    subtitle: 'Global Tenants, Plans & OTA Firmware',
    devPort: 5176,
    proxyPath: '/platform-admin/',
    accentColor: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  },
];

export function resolvePortalUrl(portal: PortalLinkItem): string {
  if (typeof window === 'undefined') return portal.proxyPath;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${portal.devPort}/`;
}

export interface PortalSwitcherBarProps {
  activePortal: PortalId;
}

export const PortalSwitcherBar: React.FC<PortalSwitcherBarProps> = ({ activePortal }) => {
  return (
    <div className="bg-slate-950 border-b border-slate-800/80 px-4 sm:px-6 py-1.5 flex items-center justify-between text-xs select-none z-40 overflow-x-auto">
      <div className="flex items-center space-x-2 shrink-0 mr-4">
        <Radio className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-bold text-slate-300 tracking-wide text-[11px] uppercase">
          KIOT Multi-Product Suite
        </span>
      </div>

      <div className="flex items-center space-x-1.5 shrink-0">
        {KIOT_PORTALS.map((portal) => {
          const isCurrent = portal.id === activePortal;
          const Icon =
            portal.id === 'industrial'
              ? Cpu
              : portal.id === 'cold'
                ? Snowflake
                : portal.id === 'energy'
                  ? Zap
                  : portal.id === 'home'
                    ? Home
                    : portal.id === 'customer-admin'
                      ? Building2
                      : Shield;

          return (
            <a
              key={portal.id}
              href={resolvePortalUrl(portal)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1.5 transition border',
                isCurrent
                  ? portal.accentColor
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900'
              )}
            >
              <Icon className="w-3 h-3" />
              <span>{portal.name}</span>
              {!isCurrent && <ExternalLink className="w-2.5 h-2.5 opacity-60" />}
            </a>
          );
        })}
      </div>
    </div>
  );
};

export interface StatusBadgeProps {
  status: string;
  variant?: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple' | 'slate';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'emerald',
  pulse = false,
}) => {
  const styles: Record<NonNullable<StatusBadgeProps['variant']>, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    rose: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    slate: 'bg-slate-800 text-slate-400 border-slate-700',
  };

  const dotColors: Record<NonNullable<StatusBadgeProps['variant']>, string> = {
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    blue: 'bg-blue-400',
    purple: 'bg-purple-400',
    slate: 'bg-slate-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
        styles[variant]
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          dotColors[variant],
          pulse && 'animate-pulse'
        )}
      />
      {status}
    </span>
  );
};
