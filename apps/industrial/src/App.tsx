import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar, NavTab } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { OverviewView } from './views/OverviewView';
import { ScopeView } from './views/ScopeView';
import { CommandsView } from './views/CommandsView';
import { AlertsView } from './views/AlertsView';
import { AlertBanner } from './components/Alerts/AlertBanner';
import { MachinesTable } from './components/Machines/MachinesTable';
import { useMachines } from './api/machines';
import { useRealtimeTelemetry } from './hooks/useRealtimeTelemetry';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 2,
    },
  },
});

const IndustrialDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [targetScopeDevice, setTargetScopeDevice] = useState<string>('DEV-ESP32-001');

  // Initialize background WebSocket real-time connection
  useRealtimeTelemetry();

  const { data: machines, isLoading: isLoadingMachines } = useMachines();

  const handleOpenScopeForDevice = (deviceId: string) => {
    setTargetScopeDevice(deviceId);
    setCurrentTab('scope');
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Fixed Left Sidebar */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Global Incident / Alarm Toast Banner */}
        <AlertBanner onNavigateToAlerts={() => setCurrentTab('alerts')} />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-grid-pattern">
          <div className="max-w-7xl mx-auto pb-12">
            {currentTab === 'overview' && (
              <OverviewView onSelectScope={handleOpenScopeForDevice} />
            )}

            {currentTab === 'machines' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-white">CNC & Factory Equipment Fleet</h1>
                  <span className="text-xs text-slate-400 font-mono">
                    Total Connected Units: {machines?.length || 0}
                  </span>
                </div>
                <MachinesTable
                  machines={machines || []}
                  isLoading={isLoadingMachines}
                  onOpenScope={handleOpenScopeForDevice}
                />
              </div>
            )}

            {currentTab === 'scope' && (
              <ScopeView initialDeviceId={targetScopeDevice} />
            )}

            {currentTab === 'commands' && <CommandsView />}

            {currentTab === 'alerts' && <AlertsView />}
          </div>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <IndustrialDashboard />
    </QueryClientProvider>
  );
};

export default App;

