import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { Activity, Flame, Gauge, Zap } from 'lucide-react';
import { formatNumber } from '../../lib/utils';

interface LiveStreamingChartProps {
  deviceId: string;
  metric: string;
  title: string;
  unit: string;
  color?: string;
  threshold?: number;
  thresholdLabel?: string;
}

const EMPTY_STREAM: Array<{ time: string; value: number; unit: string }> = [];

export const LiveStreamingChart: React.FC<LiveStreamingChartProps> = ({
  deviceId,
  metric,
  title,
  unit,
  color = '#f59e0b',
  threshold,
  thresholdLabel,
}) => {
  const streamKey = `${deviceId}:${metric}`;
  const rawStream = useTelemetryStore((s) => s.metricStreams[streamKey]);
  const stream = rawStream ?? EMPTY_STREAM;
  const latestMetric = useTelemetryStore((s) => s.latestMetrics[streamKey]);

  // Compute stats: current, min, max, avg
  const stats = useMemo(() => {
    if (stream.length === 0) {
      return {
        current: latestMetric?.value ?? null,
        min: null,
        max: null,
        avg: null,
      };
    }
    const values = stream.map((s) => s.value);
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      current: values[values.length - 1],
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
    };
  }, [stream, latestMetric]);

  // ECharts Configuration
  const option = useMemo(() => {
    const times = stream.map((s) => {
      const d = new Date(s.time);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });
    const values = stream.map((s) => s.value);

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 300,
      grid: {
        top: 25,
        left: 45,
        right: 25,
        bottom: 30,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12, fontFamily: 'var(--font-mono)' },
        formatter: (params: any) => {
          if (!params || !params[0]) return '';
          const p = params[0];
          return `<div class="font-mono text-xs">
            <span class="text-slate-400">${p.name}</span><br/>
            <span style="color:${color}; font-weight:bold">${title}:</span> 
            <strong>${formatNumber(p.value, 2)} ${unit}</strong>
          </div>`;
        },
      },
      xAxis: {
        type: 'category',
        data: times.length > 0 ? times : ['--:--:--'],
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10, fontFamily: 'var(--font-mono)' },
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitLine: { lineStyle: { color: 'rgba(51, 65, 85, 0.4)', type: 'dashed' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          formatter: (v: number) => `${v}`,
        },
      },
      series: [
        {
          name: title,
          type: 'line',
          smooth: 0.25,
          showSymbol: false,
          data: values.length > 0 ? values : [0],
          itemStyle: { color },
          lineStyle: { width: 2.5, color },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${color}40` },
                { offset: 1, color: `${color}00` },
              ],
            },
          },
          markLine: threshold
            ? {
                silent: true,
                lineStyle: { color: '#ef4444', type: 'dashed', width: 1.5 },
                label: {
                  show: true,
                  formatter: `${thresholdLabel || 'Limit'}: ${threshold} ${unit}`,
                  color: '#f87171',
                  fontSize: 10,
                  position: 'insideEndTop',
                },
                data: [{ yAxis: threshold }],
              }
            : undefined,
        },
      ],
    };
  }, [stream, color, title, unit, threshold, thresholdLabel]);

  return (
    <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col justify-between">
      {/* Header with Title and Live Indicator */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div
            className="w-2.5 h-2.5 rounded-full animate-ping"
            style={{ backgroundColor: color }}
          />
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            {title}
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">({unit})</span>
        </div>

        {/* Live metric value */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <span
              className="text-xl font-extrabold font-mono"
              style={{ color }}
            >
              {formatNumber(stats.current, 2)}
            </span>
            <span className="ml-1 text-xs text-slate-400 font-medium">{unit}</span>
          </div>
        </div>
      </div>

      {/* Mini Stats Ribbon */}
      <div className="grid grid-cols-3 gap-2 py-3 text-center border-b border-slate-800/50">
        <div className="px-2 py-1 rounded bg-slate-800/40">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Min</div>
          <div className="text-xs font-mono font-bold text-slate-200">
            {formatNumber(stats.min, 1)} {unit}
          </div>
        </div>
        <div className="px-2 py-1 rounded bg-slate-800/40">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Average</div>
          <div className="text-xs font-mono font-bold text-slate-200">
            {formatNumber(stats.avg, 1)} {unit}
          </div>
        </div>
        <div className="px-2 py-1 rounded bg-slate-800/40">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Peak</div>
          <div className="text-xs font-mono font-bold text-slate-200">
            {formatNumber(stats.max, 1)} {unit}
          </div>
        </div>
      </div>

      {/* ECharts Canvas Canvas */}
      <div className="h-48 w-full mt-2">
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>

      {/* Footer info */}
      <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[11px] text-slate-400">
        <span>Device Node: <strong className="text-slate-300 font-mono">{deviceId}</strong></span>
        <span>Buffer: <strong className="text-slate-300 font-mono">{stream.length} pts</strong></span>
      </div>
    </div>
  );
};

