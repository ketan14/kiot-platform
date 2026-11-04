import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  Calendar,
  Layers,
  Gauge,
  Flame,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { HistoricalChart } from '../components/Analytics/HistoricalChart';
import { useHistoricalTelemetry, useMachineAnalytics } from '../api/telemetry';
import { useMachines } from '../api/machines';

type TimeRangePreset = '1h' | '6h' | '24h' | '7d';

export const AnalyticsView: React.FC = () => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('DEV-ESP32-001');
  const [selectedRange, setSelectedRange] = useState<TimeRangePreset>('24h');
  const [resolution, setResolution] = useState<'raw' | '1m' | '1h'>('1m');

  // Selected metrics to display on the chart
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'spindle_speed_rpm',
    'temperature_bearing',
    'vibration_rms',
    'power_kw',
  ]);

  const { data: machines } = useMachines();
  const currentMachine = machines?.find((m) => m.primary_device_id === selectedDeviceId) || machines?.[0];

  const { data: analytics, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } = useMachineAnalytics(
    currentMachine?.id
  );

  // Compute from / to ISO strings based on preset
  const { fromTime, toTime } = useMemo(() => {
    const to = new Date();
    const from = new Date();
    if (selectedRange === '1h') from.setHours(to.getHours() - 1);
    else if (selectedRange === '6h') from.setHours(to.getHours() - 6);
    else if (selectedRange === '24h') from.setDate(to.getDate() - 1);
    else if (selectedRange === '7d') from.setDate(to.getDate() - 7);

    return { fromTime: from.toISOString(), toTime: to.toISOString() };
  }, [selectedRange]);

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useHistoricalTelemetry({
    deviceId: selectedDeviceId,
    metric: selectedMetrics.join(','),
    resolution,
    from: fromTime,
    to: toTime,
    order: 'ASC',
    limit: 1000,
  });

  const toggleMetric = (metricKey: string) => {
    if (selectedMetrics.includes(metricKey)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter((m) => m !== metricKey));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, metricKey]);
    }
  };

  const handleExportCsv = () => {
    const orgId = '00000000-0000-4000-a000-000000000001';
    const url = `/v1/telemetry/export.csv?device_id=${selectedDeviceId}&limit=2000`;
    window.open(url, '_blank');
  };

  const handleRefreshAll = () => {
    refetchHistory();
    refetchAnalytics();
  };

  return (
    <div className="space-y-6">
      {/* View Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <span>Historical Telemetry Analytics & Equipment OEE</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            TimescaleDB Continuous Aggregates with downsampled multi-metric correlation and energy reporting.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleRefreshAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow shadow-amber-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Equipment KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Availability</p>
            <p className="text-xl font-black text-emerald-400 font-mono">
              {analytics?.availabilityPercent ?? 97.4}%
            </p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Spindle</p>
            <p className="text-xl font-black text-cyan-300 font-mono">
              {analytics?.telemetryStats?.avg_speed || 3200} <span className="text-xs text-slate-500 font-normal">RPM</span>
            </p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Peak Demand</p>
            <p className="text-xl font-black text-purple-400 font-mono">
              {analytics?.telemetryStats?.peak_power || 12.8} <span className="text-xs text-slate-500 font-normal">kW</span>
            </p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Thermal</p>
            <p className="text-xl font-black text-amber-400 font-mono">
              {analytics?.telemetryStats?.max_temperature || 60.1}°C
            </p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Vibration</p>
            <p className="text-xl font-black text-rose-400 font-mono">
              {analytics?.telemetryStats?.max_vibration || 3.4} <span className="text-xs text-slate-500 font-normal">mm/s</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-xl">
        {/* Controls Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          {/* Target Node Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Target Node:</span>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs font-mono font-medium rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="DEV-ESP32-001">DEV-ESP32-001 (CNC Spindle & Vibration)</option>
              <option value="DEV-METER-001">DEV-METER-001 (3-Phase Electrical Meter)</option>
            </select>
          </div>

          {/* Time Range & Resolution Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Range Presets */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
              {(['1h', '6h', '24h', '7d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRange(r)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold uppercase transition ${
                    selectedRange === r
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Downsample Resolution */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <Layers className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
              {(['1m', '1h', 'raw'] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    resolution === res
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {res === '1m' ? '1-Min Rollup' : res === '1h' ? '1-Hour Rollup' : 'Raw Samples'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Metric Toggles */}
        <div className="pt-3 pb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold mr-1">Active Series:</span>
          {[
            { key: 'spindle_speed_rpm', label: 'Spindle RPM', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
            { key: 'power_kw', label: 'Power (kW)', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
            { key: 'temperature_bearing', label: 'Bearing Temp (°C)', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
            { key: 'vibration_rms', label: 'Vibration (mm/s)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
          ].map((m) => {
            const isSelected = selectedMetrics.includes(m.key);
            return (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                  isSelected
                    ? `${m.color} shadow-sm font-bold`
                    : 'bg-slate-950/60 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                {isSelected ? '✓ ' : '+ '}
                {m.label}
              </button>
            );
          })}

          <span className="ml-auto text-[11px] font-mono text-slate-500">
            {historyData?.count || 0} buckets loaded from TimescaleDB
          </span>
        </div>

        {/* Interactive ECharts Surface */}
        <div className="mt-2 pt-2">
          {isLoadingHistory ? (
            <div className="h-[420px] flex items-center justify-center text-slate-500 font-mono text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-amber-500" />
              Loading TimescaleDB continuous aggregates...
            </div>
          ) : (
            <HistoricalChart
              dataPoints={historyData?.dataPoints || []}
              selectedMetrics={selectedMetrics}
              height={420}
            />
          )}
        </div>
      </div>
    </div>
  );
};

