import mqtt, { MqttClient } from 'mqtt';
import { CncPhysicsModel } from './models/cnc-device.js';
import { PowerMeterPhysicsModel } from './models/power-meter.js';

export interface DeviceAgentOptions {
  brokerUrl: string;
  organizationId: string;
  cncDeviceId?: string;
  cncDeviceIds?: string[];
  meterDeviceId?: string;
  meterDeviceIds?: string[];
  intervalMs?: number;
  onLog?: (msg: string) => void;
}

export class VirtualDeviceFleet {
  private client: MqttClient | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;

  public readonly cncs: CncPhysicsModel[] = [];
  public readonly meters: PowerMeterPhysicsModel[] = [];

  constructor(private readonly options: DeviceAgentOptions) {
    const cncIds =
      options.cncDeviceIds && options.cncDeviceIds.length > 0
        ? options.cncDeviceIds
        : [options.cncDeviceId || 'DEV-ESP32-001'];

    const meterIds =
      options.meterDeviceIds && options.meterDeviceIds.length > 0
        ? options.meterDeviceIds
        : [options.meterDeviceId || 'DEV-METER-001'];

    this.cncs = cncIds.map((id) => new CncPhysicsModel(id));
    this.meters = meterIds.map((id) => new PowerMeterPhysicsModel(id));
  }

  public get cnc(): CncPhysicsModel {
    return this.cncs[0]!;
  }

  public get meter(): PowerMeterPhysicsModel {
    return this.meters[0]!;
  }

  private log(message: string): void {
    if (this.options.onLog) {
      this.options.onLog(message);
    } else {
      console.log(`[Virtual Fleet] ${message}`);
    }
  }

