export type CncOperationalMode =
  | 'NORMAL'
  | 'HIGH_LOAD'
  | 'VIBRATION_FAULT'
  | 'OVERHEAT'
  | 'EMERGENCY_STOPPED'
  | 'IDLE';

export interface CncTelemetrySnapshot {
  spindle_speed_rpm: number;
  vibration_rms: number;
  temperature_bearing: number;
  power_kw: number;
  coolant_pump: 'ON' | 'OFF';
  timestamp: string;
}

export class CncPhysicsModel {
  private currentRpm: number = 3200;
  private targetRpm: number = 3200;
  private currentVibration: number = 3.35;
  private currentTemp: number = 58.2;
  private coolantPump: 'ON' | 'OFF' = 'ON';
  private mode: CncOperationalMode = 'NORMAL';
  private step: number = 0;

  constructor(public readonly deviceId: string = 'DEV-ESP32-001') {}

  public getMode(): CncOperationalMode {
    return this.mode;
  }

  public setMode(mode: CncOperationalMode): void {
    this.mode = mode;
    if (mode === 'IDLE') {
      this.targetRpm = 0;
    } else if (mode === 'HIGH_LOAD') {
      this.targetRpm = 4800;
    } else if (mode === 'NORMAL') {
      this.targetRpm = 3200;
    } else if (mode === 'EMERGENCY_STOPPED') {
      this.targetRpm = 0;
      this.currentRpm = 0;
      this.coolantPump = 'OFF';
    }
  }

  public setTargetSpeed(rpm: number): void {
    if (this.mode === 'EMERGENCY_STOPPED') return;
    this.targetRpm = Math.max(0, Math.min(rpm, 6000));
    if (this.targetRpm > 0 && this.mode === 'IDLE') {
      this.mode = 'NORMAL';
    }
  }

  public setRelayState(relay: string, state: 'ON' | 'OFF'): void {
    if (relay === 'coolant_pump') {
      this.coolantPump = state;
    }
  }

  public emergencyStop(): void {
    this.mode = 'EMERGENCY_STOPPED';
    this.targetRpm = 0;
    this.currentRpm = 0;
    this.coolantPump = 'OFF';
  }

  public resetFault(): void {
    if (this.mode === 'EMERGENCY_STOPPED' || this.mode === 'VIBRATION_FAULT' || this.mode === 'OVERHEAT') {
      this.mode = 'NORMAL';
      this.targetRpm = 3200;
      this.coolantPump = 'ON';
    }
  }

  /**
   * Advance physics clock by 1 second
   */
  public tick(): CncTelemetrySnapshot {
    this.step += 0.2;

    // 1. Spindle Speed Ramp
    if (this.currentRpm < this.targetRpm) {
      this.currentRpm = Math.min(this.targetRpm, this.currentRpm + 400);
    } else if (this.currentRpm > this.targetRpm) {
      this.currentRpm = Math.max(this.targetRpm, this.currentRpm - 500);
    }

    const rpmNoise = this.currentRpm > 0 ? (Math.random() * 30 - 15) : 0;
    const effectiveRpm = Math.round(Math.max(0, this.currentRpm + rpmNoise));

    // 2. Vibration calculation
    let baseVibration = 0.15;
    if (effectiveRpm > 0) {
      // Proportional to RPM with natural sine harmonic
      baseVibration = 1.8 + (effectiveRpm / 3200) * 1.5 + Math.sin(this.step * 0.7) * 0.25;
    }

    if (this.mode === 'VIBRATION_FAULT') {
      // Exceeds ISO 10816 4.5 mm/s alarm limit
      baseVibration = 5.2 + Math.sin(this.step) * 0.6 + (Math.random() * 0.4 - 0.2);
    }

    this.currentVibration = +(baseVibration + (Math.random() * 0.1 - 0.05)).toFixed(2);

    // 3. Thermal Dynamics with cooling/overheating
    let targetTemp = 26.0; // Ambient
    if (effectiveRpm > 0) {
      targetTemp = 52.0 + (effectiveRpm / 3200) * 8.0;
      if (this.coolantPump === 'OFF') {
        targetTemp += 22.0; // Overheat without coolant
      }
    }

    if (this.mode === 'OVERHEAT') {
      targetTemp = 82.5; // Safety trip threshold (75°C) exceeded
    }

    // Thermal inertia
    this.currentTemp += (targetTemp - this.currentTemp) * 0.15;
    const effectiveTemp = +(this.currentTemp + (Math.random() * 0.2 - 0.1)).toFixed(1);

    // 4. Power Consumption (kW)
    let power = 0.75; // Standby
    if (effectiveRpm > 0) {
      power = 3.5 + (effectiveRpm / 3200) * 7.5 + (this.coolantPump === 'ON' ? 0.8 : 0);
    }
    const effectivePower = +(power + (Math.random() * 0.3 - 0.15)).toFixed(2);

    return {
      spindle_speed_rpm: effectiveRpm,
      vibration_rms: this.currentVibration,
      temperature_bearing: effectiveTemp,
      power_kw: effectivePower,
      coolant_pump: this.coolantPump,
      timestamp: new Date().toISOString(),
    };
  }
}

