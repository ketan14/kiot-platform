import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Bell,
  Sliders,
  RefreshCw,
  Clock,
  CheckCheck,
  Mail,
  Webhook,
  Send,
  Plus,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import {
  useIncidents,
  useAlertRules,
  useAcknowledgeIncident,
  useResolveIncident,
  useNotificationChannels,
  useNotificationDeliveries,
  useCreateNotificationChannel,
  useDeleteNotificationChannel,
  useTestNotificationChannel,
} from '../api/alerts';
import { Incident, IncidentStatus } from '@kiot/shared-types';
import { useOrgStore } from '../stores/orgStore';

export const AlertsView: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'incidents' | 'notifications'>('incidents');
  const canManageAlerts = useOrgStore((s) => s.can('alerts:manage'));

  const [newChName, setNewChName] = useState('');
  const [newChType, setNewChType] = useState<'EMAIL' | 'WEBHOOK' | 'SLACK'>('EMAIL');
  const [newChTarget, setNewChTarget] = useState('');
  const [newChSeverity, setNewChSeverity] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('WARNING');
  const [testNotice, setTestNotice] = useState<string | null>(null);

  const { data: incidents, isLoading: isLoadingIncidents, refetch: refetchIncidents } = useIncidents();
  const { data: rules } = useAlertRules();
  const { data: channels } = useNotificationChannels();
  const { data: deliveries } = useNotificationDeliveries();

  const acknowledgeMutation = useAcknowledgeIncident();
  const resolveMutation = useResolveIncident();
  const createChannelMutation = useCreateNotificationChannel();
  const deleteChannelMutation = useDeleteNotificationChannel();
  const testChannelMutation = useTestNotificationChannel();

  const incidentList = incidents || [];
  const openCount = incidentList.filter((i) => i.status === 'OPEN').length;
  const criticalCount = incidentList.filter((i) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length;
  const ackCount = incidentList.filter((i) => i.status === 'ACKNOWLEDGED').length;

  const filteredIncidents = incidentList.filter((inc) => {
    if (statusFilter === 'ALL') return true;
    return inc.status === statusFilter;
  });

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to acknowledge incident:', err);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to resolve incident:', err);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChName || !newChTarget) return;
    await createChannelMutation.mutateAsync({
      name: newChName,
      channelType: newChType,
      target: newChTarget,
      minSeverity: newChSeverity,
    });
    setNewChName('');
    setNewChTarget('');
  };

  const handleTestChannel = async (id: string, name: string) => {
    await testChannelMutation.mutateAsync(id);
    setTestNotice(`Test notification dispatched to '${name}' and logged in Delivery Ledger.`);
    setTimeout(() => setTestNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <span>Real-Time Anomaly & Incident Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated threshold violation detection, machine trip alarms, and operator acknowledgment workflows.
          </p>
        </div>

        <button
          onClick={() => refetchIncidents()}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Critical Alarms</p>
            <p className="text-2xl font-black text-rose-400 font-mono">{criticalCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Open Incidents</p>
            <p className="text-2xl font-black text-amber-400 font-mono">{openCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Acknowledged</p>
            <p className="text-2xl font-black text-blue-400 font-mono">{ackCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Rules</p>
            <p className="text-2xl font-black text-emerald-400 font-mono">{rules?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation: Incident Stream vs Multi-Channel Notifications */}
      <div className="flex border-b border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveSubTab('incidents')}
          className={`pb-3 flex items-center space-x-2 transition border-b-2 ${
            activeSubTab === 'incidents'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Active Incident Stream & Threshold Rules ({incidentList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('notifications')}
          className={`pb-3 flex items-center space-x-2 transition border-b-2 ${
            activeSubTab === 'notifications'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Webhook className="w-4 h-4" />
          <span>
            Notification Channels & Escalation Ledger ({channels?.length || 0} Channels •{' '}
            {deliveries?.length || 0} Dispatches)
          </span>
        </button>
      </div>

      {activeSubTab === 'incidents' ? (
        <>
      {/* Incidents Table Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-white">Incident Stream</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
              {filteredIncidents.length} events
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800/80">
            {(['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  statusFilter === tab
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">Incident Title & Details</th>
                <th className="py-3 px-4">Breach Metric</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-sans">
              {isLoadingIncidents ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading incident history...
                  </td>
                </tr>
              ) : filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                    <p className="text-slate-300 font-semibold text-sm">No incidents match this filter</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      All machine telemetry readings are operating within nominal safety thresholds.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => {
                  const isCritical = incident.severity === 'CRITICAL';
                  const isOpen = incident.status === 'OPEN';
                  const isAck = incident.status === 'ACKNOWLEDGED';
                  const isResolved = incident.status === 'RESOLVED';

                  return (
                    <tr
                      key={incident.id}
                      className={`hover:bg-slate-800/40 transition ${
                        isOpen && isCritical ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Severity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isCritical ? (
                            <ShieldAlert className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          <span>{incident.severity}</span>
                        </span>
                      </td>

                      {/* Device */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                        {incident.device_id}
                      </td>

                      {/* Title & Message */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{incident.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {incident.message}
                        </div>
                      </td>

                      {/* Trigger Value vs Threshold */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-rose-400 font-bold">{incident.trigger_value}</span>
                        <span className="text-slate-500 text-[11px]"> / limit: {incident.threshold_value}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                            isOpen
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                              : isAck
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {incident.status}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {new Date(incident.created_at).toLocaleTimeString()}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        {isOpen && canManageAlerts && (
                          <button
                            onClick={() => handleAcknowledge(incident.id)}
                            disabled={acknowledgeMutation.isPending}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white transition shadow"
                          >
                            Acknowledge
                          </button>
                        )}
                        {isAck && canManageAlerts && (
                          <button
                            onClick={() => handleResolve(incident.id)}
                            disabled={resolveMutation.isPending}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition shadow"
                          >
                            Resolve
                          </button>
                        )}
                        {!isResolved && !canManageAlerts && (
                          <span className="text-slate-500 text-[11px] font-mono">Read-Only</span>
                        )}
                        {isResolved && (
                          <span className="text-emerald-400 text-xs font-medium flex items-center justify-end space-x-1">
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Resolved</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configured Threshold Rules Section */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Active Anomaly & Threshold Rules ({rules?.length || 0})</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {rules?.map((rule) => (
            <div
              key={rule.id}
              className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white truncate">{rule.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                      rule.severity === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {rule.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{rule.description}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">{rule.metric}</span>
                <span className="text-amber-400 font-bold">
                  {rule.condition} {rule.threshold}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      ) : (
        <div className="space-y-6">
          {testNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{testNotice}</span>
            </div>
          )}

          {/* Create Channel Form */}
          {canManageAlerts && (
            <form
              onSubmit={handleCreateChannel}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-3"
            >
              <input
                type="text"
                required
                placeholder="Channel Name (e.g. Shift Supervisor Email)"
                value={newChName}
                onChange={(e) => setNewChName(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
              <select
                value={newChType}
                onChange={(e) => setNewChType(e.target.value as 'EMAIL' | 'WEBHOOK' | 'SLACK')}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value="EMAIL">EMAIL Dispatch</option>
                <option value="WEBHOOK">WEBHOOK (HTTP POST + HMAC)</option>
                <option value="SLACK">SLACK Ops Webhook</option>
              </select>
              <input
                type="text"
                required
                placeholder="Target Email(s) or Webhook URL"
                value={newChTarget}
                onChange={(e) => setNewChTarget(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
              />
              <select
                value={newChSeverity}
                onChange={(e) => setNewChSeverity(e.target.value as 'INFO' | 'WARNING' | 'CRITICAL')}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value="INFO">Min Severity: INFO</option>
                <option value="WARNING">Min Severity: WARNING</option>
                <option value="CRITICAL">Min Severity: CRITICAL</option>
              </select>
              <button
                type="submit"
                disabled={createChannelMutation.isPending}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Channel</span>
              </button>
            </form>
          )}

          {/* Configured Channels Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {channels?.map((ch) => {
              const Icon =
                ch.channel_type === 'EMAIL'
                  ? Mail
                  : ch.channel_type === 'WEBHOOK'
                    ? Webhook
                    : MessageSquare;

              return (
                <div
                  key={ch.id}
                  className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <Icon className="w-3 h-3" />
                        <span>{ch.channel_type}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Min: <strong className="text-white">{ch.min_severity}</strong>
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-2">{ch.name}</h3>
                    <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                      {ch.target}
                    </p>
                  </div>

                  {canManageAlerts && (
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => void handleTestChannel(ch.id, ch.name)}
                        disabled={testChannelMutation.isPending}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center space-x-1.5"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send Test Alert</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteChannelMutation.mutateAsync(ch.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Delivery Ledger Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                Outbound Notification Delivery & Escalation Ledger
              </span>
              <span className="text-xs font-mono text-slate-400">
                Worker: @kiot/notification-worker
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Sent At</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Subject / Alert</th>
                    <th className="py-3 px-4">Recipient / Endpoint</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">HTTP / Ack</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-mono">
                  {deliveries?.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(d.sent_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                          {d.channel_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans font-semibold text-white">{d.subject}</td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{d.recipient}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.status === 'ESCALATED'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : d.status === 'SENT'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-emerald-400">
                        {d.response_code ? `HTTP ${d.response_code}` : 'OK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