  public async start(): Promise<void> {
    const { brokerUrl, organizationId } = this.options;

    this.client = mqtt.connect(brokerUrl, {
      clientId: `kiot_sim_fleet_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      connectTimeout: 5000,
    });

    await new Promise<void>((resolve, reject) => {
      this.client!.on('connect', () => {
        this.log(`✔ Connected to EMQX Broker at ${brokerUrl}`);
        resolve();
      });
      this.client!.on('error', (err) => {
        this.log(`❌ MQTT Connection Error: ${err.message}`);
        reject(err);
      });
    });

    // Subscriptions for inbound commands across all simulated devices
    const commandTopics = [
      ...this.cncs.map((c) => `kiot/${organizationId}/devices/${c.deviceId}/commands`),
      ...this.meters.map((m) => `kiot/${organizationId}/devices/${m.deviceId}/commands`),
    ];

    this.client.subscribe(commandTopics, { qos: 1 }, (err) => {
      if (err) {
        this.log(`❌ Failed to subscribe to command topics: ${err.message}`);
      } else {
        const activeIds = [...this.cncs.map((c) => c.deviceId), ...this.meters.map((m) => m.deviceId)];
        this.log(`✔ Subscribed to inbound commands for [${activeIds.join(', ')}]`);
      }
    });

    // Handle inbound commands dispatched from API / User Dashboard
    this.client.on('message', (topic: string, messageBuf: Buffer) => {
      this.handleInboundMqttMessage(topic, messageBuf);
    });

    // Publish initial reported device state for each device
    for (const c of this.cncs) {
      this.publishDeviceState(c.deviceId, {
        status: 'online',
        firmware_version: 'v2.4.1-esp32',
        spindle_state: 'IDLE',
        coolant_pump: 'ON',
      });
    }

    for (const m of this.meters) {
      this.publishDeviceState(m.deviceId, {
        status: 'online',
        firmware_version: 'v1.0.0-meter',
      });
    }

    // Start periodic high-resolution telemetry streaming
    const interval = this.options.intervalMs || 1000;
    this.intervalTimer = setInterval(() => {
      this.publishTelemetryTick();
    }, interval);

    this.log(`✔ Telemetry streaming engine active (${interval}ms interval)`);
  }

  private handleInboundMqttMessage(topic: string, messageBuf: Buffer): void {
    const parts = topic.split('/');
    // Expected pattern: kiot/{orgId}/devices/{deviceId}/commands (length: 5)
    if (parts.length !== 5 || parts[4] !== 'commands') return;

    const deviceId = parts[3];
    if (!deviceId) return;

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(messageBuf.toString('utf-8'));
    } catch {
      this.log(`⚠ Received unparseable command JSON on ${topic}`);
      return;
    }

    const commandId = payload.commandId || payload.id || `cmd_${Date.now()}`;
    const commandType = payload.commandType || payload.command_type || payload.type;
    const cmdData = payload.payload || {};

    this.log(`📥 [COMMAND RECEIVED] Device: ${deviceId} | Type: ${commandType} | ID: ${commandId}`);

    let executionSuccess = true;
    let executionNote = 'Executed successfully';

    const matchedCnc = this.cncs.find((c) => c.deviceId === deviceId);
    if (matchedCnc) {
      if (commandType === 'SET_SPEED') {
        const rpm = Number(cmdData.rpm);
        if (!isNaN(rpm)) {
          matchedCnc.setTargetSpeed(rpm);
          executionNote = `VFD Inverter set target to ${rpm} RPM`;
        }
      } else if (commandType === 'SET_RELAY') {
        const relay = String(cmdData.relay || 'coolant_pump');
        const state = String(cmdData.state || 'ON').toUpperCase() as 'ON' | 'OFF';
        matchedCnc.setRelayState(relay, state);
        executionNote = `Relay '${relay}' switched ${state}`;
      } else if (commandType === 'EMERGENCY_STOP') {
        matchedCnc.emergencyStop();
        executionNote = 'EMERGENCY STOP TRIGGERED: Motor inverter halted';
      } else if (commandType === 'RESET_FAULT') {
        matchedCnc.resetFault();
        executionNote = 'Fault flags cleared. Resuming nominal operation';
      }
    }

    // Publish Command ACK back to platform
    this.publishCommandAck(deviceId, commandId, executionSuccess ? 'SUCCEEDED' : 'FAILED', executionNote);
  }

  private publishCommandAck(
    deviceId: string,
    commandId: string,
    status: 'SUCCEEDED' | 'FAILED',
    message: string
  ): void {
    if (!this.client) return;

    const { organizationId } = this.options;
    const ackTopic = `kiot/${organizationId}/devices/${deviceId}/commands/${commandId}/ack`;
    const ackPayload = {
      commandId,
      status,
      message,
      completedAt: new Date().toISOString(),
    };

    this.client.publish(ackTopic, JSON.stringify(ackPayload), { qos: 1 }, (err) => {
      if (err) {
        this.log(`❌ Failed to publish ACK for command ${commandId}: ${err.message}`);
      } else {
        this.log(`📤 [ACK SENT] ${deviceId} -> Command #${commandId.slice(0, 8)} (${status}) - ${message}`);
      }
    });
  }

  private publishDeviceState(deviceId: string, state: Record<string, unknown>): void {
    if (!this.client) return;
    const { organizationId } = this.options;
    const topic = `kiot/${organizationId}/devices/${deviceId}/state`;
    this.client.publish(topic, JSON.stringify({ reported: state, timestamp: new Date().toISOString() }), { qos: 1 });
  }

  private publishTelemetryTick(): void {
    if (!this.client) return;

    const { organizationId } = this.options;

    // 1. Advance all CNC physics & publish
    for (const cnc of this.cncs) {
      const cncData = cnc.tick();
      const cncTopic = `kiot/${organizationId}/devices/${cnc.deviceId}/telemetry`;
      this.client.publish(cncTopic, JSON.stringify(cncData), { qos: 1 });
    }

    // 2. Advance all Power Meter physics & publish
    for (const meter of this.meters) {
      const meterData = meter.tick();
      const meterTopic = `kiot/${organizationId}/devices/${meter.deviceId}/telemetry`;
      this.client.publish(meterTopic, JSON.stringify(meterData), { qos: 1 });
    }
  }

  public stop(): void {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    if (this.client) {
      this.client.end(true);
      this.log('Virtual Device Fleet disconnected.');
    }
  }
}
