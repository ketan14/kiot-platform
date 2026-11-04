import React, { useState } from 'react';
import {
  Sliders,
  Send,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Power,
  ShieldAlert,
  Cpu,
} from 'lucide-react';
import { useSendCommand, useDeviceCommands } from '../api/commands';
import { useMachines } from '../api/machines';
import { formatTimestamp } from '../lib/utils';

export const CommandsView: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState<string>('DEV-ESP32-001');
  const [speedTarget, setSpeedTarget] = useState<number>(3200);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: machines } = useMachines();
  const { data: commands, isLoading: isLoadingCommands } = useDeviceCommands(selectedDevice);
  const { mutate: sendCommand, isPending } = useSendCommand();

  const commandList = Array.isArray(commands) ? commands : [];

  const handleSendCommand = (type: string, payload: Record<string, unknown>) => {
    sendCommand(
      {
        deviceId: selectedDevice,
        commandType: type,
        payload,
      },
      {
        onSuccess: (cmd) => {
          setNotice(`Dispatched ${type} successfully (ID: ${cmd.id.slice(0, 8)})`);
          setTimeout(() => setNotice(null), 4000);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Actuators & Remote Machine Control</h1>
            <p className="text-xs text-slate-400">
              QoS 1 telemetry-acknowledged command dispatch to edge actuators and CNC controllers
            </p>
          </div>
        </div>

        {/* Device selector */}
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
      </div>

      {notice && (
        <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Control Station Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Speed Modulation */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Spindle Speed Control
              </span>
              <span className="font-mono text-lg font-extrabold text-amber-400">
                {speedTarget} RPM
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Direct VFD frequency command</p>
          </div>

          <input
            type="range"
            min="0"
            max="6000"
            step="100"
            value={speedTarget}
            onChange={(e) => setSpeedTarget(Number(e.target.value))}
            className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />

          <div className="grid grid-cols-4 gap-1.5">
            {[1500, 2400, 3600, 4800].map((rpm) => (
              <button
                key={rpm}
                onClick={() => setSpeedTarget(rpm)}
                className="py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
              >
                {rpm}
              </button>
            ))}
          </div>

          <button
            disabled={isPending}
            onClick={() => handleSendCommand('SET_SPEED', { rpm: speedTarget })}
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Apply Target RPM</span>
          </button>
        </div>

        {/* Card 2: Auxiliary Systems (Relays) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Auxiliary Actuators
            </span>
            <p className="text-xs text-slate-500 mt-1">High-pressure coolant & pneumatic chucks</p>
          </div>

          <div className="space-y-2">
            <button
              disabled={isPending}
              onClick={() => handleSendCommand('SET_RELAY', { relay: 'coolant_pump', state: 'ON' })}
              className="w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-between border border-slate-700/60"
            >
              <span className="flex items-center space-x-2">
                <Power className="w-3.5 h-3.5 text-emerald-400" />
                <span>Start Coolant Pump</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">RELAY #1</span>
            </button>

            <button
              disabled={isPending}
              onClick={() => handleSendCommand('SET_RELAY', { relay: 'chip_conveyor', state: 'ON' })}
              className="w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-between border border-slate-700/60"
            >
              <span className="flex items-center space-x-2">
                <Power className="w-3.5 h-3.5 text-cyan-400" />
                <span>Start Chip Conveyor</span>
              </span>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">RELAY #2</span>
            </button>
          </div>

          <button
            disabled={isPending}
            onClick={() => handleSendCommand('RESET_FAULT', { clear_flags: true })}
            className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center space-x-2 transition-colors border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Controller Faults</span>
          </button>
        </div>

        {/* Card 3: Emergency E-Stop Station */}
        <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-900/50 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Emergency Stop Station
              </span>
            </div>
            <p className="text-xs text-rose-300/70 mt-1">
              Safety hard stop. Disables inverter gate drive and trips safety relays.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-rose-900/20 border border-rose-800/40 text-[11px] text-rose-300">
            ⚠ Warning: Executing E-Stop will immediately abort current cutting cycle and register an emergency incident in audit logs.
          </div>

          <button
            disabled={isPending}
            onClick={() =>
              handleSendCommand('EMERGENCY_STOP', {
                reason: 'HMI manual emergency override',
                priority: 'CRITICAL',
              })
            }
            className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm shadow-xl shadow-rose-600/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>EXECUTE EMERGENCY STOP</span>
          </button>
        </div>
      </div>

      {/* Audit History Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Dispatched Command Log & Execution Acknowledgements
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Device: {selectedDevice}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/60 text-slate-400 text-[10px] uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Command ID</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Payload</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Sent At</th>
                <th className="py-2.5 px-4">Completed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoadingCommands ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Loading command records...
                  </td>
                </tr>
              ) : commandList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No commands dispatched to this device yet.
                  </td>
                </tr>
              ) : (
                commandList.map((cmd) => (
                  <tr key={cmd.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 text-slate-400">{cmd.id.slice(0, 8)}...</td>
                    <td className="py-2.5 px-4 font-bold text-slate-200">{cmd.command_type}</td>
                    <td className="py-2.5 px-4 text-slate-400 truncate max-w-xs">
                      {JSON.stringify(cmd.payload)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cmd.status === 'SUCCEEDED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : cmd.status === 'SENT'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {cmd.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">{formatTimestamp(cmd.created_at)}</td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {formatTimestamp(cmd.completed_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

