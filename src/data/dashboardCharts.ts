/**
 * Resumen charts computed from the common activity, scoped to the session and cut by the global filters, so the
 * charts and the four indicators above them always describe the same slice.
 */
import { FUEL_PRODUCT_LABELS, type DayPoint, type FuelEvent, type FuelProduct } from '../domain/dashboard/types';
import { eventsBetween, missingFeedsOn } from '../domain/data/fleet-activity';
import { businessNow } from '../domain/demo/clock';
import { inOrgScope } from '../domain/rbac/scope';
import { matches, ANY, type GlobalFilters } from '../domain/filters/types';
import { childrenOf, findNode, rootOf } from '../domain/org/types';
import type { ChartSeries, GapSeries } from '../types';
import { clientAccount, clientOrgTree, orgPathOf, unitById } from './client';
import { expectedKmPerLiter } from './fleet';
import { scopedSnapshot, sessionPrincipal } from './session';

export interface ChartData {
  labels: string[];
  series: ChartSeries[];
  yMin: number;
  yMax: number;
}

const closedDays = (points: DayPoint[]): DayPoint[] => points.filter((point) => !point.partial);

// ── Twelve months ───────────────────────────────────────────────────────

/** Months the monthly chart covers: the twelve full months before the business date's month. */
export const MONTHLY_CHART_MONTHS = 12;

const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const PRODUCT_COLOR: Record<FuelProduct, string> = { autoconsumo: '#f97316', ticketcar_plus: '#0060df' };

/** Dispatches of the twelve months, unscoped. Rebuilt only when the business month changes. */
let yearEvents: { key: string; events: FuelEvent[] } | null = null;

function eventsOfYear(at: number): { months: Date[]; events: FuelEvent[] } {
  const today = new Date(at);
  const months = Array.from(
    { length: MONTHLY_CHART_MONTHS },
    (_, index) => new Date(today.getFullYear(), today.getMonth() - MONTHLY_CHART_MONTHS + index, 1),
  );
  const key = `${today.getFullYear()}-${today.getMonth()}`;
  if (yearEvents?.key !== key) {
    const to = new Date(today.getFullYear(), today.getMonth(), 0).getTime();
    yearEvents = { key, events: eventsBetween(clientAccount, months[0].getTime(), to, at, orgPathOf) };
  }
  return { months, events: yearEvents.events };
}

export interface MonthlyChartData {
  labels: string[];
  series: GapSeries[];
  yMax: number;
  /** One line per product and month without data, for the note under the chart. */
  gaps: string[];
}

/**
 * Litres per month and product over the last twelve full months, inside the session scope and the global filters
 * (the period filter does not apply: the chart is always twelve months). A month whose feed did not arrive is `null`:
 * the line breaks there instead of dropping to zero or bridging the gap.
 */
export function monthlyConsumption(filters: GlobalFilters, at = businessNow()): MonthlyChartData {
  const { months, events } = eventsOfYear(at);
  const principal = sessionPrincipal();
  const products = (Object.keys(FUEL_PRODUCT_LABELS) as FuelProduct[]).filter((product) => filters.product === ANY || filters.product === product);
  const liters = new Map<string, number>();
  for (const event of events) {
    if (!inOrgScope(principal, event.orgPath) || !matches(event, filters)) continue;
    const date = new Date(event.at);
    const key = `${date.getFullYear()}-${date.getMonth()}|${event.product}`;
    liters.set(key, (liters.get(key) ?? 0) + event.liters);
  }

  const gaps: string[] = [];
  const series = products.map((product) => ({
    name: FUEL_PRODUCT_LABELS[product],
    color: PRODUCT_COLOR[product],
    values: months.map((month) => {
      const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      let missing = 0;
      for (let day = 1; day <= days; day++) {
        if (missingFeedsOn(new Date(month.getFullYear(), month.getMonth(), day).getTime()).includes(product)) missing += 1;
      }
      const label = `${MONTH_SHORT[month.getMonth()]} ${month.getFullYear()}`;
      if (missing === days) {
        gaps.push(`${FUEL_PRODUCT_LABELS[product]} no entregó datos de ${label}.`);
        return null;
      }
      if (missing > 0) gaps.push(`${FUEL_PRODUCT_LABELS[product]} no entregó ${missing} días de ${label}: el mes está incompleto.`);
      return Math.round(liters.get(`${month.getFullYear()}-${month.getMonth()}|${product}`) ?? 0);
    }),
  }));

  const values = series.flatMap((item) => item.values).filter((value): value is number => value !== null);
  return {
    labels: months.map((month) => `${MONTH_SHORT[month.getMonth()]} ${String(month.getFullYear()).slice(2)}`),
    series,
    yMax: niceMax(Math.max(0, ...values)),
    gaps,
  };
}

