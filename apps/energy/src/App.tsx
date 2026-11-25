import React, { useState, useEffect } from 'react';
import {
  Zap,
  Gauge,
  IndianRupee,
  Leaf,
  Sliders,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { createKiotApiClient } from '@kiot/api-client';
import { PortalSwitcherBar, StatusBadge } from '@kiot/ui';

const DEFAULT_ORG_ID = '00000000-0000-4000-a000-000000000001';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'grid' | 'tariffs'>('grid');
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Tariff Editor State
  const [baseRate, setBaseRate] = useState(8.5);
  const [peakRate, setPeakRate] = useState(11.2);
  const [offPeakRate, setOffPeakRate] = useState(6.4);
  const [contractedKva, setContractedKva] = useState(120);
  const [peakThresholdKw, setPeakThresholdKw] = useState(85);

  const apiClient = createKiotApiClient({
    getOrganizationId: () => {
      try {
        const raw = window.localStorage.getItem('kiot_auth_session_v1');
        if (raw) return JSON.parse(raw).currentOrg?.id || DEFAULT_ORG_ID;
      } catch {}
      return DEFAULT_ORG_ID;
    },
    getAccessToken: () => {
      try {
        const raw = window.localStorage.getItem('kiot_auth_session_v1');
        if (raw) return JSON.parse(raw).accessToken || null;
      } catch {}
      return null;
    },
  });

  const loadEnergyData = async (syncForm = false) => {
    setIsLoading(true);
    try {
      const res = await apiClient.request<any>('/v1/energy/overview');
      setData(res);
      if (syncForm && res.tariff) {
        setBaseRate(Number(res.tariff.base_rate_per_kwh));
        setPeakRate(Number(res.tariff.peak_rate_per_kwh));
        setOffPeakRate(Number(res.tariff.off_peak_rate_per_kwh));
        setContractedKva(Number(res.tariff.contracted_demand_kva));
        setPeakThresholdKw(Number(res.tariff.peak_demand_threshold_kw));
      }
    } catch (err) {
      console.error('Failed to load KIOT Energy overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEnergyData(true);
    const timer = setInterval(() => void loadEnergyData(false), 3000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveTariffs = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiClient.request('/v1/energy/tariffs', {
      method: 'PUT',
      body: JSON.stringify({
        baseRatePerKwh: Number(baseRate),
        peakRatePerKwh: Number(peakRate),
        offPeakRatePerKwh: Number(offPeakRate),
        contractedDemandKva: Number(contractedKva),
        peakDemandThresholdKw: Number(peakThresholdKw),
      }),
    });
    setNotice('Updated electricity tariff policy & demand threshold limits.');
    setTimeout(() => setNotice(null), 4000);
    await loadEnergyData(true);
  };

  const live = data?.liveMetrics || {
    activePowerKw: 46.8,
    apparentPowerKva: 48.6,
    voltageL1: 415.2,
    currentAmps: 67.6,
    powerFactor: 0.962,
    frequencyHz: 50.02,
    loadUtilizationPct: 40.5,
  };
  const cons = data?.consumption || {
    dailyKwh: 865.8,
    monthlyKwh: 25974,
    dailyCostInr: 7359.3,
    monthlyProjectedCostInr: 220779,
    dailyCarbonKg: 614.7,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-grid-pattern">
      <PortalSwitcherBar activePortal="energy" />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-base text-white">KIOT ENERGY</span>
              <p className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
                3-Phase Grid & Tariffs
              </p>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            <button
              onClick={() => setActiveTab('grid')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'grid'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Gauge className="w-4 h-4 text-emerald-400" />
              <span>3-Phase Power & Cost HUD</span>
            </button>

            <button
              onClick={() => setActiveTab('tariffs')}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'tariffs'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Tariff & Demand Policy</span>
            </button>
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Feeder Node:</span>
              <span className="font-mono text-white font-bold">DEV-METER-001</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Grid Quality:</span>
              <StatusBadge status={`PF ${live.powerFactor}`} variant="emerald" pulse />
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">
                Modbus RS-485 3-Phase Smart Energy Meter Telemetry & Tariff Computation Engine
              </span>
            </div>

            <button
              onClick={() => void loadEnergyData(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Meter</span>
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

              {/* TAB 1: 3-PHASE GRID & COST HUD */}
              {activeTab === 'grid' && (
                <div className="space-y-6">
                  {/* Live Electrical Parameters */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800">
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        Active Power (kW)
                      </span>
                      <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                        {live.activePowerKw} kW
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Apparent: {live.apparentPowerKva} kVA
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800">
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        Line Voltage (L1-N)
                      </span>
                      <div className="text-3xl font-black font-mono text-white mt-1">
                        {live.voltageL1} V
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Current: {live.currentAmps} A • {live.frequencyHz} Hz
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800">
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        Power Factor (PF)
                      </span>
                      <div className="text-3xl font-black font-mono text-cyan-400 mt-1">
                        {live.powerFactor}
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400">
                        Unity Capacitor Bank Active
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800">
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        Contracted Demand Load
                      </span>
                      <div className="text-3xl font-black font-mono text-amber-400 mt-1">
                        {live.loadUtilizationPct}%
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Of {contractedKva} kVA Sanctioned
                      </span>
                    </div>
                  </div>

                  {/* Cost & Carbon Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold uppercase">Estimated Daily Consumption</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black font-mono text-white">
                        {cons.dailyKwh.toLocaleString()} kWh / day
                      </div>
                      <p className="text-xs text-slate-400">
                        Monthly Projection:{' '}
                        <strong className="text-slate-200 font-mono">
                          {cons.monthlyKwh.toLocaleString()} kWh
                        </strong>
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold uppercase">Tariff Cost Estimate (INR)</span>
                        <IndianRupee className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-2xl font-black font-mono text-amber-400">
                        ₹{cons.dailyCostInr.toLocaleString()} / day
                      </div>
                      <p className="text-xs text-slate-400">
                        Monthly Bill Forecast:{' '}
                        <strong className="text-amber-300 font-mono">
                          ₹{cons.monthlyProjectedCostInr.toLocaleString()}
                        </strong>{' '}
                        (@ ₹{baseRate}/kWh)
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold uppercase">Scope-2 Carbon Footprint</span>
                        <Leaf className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black font-mono text-emerald-300">
                        {cons.dailyCarbonKg} kg CO₂e / day
                      </div>
                      <p className="text-xs text-slate-400">
                        Grid Emission Factor: <code className="text-slate-300">0.71 kg CO₂/kWh</code>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TARIFF & DEMAND POLICY EDITOR */}
              {activeTab === 'tariffs' && (
                <div className="max-w-2xl bg-slate-900/85 border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      Industrial Time-of-Day (ToD) Tariff & Peak Demand Configuration
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Configure utility billing rates (INR/kWh) and maximum sanctioned demand kVA thresholds.
                    </p>
                  </div>

                  <form onSubmit={handleSaveTariffs} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Base Rate (₹ / kWh)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={baseRate}
                          onChange={(e) => setBaseRate(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Peak ToD Rate (₹ / kWh)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={peakRate}
                          onChange={(e) => setPeakRate(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Off-Peak Rate (₹ / kWh)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={offPeakRate}
                          onChange={(e) => setOffPeakRate(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Contracted Sanctioned Demand (kVA)
                        </label>
                        <input
                          type="number"
                          value={contractedKva}
                          onChange={(e) => setContractedKva(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Peak Demand Alert Threshold (kW)
                        </label>
                        <input
                          type="number"
                          value={peakThresholdKw}
                          onChange={(e) => setPeakThresholdKw(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition"
                    >
                      Save Tariff Policy
                    </button>
                  </form>
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
