import React, { useState } from 'react';
import {
  Activity,
  Layers,
  RotateCcw,
  Zap,
  Sliders,
  Send,
  Radio,
} from 'lucide-react';
import { LiveStreamingChart } from '../components/Telemetry/LiveStreamingChart';
import { useTelemetryStore } from '../stores/telemetryStore';
import { useOrgStore } from '../stores/orgStore';

interface ScopeViewProps {
  initialDeviceId?: string;
}

export const ScopeView: React.FC<ScopeViewProps> = ({ initialDeviceId = 'DEV-ESP32-001' }) => {
  const [selectedDevice, setSelectedDevice] = useState<string>(initialDeviceId);
  const currentOrg = useOrgStore((s) => s.currentOrg);
  const recordReading = useTelemetryStore((s) => s.recordReading);
  const [isSimulating, setIsSimulating] = useState(false);

  // Quick packet injection helper for testing frontend responsiveness
  const handleSimulateBurst = () => {
    setIsSimulating(true);
    const now = new Date().toISOString();
    const rpm = 3000 + Math.floor(Math.random() * 400 - 200);
    const vib = +(3.2 + Math.random() * 0.8).toFixed(2);
    const temp = +(58.0 + Math.random() * 1.5).toFixed(1);

    recordReading(selectedDevice, 'spindle_speed_rpm', rpm, 'RPM', now);
    recordReading(selectedDevice, 'vibration_rms', vib, 'mm/s', now);
    recordReading(selectedDevice, 'temperature_bearing', temp, '°C', now);

    setTimeout(() => setIsSimulating(false), 300);
  };

  return (
    <div className="space-y-6">
      {/* Scope Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Real-Time Telemetry Oscilloscope</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                CANVAS 60FPS
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Low-latency edge sensor streams dispatched over WebSocket Gateway
            </p>
          </div>
        </div>

        {/* Device Node Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-800/80 p-1 rounded-lg border border-slate-700/80">
            {['DEV-ESP32-001', 'DEV-METER-001'].map((dev) => (
              <button
                key={dev}
                onClick={() => setSelectedDevice(dev)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all ${
                  selectedDevice === dev
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {dev}
              </button>
            ))}
          </div>

          <button
            onClick={handleSimulateBurst}
            disabled={isSimulating}
            className="px-3.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-bounce' : ''}`} />
            <span>Inject Telemetry Sample</span>
          </button>
        </div>
      </div>

      {/* Scope Channels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveStreamingChart
          deviceId={selectedDevice}
          metric="spindle_speed_rpm"
          title="Channel 1: Spindle Speed (VFD)"
          unit="RPM"
          color="#f59e0b"
        />

        <LiveStreamingChart
          deviceId={selectedDevice}
          metric="vibration_rms"
          title="Channel 2: Bearing Radial Vibration (RMS)"
          unit="mm/s"
          color="#06b6d4"
          threshold={4.5}
          thresholdLabel="ISO 10816 Limit"
        />

        <LiveStreamingChart
          deviceId={selectedDevice}
          metric="temperature_bearing"
          title="Channel 3: Spindle Bearing Temperature"
          unit="°C"
          color="#ef4444"
          threshold={75.0}
          thresholdLabel="Overheat Trip"
        />

        <LiveStreamingChart
          deviceId={selectedDevice}
          metric="power_kw"
          title="Channel 4: Active Power Consumption"
          unit="kW"
          color="#10b981"
          threshold={15.0}
          thresholdLabel="Peak Demand"
        />
      </div>
    </div>
  );
};

