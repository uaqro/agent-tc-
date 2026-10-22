import { describe, expect, it } from 'vitest';
import {
  ALERT_RULE_DEFINITIONS,
  NOTIFICATION_TYPES,
  alertValueError,
  notificationUnitSelectionEnabled,
} from '../operationalAlerts';

describe('alertas operativas de combustible', () => {
  it('conserva el orden de los nueve tipos de alerta de la HU', () => {
    expect(ALERT_RULE_DEFINITIONS.map((definition) => definition.label)).toEqual([
      'Dispersión a unidades',
      'Saldo de la base',
      'Saldo negativo (Transacciones off-line)',
      'Facturas próximas a vencer (días de anticipación)',
      'Vencimiento de dispositivo (días de anticipación)',
      'Tarjetas stock disponibles',
      'Dispositivos sin transacciones (por días)',
      'Nota vale generada (por litros)',
      'Nota vale generada (por monto)',
    ]);
  });

  it('valida enteros, decimales y valores negativos según el tipo', () => {
    const dispersion = ALERT_RULE_DEFINITIONS[0]!;
    const invoiceDue = ALERT_RULE_DEFINITIONS[3]!;
    const negativeBalance = ALERT_RULE_DEFINITIONS[2]!;
    expect(alertValueError(dispersion, '999.99')).toBeNull();
    expect(alertValueError(invoiceDue, '3.5')).toContain('enteros');
    expect(alertValueError(negativeBalance, '-100.00')).toBeNull();
    expect(alertValueError(negativeBalance, '0')).toContain('saldo negativo');
  });

  it('bloquea la selección de todas las unidades en los tres tipos indicados', () => {
    expect(NOTIFICATION_TYPES).toHaveLength(6);
    expect(NOTIFICATION_TYPES.slice(0, 3).every((type) => !notificationUnitSelectionEnabled(type.id))).toBe(true);
    expect(NOTIFICATION_TYPES.slice(3).every((type) => notificationUnitSelectionEnabled(type.id))).toBe(true);
  });
});