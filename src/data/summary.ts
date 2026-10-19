import type { DayPoint } from '../domain/dashboard/types';
import { matches, type GlobalFilters } from '../domain/filters/types';
import type { SummaryMetric } from '../types';
import { scopedSnapshot } from './session';

interface PeriodTotals {
  liters: number;
  fills: number;
  km: number;
  /** Units that reported at least one day of the period. */
  activeUnits: number;
}

/**
 * Sums the closed days of a period through the global filter. The running day is left out: comparing a half day
 * against a full previous period would always read as a drop.
 */
function totalsOf(points: DayPoint[], filters: GlobalFilters): PeriodTotals {
  const totals: PeriodTotals = { liters: 0, fills: 0, km: 0, activeUnits: 0 };
  const active = new Set<string>();

  for (const point of points) {
    if (point.partial) continue;
    for (const row of point.rows) {
      if (!matches(row, filters)) continue;
      totals.liters += row.liters;
      totals.km += row.km;
      if (row.active) active.add(row.unitId);
    }
    for (const event of point.events) {
      if (!event.refund && matches(event, filters)) totals.fills += 1;
    }
  }

  totals.activeUnits = active.size;
  return totals;
}

const round = (value: number, decimals = 0): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** The four Resumen indicators for the filtered period, against the period right before it. */
export function summaryMetricsFor(filters: GlobalFilters, at?: number): SummaryMetric[] {
  const activity = scopedSnapshot(filters.periodDays, at).accounts[0];
  const current = totalsOf(activity.period, filters);
  const previous = totalsOf(activity.previousPeriod, filters);
  const labels = {
    currentLabel: `Últimos ${filters.periodDays} ${filters.periodDays === 1 ? 'día' : 'días'}`,
    previousLabel: 'Periodo anterior',
  };

  const metric = (
    id: string,
    title: string,
    accent: SummaryMetric['accent'],
    unit: string,
    value: (totals: PeriodTotals) => number,
    higherIsBetter: boolean,
  ): SummaryMetric => ({
    id,
    title,
    accent,
    unit,
    currentMonth: value(current),
    previousMonth: value(previous),
    higherIsBetter,
    ...labels,
  });

  return [
    metric('volume', 'Consumo en volumen', 'blue', 'L', (totals) => round(totals.liters), false),
    metric('average-consumption', 'Promedio por carga', 'orange', 'L', (totals) => (totals.fills > 0 ? round(totals.liters / totals.fills, 1) : 0), false),
    metric('total-km', 'Total kilómetros recorridos', 'purple', 'km', (totals) => round(totals.km), true),
    metric('average-km', 'Promedio kilómetros por unidad', 'green', 'km', (totals) => (totals.activeUnits > 0 ? round(totals.km / totals.activeUnits) : 0), true),
  ];
}
