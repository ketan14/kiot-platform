import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar, NavTab } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { OverviewView } from './views/OverviewView';
import { ScopeView } from './views/ScopeView';
import { CommandsView } from './views/CommandsView';
import { AlertsView } from './views/AlertsView';
import { AnalyticsView } from './views/AnalyticsView';
import { ManagementView } from './views/ManagementView';
import { LoginView } from './views/LoginView';
import { AlertBanner } from './components/Alerts/AlertBanner';
import { MachinesTable } from './components/Machines/MachinesTable';
import { useMachines } from './api/machines';
import { useRealtimeTelemetry } from './hooks/useRealtimeTelemetry';
import { useOrgStore } from './stores/orgStore';
import { PortalSwitcherBar } from '@kiot/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 2,
    },
  },
});

const getInitialTab = (): NavTab => {
  if (typeof window === 'undefined') return 'overview';
  const path = window.location.pathname.toLowerCase();
  if (path.includes('device') || path.includes('management') || path.includes('admin')) return 'management';
  if (path.includes('machine') || path.includes('cnc')) return 'machines';
  if (path.includes('scope')) return 'scope';
  if (path.includes('alert') || path.includes('incident')) return 'alerts';
  if (path.includes('analytic') || path.includes('history')) return 'analytics';
  if (path.includes('command') || path.includes('actuator')) return 'commands';
  return 'overview';
};

const IndustrialDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>(getInitialTab);
  const [targetScopeDevice, setTargetScopeDevice] = useState<string>('DEV-ESP32-001');

  // Sync URL changes with browser Back/Forward buttons
  React.useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getInitialTab());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    const slug = tab === 'overview' ? '/' : `/${tab === 'management' ? 'devices' : tab}`;
    if (window.location.pathname !== slug) {
      window.history.pushState(null, '', slug);
    }
  };

  // Initialize background WebSocket real-time connection
  useRealtimeTelemetry();

  const { data: machines, isLoading: isLoadingMachines } = useMachines();

  const handleOpenScopeForDevice = (deviceId: string) => {
    setTargetScopeDevice(deviceId);
    handleSelectTab('scope');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <PortalSwitcherBar activePortal="industrial" />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Fixed Left Sidebar */}
        <Sidebar currentTab={currentTab} onSelectTab={handleSelectTab} />

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

            {currentTab === 'analytics' && <AnalyticsView />}

            {currentTab === 'management' && <ManagementView />}
          </div>
        </main>
      </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const isAuthenticated = useOrgStore((s) => s.isAuthenticated);

  return (
    <QueryClientProvider client={queryClient}>
      {isAuthenticated ? <IndustrialDashboard /> : <LoginView />}
    </QueryClientProvider>
  );
};

export default App;

