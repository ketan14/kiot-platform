import React from 'react';

interface MachineStatusBadgeProps {
  status: 'running' | 'idle' | 'stopped' | 'maintenance' | 'error' | string;
}

export const MachineStatusBadge: React.FC<MachineStatusBadgeProps> = ({ status }) => {
  const configs = {
    running: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-400',
      glow: 'led-glow-green',
      label: 'RUNNING / MILLING',
    },
    idle: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-400',
      glow: 'led-glow-amber',
      label: 'IDLE / STANDBY',
    },
    stopped: {
      bg: 'bg-slate-700/30',
      text: 'text-slate-400',
      border: 'border-slate-700/50',
      dot: 'bg-slate-400',
      glow: '',
      label: 'STOPPED',
    },
    maintenance: {
      bg: 'bg-cyan-500/15',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      dot: 'bg-cyan-400',
      glow: 'led-glow-cyan',
      label: 'MAINTENANCE',
    },
    error: {
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-400',
      glow: 'led-glow-red',
      label: 'ALARM / FAULT',
    },
  }[status.toLowerCase()] || {
    bg: 'bg-slate-700/30',
    text: 'text-slate-400',
    border: 'border-slate-700/50',
    dot: 'bg-slate-400',
    glow: '',
    label: status.toUpperCase(),
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border tracking-wide ${configs.bg} ${configs.text} ${configs.border}`}
    >
      <span className={`w-2 h-2 rounded-full mr-2 ${configs.dot} ${configs.glow}`} />
      {configs.label}
    </span>
  );
};

