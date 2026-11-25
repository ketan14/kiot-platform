import React, { useState, useEffect } from 'react';
import {
  Snowflake,
  Thermometer,
  Droplets,
  ShieldCheck,
  FileCheck2,
  DoorClosed,
  Power,
  Flame,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import { createKiotApiClient } from '@kiot/api-client';
import { PortalSwitcherBar, StatusBadge } from '@kiot/ui';

const DEFAULT_ORG_ID = '00000000-0000-4000-a000-000000000001';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chambers' | 'haccp'>('chambers');
  const [chambers, setChambers] = useState<any[]>([]);
  const [report, setReport] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const apiClient = createKiotApiClient({
    getOrganizationId: () => {
      try {
        const raw = window.localStorage.getItem('kiot_auth_session_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed.currentOrg?.id || DEFAULT_ORG_ID;
        }
      } catch {}
      return DEFAULT_ORG_ID;
    },
    getAccessToken: () => {
      try {
        const raw = window.localStorage.getItem('kiot_auth_session_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed.accessToken || null;
        }
      } catch {}
      return null;
    },
  });

  const loadColdData = async () => {
    setIsLoading(true);
    try {
      const [chRes, repRes] = await Promise.all([
        apiClient.request<{ chambers: any[] }>('/v1/cold/chambers'),
        apiClient.request<any>('/v1/cold/haccp-report'),
      ]);
      setChambers(chRes.chambers || []);
      setReport(repRes);
    } catch (err) {
      console.error('Failed to load KIOT Cold telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadColdData();
    const timer = setInterval(() => void loadColdData(), 4000);
    return () => clearInterval(timer);
  }, []);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleControlChamber = async (
    chamberId: string,
    chamberName: string,
    payload: {
      targetTempC?: number;
      compressor?: 'ON' | 'OFF';
      defrostHeater?: 'ON' | 'OFF';
      doorStatus?: 'CLOSED' | 'OPEN';
    }
  ) => {
    await apiClient.request(`/v1/cold/chambers/${chamberId}/control`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    showNotice(`Dispatched Device Shadow command to '${chamberName}'.`);
    await loadColdData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-grid-pattern">
      <PortalSwitcherBar activePortal="cold" />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-slate-950 shadow-lg shadow-sky-500/20">
              <Snowflake className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-base text-white">KIOT COLD</span>
              <p className="text-[11px] text-sky-400 font-semibold uppercase tracking-wider">
                Cold-Chain & Pharma GDP
              </p>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            <button
              onClick={() => setActiveTab('chambers')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'chambers'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Thermometer className="w-4 h-4 text-sky-400" />
              <span>Cold Chambers & Freezers</span>
            </button>

            <button
              onClick={() => setActiveTab('haccp')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'haccp'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-sky-400" />
              <span>HACCP & GDP Audit Report</span>
            </button>
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Compliance Regime:</span>
              <StatusBadge status="HACCP / GDP" variant="blue" pulse />
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Compliance Score:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {report?.complianceScore || 99.4}%
              </span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-200">
                Continuous Cold Storage Temperature, Humidity & Excursion Telemetry
              </span>
            </div>

            <button
              onClick={() => void loadColdData()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sync Sensors</span>
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              {notice && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{notice}</span>
                </div>
              )}

              {/* TAB 1: COLD CHAMBERS */}
              {activeTab === 'chambers' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-xl font-black text-white">
                      Refrigerated Chambers & Pharma Cold Rooms
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time Modbus & ESP32 thermal telemetry with bidirectional compressor and defrost Device Shadow control.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {chambers.map((ch) => {
                      const reported = ch.shadow_reported || {};
                      const compressorOn = reported.compressor !== 'OFF';
                      const defrostOn = reported.defrost_heater === 'ON';
                      const doorOpen = reported.door_status === 'OPEN';

                      return (
                        <div
                          key={ch.id}
                          className="p-6 rounded-2xl bg-slate-900/85 border border-slate-800 shadow-xl space-y-5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                  {ch.chamber_code}
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                  Node: {ch.device_id}
                                </span>
                              </div>
                              <h2 className="text-lg font-extrabold text-white mt-1.5">
                                {ch.name}
                              </h2>
                              <p className="text-xs text-slate-400">{ch.storage_category}</p>
                            </div>

                            <StatusBadge
                              status={ch.is_excursion ? 'EXCURSION ALERT' : 'HACCP COMPLIANT'}
                              variant={ch.is_excursion ? 'rose' : 'emerald'}
                              pulse
                            />
                          </div>

                          {/* Primary Temperature & Humidity Gauges */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                              <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Chamber Temp</span>
                                <Thermometer className="w-4 h-4 text-sky-400" />
                              </div>
                              <div className="text-3xl font-black font-mono text-sky-400 mt-1">
                                {Number(ch.current_temp_c).toFixed(1)}°C
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 mt-1">
                                Safe Band: {ch.min_temp_c}°C to {ch.max_temp_c}°C
                              </div>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                              <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Relative Humidity</span>
                                <Droplets className="w-4 h-4 text-cyan-400" />
                              </div>
                              <div className="text-3xl font-black font-mono text-cyan-300 mt-1">
                                {Number(ch.current_humidity_pct).toFixed(1)}%
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 mt-1">
                                Target RH: {ch.target_humidity_pct}%
                              </div>
                            </div>
                          </div>

                          {/* Hardware Shadow Status Strip */}
                          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                              <span className="text-slate-400">Compressor</span>
                              <span
                                className={
                                  compressorOn
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-rose-400 font-bold'
                                }
                              >
                                {compressorOn ? 'ON' : 'OFF'}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                              <span className="text-slate-400">Door Seal</span>
                              <span
                                className={
                                  doorOpen
                                    ? 'text-rose-400 font-bold'
                                    : 'text-emerald-400 font-bold'
                                }
                              >
                                {doorOpen ? 'OPEN' : 'SEALED'}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                              <span className="text-slate-400">Defrost</span>
                              <span
                                className={
                                  defrostOn
                                    ? 'text-amber-400 font-bold'
                                    : 'text-slate-400 font-bold'
                                }
                              >
                                {defrostOn ? 'ACTIVE' : 'IDLE'}
                              </span>
                            </div>
                          </div>

                          {/* Actuator Controls */}
                          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                            <button
                              onClick={() =>
                                void handleControlChamber(ch.id, ch.name, {
                                  compressor: compressorOn ? 'OFF' : 'ON',
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center space-x-1.5"
                            >
                              <Power className="w-3.5 h-3.5 text-sky-400" />
                              <span>{compressorOn ? 'Pause Compressor' : 'Start Compressor'}</span>
                            </button>

                            <button
                              onClick={() =>
                                void handleControlChamber(ch.id, ch.name, {
                                  defrostHeater: defrostOn ? 'OFF' : 'ON',
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 flex items-center space-x-1.5"
                            >
                              <Flame className="w-3.5 h-3.5" />
                              <span>{defrostOn ? 'Stop Defrost Cycle' : 'Trigger Defrost'}</span>
                            </button>

                            <button
                              onClick={() =>
                                void handleControlChamber(ch.id, ch.name, {
                                  doorStatus: doorOpen ? 'CLOSED' : 'OPEN',
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center space-x-1.5"
                            >
                              <DoorClosed className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{doorOpen ? 'Seal Chamber Door' : 'Simulate Door Open'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: HACCP / GDP COMPLIANCE REPORT */}
              {activeTab === 'haccp' && report && (
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          CERTIFIED AUDIT LOG
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          Report ID: {report.reportId}
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-white mt-1.5">{report.standard}</h2>
                      <p className="text-xs text-slate-400">
                        Tamper-evident time-series temperature & humidity verification ledger for regulatory inspection.
                      </p>
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center space-x-2 shrink-0"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print / Export PDF Report</span>
                    </button>
                  </div>

                  <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950/70 text-slate-400 uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Timestamp (UTC)</th>
                          <th className="py-3 px-4">Chamber Node</th>
                          <th className="py-3 px-4">Metric</th>
                          <th className="py-3 px-4">Recorded Value</th>
                          <th className="py-3 px-4">Sensor Quality</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {report.readings.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 text-slate-400">
                              {new Date(r.time).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-white">{r.device_id}</td>
                            <td className="py-2.5 px-4 text-sky-400">{r.metric}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-200">
                              {Number(r.value).toFixed(2)} {r.unit}
                            </td>
                            <td className="py-2.5 px-4">
                              <StatusBadge status={r.quality} variant="emerald" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
export default App;
