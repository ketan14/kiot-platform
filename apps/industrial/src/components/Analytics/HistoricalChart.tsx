import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { HistoryDataPoint } from '../../api/telemetry';

interface HistoricalChartProps {
  dataPoints: HistoryDataPoint[];
  selectedMetrics: string[];
  height?: number;
}

const METRIC_CONFIG: Record<
  string,
  { label: string; unit: string; color: string; yAxisIndex: number }
> = {
  spindle_speed_rpm: {
    label: 'Spindle Speed',
    unit: 'RPM',
    color: '#06b6d4', // cyan-500
    yAxisIndex: 0,
  },
  power_kw: {
    label: 'Active Power',
    unit: 'kW',
    color: '#a855f7', // purple-500
    yAxisIndex: 0,
  },
  temperature_bearing: {
    label: 'Bearing Temp',
    unit: '°C',
    color: '#f59e0b', // amber-500
    yAxisIndex: 1,
  },
  vibration_rms: {
    label: 'Vibration RMS',
    unit: 'mm/s',
    color: '#f43f5e', // rose-500
    yAxisIndex: 1,
  },
  voltage_v: {
    label: 'Grid Voltage',
    unit: 'V',
    color: '#3b82f6', // blue-500
    yAxisIndex: 0,
  },
  current_a: {
    label: 'Phase Current',
    unit: 'A',
    color: '#10b981', // emerald-500
    yAxisIndex: 1,
  },
};

export const HistoricalChart: React.FC<HistoricalChartProps> = ({
  dataPoints,
  selectedMetrics,
  height = 420,
}) => {
  const chartOption = useMemo(() => {
    // 1. Group points by metric: metric -> Map<time, value>
    const metricDataMap: Record<string, Array<[string, number]>> = {};
    for (const metric of selectedMetrics) {
      metricDataMap[metric] = [];
    }

    for (const pt of dataPoints) {
      if (metricDataMap[pt.metric]) {
        const val = pt.avg_value !== undefined ? pt.avg_value : pt.value !== undefined ? pt.value : 0;
        metricDataMap[pt.metric].push([pt.time, Number(val.toFixed(2))]);
      }
    }

    // Sort chronologically
    for (const m of selectedMetrics) {
      metricDataMap[m].sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    }

    // 2. Build series
    const series = selectedMetrics.map((metricKey) => {
      const cfg = METRIC_CONFIG[metricKey] || {
        label: metricKey,
        unit: '',
        color: '#e2e8f0',
        yAxisIndex: 0,
      };

      return {
        name: cfg.label,
        type: 'line',
        yAxisIndex: cfg.yAxisIndex,
        data: metricDataMap[metricKey],
        smooth: true,
        showSymbol: false,
        lineStyle: {
          width: 2.2,
          color: cfg.color,
        },
        itemStyle: {
          color: cfg.color,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${cfg.color}35` },
              { offset: 1, color: `${cfg.color}00` },
            ],
          },
        },
      };
    });

    return {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#090d16',
        borderColor: '#334155',
        borderWidth: 1,
        textStyle: {
          color: '#f8fafc',
          fontSize: 12,
          fontFamily: 'monospace',
        },
        axisPointer: {
          type: 'cross',
          crossStyle: { color: '#64748b' },
          lineStyle: { color: '#f59e0b', width: 1, type: 'dashed' },
        },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          const time = new Date(params[0].axisValue).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          let content = `<div style="font-weight: bold; margin-bottom: 4px; color: #94a3b8;">${time}</div>`;
          for (const item of params) {
            content += `<div style="display: flex; justify-content: space-between; gap: 16px; margin: 2px 0;">
              <span>${item.marker} ${item.seriesName}</span>
              <span style="font-weight: bold; font-family: monospace;">${item.value[1]}</span>
            </div>`;
          }
          return content;
        },
      },
      legend: {
        top: 0,
        right: 10,
        textStyle: {
          color: '#94a3b8',
          fontSize: 11,
          fontFamily: 'sans-serif',
        },
      },
      grid: {
        top: 36,
        left: 45,
        right: 45,
        bottom: 55,
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#334155' } },
        splitLine: { show: true, lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          fontFamily: 'monospace',
          formatter: (value: number) => {
            const d = new Date(value);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
          },
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'RPM / kW',
          position: 'left',
          axisLine: { lineStyle: { color: '#334155' } },
          splitLine: { show: true, lineStyle: { color: '#1e293b', type: 'dashed' } },
          axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
          nameTextStyle: { color: '#64748b', fontSize: 10 },
        },
        {
          type: 'value',
          name: '°C / mm/s',
          position: 'right',
          axisLine: { lineStyle: { color: '#334155' } },
          splitLine: { show: false },
          axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'monospace' },
          nameTextStyle: { color: '#64748b', fontSize: 10 },
        },
      ],
      dataZoom: [
        {
          type: 'slider',
          height: 18,
          bottom: 8,
          borderColor: '#1e293b',
          backgroundColor: '#090d16',
          fillerColor: 'rgba(245, 158, 11, 0.15)',
          handleStyle: { color: '#f59e0b' },
          textStyle: { color: '#64748b', fontSize: 9 },
        },
        {
          type: 'inside',
        },
      ],
      series,
    };
  }, [dataPoints, selectedMetrics]);

  return (
    <div className="w-full">
      <ReactECharts
        option={chartOption}
        style={{ height: `${height}px`, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

