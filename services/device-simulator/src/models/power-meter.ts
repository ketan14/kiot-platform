export interface MeterTelemetrySnapshot {
  voltage_v: number;
  current_a: number;
  power_kw: number;
  power_factor: number;
  frequency_hz: number;
  timestamp: string;
}

export class PowerMeterPhysicsModel {
  private step: number = 0;

  constructor(public readonly deviceId: string = 'DEV-METER-001') {}

  public tick(): MeterTelemetrySnapshot {
    this.step += 0.1;

    const voltage = +(415.0 + Math.sin(this.step * 0.5) * 3.5 + (Math.random() * 1.0 - 0.5)).toFixed(1);
    const current = +(18.4 + Math.sin(this.step * 0.8) * 2.2 + (Math.random() * 0.8 - 0.4)).toFixed(2);
    const power = +((voltage * current * 1.732 * 0.95) / 1000).toFixed(2);
    const powerFactor = +(0.95 + Math.sin(this.step * 0.3) * 0.02 + (Math.random() * 0.01 - 0.005)).toFixed(3);
    const frequency = +(50.0 + Math.sin(this.step * 0.2) * 0.04 + (Math.random() * 0.02 - 0.01)).toFixed(2);

    return {
      voltage_v: voltage,
      current_a: current,
      power_kw: power,
      power_factor: powerFactor,
      frequency_hz: frequency,
      timestamp: new Date().toISOString(),
    };
  }
}

