import { config } from './config.js';
import { VirtualDeviceFleet } from './device-agent.js';

const brokerUrl = `mqtt://${config.EMQX_HOST}:${config.EMQX_PORT}`;

console.clear?.();
console.log(`
==================================================================
🤖 KIOT VIRTUAL EDGE DEVICE SIMULATOR (IIoT Fleet)
==================================================================
  • Broker:       ${brokerUrl}
  • Organization: ${config.ORG_ID}
  • CNC Nodes:    ${config.CNC_DEVICE_IDS.join(', ')}
  • Power Nodes:  ${config.METER_DEVICE_ID}
  • Rate:         1 packet / sec (${config.TELEMETRY_INTERVAL_MS}ms)
==================================================================
  Interactive Keyboard Controls:
    [1] 🟢 Mode: NORMAL (Nominal 3200 RPM, Coolant ON)
    [2] 🟡 Mode: HIGH_LOAD (4800 RPM, Elevated Thermal)
    [3] 🔴 Mode: VIBRATION FAULT (Radial Vibration > 5.0 mm/s)
    [4] 💥 Mode: OVERHEAT FAULT (Bearing Temp > 78.0 °C)
    [5] 🛑 Mode: EMERGENCY STOP (Halt all actuators immediately)
    [6] 🔄 Mode: RESET FAULTS (Restore nominal state)
    [q] 🚪 Quit Simulator
==================================================================
`);

const fleet = new VirtualDeviceFleet({
  brokerUrl,
  organizationId: config.ORG_ID,
  cncDeviceIds: config.CNC_DEVICE_IDS,
  meterDeviceId: config.METER_DEVICE_ID,
  intervalMs: config.TELEMETRY_INTERVAL_MS,
  onLog: (msg) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${msg}`);
  },
});

await fleet.start();

// Handle Interactive Keypresses in Terminal if TTY available
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key: string) => {
    const k = key.trim().toLowerCase();
    if (k === '1') {
      fleet.cncs.forEach((c) => c.setMode('NORMAL'));
      console.log('\n>>> Switched all CNC nodes to NORMAL MODE (Nominal 3200 RPM, Coolant ON)');
    } else if (k === '2') {
      fleet.cncs.forEach((c) => c.setMode('HIGH_LOAD'));
      console.log('\n>>> Switched all CNC nodes to HIGH LOAD MODE (4800 RPM)');
    } else if (k === '3') {
      fleet.cncs.forEach((c) => c.setMode('VIBRATION_FAULT'));
      console.log('\n>>> INJECTED VIBRATION FAULT! Radial vibration will spike past 4.5 mm/s alarm line!');
    } else if (k === '4') {
      fleet.cncs.forEach((c) => c.setMode('OVERHEAT'));
      console.log('\n>>> INJECTED THERMAL FAULT! Bearing temperature climbing past 75°C trip threshold!');
    } else if (k === '5') {
      fleet.cncs.forEach((c) => c.emergencyStop());
      console.log('\n>>> EMERGENCY STOP EXECUTED! Spindles cut off.');
    } else if (k === '6') {
      fleet.cncs.forEach((c) => c.resetFault());
      console.log('\n>>> FAULTS RESET: Resuming normal operation.');
    } else if (k === 'q' || key === '\u0003') {
      // Ctrl+C or 'q'
      console.log('\nExiting Virtual Device Simulator...');
      fleet.stop();
      process.exit(0);
    }
  });
}

// Graceful Shutdown
process.on('SIGINT', () => {
  fleet.stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  fleet.stop();
  process.exit(0);
});
