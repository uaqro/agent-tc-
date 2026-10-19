/**
 * The uncomfortable cases of the single generator, pinned. eOne's own datasets had a February gap, seasonality and
 * recommendations that lose money; the unified padrón keeps all of them, plus incomplete records and consumption
 * anomalies for Insights (Fase 2).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '../../domain/filters/types';
import {
  FEED_GAPS,
  OFF_HOURS_RATE,
  OVER_TANK_RATE,
  eventsBetween,
  hasAtypicalEfficiency,
} from '../../domain/data/fleet-activity';
import { consumptionAnomalies, isNightLoad, isOverTank } from '../../domain/insights/anomalies';
import { computeOptimizerKpis } from '../../domain/optimizer/metrics';
import { DEFAULT_ASSUMPTIONS, discardRecommendations, isRedirectable, losesMoney, netSaving } from '../../domain/optimizer/rules';
import { clientAccount, clientSnapshot, clientUnits, orgPathOf } from '../client';
import { monthlyConsumption } from '../dashboardCharts';
import { vehicleDetails } from '../fleet';
import { scopedOptimizerLoads } from '../optimizer';

/** Friday 16 October 2026, 11:00: the business date. */
const AT = new Date(2026, 9, 16, 11, 0).getTime();
const YEAR_FROM = new Date(2025, 9, 1).getTime();
const YEAR_TO = new Date(2026, 8, 30).getTime();
const yearEvents = eventsBetween(clientAccount, YEAR_FROM, YEAR_TO, AT, orgPathOf);
const units = new Map(clientUnits.map((unit) => [unit.id, unit]));
const fills = yearEvents.filter((event) => !event.refund);

describe('a data gap: TicketCar+ did not deliver February 2026', () => {
  it('is declared once, for part of the fleet', () => {
    expect(FEED_GAPS).toEqual([{ product: 'ticketcar_plus', from: '2026-02-01', to: '2026-02-28' }]);
    const share = clientUnits.filter((unit) => unit.product === 'ticketcar_plus').length / clientUnits.length;
    expect(share).toBeGreaterThan(0.5);
    expect(share).toBeLessThan(0.7);
  });

  it('TicketCar+ units have no loads in February; Autoconsumo units do, and both have loads around it', () => {
    const inMonth = (year: number, month: number, product: string) =>
      fills.filter((event) => {
        const date = new Date(event.at);
        return date.getFullYear() === year && date.getMonth() === month && event.product === product;
      }).length;
    expect(inMonth(2026, 1, 'ticketcar_plus')).toBe(0);
    expect(inMonth(2026, 1, 'autoconsumo')).toBeGreaterThan(0);
    expect(inMonth(2026, 0, 'ticketcar_plus')).toBeGreaterThan(0);
    expect(inMonth(2026, 2, 'ticketcar_plus')).toBeGreaterThan(0);
  });

  it('the monthly chart leaves the month blank: null, not zero and not interpolated', () => {
    const chart = monthlyConsumption(DEFAULT_FILTERS, AT);
    expect(chart.labels).toHaveLength(12);
    expect(chart.labels[0]).toBe('oct 25');
    const ticketcar = chart.series.find((series) => series.name === 'TicketCar+')!;
    const feb = chart.labels.indexOf('feb 26');
    expect(ticketcar.values[feb]).toBeNull();
    expect(ticketcar.values.filter((value) => value === null)).toHaveLength(1);
    expect(chart.series.find((series) => series.name === 'Autoconsumo')!.values[feb]).toBeGreaterThan(0);
    expect(chart.gaps).toEqual(['TicketCar+ no entregó datos de feb 2026.']);
  });
});

describe('monthly seasonality, visible over twelve months', () => {
  const litersByMonth = Array.from({ length: 12 }, () => 0);
  // Autoconsumo has every month (TicketCar+ misses February), so it shows the season cleanly.
  for (const event of fills) if (event.product === 'autoconsumo') litersByMonth[new Date(event.at).getMonth()] += event.liters;
  const perDay = litersByMonth.map((liters, month) => liters / new Date(2026, month + 1, 0).getDate());

  it('December is the peak and January the trough, with a clear gap between them', () => {
    expect(perDay.indexOf(Math.max(...perDay))).toBe(11);
    expect(perDay.indexOf(Math.min(...perDay))).toBe(0);
    expect(perDay[11]).toBeGreaterThan(perDay[0] * 1.25);
  });

  it('the end of the year runs above September, and Holy Week (April) below March', () => {
    expect(perDay[10] + perDay[11]).toBeGreaterThan(2 * perDay[8]);
    expect(perDay[3]).toBeLessThan(perDay[2]);
  });
});

