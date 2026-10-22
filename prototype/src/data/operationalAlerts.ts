export type AlertOperator = 'gt' | 'lt' | 'eq';
export type DeliveryChannel = 'email' | 'whatsapp' | 'sms';

export interface AlertRuleDefinition {
  id: string;
  label: string;
  operators: AlertOperator[];
  decimals: 0 | 2;
  unit: string;
  minimum?: number;
  maximum?: number;
}

export const ALERT_OPERATORS: Record<AlertOperator, string> = {
  gt: 'Mayor a',
  lt: 'Menor a',
  eq: 'Igual a',
};

export const DELIVERY_CHANNELS: { id: DeliveryChannel; label: string }[] = [
  { id: 'email', label: 'Correo' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'sms', label: 'SMS' },
];

export const ALERT_RULE_DEFINITIONS: AlertRuleDefinition[] = [
  { id: 'unit-dispersion', label: 'Dispersión a unidades', operators: ['gt', 'lt'], decimals: 2, unit: 'MXN', minimum: 0 },
  { id: 'base-balance', label: 'Saldo de la base', operators: ['gt', 'lt'], decimals: 2, unit: 'MXN', minimum: 0 },
  { id: 'negative-offline-balance', label: 'Saldo negativo (Transacciones off-line)', operators: ['gt', 'eq'], decimals: 2, unit: 'MXN', maximum: -0.01 },
  { id: 'invoice-due', label: 'Facturas próximas a vencer (días de anticipación)', operators: ['eq'], decimals: 0, unit: 'días', minimum: 0 },
  { id: 'device-expiry', label: 'Vencimiento de dispositivo (días de anticipación)', operators: ['eq'], decimals: 0, unit: 'días', minimum: 0 },
  { id: 'stock-cards', label: 'Tarjetas stock disponibles', operators: ['gt', 'lt'], decimals: 0, unit: 'tarjetas', minimum: 0 },
  { id: 'inactive-device', label: 'Dispositivos sin transacciones (por días)', operators: ['gt'], decimals: 0, unit: 'días', minimum: 0 },
  { id: 'voucher-liters', label: 'Nota vale generada (por litros)', operators: ['gt'], decimals: 2, unit: 'litros', minimum: 0 },
  { id: 'voucher-amount', label: 'Nota vale generada (por monto)', operators: ['gt'], decimals: 2, unit: 'MXN', minimum: 0 },
];

export interface NotificationTypeDefinition {
  id: string;
  label: string;
  canSelectUnits: boolean;
}

export const NOTIFICATION_TYPES: NotificationTypeDefinition[] = [
  { id: 'unit-controls-changed', label: 'Modificación en controles de unidades', canSelectUnits: false },
  { id: 'bulk-load-success', label: 'Carga masiva exitosa', canSelectUnits: false },
  { id: 'bulk-load-rejected', label: 'Carga masiva rechazada', canSelectUnits: false },
  { id: 'odometer-inconsistent', label: 'Odómetro inconsistente', canSelectUnits: true },
  { id: 'odometer-extra', label: 'Odómetro adicional al registrado', canSelectUnits: true },
  { id: 'call-center-dispersion', label: 'Dispersión a unidades vía Call Center', canSelectUnits: true },
];

export interface AlertRuleConfig {
  id: string;
  typeId: string;
  operator: AlertOperator;
  value: string;
  channels: DeliveryChannel[];
  allUnits: boolean;
  unitIds: string[];
  contactIds: string[];
  active: boolean;
}

export interface NotificationGroupConfig {
  id: string;
  name: string;
  typeId: string;
  channels: DeliveryChannel[];
  allUnits: boolean;
  unitIds: string[];
  allDrivers: false;
  contactIds: string[];
  active: boolean;
}

export interface AlertAuditEntry {
  id: string;
  client: string;
  device: string;
  rule: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  channel: DeliveryChannel;
  sentAt: string;
  result: 'Envío demo';
}

export interface AlertContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export interface AlertUnitOption {
  id: string;
  label: string;
}

