export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertCondition = 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NEQ';
export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface AlertRule {
  id: string;
  organization_id: string;
  product_id: string;
  device_id: string | null;
  name: string;
  description: string | null;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  severity: AlertSeverity;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  organization_id: string;
  rule_id: string | null;
  device_id: string;
  metric: string;
  trigger_value: number;
  threshold_value: number;
  severity: AlertSeverity;
  status: IncidentStatus;
  title: string;
  message: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentEventPayload {
  incident: Incident;
  rule?: AlertRule;
}

