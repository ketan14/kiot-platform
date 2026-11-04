export interface Machine {
  id: string;
  name: string;
  machine_code: string;
  category: string;
  status: 'running' | 'idle' | 'stopped' | 'maintenance' | 'error' | string;
  current_operating_hours: string | number;
  last_status_change_at?: string;
  location_id?: string;
  primary_device_id?: string;
  device_name?: string;
  device_status?: string;
  last_seen_at?: string;
}

export interface Device {
  id: string;
  product_id: string;
  gateway_id?: string;
  location_id?: string;
  name: string;
  hardware_type: string;
  hardware_serial: string;
  firmware_version?: string;
  status: 'provisioned' | 'online' | 'offline' | 'degraded' | string;
  last_seen_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DeviceCommand {
  id: string;
  organization_id: string;
  device_id: string;
  command_type: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface DeviceLatestTelemetry {
  source: 'redis_hot_cache' | 'database_fallback';
  deviceId: string;
  state: Record<string, { value: number; unit: string; timestamp: string }>;
}
