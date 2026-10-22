import { describe, expect, it } from 'vitest';
import { allReportColumns } from '../../../data/reports';
import {
  accountPeriodBalances,
  balancePeriodByMedium,
  createDemoAccountMovements,
  createDemoBalanceMovements,
  createDemoFuelTransactions,
  filterAccountMovements,
  filterBalanceMovements,
  filterFuelTransactions,
  reorderColumns,
} from '../data';
import { periodForPreset } from '../periods';
import { rowsToCsv, rowsToTxt } from '../export';
import { rowsToXlsx } from '../../../utils/xlsx';

describe('reportería de combustible', () => {
  const referenceDate = new Date(2026, 9, 16, 12);

  it('mantiene el catálogo completo del Excel y agrega solo los campos de conciliación', () => {
    expect(allReportColumns).toHaveLength(123);
    expect(new Set(allReportColumns).size).toBe(allReportColumns.length);
    expect(allReportColumns.slice(0, 3)).toEqual(['FECHA', 'HORA', 'MES']);
    expect(allReportColumns.slice(-2)).toEqual(['ESTATUS DE CONCILIACIÓN', 'MOTIVO DE RECHAZO']);
  });

  it('interpreta los periodos rápidos como días inclusivos hasta hoy', () => {
    expect(periodForPreset('last7', referenceDate)).toMatchObject({ from: '2026-10-10', to: '2026-10-16' });
    expect(periodForPreset('yesterday', referenceDate)).toMatchObject({ from: '2026-10-15', to: '2026-10-15' });
    expect(periodForPreset('month', referenceDate)).toMatchObject({ from: '2026-10-01', to: '2026-10-16' });
  });

  it('combina estados, fechas y filtros avanzados con AND', () => {
    const transactions = createDemoFuelTransactions(referenceDate);
    const rejected = transactions.find((transaction) => transaction.status === 'Rechazada')!;
    const result = filterFuelTransactions(transactions, {
      preset: 'last90',
      from: '2026-07-19',
      to: '2026-10-16',
      statuses: ['Rechazada'],
      filters: [{ id: 1, field: 'MEDIO DE PAGO', operator: 'Igual a', value: String(rejected['MEDIO DE PAGO']) }],
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((transaction) => transaction.status === 'Rechazada' && transaction['MEDIO DE PAGO'] === rejected['MEDIO DE PAGO'])).toBe(true);
    expect(result.every((transaction) => String(transaction['MOTIVO DE RECHAZO']).length > 0)).toBe(true);
  });

  it('filtra movimientos de cuenta y calcula los saldos de apertura y cierre', () => {
    const movements = createDemoAccountMovements(referenceDate);
    const period = periodForPreset('last30', referenceDate);
    const filtered = filterAccountMovements(movements, period, 'Abono del cliente');
    const balances = accountPeriodBalances(movements, period);
    const beforePeriod = movements.filter((movement) => movement.date < period.from);
    const inPeriod = movements.filter((movement) => movement.date <= period.to);
    const expectedOpening = beforePeriod[beforePeriod.length - 1]!.balanceAfter;
    const expectedClosing = inPeriod[inPeriod.length - 1]!.balanceAfter;
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((movement) => movement.type === 'Abono del cliente')).toBe(true);
    expect(balances).toEqual({ opening: expectedOpening, closing: expectedClosing });
  });

  it('filtra movimientos por medio de pago dentro del período', () => {
    const movements = createDemoBalanceMovements(referenceDate);
    const period = periodForPreset('last30', referenceDate);
    const filtered = filterBalanceMovements(movements, period, 'Tarjeta 000104');
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((movement) => movement.medium === 'Tarjeta 000104' && movement.date >= period.from && movement.date <= period.to)).toBe(true);
  });

  it('calcula saldo inicial y final por dispositivo al corte del período', () => {
    const summaries = balancePeriodByMedium(createDemoBalanceMovements(referenceDate), periodForPreset('last30', referenceDate));
    expect(summaries.get('Tarjeta 000104')).toEqual({ opening: 3620, closing: 3090 });
  });

  it('reordena únicamente las columnas arrastradas y conserva las demás', () => {
    expect(reorderColumns(['FECHA', 'UNIDAD', 'IMPORTE'], 'IMPORTE', 'UNIDAD')).toEqual(['FECHA', 'IMPORTE', 'UNIDAD']);
    expect(reorderColumns(['FECHA', 'UNIDAD', 'IMPORTE'], 'FECHA', 'OTRO')).toEqual(['FECHA', 'UNIDAD', 'IMPORTE']);
  });

  it('protege texto en las descargas y genera un XLSX ZIP válido', () => {
    const rows = [['UNIDAD', 'IMPORTE'], ['=1+1', 22.5]];
    expect(rowsToCsv(rows)).toContain("'=1+1");
    expect(rowsToTxt(rows)).toContain("'=1+1");
    expect(Array.from(rowsToXlsx(rows).slice(0, 4))).toEqual([80, 75, 3, 4]);
  });
});