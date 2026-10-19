/**
 * Resumen charts computed from the common activity, scoped to the session and cut by the global filters, so the
 * charts and the four indicators above them always describe the same slice.
 */
import type { DayPoint } from '../domain/dashboard/types';
import { matches, ANY, type GlobalFilters } from '../domain/filters/types';
import { childrenOf, findNode, rootOf } from '../domain/org/types';
import type { ChartSeries } from '../types';
import { clientAccount, clientOrgTree, unitById } from './client';
import { expectedKmPerLiter } from './fleet';
import { scopedSnapshot, sessionPrincipal } from './session';

export interface ChartData {
  labels: string[];
  series: ChartSeries[];
  yMin: number;
  yMax: number;
}

const closedDays = (points: DayPoint[]): DayPoint[] => points.filter((point) => !point.partial);

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
