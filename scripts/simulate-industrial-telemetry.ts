/**
 * Live Industrial Telemetry Generator / Simulator
 * 
 * Continuously publishes realistic CNC and factory machine telemetry to EMQX:
 * - Spindle RPM (2800 - 3400 RPM with smooth sine/noise variation)
 * - Radial Vibration RMS (2.8 - 4.1 mm/s)
 * - Bearing Core Temperature (56.0 - 62.0 °C)
 * - Active Power Consumption (8.5 - 12.2 kW)
 * 
 * Frequency: 1 packet per second (or configurable via SIM_INTERVAL_MS)
 */

import mqtt from 'mqtt';

const ORG_ID = process.env.ORG_ID || '00000000-0000-4000-a000-000000000001';
const DEVICE_ID = process.env.DEVICE_ID || 'DEV-ESP32-001';
const BROKER_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const INTERVAL_MS = parseInt(process.env.SIM_INTERVAL_MS || '1000', 10);

console.log(`
==================================================================
⚡ Starting KIOT Industrial Sensor Telemetry Simulator...
==================================================================
  • Broker:   ${BROKER_URL}
  • Org:      ${ORG_ID}
  • Device:   ${DEVICE_ID}
  • Rate:     Every ${INTERVAL_MS}ms
==================================================================
`);

const client = mqtt.connect(BROKER_URL, {
  clientId: `sim_sensor_${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
});

let step = 0;

client.on('connect', () => {
  console.log('✔ Connected to EMQX. Streaming live factory telemetry packets...');

  const topic = `kiot/${ORG_ID}/devices/${DEVICE_ID}/telemetry`;

  setInterval(() => {
    step += 0.1;

    // Realistic physical dynamics with sine waves + random noise
    const rpm = Math.round(3150 + Math.sin(step) * 120 + (Math.random() * 40 - 20));
    const vibration = +(3.35 + Math.sin(step * 0.7) * 0.35 + (Math.random() * 0.15 - 0.075)).toFixed(2);
    const temperature = +(58.2 + Math.sin(step * 0.2) * 1.8 + (Math.random() * 0.2 - 0.1)).toFixed(1);
    const power = +(9.8 + (rpm / 3200) * 1.5 + (Math.random() * 0.3 - 0.15)).toFixed(2);

    const payload = {
      spindle_speed_rpm: rpm,
      vibration_rms: vibration,
      temperature_bearing: temperature,
      power_kw: power,
      timestamp: new Date().toISOString(),
    };

    client.publish(topic, JSON.stringify(payload), { qos: 1 });

    process.stdout.write(
      `\r[Telemetry Push] RPM: ${rpm} | Vib: ${vibration} mm/s | Temp: ${temperature} °C | Power: ${power} kW    `
    );
  }, INTERVAL_MS);
});

client.on('error', (err) => {
  console.error('\n❌ MQTT Simulator Error:', err.message);
});

process.on('SIGINT', () => {
  console.log('\n[Simulator] Shutting down...');
  client.end(true, () => process.exit(0));
});

