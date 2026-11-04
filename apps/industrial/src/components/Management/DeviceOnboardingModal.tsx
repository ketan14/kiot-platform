import React, { useState } from 'react';
import {
  X,
  Cpu,
  MapPin,
  Key,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Radio,
  Sliders,
} from 'lucide-react';
import {
  useCreateDevice,
  useLocations,
  useGateways,
  DeviceOnboardInput,
  DeviceProvisioningResult,
} from '../../api/management';

interface DeviceOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceOnboardingModal: React.FC<DeviceOnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form State
  const [deviceId, setDeviceId] = useState('');
  const [name, setName] = useState('');
  const [productId, setProductId] = useState<'industrial' | 'cold' | 'home' | 'energy'>('industrial');
  const [hardwareType, setHardwareType] = useState<'esp32' | 'linux_gateway' | 'third_party'>('esp32');
  const [hardwareSerial, setHardwareSerial] = useState('');
  const [firmwareVersion, setFirmwareVersion] = useState('1.0.0');
  const [locationId, setLocationId] = useState<string>('');
  const [gatewayId, setGatewayId] = useState<string>('');
  const [samplingRate, setSamplingRate] = useState('1000');

  // Mutation and lookup queries
  const createDeviceMutation = useCreateDevice();
  const { data: locations } = useLocations(false);
  const { data: gateways } = useGateways();

  // Provisioning Result from Step 2 completion
  const [provisioningResult, setProvisioningResult] = useState<DeviceProvisioningResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId.trim() || !name.trim() || !hardwareSerial.trim()) {
      setErrorMessage('Device ID, Friendly Name, and Hardware Serial are required.');
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  const handleFinishOnboarding = async () => {
    setErrorMessage(null);
    const payload: DeviceOnboardInput = {
      id: deviceId.trim(),
      name: name.trim(),
      productId,
      hardwareType,
      hardwareSerial: hardwareSerial.trim(),
      firmwareVersion: firmwareVersion.trim() || '1.0.0',
      locationId: locationId ? locationId : null,
      gatewayId: gatewayId ? gatewayId : null,
      metadata: {
        samplingRateMs: parseInt(samplingRate, 10) || 1000,
        registeredVia: 'Industrial_Admin_Wizard',
      },
    };

    try {
      const result = await createDeviceMutation.mutateAsync(payload);
      setProvisioningResult(result);
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to onboard device. Check ID uniqueness.');
    }
  };

  const handleResetAndClose = () => {
    setStep(1);
    setDeviceId('');
    setName('');
    setHardwareSerial('');
    setFirmwareVersion('1.0.0');
    setLocationId('');
    setGatewayId('');
    setProvisioningResult(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Radio className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Device Onboarding Wizard
              </h2>
              <p className="text-xs text-slate-400">
                Register edge hardware, assign factory line, and generate MQTT provisioning tokens
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 1
                  ? 'bg-amber-500 text-slate-950'
                  : step > 1
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-500'
              }`}
            >
              1
            </span>
            <span className={step === 1 ? 'font-semibold text-white' : 'text-slate-400'}>
              Hardware Identity
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
          <div className="flex items-center space-x-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 2
                  ? 'bg-amber-500 text-slate-950'
                  : step > 2
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-500'
              }`}
            >
              2
            </span>
            <span className={step === 2 ? 'font-semibold text-white' : 'text-slate-400'}>
              Factory Topology
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600" />
          <div className="flex items-center space-x-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step === 3
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              3
            </span>
            <span className={step === 3 ? 'font-semibold text-emerald-400' : 'text-slate-400'}>
              Provisioning & Credentials
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Hardware Identity */}
          {step === 1 && (
            <form id="onboard-step-1" onSubmit={handleNextFromStep1} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Device Identifier (ID) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DEV-ESP32-002"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Alphanumeric, dashes, uppercase (used in MQTT topics)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Friendly Device Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CNC Mill #2 Vibration Sensor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Product Domain
                  </label>
                  <select
                    value={productId}
                    onChange={(e: any) => setProductId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="industrial">Industrial Machinery (IIoT)</option>
                    <option value="energy">Energy & Power Metering</option>
                    <option value="cold">Cold Storage & HVAC</option>
                    <option value="home">Home Automation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hardware Architecture
                  </label>
                  <select
                    value={hardwareType}
                    onChange={(e: any) => setHardwareType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="esp32">ESP32 Dual-Core (FreeRTOS)</option>
                    <option value="linux_gateway">Linux Edge Gateway / IPC</option>
                    <option value="third_party">Third-Party Modbus / RS485</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hardware Serial Number <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SN-ESP32-8823719"
                    value={hardwareSerial}
                    onChange={(e) => setHardwareSerial(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Factory engraved hardware serial / MAC suffix
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Initial Firmware Version
                  </label>
                  <input
                    type="text"
                    placeholder="1.0.0"
                    value={firmwareVersion}
                    onChange={(e) => setFirmwareVersion(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>
            </form>
          )}

          {/* STEP 2: Factory Topology & Assignment */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Factory Location (Plant / Line / Workcell)
                </label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- No Direct Location Assigned --</option>
                  {locations?.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      [{loc.type.toUpperCase()}] {loc.name} {loc.code ? `(${loc.code})` : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Maps telemetry stream directly into factory hierarchy tree
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Assigned Industrial Edge Gateway (Optional)
                </label>
                <select
                  value={gatewayId}
                  onChange={(e) => setGatewayId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Direct Cloud / Wi-Fi Connection (No Gateway) --</option>
                  {gateways?.map((gw) => (
                    <option key={gw.id} value={gw.id}>
                      {gw.name} ({gw.model}) - {gw.ip_address || 'DHCP'}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Route packets through on-premise Linux gateway aggregator if airgapped
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Telemetry Sampling Rate (ms)
                </label>
                <input
                  type="number"
                  min="100"
                  max="60000"
                  step="100"
                  value={samplingRate}
                  onChange={(e) => setSamplingRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Sensor loop interval (e.g. 1000ms = 1Hz, 100ms = 10Hz)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
                <span className="font-semibold text-slate-300">Ready to Register:</span>
                <div className="flex items-center space-x-2 text-slate-400">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>Device ID: <strong className="text-white font-mono">{deviceId}</strong></span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    Location:{' '}
                    <strong className="text-white">
                      {locations?.find((l) => l.id === locationId)?.name || 'Unassigned'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Provisioning Success & MQTT Credentials */}
          {step === 3 && provisioningResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-300">
                    Device Successfully Provisioned!
                  </h4>
                  <p className="text-xs text-emerald-400/80 mt-0.5">
                    Hardware record and empty Device Shadow initialized. Use these MQTT connection
                    parameters in your ESP32 or gateway configuration.
                  </p>
                </div>
              </div>

              {/* MQTT Topics & Endpoints */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-slate-400 font-medium">MQTT Broker URL:</span>
                    <p className="font-mono text-white mt-0.5">{provisioningResult.provisioning.mqtt.brokerUrl}</p>
                  </div>
                  <button
                    onClick={() =>
                      handleCopy(provisioningResult.provisioning.mqtt.brokerUrl, 'brokerUrl')
                    }
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {copiedField === 'brokerUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-slate-400 font-medium">Telemetry Topic (Publish):</span>
                    <p className="font-mono text-emerald-300 mt-0.5">
                      {provisioningResult.provisioning.mqtt.telemetryTopic}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleCopy(provisioningResult.provisioning.mqtt.telemetryTopic, 'telemetryTopic')
                    }
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {copiedField === 'telemetryTopic' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-slate-400 font-medium">Commands Topic (Subscribe):</span>
                    <p className="font-mono text-amber-300 mt-0.5">
                      {provisioningResult.provisioning.mqtt.commandsTopic}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleCopy(provisioningResult.provisioning.mqtt.commandsTopic, 'commandsTopic')
                    }
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {copiedField === 'commandsTopic' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-slate-400 font-medium">Device Shadow Get / Update:</span>
                    <p className="font-mono text-sky-300 mt-0.5">
                      {provisioningResult.provisioning.mqtt.shadowUpdateTopic}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleCopy(provisioningResult.provisioning.mqtt.shadowUpdateTopic, 'shadowUpdateTopic')
                    }
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {copiedField === 'shadowUpdateTopic' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* JSON Flash Configuration */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">
                    Flash Config (device_config.json)
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        JSON.stringify(provisioningResult.provisioning.mqtt, null, 2),
                        'jsonConfig'
                      )
                    }
                    className="text-[11px] text-amber-400 hover:underline flex items-center space-x-1"
                  >
                    {copiedField === 'jsonConfig' ? <span>Copied!</span> : <span>Copy JSON</span>}
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {JSON.stringify(provisioningResult.provisioning.mqtt, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="onboard-step-1"
                className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20"
              >
                <span>Continue to Topology</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition flex items-center space-x-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={createDeviceMutation.isPending}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {createDeviceMutation.isPending ? (
                  <span>Registering Device...</span>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    <span>Complete Onboarding & Generate Credentials</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === 3 && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-6 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Close & View in Fleet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

