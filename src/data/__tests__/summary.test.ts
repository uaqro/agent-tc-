import { describe, expect, it } from 'vitest';
import { FUEL_PRODUCTS } from '../../domain/dashboard/types';
import { DEFAULT_FILTERS, NO_DRIVER, type GlobalFilters } from '../../domain/filters/types';
import { summaryMetricsFor } from '../summary';

/** Friday 16 October 2026, 11:00: the default business date of Ticket Car. */
const AT = new Date(2026, 9, 16, 11, 0).getTime();

const valueOf = (filters: GlobalFilters, id: string) =>
  summaryMetricsFor(filters, AT).find((metric) => metric.id === id)!;

describe('Resumen indicators', () => {
  it('compare the period against the one right before it', () => {
    const volume = valueOf(DEFAULT_FILTERS, 'volume');
    expect(volume.currentMonth).toBeGreaterThan(0);
    expect(volume.previousMonth).toBeGreaterThan(0);
    expect(volume.currentLabel).toBe('Últimos 30 días');
  });

  it('a shorter period holds less volume', () => {
    const month = valueOf(DEFAULT_FILTERS, 'volume').currentMonth;
    const week = valueOf({ ...DEFAULT_FILTERS, periodDays: 7 }, 'volume').currentMonth;
    expect(week).toBeLessThan(month);
    expect(valueOf({ ...DEFAULT_FILTERS, periodDays: 7 }, 'volume').currentLabel).toBe('Últimos 7 días');
  });

  it('the product filter splits the volume exactly', () => {
    const total = valueOf(DEFAULT_FILTERS, 'volume').currentMonth;
    const parts = FUEL_PRODUCTS.reduce((sum, product) => sum + valueOf({ ...DEFAULT_FILTERS, product }, 'volume').currentMonth, 0);
    expect(parts).toBeCloseTo(total, -1);
  });

  it('"Sin conductor asignado" isolates the days driven by units registered without a driver', () => {
    const total = valueOf(DEFAULT_FILTERS, 'total-km').currentMonth;
    const withoutDriver = valueOf({ ...DEFAULT_FILTERS, driverId: NO_DRIVER }, 'total-km').currentMonth;
    expect(withoutDriver).toBeGreaterThan(0);
    expect(withoutDriver).toBeLessThan(total / 5);
  });

  it('a group with no units left after filtering reads as zero, not as an error', () => {
    const empty = valueOf({ ...DEFAULT_FILTERS, unitId: 'ECO-9999' }, 'average-km');
    expect(empty.currentMonth).toBe(0);
    expect(empty.previousMonth).toBe(0);
  });
});