export const DEFAULT_ALERT_RULES: AlertRuleConfig[] = [
  { id: 'rule-demo-1', typeId: 'unit-dispersion', operator: 'gt', value: '999.99', channels: ['email'], allUnits: true, unitIds: [], contactIds: ['u-1'], active: true },
  { id: 'rule-demo-2', typeId: 'negative-offline-balance', operator: 'gt', value: '-100.00', channels: ['email'], allUnits: true, unitIds: [], contactIds: ['u-1', 'u-2'], active: true },
  { id: 'rule-demo-3', typeId: 'inactive-device', operator: 'gt', value: '30', channels: ['email'], allUnits: false, unitIds: [], contactIds: ['u-2'], active: false },
];

export const DEFAULT_NOTIFICATION_GROUPS: NotificationGroupConfig[] = [
  { id: 'notification-demo-1', name: 'Cambios operativos', typeId: 'unit-controls-changed', channels: ['email'], allUnits: false, unitIds: [], allDrivers: false, contactIds: ['u-1'], active: true },
  { id: 'notification-demo-2', name: 'Incidencias de carga masiva', typeId: 'bulk-load-rejected', channels: ['email'], allUnits: false, unitIds: [], allDrivers: false, contactIds: ['u-1', 'u-4'], active: true },
  { id: 'notification-demo-3', name: 'Control de odómetro', typeId: 'odometer-inconsistent', channels: ['email'], allUnits: true, unitIds: [], allDrivers: false, contactIds: ['u-2'], active: true },
];

export function alertRuleDefinition(typeId: string): AlertRuleDefinition | undefined {
  return ALERT_RULE_DEFINITIONS.find((definition) => definition.id === typeId);
}

export function alertValueError(definition: AlertRuleDefinition, rawValue: string): string | null {
  if (rawValue.trim() === '') return 'Captura un valor.';
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return 'Captura un valor numérico válido.';
  if (definition.decimals === 0 && !Number.isInteger(value)) return 'Este tipo de alerta solo admite números enteros.';
  if (definition.maximum === -0.01 && value >= 0) return 'Captura un saldo negativo.';
  if (definition.minimum !== undefined && value < definition.minimum) return `El valor debe ser igual o mayor que ${definition.minimum}.`;
  if (definition.maximum !== undefined && value > definition.maximum) return `El valor debe ser igual o menor que ${definition.maximum}.`;
  return null;
}

export function formatAlertCondition(operator: AlertOperator, value: string, unit: string): string {
  return `${ALERT_OPERATORS[operator]} ${value} ${unit}`.trim();
}

export function notificationUnitSelectionEnabled(typeId: string): boolean {
  return NOTIFICATION_TYPES.find((type) => type.id === typeId)?.canSelectUnits ?? false;
}

export const DEMO_ALERT_AUDIT: AlertAuditEntry[] = [
  {
    id: 'audit-1', client: 'Grupo Alimentario Norte', device: '*** 9042', rule: 'Dispersión a unidades · Mayor a 999.99 MXN',
    contactName: 'U. Aquino', contactEmail: 'u.aquino@ganorte.mx', contactPhone: 'Sin teléfono registrado', channel: 'email',
    sentAt: '2026-10-16T09:14:00', result: 'Envío demo',
  },
  {
    id: 'audit-2', client: 'Grupo Alimentario Norte', device: '*** 1837', rule: 'Dispositivos sin transacciones · Mayor a 30 días',
    contactName: 'Mariana Treviño', contactEmail: 'm.trevino@ganorte.mx', contactPhone: 'Sin teléfono registrado', channel: 'email',
    sentAt: '2026-10-15T16:42:00', result: 'Envío demo',
  },
  {
    id: 'audit-3', client: 'Grupo Alimentario Norte', device: 'Todos los dispositivos', rule: 'Carga masiva rechazada',
    contactName: 'Ana Lucía Ortega', contactEmail: 'a.ortega@ganorte.mx', contactPhone: 'Sin teléfono registrado', channel: 'whatsapp',
    sentAt: '2026-10-14T11:08:00', result: 'Envío demo',
  },
];