/** Round axis maximum: 1, 2 or 5 times a power of ten, above the largest value. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * power >= value) ?? 10;
  return step * power;
}

const round = (value: number, decimals: number): number => Math.round(value * 10 ** decimals) / 10 ** decimals;

/** The units that consumed most in the period: real km/L against the manufacturer's for their class. */
export function performanceByVehicle(filters: GlobalFilters, limit = 8, at?: number): ChartData {
  const totals = new Map<string, { km: number; liters: number }>();
  for (const point of closedDays(scopedSnapshot(filters.periodDays, at).accounts[0].period)) {
    for (const row of point.rows) {
      if (!matches(row, filters) || row.liters <= 0) continue;
      const unit = totals.get(row.unitId) ?? { km: 0, liters: 0 };
      unit.km += row.km;
      unit.liters += row.liters;
      totals.set(row.unitId, unit);
    }
  }

  const top = [...totals]
    .sort((a, b) => b[1].liters - a[1].liters)
    .slice(0, limit)
    .map(([unitId, total]) => ({ unit: unitById(unitId)!, real: round(total.km / total.liters, 1) }));

  const real = top.map((entry) => entry.real);
  const expected = top.map((entry) => expectedKmPerLiter(entry.unit.vehicleClass));
  return {
    labels: top.map((entry) => entry.unit.plate),
    series: [
      { name: 'Rendimiento real', color: '#0060df', values: real },
      { name: 'Esperado por clase', color: '#94a3b8', values: expected },
    ],
    yMin: 0,
    yMax: niceMax(Math.max(0, ...real, ...expected)),
  };
}

const weekLabel = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

/** Fuel cost per kilometre over the period: daily up to two weeks, weekly beyond. */
export function costPerKilometer(filters: GlobalFilters, at?: number): ChartData {
  const days = closedDays(scopedSnapshot(filters.periodDays, at).accounts[0].period);
  const bucket = filters.periodDays <= 14 ? 1 : 7;
  const labels: string[] = [];
  const values: number[] = [];

  for (let start = 0; start < days.length; start += bucket) {
    const slice = days.slice(start, start + bucket);
    let amount = 0;
    let km = 0;
    for (const point of slice) {
      for (const row of point.rows) {
        if (!matches(row, filters)) continue;
        amount += row.amountMxn;
        km += row.km;
      }
    }
    labels.push(bucket === 1 ? slice[0].label : `Sem. ${weekLabel.format(new Date(slice[0].at))}`);
    values.push(km > 0 ? round(amount / km, 2) : 0);
  }

  return {
    labels,
    series: [{ name: clientAccount.name, color: '#2f6bff', values }],
    yMin: 0,
    yMax: niceMax(Math.max(0, ...values)),
  };
}

/**
 * Litres by the branches of the org chart under the node being looked at: the one picked in the filters, else the
 * session's own scope, else the company. Current period against the previous one.
 */
export function organizationalConsumption(filters: GlobalFilters, at?: number): ChartData & { parentName: string } {
  const scopeNode = sessionPrincipal().scopeNodeId;
  const parent =
    (filters.orgNodeId !== ANY ? findNode(clientOrgTree, filters.orgNodeId) : undefined) ??
    (scopeNode !== null ? findNode(clientOrgTree, scopeNode) : undefined) ??
    rootOf(clientOrgTree)!;
  const branches = childrenOf(clientOrgTree, parent.id);
  const activity = scopedSnapshot(filters.periodDays, at).accounts[0];

  const litersBy = (points: DayPoint[]) =>
    branches.map((branch) => {
      let liters = 0;
      for (const point of closedDays(points)) {
        for (const row of point.rows) {
          if (row.orgPath.includes(branch.id) && matches(row, filters)) liters += row.liters;
        }
      }
      return Math.round(liters);
    });

  const current = litersBy(activity.period);
  const previous = litersBy(activity.previousPeriod);
  return {
    parentName: parent.name,
    labels: branches.map((branch) => branch.name.replace(/^(División|Departamento|Área) /, '')),
    series: [
      { name: 'Periodo actual', color: '#0060df', values: current },
      { name: 'Periodo anterior', color: '#94a3b8', values: previous },
    ],
    yMin: 0,
    yMax: niceMax(Math.max(0, ...current, ...previous)),
  };
}
