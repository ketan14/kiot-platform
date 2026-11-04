import React, { useState } from 'react';
import {
  Cpu,
  Sliders,
  Activity,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  Layers,
} from 'lucide-react';
import { Machine } from '../../api/types';
import { MachineStatusBadge } from '../Overview/MachineStatusBadge';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { formatNumber } from '../../lib/utils';
import { CommandControlModal } from '../Commands/CommandControlModal';

interface MachinesTableProps {
  machines: Machine[];
  isLoading: boolean;
  onOpenScope: (deviceId: string) => void;
}

export const MachinesTable: React.FC<MachinesTableProps> = ({
  machines,
  isLoading,
  onOpenScope,
}) => {
  const [search, setSearch] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);

  const latestMetrics = useTelemetryStore((s) => s.latestMetrics);

  const filteredMachines = machines.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.machine_code.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenControl = (m: Machine) => {
    setSelectedMachine(m);
    setIsControlModalOpen(true);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-md overflow-hidden shadow-xl">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, machine name, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Active Units: <strong className="text-slate-200">{filteredMachines.length}</strong></span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Equipment</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Spindle RPM</th>
              <th className="py-3 px-4">Vibration (RMS)</th>
              <th className="py-3 px-4">Temp</th>
              <th className="py-3 px-4">Total Run Time</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Loading machines fleet...
                </td>
              </tr>
            ) : filteredMachines.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No industrial machines match your search.
                </td>
              </tr>
            ) : (
              filteredMachines.map((m) => {
                // Primary edge node mapping (e.g. CNC-01 uses DEV-ESP32-001)
                const deviceId = m.primary_device_id || (m.machine_code === 'CNC-01' ? 'DEV-ESP32-001' : 'DEV-METER-001');

                const rpmKey = `${deviceId}:spindle_speed_rpm`;
                const vibKey = `${deviceId}:vibration_rms`;
                const tempKey = `${deviceId}:temperature_bearing`;

                const liveRpm = latestMetrics[rpmKey]?.value;
                const liveVib = latestMetrics[vibKey]?.value;
                const liveTemp = latestMetrics[tempKey]?.value;

                return (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                            {m.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {m.machine_code} • {m.category.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <MachineStatusBadge status={m.status} />
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {liveRpm !== undefined ? (
                        <span className="text-amber-400 font-extrabold">
                          {formatNumber(liveRpm, 0)} <span className="text-[10px] text-slate-400">RPM</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold">
                      {liveVib !== undefined ? (
                        <span
                          className={
                            liveVib > 4.5
                              ? 'text-rose-400'
                              : liveVib > 3.0
                                ? 'text-amber-400'
                                : 'text-cyan-400'
                          }
                        >
                          {formatNumber(liveVib, 2)} <span className="text-[10px] text-slate-400">mm/s</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {liveTemp !== undefined ? (
                        <span className="text-rose-400">
                          {formatNumber(liveTemp, 1)} <span className="text-[10px] text-slate-400">°C</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatNumber(Number(m.current_operating_hours), 1)} hrs</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onOpenScope(deviceId)}
                          title="View Live Scope"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition-colors"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenControl(m)}
                          title="Actuator Controls"
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center space-x-1 transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Control</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Control Modal */}
      <CommandControlModal
        machine={selectedMachine}
        deviceId={selectedMachine?.primary_device_id || (selectedMachine?.machine_code === 'CNC-01' ? 'DEV-ESP32-001' : 'DEV-METER-001')}
        isOpen={isControlModalOpen}
        onClose={() => setIsControlModalOpen(false)}
      />
    </div>
  );
};
