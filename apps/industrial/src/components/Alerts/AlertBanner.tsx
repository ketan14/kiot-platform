import React from 'react';
import { AlertTriangle, ShieldAlert, X, CheckCircle, ArrowRight } from 'lucide-react';
import { useAlertStore } from '../../stores/alertStore';
import { useAcknowledgeIncident } from '../../api/alerts';

interface AlertBannerProps {
  onNavigateToAlerts?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ onNavigateToAlerts }) => {
  const activeAlarm = useAlertStore((s) => s.activeAlarm);
  const isDismissed = useAlertStore((s) => s.isDismissed);
  const dismissAlarm = useAlertStore((s) => s.dismissAlarm);
  const acknowledgeMutation = useAcknowledgeIncident();

  if (!activeAlarm || isDismissed) {
    return null;
  }

  const isCritical = activeAlarm.severity === 'CRITICAL';

  const handleAcknowledge = async () => {
    try {
      await acknowledgeMutation.mutateAsync(activeAlarm.id);
      dismissAlarm();
    } catch (err) {
      console.error('Failed to acknowledge alarm:', err);
    }
  };

  return (
    <div
      className={`relative z-20 border-b px-4 py-2.5 flex items-center justify-between transition-all duration-300 animate-pulse-subtle ${
        isCritical
          ? 'bg-rose-950/90 border-rose-500/50 text-rose-100'
          : 'bg-amber-950/90 border-amber-500/50 text-amber-100'
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isCritical ? 'bg-rose-600 text-white animate-bounce' : 'bg-amber-500 text-slate-950'
          }`}
        >
          {isCritical ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        </div>

        <div className="flex items-center space-x-2 truncate">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
              isCritical
                ? 'bg-rose-500 text-white font-mono'
                : 'bg-amber-400 text-slate-950 font-mono'
            }`}
          >
            {activeAlarm.severity} ALARM
          </span>
          <span className="font-semibold text-xs text-white truncate">
            {activeAlarm.title}:
          </span>
          <span className="text-xs text-slate-200 truncate hidden sm:inline">
            {activeAlarm.message}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0 ml-4">
        {onNavigateToAlerts && (
          <button
            onClick={onNavigateToAlerts}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <span>Details</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}

        <button
          onClick={handleAcknowledge}
          disabled={acknowledgeMutation.isPending}
          className={`flex items-center space-x-1 px-3 py-1 text-xs font-bold rounded shadow transition ${
            isCritical
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-900/40'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{acknowledgeMutation.isPending ? 'Saving...' : 'Acknowledge'}</span>
        </button>

        <button
          onClick={dismissAlarm}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/50 transition"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