describe('incomplete records besides the deregistered units', () => {
  const incomplete = vehicleDetails.filter((detail) => detail.gaps.length > 0);

  it('units without VIN, without driver and without an org node, all in the Vehículos data', () => {
    for (const gap of ['vin', 'driver', 'org', 'odometer'] as const) {
      expect(vehicleDetails.filter((detail) => detail.gaps.includes(gap)).length, gap).toBeGreaterThan(5);
    }
    expect(incomplete.length / vehicleDetails.length).toBeGreaterThan(0.08);
    expect(incomplete.length / vehicleDetails.length).toBeLessThan(0.2);
  });

  it('most of them are operating units: an incomplete record is not a deregistration', () => {
    const operating = incomplete.filter((detail) => detail.status !== 'inactive');
    expect(operating.length).toBeGreaterThan(incomplete.length * 0.9);
    expect(vehicleDetails.filter((detail) => detail.status === 'inactive')).toHaveLength(14);
  });
});

describe('optimizer: part of the recommendations lose money', () => {
  const loads = scopedOptimizerLoads(AT);
  const redirectable = loads.filter(isRedirectable);
  const losing = loads.filter((load) => losesMoney(load, DEFAULT_ASSUMPTIONS));

  it('a sizeable minority has a negative net saving, but the total still wins', () => {
    const share = losing.length / redirectable.length;
    expect(share).toBeGreaterThan(0.25);
    expect(share).toBeLessThan(0.5);
    expect(redirectable.reduce((sum, load) => sum + netSaving(load, DEFAULT_ASSUMPTIONS), 0)).toBeGreaterThan(0);
  });

  it('discarding them raises the net saving and leaves the spend as it was', () => {
    const before = computeOptimizerKpis(loads, DEFAULT_ASSUMPTIONS, 'neto', 30);
    const kept = discardRecommendations(loads, new Set(losing.map((load) => load.id)));
    const after = computeOptimizerKpis(kept, DEFAULT_ASSUMPTIONS, 'neto', 30);
    expect(after.netSaving).toBeGreaterThan(before.netSaving);
    expect(after.spend).toBeCloseTo(before.spend, 2);
    expect(kept.filter((load) => load.discarded)).toHaveLength(losing.length);
    expect(kept.filter((load) => losesMoney(load, DEFAULT_ASSUMPTIONS))).toHaveLength(0);
  });
});

describe('consumption anomalies for Insights', () => {
  it('loads over the tank capacity: about 0.5 % of the loads, and none by accident', () => {
    const over = fills.filter((event) => isOverTank(event, units.get(event.unitId)!)).length / fills.length;
    expect(over).toBeGreaterThan(OVER_TANK_RATE * 0.6);
    expect(over).toBeLessThan(OVER_TANK_RATE * 1.6);
  });

  it('loads in the small hours: about 1 % of the loads', () => {
    const night = fills.filter(isNightLoad).length / fills.length;
    expect(night).toBeGreaterThan(OFF_HOURS_RATE * 0.6);
    expect(night).toBeLessThan(OFF_HOURS_RATE * 1.6);
  });

  it('atypical efficiency: the detector finds the units the generator made atypical, and few others', () => {
    const period = clientSnapshot(30, AT).accounts[0].period;
    const flagged = new Set(
      consumptionAnomalies(clientUnits, period)
        .filter((anomaly) => anomaly.kind === 'rendimiento_atipico')
        .map((anomaly) => anomaly.unitId),
    );
    // The detector only judges units with 150 L or more in the period: below that, km/L is noise.
    const liters = new Map<string, number>();
    for (const point of period) for (const row of point.rows) liters.set(row.unitId, (liters.get(row.unitId) ?? 0) + row.liters);
    const planted = clientUnits.filter((unit, index) => hasAtypicalEfficiency(index) && (liters.get(unit.id) ?? 0) >= 150);
    expect(planted.length).toBeGreaterThanOrEqual(6);
    const found = planted.filter((unit) => flagged.has(unit.id));
    expect(found.length).toBeGreaterThanOrEqual(Math.ceil(planted.length * 0.7));
    const others = [...flagged].filter((unitId) => !clientUnits.some((unit, index) => unit.id === unitId && hasAtypicalEfficiency(index)));
    expect(others.length).toBeLessThanOrEqual(Math.ceil(clientUnits.length * 0.01));
  });
});
