import mqtt, { MqttClient } from 'mqtt';
import { CncPhysicsModel } from './models/cnc-device.js';
import { PowerMeterPhysicsModel } from './models/power-meter.js';

export interface DeviceAgentOptions {
  brokerUrl: string;
  organizationId: string;
  cncDeviceId: string;
  meterDeviceId: string;
  intervalMs?: number;
  onLog?: (msg: string) => void;
}

export class VirtualDeviceFleet {
  private client: MqttClient | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;

  public readonly cnc: CncPhysicsModel;
  public readonly meter: PowerMeterPhysicsModel;

  constructor(private readonly options: DeviceAgentOptions) {
    this.cnc = new CncPhysicsModel(options.cncDeviceId);
    this.meter = new PowerMeterPhysicsModel(options.meterDeviceId);
  }

  private log(message: string): void {
    if (this.options.onLog) {
      this.options.onLog(message);
    } else {
      console.log(`[Virtual Fleet] ${message}`);
    }
  }

  public async start(): Promise<void> {
    const { brokerUrl, organizationId, cncDeviceId, meterDeviceId } = this.options;

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

    // Subscriptions for inbound commands (exact topic only, avoiding ACK loop)
    const commandTopics = [
      `kiot/${organizationId}/devices/${cncDeviceId}/commands`,
      `kiot/${organizationId}/devices/${meterDeviceId}/commands`,
    ];

    this.client.subscribe(commandTopics, { qos: 1 }, (err) => {
      if (err) {
        this.log(`❌ Failed to subscribe to command topics: ${err.message}`);
      } else {
        this.log(`✔ Subscribed to inbound commands: ${cncDeviceId} & ${meterDeviceId}`);
      }
    });

    // Handle inbound commands dispatched from API / User Dashboard
    this.client.on('message', (topic: string, messageBuf: Buffer) => {
      this.handleInboundMqttMessage(topic, messageBuf);
    });

    // Publish initial reported device state
    this.publishDeviceState(cncDeviceId, {
      status: 'online',
      firmware_version: 'v2.4.1-esp32',
      spindle_state: 'IDLE',
      coolant_pump: 'ON',
    });

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

    if (deviceId === this.cnc.deviceId) {
      if (commandType === 'SET_SPEED') {
        const rpm = Number(cmdData.rpm);
        if (!isNaN(rpm)) {
          this.cnc.setTargetSpeed(rpm);
          executionNote = `VFD Inverter set target to ${rpm} RPM`;
        }
      } else if (commandType === 'SET_RELAY') {
        const relay = String(cmdData.relay || 'coolant_pump');
        const state = String(cmdData.state || 'ON').toUpperCase() as 'ON' | 'OFF';
        this.cnc.setRelayState(relay, state);
        executionNote = `Relay '${relay}' switched ${state}`;
      } else if (commandType === 'EMERGENCY_STOP') {
        this.cnc.emergencyStop();
        executionNote = 'EMERGENCY STOP TRIGGERED: Motor inverter halted';
      } else if (commandType === 'RESET_FAULT') {
        this.cnc.resetFault();
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

    // 1. Advance CNC physics & publish
    const cncData = this.cnc.tick();
    const cncTopic = `kiot/${organizationId}/devices/${this.cnc.deviceId}/telemetry`;
    this.client.publish(cncTopic, JSON.stringify(cncData), { qos: 1 });

    // 2. Advance Power Meter physics & publish
    const meterData = this.meter.tick();
    const meterTopic = `kiot/${organizationId}/devices/${this.meter.deviceId}/telemetry`;
    this.client.publish(meterTopic, JSON.stringify(meterData), { qos: 1 });
  }

  public stop(): void {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    if (this.client) {
      this.client.end(true);
      this.log('Virtual Device Fleet disconnected.');
    }
  }
}
