import { ProductType } from './device.js';

export interface TelemetryReading {
  organizationId: string;
  productId: ProductType;
  gatewayId?: string;
  deviceId: string;
  metric: string;
  value: number;
  unit: string;
  deviceTimestamp: string;
  serverTimestamp: string;
  sequenceNumber?: number;
  quality?: 'good' | 'bad' | 'uncertain';
}

export interface TelemetryBatchPayload {
  organizationId: string;
  deviceId: string;
  readings: Array<{
    metric: string;
    value: number;
    unit: string;
    deviceTimestamp: string;
  }>;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
}

