import React, { useState } from 'react';
import { X, Copy, Check, Radio, Cpu, Key, ShieldCheck } from 'lucide-react';
import { Device } from '../../api/types';
import { useOrgStore } from '../../stores/orgStore';

interface ProvisioningDetailsModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProvisioningDetailsModal: React.FC<ProvisioningDetailsModalProps> = ({
  device,
  isOpen,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const currentOrgId = useOrgStore((s) => s.currentOrg.id);

  if (!isOpen || !device) return null;

  const brokerUrl = 'mqtt://localhost:1883';
  const clientId = `kiot-${device.id}`;
  const telemetryTopic = `kiot/${currentOrgId}/devices/${device.id}/telemetry`;
  const commandsTopic = `kiot/${currentOrgId}/devices/${device.id}/commands`;
  const shadowGetTopic = `kiot/${currentOrgId}/devices/${device.id}/shadow/get`;
  const shadowUpdateTopic = `kiot/${currentOrgId}/devices/${device.id}/shadow/update`;

  const configJson = {
    brokerUrl,
    clientId,
    telemetryTopic,
    commandsTopic,
    shadowGetTopic,
    shadowUpdateTopic,
    hardwareSerial: device.hardware_serial,
    firmwareVersion: device.firmware_version || '1.0.0',
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Key className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                MQTT Provisioning Endpoints
              </h2>
              <p className="text-xs text-slate-400">
                Connection config for <span className="font-mono text-amber-400">{device.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-white">{device.name}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
              SN: {device.hardware_serial}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400 font-medium">MQTT Broker URL:</span>
                <p className="font-mono text-white mt-0.5">{brokerUrl}</p>
              </div>
              <button
                onClick={() => handleCopy(brokerUrl, 'brokerUrl')}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                {copiedField === 'brokerUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400 font-medium">Client ID:</span>
                <p className="font-mono text-slate-300 mt-0.5">{clientId}</p>
              </div>
              <button
                onClick={() => handleCopy(clientId, 'clientId')}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                {copiedField === 'clientId' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400 font-medium">Telemetry Topic:</span>
                <p className="font-mono text-emerald-300 mt-0.5">{telemetryTopic}</p>
              </div>
              <button
                onClick={() => handleCopy(telemetryTopic, 'telemetryTopic')}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                {copiedField === 'telemetryTopic' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400 font-medium">Commands Topic:</span>
                <p className="font-mono text-amber-300 mt-0.5">{commandsTopic}</p>
              </div>
              <button
                onClick={() => handleCopy(commandsTopic, 'commandsTopic')}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                {copiedField === 'commandsTopic' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400 font-medium">Shadow Update Topic:</span>
                <p className="font-mono text-sky-300 mt-0.5">{shadowUpdateTopic}</p>
              </div>
              <button
                onClick={() => handleCopy(shadowUpdateTopic, 'shadowUpdateTopic')}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                {copiedField === 'shadowUpdateTopic' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">
                JSON Flash Configuration
              </span>
              <button
                onClick={() => handleCopy(JSON.stringify(configJson, null, 2), 'configJson')}
                className="text-[11px] text-amber-400 hover:underline flex items-center space-x-1"
              >
                {copiedField === 'configJson' ? <span>Copied!</span> : <span>Copy JSON</span>}
              </button>
            </div>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto">
              {JSON.stringify(configJson, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

