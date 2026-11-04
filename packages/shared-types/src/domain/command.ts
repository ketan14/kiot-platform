export type CommandStatus =
  | 'PENDING'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'TIMED_OUT';

export interface DeviceCommand<TPayload = Record<string, unknown>> {
  id: string;
  organizationId: string;
  deviceId: string;
  commandType: string;
  payload: TPayload;
  status: CommandStatus;
  issuedByUserId?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceShadowState<TState = Record<string, unknown>> {
  deviceId: string;
  organizationId: string;
  desired: TState;
  reported: TState;
  delta: Partial<TState>;
  version: number;
  updatedAt: string;
}

