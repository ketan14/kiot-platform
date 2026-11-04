import mqtt from 'mqtt';
import { config } from '../config.js';

export const mqttClient = mqtt.connect(`mqtt://${config.EMQX_HOST}:${config.EMQX_PORT}`, {
  clientId: `kiot_api_service_${Math.random().toString(16).substring(2, 8)}`,
  clean: true,
  connectTimeout: 5000,
  reconnectPeriod: 2000,
});

mqttClient.on('connect', () => {
  console.log(`[MQTT] Connected to EMQX broker at ${config.EMQX_HOST}:${config.EMQX_PORT}`);
});

mqttClient.on('error', (err) => {
  console.error('[MQTT Error]:', err.message);
});

/**
 * Publish command to device on standard KIOT topic:
 * kiot/{organizationId}/devices/{deviceId}/commands
 */
export async function publishDeviceCommand(
  organizationId: string,
  deviceId: string,
  command: Record<string, unknown>
): Promise<void> {
  const topic = `kiot/${organizationId}/devices/${deviceId}/commands`;
  const payload = JSON.stringify(command);

  return new Promise((resolve, reject) => {
    mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error(`[MQTT] Failed to publish command to ${topic}:`, err);
        return reject(err);
      }
      console.log(`[MQTT] Command published to ${topic}`);
      resolve();
    });
  });
}

