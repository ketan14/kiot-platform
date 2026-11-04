import React, { useState } from 'react';
import {
  Cpu,
  MapPin,
  Users,
  Plus,
  Key,
  Trash2,
  Search,
  Building,
  Radio,
  Layers,
  Shield,
  Clock,
  ChevronRight,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  Mail,
  UserCheck,
} from 'lucide-react';
import {
  useDeviceFleet,
  useDeleteDevice,
  useLocations,
  useDeleteLocation,
  useOrgMembers,
  useRemoveMember,
  LocationItem,
} from '../api/management';
import { useOrgStore } from '../stores/orgStore';
import { Device } from '../api/types';
import { DeviceOnboardingModal } from '../components/Management/DeviceOnboardingModal';
import { InviteMemberModal } from '../components/Management/InviteMemberModal';
import { LocationCreateModal } from '../components/Management/LocationCreateModal';
import { ProvisioningDetailsModal } from '../components/Management/ProvisioningDetailsModal';

export const ManagementView: React.FC = () => {
  const currentOrg = useOrgStore((s) => s.currentOrg);
  const [activeTab, setActiveTab] = useState<'fleet' | 'hierarchy' | 'team'>('fleet');

  // Modal controls
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationParentId, setLocationParentId] = useState<string | null>(null);
  const [selectedDeviceForProvisioning, setSelectedDeviceForProvisioning] = useState<Device | null>(null);

  // Queries
  const { data: devices, isLoading: isLoadingDevices } = useDeviceFleet();
  const { data: flatLocations } = useLocations(false);
  const { data: treeLocations, isLoading: isLoadingLocations } = useLocations(true);
  const { data: members, isLoading: isLoadingMembers } = useOrgMembers();

  // Mutations
  const deleteDeviceMutation = useDeleteDevice();
  const deleteLocationMutation = useDeleteLocation();
  const removeMemberMutation = useRemoveMember();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState<string>('all');

  // Decommission confirmation
  const [decommissionId, setDecommissionId] = useState<string | null>(null);

  const filteredDevices = devices?.filter((d) => {
    const matchesSearch =
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.hardware_serial.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProduct = productFilter === 'all' || d.product_id === productFilter;
    return matchesSearch && matchesProduct;
  });

  const handleDeleteDevice = async (id: string) => {
    if (window.confirm(`Are you sure you want to decommission device '${id}'? This will permanently remove its Device Shadow and unbind hardware.`)) {
      await deleteDeviceMutation.mutateAsync(id);
    }
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (window.confirm(`Delete location '${name}'? Sub-locations will be removed and assigned devices unlinked.`)) {
      await deleteLocationMutation.mutateAsync(id);
    }
  };

  const handleRemoveMember = async (userId: string, email: string) => {
    if (window.confirm(`Revoke organization access for member '${email}'?`)) {
      await removeMemberMutation.mutateAsync(userId);
    }
  };

  const openAddSubLocation = (parentId: string) => {
    setLocationParentId(parentId);
    setIsLocationModalOpen(true);
  };

  // Helper recursive renderer for location hierarchy tree
  const renderLocationNode = (node: LocationItem, depth = 0) => {
    const typeColor =
      node.type === 'site'
        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
        : node.type === 'building'
          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
          : node.type === 'line'
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

    return (
      <div key={node.id} className="space-y-2">
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/40 transition ${
            depth > 0 ? 'ml-6 border-l-2 border-l-slate-700' : ''
          }`}
        >
          <div className="flex items-center space-x-3">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${typeColor}`}
            >
              {node.type}
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm text-white">{node.name}</span>
                {node.code && (
                  <span className="px-1.5 py-0.2 rounded text-[11px] font-mono bg-slate-800 text-slate-400">
                    {node.code}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500">ID: {node.id.slice(0, 8)}...</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => openAddSubLocation(node.id)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              <span>Add Child</span>
            </button>
            <button
              onClick={() => handleDeleteLocation(node.id, node.name)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Delete Location"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recursive Children */}
        {node.children && node.children.length > 0 && (
          <div className="space-y-2">
            {node.children.map((child) => renderLocationNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Portal Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Admin & Fleet Management
            </span>
            <span className="text-xs text-slate-400 font-mono">Org: {currentOrg.name}</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1.5">
            Device Onboarding & Management Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Provision edge IoT microcontrollers, organize factory topological hierarchy, and grant team access.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setIsOnboardModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Onboard New Device</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Cpu className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Fleet Hardware
            </span>
            <div className="text-xl font-bold text-white font-mono">
              {devices?.length || 0} Devices
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Topological Sites & Lines
            </span>
            <div className="text-xl font-bold text-white font-mono">
              {flatLocations?.length || 0} Locations
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Active Team Members
            </span>
            <div className="text-xl font-bold text-white font-mono">
              {members?.length || 0} Accounts
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('fleet')}
          className={`pb-3 flex items-center space-x-2 transition border-b-2 ${
            activeTab === 'fleet'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Device Fleet & Provisioning ({devices?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`pb-3 flex items-center space-x-2 transition border-b-2 ${
            activeTab === 'hierarchy'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Factory Locations & Hierarchy</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`pb-3 flex items-center space-x-2 transition border-b-2 ${
            activeTab === 'team'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Team & RBAC Access ({members?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: FLEET & PROVISIONING */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search device ID, name, serial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Product Domains</option>
                <option value="industrial">Industrial</option>
                <option value="energy">Energy</option>
                <option value="cold">Cold Storage</option>
                <option value="home">Home</option>
              </select>
            </div>
          </div>

          {/* Devices Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-semibold">
                    <th className="py-3.5 px-4">Device Identity</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Domain & Hardware</th>
                    <th className="py-3.5 px-4">Factory Location</th>
                    <th className="py-3.5 px-4">Firmware</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {isLoadingDevices && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Loading device fleet...
                      </td>
                    </tr>
                  )}

                  {!isLoadingDevices && filteredDevices?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="font-semibold text-slate-400">No devices found</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Click "Onboard New Device" to register hardware.
                        </p>
                      </td>
                    </tr>
                  )}

                  {filteredDevices?.map((device) => {
                    const location = flatLocations?.find((l) => l.id === device.location_id);
                    const isOnline = device.status === 'online';

                    return (
                      <tr key={device.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="font-bold text-white font-mono text-sm">
                              {device.id}
                            </span>
                            <p className="text-slate-400 text-xs mt-0.5">{device.name}</p>
                            <span className="text-[10px] text-slate-500 font-mono">
                              SN: {device.hardware_serial}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOnline
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                              }`}
                            />
                            {device.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                              {device.product_id}
                            </span>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {device.hardware_type}
                            </p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {location ? (
                            <div className="flex items-center space-x-1.5 text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>{location.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] text-slate-300">
                            v{device.firmware_version || '1.0.0'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setSelectedDeviceForProvisioning(device)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center space-x-1"
                              title="View MQTT Provisioning Topics & Flash Credentials"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-400" />
                              <span>Credentials</span>
                            </button>
                            <button
                              onClick={() => handleDeleteDevice(device.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Decommission Device"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOPOLOGICAL HIERARCHY */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Manufacturing Plant Topology</h3>
              <p className="text-xs text-slate-400">
                Hierarchical plant organization: Site $\rightarrow$ Building $\rightarrow$ Production Line $\rightarrow$ Workcell.
              </p>
            </div>
            <button
              onClick={() => {
                setLocationParentId(null);
                setIsLocationModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Root Site</span>
            </button>
          </div>

          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4">
            {isLoadingLocations && (
              <p className="text-center text-xs text-slate-500 py-6">Loading topology tree...</p>
            )}

            {!isLoadingLocations && treeLocations?.length === 0 && (
              <div className="text-center py-10 text-slate-500">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="font-semibold text-slate-400">No factory locations defined</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Create your first manufacturing plant site.
                </p>
              </div>
            )}

            {treeLocations?.map((root) => renderLocationNode(root))}
          </div>
        </div>
      )}

      {/* TAB 3: TEAM & RBAC ACCESS */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Team & Access Control</h3>
              <p className="text-xs text-slate-400">
                Enforce granular role-based permissions (Owner, Admin, Manager, Operator, Viewer).
              </p>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Invite Team Member</span>
            </button>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-semibold">
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Assigned Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Joined Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {isLoadingMembers && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Loading team members...
                      </td>
                    </tr>
                  )}

                  {members?.map((member) => {
                    const roleColor =
                      member.role === 'owner'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : member.role === 'admin'
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : member.role === 'manager'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : member.role === 'operator'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700';

                    return (
                      <tr key={member.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                              {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-white">{member.full_name}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-400">{member.email}</td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${roleColor}`}
                          >
                            {member.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                            ACTIVE
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(member.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {member.role !== 'owner' && (
                            <button
                              onClick={() => handleRemoveMember(member.user_id, member.email)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Revoke Membership"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <DeviceOnboardingModal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
      />

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      <LocationCreateModal
        isOpen={isLocationModalOpen}
        onClose={() => {
          setIsLocationModalOpen(false);
          setLocationParentId(null);
        }}
        defaultParentId={locationParentId}
      />

      <ProvisioningDetailsModal
        device={selectedDeviceForProvisioning}
        isOpen={!!selectedDeviceForProvisioning}
        onClose={() => setSelectedDeviceForProvisioning(null)}
      />
    </div>
  );
};

