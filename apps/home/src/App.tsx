import React, { useState, useEffect } from 'react';
import {
  Home,
  Lightbulb,
  Fan,
  Lock,
  Unlock,
  Thermometer,
  Sparkles,
  Power,
  Sun,
  Moon,
  Leaf,
  CheckCircle2,
  RefreshCw,
  Server,
  Tv,
} from 'lucide-react';
import { createKiotApiClient } from '@kiot/api-client';
import { PortalSwitcherBar, StatusBadge } from '@kiot/ui';

const DEFAULT_ORG_ID = '00000000-0000-4000-a000-000000000001';

interface RelayCardSpec {
  key: string;
  label: string;
  room: string;
  type: 'binary' | 'lock';
  icon: React.ComponentType<{ className?: string }>;
}

const RELAY_SWITCHBOARD: RelayCardSpec[] = [
  {
    key: 'relay_main_lights',
    label: 'Executive Floor LED Lighting',
    room: 'Main Office Wing',
    type: 'binary',
    icon: Lightbulb,
  },
  {
    key: 'relay_hvac_ac',
    label: 'Daikin VRV Split HVAC Unit',
    room: 'Conference & Operations',
    type: 'binary',
    icon: Thermometer,
  },
  {
    key: 'relay_exhaust_fan',
    label: 'Fresh Air Ventilation Blowers',
    room: 'Utility Corridor',
    type: 'binary',
    icon: Fan,
  },
  {
    key: 'relay_smart_lock',
    label: 'Biometric Magnetic Perimeter Lock',
    room: 'Main Entrance',
    type: 'lock',
    icon: Lock,
  },
  {
    key: 'relay_lobby_signage',
    label: 'Reception Brand Wall & Displays',
    room: 'Ground Lobby',
    type: 'binary',
    icon: Tv,
  },
  {
    key: 'relay_server_cooling',
    label: '24/7 Edge Server Rack Cooling',
    room: 'IT & Telemetry Closet',
    type: 'binary',
    icon: Server,
  },
];

export const App: React.FC = () => {
  const [hub, setHub] = useState<any | null>(null);
  const [env, setEnv] = useState<{ indoorTempC: number; indoorHumidityPct: number; indoorAqi: number }>({
    indoorTempC: 22.4,
    indoorHumidityPct: 48.5,
    indoorAqi: 34,
  });
  const [scenes, setScenes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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

  const loadHomeData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.request<any>('/v1/home/overview');
      setHub(res.hubDevice);
      if (res.environment) setEnv(res.environment);
      setScenes(res.scenes || []);
    } catch (err) {
      console.error('Failed to load KIOT Home state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHomeData();
  }, []);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleToggleRelay = async (spec: RelayCardSpec, currentVal: string) => {
    const nextVal =
      spec.type === 'lock'
        ? currentVal === 'LOCKED'
          ? 'UNLOCKED'
          : 'LOCKED'
        : currentVal === 'ON'
          ? 'OFF'
          : 'ON';

    await apiClient.request('/v1/home/relays/toggle', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: hub?.id || 'DEV-HOME-001',
        key: spec.key,
        value: nextVal,
      }),
    });
    showNotice(`Updated '${spec.label}' state to ${nextVal} via Device Shadow.`);
    await loadHomeData();
  };

  const handleExecuteScene = async (scene: any) => {
    await apiClient.request(`/v1/home/scenes/${scene.id}/execute`, {
      method: 'POST',
    });
    showNotice(`Activated Automation Scene: '${scene.name}'.`);
    await loadHomeData();
  };

  const reported = hub?.reported || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-grid-pattern">
      <PortalSwitcherBar activePortal="home" />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Home className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-base text-white">KIOT HOME</span>
              <p className="text-[11px] text-indigo-400 font-semibold uppercase tracking-wider">
                Smart Relays & Scenes
              </p>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Connected Smart Hub
              </span>
              <div className="font-mono font-bold text-sm text-white">
                {hub?.id || 'DEV-HOME-001'}
              </div>
              <p className="text-xs text-slate-400">{hub?.name}</p>
              <StatusBadge status="SHADOW SYNCED" variant="purple" pulse />
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Indoor Climate & Air
              </span>
              <div className="flex justify-between">
                <span className="text-slate-400">Indoor Temp:</span>
                <span className="font-mono font-bold text-white">{env.indoorTempC}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Humidity:</span>
                <span className="font-mono font-bold text-white">{env.indoorHumidityPct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Air Quality (PM2.5):</span>
                <span className="font-mono font-bold text-emerald-400">
                  {env.indoorAqi} AQI (Good)
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-200">
                ESP32 Smart Relay Switchboard, Room Grouping & One-Click Automation Scenes
              </span>
            </div>

            <button
              onClick={() => void loadHomeData()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sync Shadow</span>
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

              {/* 1-Click Automation Scenes */}
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-extrabold text-white">
                    One-Click Smart Automation Scenes
                  </h2>
                  <p className="text-xs text-slate-400">
                    Orchestrate multiple ESP32 relay channels and HVAC setpoints simultaneously via Device Shadow deltas.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {scenes.map((scene) => {
                    const SceneIcon =
                      scene.icon === 'Sun' ? Sun : scene.icon === 'Leaf' ? Leaf : Moon;

                    return (
                      <div
                        key={scene.id}
                        className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800 flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                              <SceneIcon className="w-5 h-5" />
                            </div>
                            {scene.last_executed_at && (
                              <span className="text-[10px] font-mono text-slate-500">
                                Last: {new Date(scene.last_executed_at).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-extrabold text-white mt-3">{scene.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">{scene.description}</p>
                        </div>

                        <button
                          onClick={() => void handleExecuteScene(scene)}
                          className="w-full py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs transition shadow-md shadow-indigo-500/20"
                        >
                          Activate Scene
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Room Relay Switchboard */}
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-extrabold text-white">
                    Room-by-Room ESP32 Smart Relay Switchboard
                  </h2>
                  <p className="text-xs text-slate-400">
                    Click any relay card to toggle physical state via MQTT QoS-1 and synchronize reported Device Shadow.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {RELAY_SWITCHBOARD.map((spec) => {
                    const rawState = String(
                      reported[spec.key] || (spec.type === 'lock' ? 'LOCKED' : 'OFF')
                    );
                    const isActive = rawState === 'ON' || rawState === 'LOCKED';
                    const Icon =
                      spec.type === 'lock' ? (rawState === 'LOCKED' ? Lock : Unlock) : spec.icon;

                    return (
                      <div
                        key={spec.key}
                        onClick={() => void handleToggleRelay(spec, rawState)}
                        className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-4 ${
                          isActive
                            ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isActive
                                ? 'bg-indigo-500 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          <StatusBadge
                            status={rawState}
                            variant={isActive ? 'emerald' : 'slate'}
                            pulse={isActive}
                          />
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                            {spec.room}
                          </span>
                          <h3 className="text-sm font-extrabold text-white mt-0.5">
                            {spec.label}
                          </h3>
                          <p className="text-[11px] font-mono text-slate-500 mt-1">
                            Shadow Key: {spec.key}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Click to Toggle</span>
                          <Power
                            className={`w-4 h-4 ${
                              isActive ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
export default App;
