import React, { useState, useEffect } from 'react';
import {
  Shield,
  Building2,
  Cpu,
  Package,
  HardDriveDownload,
  Activity,
  Plus,
  CheckCircle2,
  Power,
  RefreshCw,
  Server,
  Globe,
  FileCode2,
} from 'lucide-react';
import {
  createKiotApiClient,
  FirmwareReleaseItem,
  PlatformOverviewMetrics,
} from '@kiot/api-client';
import { PortalSwitcherBar, StatusBadge } from '@kiot/ui';

type PlatformTab = 'overview' | 'tenants' | 'firmware' | 'devices' | 'catalogue';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PlatformTab>('overview');
  const [overview, setOverview] = useState<PlatformOverviewMetrics | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [firmwareReleases, setFirmwareReleases] = useState<FirmwareReleaseItem[]>([]);
  const [globalDevices, setGlobalDevices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // New Tenant Form
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [newTenantTier, setNewTenantTier] = useState('enterprise');

  // New OTA Firmware Form
  const [fwVersion, setFwVersion] = useState('');
  const [fwHardware, setFwHardware] = useState('esp32');
  const [fwProduct, setFwProduct] = useState('industrial');
  const [fwRollout, setFwRollout] = useState(100);
  const [fwNotes, setFwNotes] = useState('');
  const [fwMandatory, setFwMandatory] = useState(false);

  const apiClient = createKiotApiClient();

  const loadPlatformData = async () => {
    setIsLoading(true);
    try {
      const [ovRes, orgRes, fwRes, devRes, prodRes] = await Promise.all([
        apiClient.request<PlatformOverviewMetrics>('/v1/platform/overview'),
        apiClient.request<{ organizations: any[] }>('/v1/platform/organizations'),
        apiClient.request<{ releases: FirmwareReleaseItem[] }>('/v1/platform/firmware'),
        apiClient.request<{ devices: any[] }>('/v1/platform/devices'),
        apiClient.request<{ products: any[] }>('/v1/platform/products'),
      ]);
      setOverview(ovRes);
      setTenants(orgRes.organizations || []);
      setFirmwareReleases(fwRes.releases || []);
      setGlobalDevices(devRes.devices || []);
      setProducts(prodRes.products || []);
    } catch (err) {
      console.error('Failed to load platform admin metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPlatformData();
  }, []);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleProvisionTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName) return;
    await apiClient.request('/v1/platform/organizations', {
      method: 'POST',
      body: JSON.stringify({
        name: newTenantName,
        slug: newTenantSlug || undefined,
        planTier: newTenantTier,
        products: ['industrial', 'energy'],
      }),
    });
    setNewTenantName('');
    setNewTenantSlug('');
    showNotice(`Provisioned tenant organization '${newTenantName}' with RLS & subscriptions.`);
    await loadPlatformData();
  };

  const handleToggleTenantStatus = async (orgId: string, currentActive: boolean) => {
    await apiClient.request(`/v1/platform/organizations/${orgId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !currentActive }),
    });
    showNotice(`Updated tenant status to ${!currentActive ? 'ACTIVE' : 'SUSPENDED'}.`);
    await loadPlatformData();
  };

  const handlePublishFirmware = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fwVersion) return;
    await apiClient.request('/v1/platform/firmware', {
      method: 'POST',
      body: JSON.stringify({
        version: fwVersion,
        hardwareType: fwHardware,
        productId: fwProduct,
        releaseNotes: fwNotes,
        rolloutPercentage: Number(fwRollout),
        isMandatory: fwMandatory,
        isStable: Number(fwRollout) === 100,
      }),
    });
    setFwVersion('');
    setFwNotes('');
    showNotice(`Published OTA firmware v${fwVersion} (${fwHardware}) to release registry.`);
    await loadPlatformData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-grid-pattern">
      <PortalSwitcherBar activePortal="platform-admin" />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-purple-400 flex items-center justify-center text-slate-950 shadow-lg shadow-purple-500/20">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base text-white">PLATFORM ADMIN</span>
              </div>
              <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider">
                KIOT Global Operator
              </p>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {[
              { id: 'overview', label: 'Global Platform Health', icon: Activity },
              { id: 'tenants', label: 'Tenant Organizations', icon: Building2 },
              { id: 'firmware', label: 'OTA Firmware Registry', icon: HardDriveDownload },
              { id: 'devices', label: 'Global Hardware Fleet', icon: Cpu },
              { id: 'catalogue', label: 'SaaS Product Catalogue', icon: Package },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as PlatformTab)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition ${
                    isActive
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Operator Clearance:</span>
              <StatusBadge status="SUPER_ADMIN" variant="purple" pulse />
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Control Plane:</span>
              <span className="font-mono text-emerald-400">Multi-Region Ready</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-slate-200">
                KIOT Technologies – Internal Multi-Tenant SaaS Control Plane
              </span>
            </div>

            <button
              onClick={() => void loadPlatformData()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Control Plane</span>
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

              {/* Global KPI Cards */}
              {overview && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] font-bold uppercase text-slate-400">
                      Tenant Organizations
                    </span>
                    <div className="text-2xl font-black text-purple-400 font-mono mt-1">
                      {overview.totals.activeOrganizations} / {overview.totals.organizations}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] font-bold uppercase text-slate-400">
                      Global Edge Devices
                    </span>
                    <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                      {overview.totals.onlineDevices} / {overview.totals.devices} Online
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] font-bold uppercase text-slate-400">
                      OTA Firmware Builds
                    </span>
                    <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                      {overview.totals.firmwareReleases} Releases
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[11px] font-bold uppercase text-slate-400">
                      Active Subscriptions
                    </span>
                    <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
                      {overview.totals.subscriptions} Plans
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 1: OVERVIEW & GLOBAL AUDIT STREAM */}
              {activeTab === 'overview' && overview && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-extrabold text-white">
                        Cross-Tenant Platform Activity & Security Stream
                      </h2>
                      <p className="text-xs text-slate-400">
                        Live audit stream across all customer organizations, user logins, and OTA rollouts.
                      </p>
                    </div>
                    <Server className="w-6 h-6 text-purple-400" />
                  </div>

                  <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/70 text-slate-400 uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Tenant Organization</th>
                          <th className="py-3 px-4">Actor</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {overview.recentAuditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-4 text-slate-400">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </td>
                            <td className="py-3 px-4 font-sans font-bold text-white">
                              {log.organization_name || 'Global Control Plane'}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {log.user_email || 'system'}
                            </td>
                            <td className="py-3 px-4 text-purple-400 font-bold">{log.action}</td>
                            <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                              {JSON.stringify(log.details)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: TENANT ORGANIZATIONS */}
              {activeTab === 'tenants' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      Global Tenant Organizations & Lifecycle Management
                    </h2>
                    <p className="text-xs text-slate-400">
                      Provision new customer organizations, monitor device/member counts, and suspend or activate tenants.
                    </p>
                  </div>

                  <form
                    onSubmit={handleProvisionTenant}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Organization Name (e.g. Mahindra Auto Works)"
                      value={newTenantName}
                      onChange={(e) => setNewTenantName(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Slug (optional, e.g. mahindra-auto)"
                      value={newTenantSlug}
                      onChange={(e) => setNewTenantSlug(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                    />
                    <select
                      value={newTenantTier}
                      onChange={(e) => setNewTenantTier(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      <option value="starter">Starter Tier (10 Devices)</option>
                      <option value="standard">Standard Tier (25 Devices)</option>
                      <option value="enterprise">Enterprise Tier (100 Devices)</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Provision Tenant</span>
                    </button>
                  </form>

                  <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/70 text-slate-400 uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Organization</th>
                          <th className="py-3 px-4">Slug</th>
                          <th className="py-3 px-4">Members</th>
                          <th className="py-3 px-4">Devices</th>
                          <th className="py-3 px-4">Subscriptions</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {tenants.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-800/40">
                            <td className="py-3.5 px-4 font-bold text-white">{t.name}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-400">{t.slug}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-200">
                              {t.member_count}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-200">
                              {t.device_count}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap gap-1">
                                {(t.subscriptions || []).map((s: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                  >
                                    {s.product_id} ({s.plan_tier})
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge
                                status={t.is_active ? 'ACTIVE' : 'SUSPENDED'}
                                variant={t.is_active ? 'emerald' : 'rose'}
                                pulse={t.is_active}
                              />
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => void handleToggleTenantStatus(t.id, t.is_active)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center space-x-1"
                              >
                                <Power className="w-3.5 h-3.5 text-amber-400" />
                                <span>{t.is_active ? 'Suspend' : 'Activate'}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: OTA FIRMWARE REGISTRY */}
              {activeTab === 'firmware' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      Over-The-Air (OTA) Firmware Release Registry
                    </h2>
                    <p className="text-xs text-slate-400">
                      Manage signed ESP-IDF and Linux Gateway binary images, SHA-256 verification checksums, and staged canary rollout percentages.
                    </p>
                  </div>

                  <form
                    onSubmit={handlePublishFirmware}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="SemVer (e.g. 1.4.0)"
                        value={fwVersion}
                        onChange={(e) => setFwVersion(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                      <select
                        value={fwHardware}
                        onChange={(e) => setFwHardware(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      >
                        <option value="esp32">ESP32 Microcontroller</option>
                        <option value="linux_gateway">Linux Industrial Gateway</option>
                        <option value="third_party">Modbus Bridge / Meter</option>
                      </select>
                      <select
                        value={fwProduct}
                        onChange={(e) => setFwProduct(e.target.value)}
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      >
                        <option value="industrial">KIOT Industrial</option>
                        <option value="energy">KIOT Energy</option>
                        <option value="cold">KIOT Cold</option>
                        <option value="home">KIOT Home</option>
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={fwRollout}
                        onChange={(e) => setFwRollout(Number(e.target.value))}
                        placeholder="Rollout %"
                        className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-1.5"
                      >
                        <HardDriveDownload className="w-4 h-4" />
                        <span>Publish OTA Release</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="text"
                        placeholder="Release Notes (e.g. Added RS-485 CRC retry & watchdog timer)"
                        value={fwNotes}
                        onChange={(e) => setFwNotes(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                      <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fwMandatory}
                          onChange={(e) => setFwMandatory(e.target.checked)}
                          className="accent-purple-500"
                        />
                        <span>Mandatory Security OTA</span>
                      </label>
                    </div>
                  </form>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {firmwareReleases.map((fw) => (
                      <div
                        key={fw.id}
                        className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <FileCode2 className="w-5 h-5 text-purple-400" />
                            <span className="font-mono font-black text-base text-white">
                              v{fw.version}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                              {fw.hardware_type}
                            </span>
                          </div>
                          <StatusBadge
                            status={
                              fw.is_stable
                                ? `STABLE (${fw.rollout_percentage}%)`
                                : `CANARY (${fw.rollout_percentage}%)`
                            }
                            variant={fw.is_stable ? 'emerald' : 'amber'}
                          />
                        </div>

                        <p className="text-xs text-slate-400">{fw.release_notes}</p>

                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Product Line:</span>
                            <span className="text-purple-300 uppercase font-bold">
                              {fw.product_id}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Binary Size:</span>
                            <span className="text-slate-200">
                              {(fw.binary_size_bytes / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                          <div className="truncate">
                            <span className="text-slate-500">SHA256: </span>
                            <span>{fw.checksum_sha256}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: GLOBAL HARDWARE FLEET */}
              {activeTab === 'devices' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      Global Cross-Tenant Hardware Inventory
                    </h2>
                    <p className="text-xs text-slate-400">
                      Inspect all registered devices across every customer organization on the KIOT Platform.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/70 text-slate-400 uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Device ID</th>
                          <th className="py-3 px-4">Tenant Organization</th>
                          <th className="py-3 px-4">Product Line</th>
                          <th className="py-3 px-4">Hardware Serial</th>
                          <th className="py-3 px-4">Firmware</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {globalDevices.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-4 font-mono font-bold text-white">{d.id}</td>
                            <td className="py-3 px-4 text-purple-300 font-semibold">
                              {d.organization_name}
                            </td>
                            <td className="py-3 px-4 uppercase font-mono text-slate-300">
                              {d.product_id}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">
                              {d.hardware_serial}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              v{d.firmware_version}
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge
                                status={d.status}
                                variant={d.status === 'online' ? 'emerald' : 'slate'}
                                pulse={d.status === 'online'}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: PRODUCT CATALOGUE */}
              {activeTab === 'catalogue' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">
                      KIOT Master Brand Product Portfolio
                    </h2>
                    <p className="text-xs text-slate-400">
                      Global product catalogue metrics across KIOT Industrial, KIOT Energy, KIOT Cold, and KIOT Home.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((p) => (
                      <div
                        key={p.id}
                        className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-base text-white">{p.name}</span>
                          <StatusBadge
                            status={p.is_active ? 'GA ACTIVE' : 'DISABLED'}
                            variant="purple"
                          />
                        </div>
                        <p className="text-xs text-slate-400">{p.description}</p>
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">
                            Active Tenant Subscriptions:{' '}
                            <strong className="text-white">{p.active_subscriptions}</strong>
                          </span>
                          <span className="text-slate-400">
                            Provisioned Hardware:{' '}
                            <strong className="text-emerald-400">{p.total_devices}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
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
