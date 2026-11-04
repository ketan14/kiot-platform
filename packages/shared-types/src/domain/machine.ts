export type MachineOperatingStatus = 'running' | 'stopped' | 'abnormal' | 'offline';

export interface IndustrialMachine {
  id: string;
  organizationId: string;
  siteId: string;
  productionLineId?: string;
  deviceId?: string;
  name: string;
  machineCode: string;
  category: string;
  status: MachineOperatingStatus;
  currentOperatingHours: number;
  lastStatusChangeAt: string;
  createdAt: string;
  updatedAt: string;
}

