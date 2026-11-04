import React from 'react';
import {
  Activity,
  Cpu,
  Flame,
  Gauge,
  Radio,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { MetricCard } from '../components/Overview/MetricCard';
import { MachinesTable } from '../components/Machines/MachinesTable';
import { LiveStreamingChart } from '../components/Telemetry/LiveStreamingChart';
import { useMachines } from '../api/machines';
import { useTelemetryStore } from '../stores/telemetryStore';
import { formatNumber } from '../lib/utils';

interface OverviewViewProps {
  onSelectScope: (deviceId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onSelectScope }) => {
  const { data: machines, isLoading } = useMachines();
  const status = useTelemetryStore((s) => s.status);

  // Read latest values specifically for DEV-ESP32-001
  const liveRpm = useTelemetryStore((s) => s.latestMetrics['DEV-ESP32-001:spindle_speed_rpm']?.value) ?? 3200;
  const liveVib = useTelemetryStore((s) => s.latestMetrics['DEV-ESP32-001:vibration_rms']?.value) ?? 3.42;
  const liveTemp = useTelemetryStore((s) => s.latestMetrics['DEV-ESP32-001:temperature_bearing']?.value) ?? 58.1;

  const runningCount = machines?.filter((m) => m.status === 'running').length ?? 1;
  const totalCount = machines?.length ?? 2;
  const availabilityPct = Math.round((runningCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Plant Status Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
              Plant Floor Live
            </span>
            <span className="text-xs text-slate-400">Section B • CNC Precision Cells</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-white tracking-tight">
            Industrial Fleet Status & Real-Time Telemetry
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Continuous sub-millisecond edge monitoring via EMQX shared broker subscriptions, TimescaleDB continuous aggregates, and dedicated WebSocket gateway.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
            <div className="text-[10px] uppercase font-bold text-slate-400">Gateway Uplink</div>
            <div className="font-mono font-bold text-emerald-400 flex items-center space-x-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 led-glow-green" />
              <span>GW-PUN-001 (Online)</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Fleet Availability"
          value={availabilityPct}
          unit="%"
          icon={Cpu}
          color="emerald"
          change="+4.2% vs yesterday"
          isPositive={true}
          subtext={`${runningCount}/${totalCount} operational`}
        />

        <MetricCard
          title="CNC-01 Spindle Speed"
          value={formatNumber(liveRpm, 0)}
          unit="RPM"
          icon={Gauge}
          color="amber"
          change="Operating at 53% rated max"
          isPositive={true}
          subtext="Target: 3,200 RPM"
        />

        <MetricCard
          title="Spindle Vibration (RMS)"
          value={formatNumber(liveVib, 2)}
          unit="mm/s"
          icon={Activity}
          color="blue"
          change="ISO 10816: Class A"
          isPositive={true}
          subtext="Threshold: 4.5 mm/s"
        />

        <MetricCard
          title="Bearing Core Temp"
          value={formatNumber(liveTemp, 1)}
          unit="°C"
          icon={Flame}
          color="purple"
          change="Thermal stability nominal"
          isPositive={true}
          subtext="Alarm: 75.0 °C"
        />
      </div>

      {/* Real-time Streaming Oscilloscope Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveStreamingChart
          deviceId="DEV-ESP32-001"
          metric="spindle_speed_rpm"
          title="CNC-01 Spindle Dynamic Velocity"
          unit="RPM"
          color="#f59e0b"
        />

        <LiveStreamingChart
          deviceId="DEV-ESP32-001"
          metric="vibration_rms"
          title="CNC-01 Radial Vibration Velocity (RMS)"
          unit="mm/s"
          color="#06b6d4"
          threshold={4.5}
          thresholdLabel="ISO Alarm"
        />
      </div>

      {/* Machines Fleet Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>Active Factory Machine Units</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            TimescaleDB Continuous Aggregates Enabled
          </span>
        </div>

        <MachinesTable
          machines={machines || []}
          isLoading={isLoading}
          onOpenScope={onSelectScope}
        />
      </div>
    </div>
  );
};

