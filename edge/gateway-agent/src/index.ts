import os from 'os';
import mqtt from 'mqtt';
import { createLogger } from '@kiot/logging';
import { config } from './config.js';
import { OfflineStoreAndForwardBuffer } from './offline-buffer.js';
import { ModbusPoller, MODBUS_REGISTER_MAP } from './modbus-poller.js';

const logger = createLogger('gateway-agent', 'info');
const offlineBuffer = new OfflineStoreAndForwardBuffer(
  config.OFFLINE_BUFFER_FILE,
  config.MAX_BUFFER_RECORDS
);
const modbusPoller = new ModbusPoller();

async function startGatewayAgent(): Promise<void> {
  const client = mqtt.connect(config.EMQX_BROKER_URL, {
    clientId: `kiot-edge-gateway-${config.GATEWAY_ID}-${Math.random().toString(16).slice(2, 6)}`,
    clean: true,
    reconnectPeriod: 3000,
  });

  let isBrokerConnected = false;

  const publishOrBuffer = (topic: string, payload: Record<string, unknown>) => {
    if (isBrokerConnected && client.connected) {
      client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          offlineBuffer.enqueue(topic, payload);
        }
      });
    } else {
      offlineBuffer.enqueue(topic, payload);
      logger.warn('Broker offline — queued telemetry packet to Store-and-Forward buffer', {
        gatewayId: config.GATEWAY_ID,
        bufferDepth: offlineBuffer.size(),
      });
    }
  };

  const flushOfflineBuffer = () => {
    if (!isBrokerConnected || offlineBuffer.size() === 0) return;
    const batch = offlineBuffer.drainBatch(50);
    for (const pkt of batch) {
      client.publish(
        pkt.topic,
        JSON.stringify({ ...pkt.payload, replayedFromBuffer: true, originalQueuedAt: pkt.queuedAt }),
        { qos: 1 }
      );
    }
    logger.info(`Flushed ${batch.length} buffered packets to EMQX broker`, {
      gatewayId: config.GATEWAY_ID,
      remainingInBuffer: offlineBuffer.size(),
    });
  };

  client.on('connect', () => {
    isBrokerConnected = true;
    logger.info('Connected to EMQX MQTT Broker', {
      gatewayId: config.GATEWAY_ID,
      broker: config.EMQX_BROKER_URL,
    });
    flushOfflineBuffer();
  });

  client.on('close', () => {
    isBrokerConnected = false;
  });

  client.on('error', (err) => {
    logger.error('MQTT connection error', err);
  });

  // 1. Periodic Gateway Heartbeat Emitter
  const sendHeartbeat = () => {
    const heartbeatTopic = `kiot/${config.ORGANIZATION_ID}/gateways/${config.GATEWAY_ID}/heartbeat`;
    const loadAvg = os.loadavg()[0] || 0.15;
    const memUsagePct = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);

    const payload = {
      gatewayId: config.GATEWAY_ID,
      organizationId: config.ORGANIZATION_ID,
      model: config.GATEWAY_MODEL,
      ipAddress: config.GATEWAY_IP,
      status: 'online',
      cpuLoadAvg: Number(loadAvg.toFixed(2)),
      memoryUsagePct: memUsagePct,
      offlineBufferDepth: offlineBuffer.size(),
      activeModbusSlaves: new Set(MODBUS_REGISTER_MAP.map((r) => r.slaveId)).size,
      polledRegistersCount: MODBUS_REGISTER_MAP.length,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };

    if (isBrokerConnected && client.connected) {
      client.publish(heartbeatTopic, JSON.stringify(payload), { qos: 1 });
    }
  };

  // 2. Periodic Modbus RTU/TCP Polling Loop
  const pollTimer = setInterval(() => {
    const readings = modbusPoller.pollAllRegisters();
    for (const reading of readings) {
      const topic = `kiot/${config.ORGANIZATION_ID}/devices/${reading.deviceId}/telemetry`;
      publishOrBuffer(topic, {
        productId: reading.productId,
        gatewayId: config.GATEWAY_ID,
        metric: reading.metric,
        value: reading.value,
        unit: reading.unit,
        quality: 'good',
        sequenceNumber: reading.sequenceNumber,
        deviceTimestamp: reading.deviceTimestamp,
        modbus: {
          protocol: reading.protocol,
          slaveId: reading.slaveId,
          register: reading.registerAddress,
        },
      });
    }

    if (offlineBuffer.size() > 0 && isBrokerConnected) {
      flushOfflineBuffer();
    }
  }, config.POLL_INTERVAL_MS);

  const heartbeatTimer = setInterval(sendHeartbeat, config.HEARTBEAT_INTERVAL_MS);
  setTimeout(sendHeartbeat, 1000);

  console.log(`
==================================================================
🏭 KIOT Industrial Edge Gateway Agent Started!
==================================================================
  • Gateway ID:          ${config.GATEWAY_ID} (${config.GATEWAY_MODEL})
  • Organization ID:     ${config.ORGANIZATION_ID}
  • Northbound MQTT:     ${config.EMQX_BROKER_URL}
  • Modbus Poll Rate:    ${config.POLL_INTERVAL_MS}ms (${MODBUS_REGISTER_MAP.length} registers across 2 slaves)
  • Offline Ring Buffer: ${config.OFFLINE_BUFFER_FILE} (Max: ${config.MAX_BUFFER_RECORDS})
==================================================================
`);

  const shutdown = () => {
    clearInterval(pollTimer);
    clearInterval(heartbeatTimer);
    client.end(true);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void startGatewayAgent();
