import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Activity,
  Sliders,
  History,
  ShieldCheck,
  Radio,
  Server,
  Bell,
  TrendingUp,
} from 'lucide-react';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useIncidents } from '../../api/alerts';

export type NavTab = 'overview' | 'machines' | 'scope' | 'commands' | 'alerts' | 'analytics';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const status = useTelemetryStore((s) => s.status);
  const packets = useTelemetryStore((s) => s.packetsReceived);
  const { data: openIncidents } = useIncidents('OPEN');
  const openCount = openIncidents?.length || 0;

  const navItems = [
    { id: 'overview', label: 'Fleet Overview', icon: LayoutDashboard },
    { id: 'machines', label: 'CNC & Machines', icon: Cpu },
    { id: 'scope', label: 'Telemetry Scope', icon: Activity },
    { id: 'analytics', label: 'Historical Analytics', icon: TrendingUp },
    { id: 'commands', label: 'Actuators & Control', icon: Sliders },
    { id: 'alerts', label: 'Alerts & Incidents', icon: Bell },
  ] as const;

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Radio className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">KIOT</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">
              Industrial IIoT
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-5 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Manufacturing Floor
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.id === 'alerts' && openCount > 0 && (
                <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {openCount}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Infrastructure
        </div>
        <div className="px-3 py-2 text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span>EMQX Broker</span>
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">1883/TLS</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>RLS Multi-Tenancy</span>
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">Strict</span>
          </div>
        </div>
      </div>

      {/* Live Pipeline Status Pill in Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px] font-medium">Real-Time Bus</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                status === 'CONNECTED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : status === 'CONNECTING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  status === 'CONNECTED'
                    ? 'bg-emerald-400 animate-pulse'
                    : status === 'CONNECTING'
                      ? 'bg-amber-400 animate-spin'
                      : 'bg-rose-400'
                }`}
              />
              {status}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Packets Processed:</span>
            <span className="font-mono text-slate-200 font-semibold">{packets.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

