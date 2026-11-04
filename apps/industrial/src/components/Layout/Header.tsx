import React from 'react';
import { Building2, Wifi, Zap, User, ChevronDown } from 'lucide-react';
import { useOrgStore } from '../../stores/orgStore';
import { useTelemetryStore } from '../../stores/telemetryStore';

export const Header: React.FC = () => {
  const currentOrg = useOrgStore((s) => s.currentOrg);
  const userRole = useOrgStore((s) => s.userRole);
  const status = useTelemetryStore((s) => s.status);
  const latency = useTelemetryStore((s) => s.latencyMs);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20">
      {/* Active Organization Switcher */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 cursor-pointer transition-colors group">
          <Building2 className="w-4 h-4 text-amber-400" />
          <div className="text-left">
            <div className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
              {currentOrg.name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              TENANT: {currentOrg.id.slice(0, 8)}...
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </div>

        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/40 px-2.5 py-1 rounded-md border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Facility: <strong>Pune Plant 01</strong></span>
        </div>
      </div>

      {/* Right Controls: Telemetry Latency & User Profile */}
      <div className="flex items-center space-x-4">
        {/* Real-Time WebSocket Latency Badge */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
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

        {/* User Badge */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-xs text-slate-950 shadow-md">
            AP
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-200">Admin User</div>
            <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
              {userRole}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

