import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '../../domain/filters/types';
import { portalPrincipals } from '../access';
import { CLIENT_ACCOUNT_ID } from '../client';
import { costPerKilometer, niceMax, organizationalConsumption, performanceByVehicle } from '../dashboardCharts';
import { DEFAULT_PRINCIPAL, setSessionPrincipal } from '../session';
import { summaryMetricsFor } from '../summary';

const AT = new Date(2026, 9, 16, 11, 0).getTime();

afterEach(() => setSessionPrincipal(DEFAULT_PRINCIPAL));

describe('Resumen charts', () => {
  it('rank the units with most litres and compare them with the expected km/L of their class', () => {
    const chart = performanceByVehicle(DEFAULT_FILTERS, 8, AT);
    expect(chart.labels).toHaveLength(8);
    expect(chart.series.map((series) => series.name)).toEqual(['Rendimiento real', 'Esperado por clase']);
    expect(chart.series[0].values.every((value) => value > 0)).toBe(true);
    expect(chart.yMax).toBeGreaterThanOrEqual(Math.max(...chart.series.flatMap((series) => series.values)));
  });

  it('cost per kilometre is daily for a week and weekly for a month', () => {
    expect(costPerKilometer({ ...DEFAULT_FILTERS, periodDays: 7 }, AT).labels).toHaveLength(7);
    expect(costPerKilometer({ ...DEFAULT_FILTERS, periodDays: 30 }, AT).labels).toHaveLength(5);
  });

  it('organizational consumption splits the company into its divisions, and adds up to the Resumen volume', () => {
    const chart = organizationalConsumption(DEFAULT_FILTERS, AT);
    expect(chart.parentName).toBe('Grupo Alimentario Norte');
    expect(chart.labels).toContain('Noreste');
    const volume = summaryMetricsFor(DEFAULT_FILTERS, AT).find((metric) => metric.id === 'volume')!.currentMonth;
    const total = chart.series[0].values.reduce((sum, value) => sum + value, 0);
    expect(Math.abs(total - volume)).toBeLessThan(chart.labels.length + 1);
  });

  it('a user limited to a division sees its departments, not the company', () => {
    setSessionPrincipal(portalPrincipals.find((principal) => principal.userId === 'u-2')!);
    const chart = organizationalConsumption(DEFAULT_FILTERS, AT);
    expect(chart.parentName).toBe('División Noreste');
    expect(chart.labels).toEqual(['Monterrey', 'Saltillo']);
  });

  it('the org filter drills down one level', () => {
    const chart = organizationalConsumption({ ...DEFAULT_FILTERS, orgNodeId: `org:${CLIENT_ACCOUNT_ID}:division-occidente` }, AT);
    expect(chart.parentName).toBe('División Occidente');
    expect(chart.labels).toEqual(['Guadalajara']);
  });

  it('axis maximums are round numbers above the data', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(7.3)).toBe(10);
    expect(niceMax(0.66)).toBe(1);
    expect(niceMax(18_400)).toBe(20_000);
  });

  it('comparison bars use visualization roles instead of fixed colors', () => {
    for (const chart of [
      performanceByVehicle(DEFAULT_FILTERS, 8, AT),
      organizationalConsumption(DEFAULT_FILTERS, AT),
    ]) {
      expect(chart.series.map((series) => series.color)).toEqual([
        'var(--viz-accent)',
        'var(--viz-neutral)',
      ]);
    }
  });
});
