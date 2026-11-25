export interface ModbusSlaveRegister {
  slaveId: number;
  deviceId: string;
  productId: 'industrial' | 'energy' | 'cold' | 'home';
  protocol: 'MODBUS_RTU_RS485' | 'MODBUS_TCP';
  registerAddress: number;
  metric: string;
  unit: string;
  scaleFactor: number;
  simulateValue: (tick: number) => number;
}

export const MODBUS_REGISTER_MAP: ModbusSlaveRegister[] = [
  // Slave 1: CNC-01 Spindle VFD & Vibration Sensor Node (Modbus TCP)
  {
    slaveId: 1,
    deviceId: 'DEV-ESP32-001',
    productId: 'industrial',
    protocol: 'MODBUS_TCP',
    registerAddress: 40001,
    metric: 'spindle_rpm',
    unit: 'RPM',
    scaleFactor: 1,
    simulateValue: (tick) => Number((3450 + Math.sin(tick * 0.3) * 45).toFixed(1)),
  },
  {
    slaveId: 1,
    deviceId: 'DEV-ESP32-001',
    productId: 'industrial',
    protocol: 'MODBUS_TCP',
    registerAddress: 40002,
    metric: 'temperature',
    unit: '°C',
    scaleFactor: 0.1,
    simulateValue: (tick) => Number((69.5 + Math.sin(tick * 0.2) * 2.1).toFixed(2)),
  },
  {
    slaveId: 1,
    deviceId: 'DEV-ESP32-001',
    productId: 'industrial',
    protocol: 'MODBUS_TCP',
    registerAddress: 40003,
    metric: 'vibration_rms',
    unit: 'mm/s',
    scaleFactor: 0.01,
    simulateValue: (tick) => Number((2.4 + Math.cos(tick * 0.4) * 0.45).toFixed(2)),
  },

  // Slave 2: Main Feeder 3-Phase Smart Energy Meter (Modbus RTU over RS-485)
  {
    slaveId: 2,
    deviceId: 'DEV-METER-001',
    productId: 'energy',
    protocol: 'MODBUS_RTU_RS485',
    registerAddress: 30001,
    metric: 'active_power',
    unit: 'kW',
    scaleFactor: 0.1,
    simulateValue: (tick) => Number((46.2 + Math.sin(tick * 0.25) * 3.4).toFixed(2)),
  },
  {
    slaveId: 2,
    deviceId: 'DEV-METER-001',
    productId: 'energy',
    protocol: 'MODBUS_RTU_RS485',
    registerAddress: 30003,
    metric: 'voltage_l1',
    unit: 'V',
    scaleFactor: 0.1,
    simulateValue: (tick) => Number((415.0 + Math.cos(tick * 0.15) * 2.8).toFixed(1)),
  },
  {
    slaveId: 2,
    deviceId: 'DEV-METER-001',
    productId: 'energy',
    protocol: 'MODBUS_RTU_RS485',
    registerAddress: 30005,
    metric: 'power_factor',
    unit: 'PF',
    scaleFactor: 0.01,
    simulateValue: (tick) => Number((0.96 + Math.sin(tick * 0.1) * 0.02).toFixed(3)),
  },

  // Slave 3: Deep Blast Freezer Chamber A Sensor (KIOT Cold)
  {
    slaveId: 3,
    deviceId: 'DEV-COLD-001',
    productId: 'cold',
    protocol: 'MODBUS_RTU_RS485',
    registerAddress: 30101,
    metric: 'chamber_temp_c',
    unit: '°C',
    scaleFactor: 0.1,
    simulateValue: (tick) => Number((-20.0 + Math.sin(tick * 0.2) * 0.8).toFixed(2)),
  },
  {
    slaveId: 3,
    deviceId: 'DEV-COLD-001',
    productId: 'cold',
    protocol: 'MODBUS_RTU_RS485',
    registerAddress: 30102,
    metric: 'humidity_pct',
    unit: '%',
    scaleFactor: 0.1,
    simulateValue: (tick) => Number((61.5 + Math.cos(tick * 0.15) * 1.4).toFixed(1)),
  },

  // Slave 4: GDP Biopharma Cold Room B Sensor (KIOT Cold)
  {
    slaveId: 4,
    deviceId: 'DEV-COLD-002',
    productId: 'cold',
    protocol: 'MODBUS_RTU_RS485',
    registerAddress: 30201,
    metric: 'chamber_temp_c',
    unit: '°C',
    scaleFactor: 0.1,
    simulateValue: (tick) => Number((4.1 + Math.cos(tick * 0.25) * 0.4).toFixed(2)),
  },
  {
    slaveId: 4,
    deviceId: 'DEV-COLD-002',
    productId: 'cold',
    protocol: 'MODBUS_RTU_RS485',
    registerAddress: 30202,
    metric: 'humidity_pct',
    unit: '%',
    scaleFactor: 0.1,
    simulateValue: (tick) => Number((54.8 + Math.sin(tick * 0.2) * 1.1).toFixed(1)),
  },

  // Slave 5: Smart Home & Facility Environmental Comfort Node (KIOT Home)
  {
    slaveId: 5,
    deviceId: 'DEV-HOME-001',
    productId: 'home',
    protocol: 'MODBUS_TCP',
    registerAddress: 40501,
    metric: 'indoor_temp_c',
    unit: '°C',
    scaleFactor: 0.1,
    simulateValue: (tick) => Number((22.4 + Math.sin(tick * 0.1) * 0.3).toFixed(1)),
  },
];

export interface PolledModbusReading {
  slaveId: number;
  deviceId: string;
  productId: string;
  protocol: string;
  registerAddress: number;
  metric: string;
  value: number;
  unit: string;
  deviceTimestamp: string;
  sequenceNumber: number;
}

export class ModbusPoller {
  private tick = 0;
  private sequenceNumber = 1;

  public pollAllRegisters(): PolledModbusReading[] {
    this.tick += 1;
    const nowIso = new Date().toISOString();

    return MODBUS_REGISTER_MAP.map((reg) => ({
      slaveId: reg.slaveId,
      deviceId: reg.deviceId,
      productId: reg.productId,
      protocol: reg.protocol,
      registerAddress: reg.registerAddress,
      metric: reg.metric,
      value: reg.simulateValue(this.tick),
      unit: reg.unit,
      deviceTimestamp: nowIso,
      sequenceNumber: this.sequenceNumber++,
    }));
  }
}
