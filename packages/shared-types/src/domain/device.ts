export type ProductType = 'home' | 'cold' | 'industrial' | 'energy';

export type DeviceConnectivityStatus = 'online' | 'offline' | 'degraded' | 'provisioning';

export type DeviceHardwareType = 'esp32' | 'linux_gateway' | 'third_party';

export interface Device {
  id: string;
  organizationId: string;
  productId: ProductType;
  gatewayId?: string;
  name: string;
  hardwareType: DeviceHardwareType;
  hardwareSerial: string;
  macAddress?: string;
  firmwareVersion: string;
  status: DeviceConnectivityStatus;
  lastSeenAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Gateway {
  id: string;
  organizationId: string;
  name: string;
  ipAddress?: string;
  model: string;
  status: DeviceConnectivityStatus;
  lastHeartbeatAt?: string;
  createdAt: string;
  updatedAt: string;
}

