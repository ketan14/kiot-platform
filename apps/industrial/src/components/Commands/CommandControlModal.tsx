import React, { useState } from 'react';
import {
  X,
  Sliders,
  AlertTriangle,
  RotateCcw,
  Zap,
  CheckCircle2,
  Clock,
  Send,
  Power,
} from 'lucide-react';
import { useSendCommand, useDeviceCommands } from '../../api/commands';
import { Machine } from '../../api/types';
import { formatTimestamp } from '../../lib/utils';

interface CommandControlModalProps {
  machine: Machine | null;
  deviceId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CommandControlModal: React.FC<CommandControlModalProps> = ({
  machine,
  deviceId = 'DEV-ESP32-001',
  isOpen,
  onClose,
}) => {
  const [speedRpm, setSpeedRpm] = useState<number>(3000);
  const [coolantOn, setCoolantOn] = useState<boolean>(true);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const { mutate: sendCommand, isPending } = useSendCommand();
  const { data: commands, isLoading: isLoadingCommands } = useDeviceCommands(
    isOpen ? deviceId : null
  );

  const commandList = Array.isArray(commands) ? commands : [];

  if (!isOpen || !machine) return null;

  const handleDispatchSpeed = () => {
    sendCommand(
      {
        deviceId,
        commandType: 'SET_SPEED',
        payload: { rpm: speedRpm, unit: 'RPM' },
      },
      {
        onSuccess: (cmd) => {
          setSuccessNotice(`Speed set to ${speedRpm} RPM (Command #${cmd.id.slice(0, 8)})`);
          setTimeout(() => setSuccessNotice(null), 4000);
        },
      }
    );
  };

  const handleToggleCoolant = () => {
    const nextState = !coolantOn;
    setCoolantOn(nextState);
    sendCommand(
      {
        deviceId,
        commandType: 'SET_RELAY',
        payload: { relay: 'coolant_pump', state: nextState ? 'ON' : 'OFF' },
      },
      {
        onSuccess: (cmd) => {
          setSuccessNotice(`Coolant pump switched ${nextState ? 'ON' : 'OFF'}`);
          setTimeout(() => setSuccessNotice(null), 4000);
        },
      }
    );
  };

  const handleEmergencyStop = () => {
    sendCommand(
      {
        deviceId,
        commandType: 'EMERGENCY_STOP',
        payload: { reason: 'Operator initiated E-Stop from HMI', level: 'CRITICAL' },
      },
      {
        onSuccess: () => {
          setSpeedRpm(0);
          setCoolantOn(false);
          setSuccessNotice('EMERGENCY STOP EXECUTED: All actuators halted.');
          setTimeout(() => setSuccessNotice(null), 5000);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{machine.name}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {machine.machine_code}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Edge Node: {deviceId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Notification banner */}
          {successNotice && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Actuator 1: Spindle Speed Regulation */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Spindle Speed Target</h3>
                <p className="text-xs text-slate-400">PWM VFD Frequency & Inverter Drive</p>
              </div>
              <span className="text-xl font-extrabold font-mono text-amber-400">
                {speedRpm} <span className="text-xs text-slate-400">RPM</span>
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="6000"
              step="100"
              value={speedRpm}
              onChange={(e) => setSpeedRpm(Number(e.target.value))}
              className="w-full accent-amber-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {[1200, 2400, 3600, 4800].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setSpeedRpm(preset)}
                    className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <button
                disabled={isPending}
                onClick={handleDispatchSpeed}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-md disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Apply RPM</span>
              </button>
            </div>
          </div>

          {/* Actuator 2: Relays & Auxiliary Systems */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Coolant Pump
                </h4>
                <p className="text-[11px] text-slate-400">Relay Channel #1</p>
              </div>
              <button
                onClick={handleToggleCoolant}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  coolantOn
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-700/40 text-slate-400 border border-slate-700'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{coolantOn ? 'ACTIVE' : 'OFF'}</span>
              </button>
            </div>

            {/* Emergency E-Stop Button */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                  Emergency Stop
                </h4>
                <p className="text-[11px] text-rose-400/80">Immediate Motor Cutoff</p>
              </div>
              <button
                onClick={handleEmergencyStop}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 flex items-center space-x-1.5 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>E-STOP</span>
              </button>
            </div>
          </div>

          {/* Command Audit Log / History */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Recent Edge Dispatches</span>
            </h4>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden text-xs">
              {isLoadingCommands ? (
                <div className="p-4 text-center text-slate-500">Loading audit history...</div>
              ) : commandList.length > 0 ? (
                <div className="divide-y divide-slate-800/60 max-h-40 overflow-y-auto">
                  {commandList.slice(0, 5).map((cmd) => (
                    <div
                      key={cmd.id}
                      className="px-3 py-2 flex items-center justify-between font-mono"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-200">{cmd.command_type}</span>
                        <span className="text-[10px] text-slate-500">
                          {formatTimestamp(cmd.created_at)}
                        </span>
                      </div>
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center text-slate-500 font-mono text-xs">
                  No previous commands recorded
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>QoS 1 Reliable MQTT Command Bus</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
