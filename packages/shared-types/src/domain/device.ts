export type ProductType = 'home' | 'cold' | 'industrial' | 'energy';

export type DeviceConnectivityStatus = 'online' | 'offline' | 'degraded' | 'provisioning';

export type DeviceHardwareType = 'esp32' | 'linux_gateway' | 'third_party';

export interface Device {
  id: string;
  organizationId: string;
  productId: ProductType;
  gatewayId?: string | null;
  locationId?: string | null;
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

export interface CreateDeviceInput {
  id: string;
  name: string;
  productId: ProductType;
  hardwareType: DeviceHardwareType;
  hardwareSerial: string;
  macAddress?: string;
  firmwareVersion?: string;
  locationId?: string | null;
  gatewayId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateDeviceInput {
  name?: string;
  locationId?: string | null;
  gatewayId?: string | null;
  firmwareVersion?: string;
  status?: DeviceConnectivityStatus;
  metadata?: Record<string, unknown>;
}

export interface DeviceProvisioningInfo {
  device: Device;
  mqtt: {
    brokerUrl: string;
    clientId: string;
    telemetryTopic: string;
    commandsTopic: string;
    shadowGetTopic: string;
    shadowUpdateTopic: string;
  };
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

