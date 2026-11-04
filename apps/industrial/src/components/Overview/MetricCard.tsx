import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  color?: 'amber' | 'emerald' | 'blue' | 'purple';
  subtext?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  change,
  isPositive,
  icon: Icon,
  color = 'amber',
  subtext,
}) => {
  const colorStyles = {
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-300',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300',
    },
    blue: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      text: 'text-cyan-400',
      badge: 'bg-cyan-500/20 text-cyan-300',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-400',
      badge: 'bg-purple-500/20 text-purple-300',
    },
  }[color];

  return (
    <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 shadow-md hover:border-slate-700 transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${colorStyles.bg} ${colorStyles.text} border ${colorStyles.border}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline space-x-1.5">
        <span className="text-2xl font-extrabold text-white font-mono tracking-tight">
          {value}
        </span>
        {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {change && (
          <span
            className={`font-semibold ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {change}
          </span>
        )}
        {subtext && <span className="text-[11px] text-slate-500">{subtext}</span>}
      </div>
    </div>
  );
};

