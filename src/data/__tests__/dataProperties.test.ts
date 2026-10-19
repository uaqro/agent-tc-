/**
 * The uncomfortable cases of the single generator, pinned. eOne's own datasets had a February gap, seasonality and
 * recommendations that lose money; the unified padrón keeps all of them, plus incomplete records and consumption
 * anomalies for Insights (Fase 2).
 */
import { afterEach, describe, expect, it } from 'vitest';
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
import { stationForDispatch } from '../../domain/stations/directory';
import { portalPrincipals } from '../access';
import { clientAccount, clientSnapshot, clientUnits, orgPathOf } from '../client';
import { monthlyConsumption } from '../dashboardCharts';
import { vehicleDetails } from '../fleet';
import { scopedOptimizerLoads } from '../optimizer';
import { DEFAULT_PRINCIPAL, setSessionPrincipal } from '../session';

/** Friday 16 October 2026, 11:00: the business date. */
const AT = new Date(2026, 9, 16, 11, 0).getTime();
const YEAR_FROM = new Date(2025, 9, 1).getTime();
const YEAR_TO = new Date(2026, 8, 30).getTime();
const yearEvents = eventsBetween(clientAccount, YEAR_FROM, YEAR_TO, AT, orgPathOf);
const units = new Map(clientUnits.map((unit) => [unit.id, unit]));
const fills = yearEvents.filter((event) => !event.refund);

afterEach(() => setSessionPrincipal(DEFAULT_PRINCIPAL));

describe('a data gap: two Autoconsumo plants did not deliver February 2026', () => {
  const GAP_PLANTS = ['AUTO-HMO', 'AUTO-CUL'];
  const plantOf = (unitId: string) => stationForDispatch(clientAccount, unitId, 'autoconsumo', 0, 0);
  const inMonth = (year: number, month: number, keep: (event: (typeof fills)[number]) => boolean) =>
    fills.filter((event) => {
      const date = new Date(event.at);
      return date.getFullYear() === year && date.getMonth() === month && keep(event);
    }).length;

  it('is declared once, for part of the Autoconsumo units only', () => {
    expect(FEED_GAPS).toEqual([
      expect.objectContaining({ product: 'autoconsumo', from: '2026-02-01', to: '2026-02-28', stations: GAP_PLANTS }),
    ]);
    const autoconsumo = clientUnits.filter((unit) => unit.product === 'autoconsumo');
    const affected = autoconsumo.filter((unit) => GAP_PLANTS.includes(plantOf(unit.id) ?? ''));
    expect(affected).toHaveLength(45);
    expect(affected.length / autoconsumo.length).toBeGreaterThan(0.15);
    expect(affected.length / autoconsumo.length).toBeLessThan(0.3);
  });

  it('TicketCar+ is the portal\'s own transactional system: no gap in any of the twelve months', () => {
    for (let i = 0; i < 12; i++) {
      const date = new Date(2025, 9 + i, 1);
      expect(inMonth(date.getFullYear(), date.getMonth(), (event) => event.product === 'ticketcar_plus'), `${i}`).toBeGreaterThan(0);
    }
  });

  it('the two plants have no loads in February; the other plants do, and the two plants load around it', () => {
    const atGapPlants = (event: (typeof fills)[number]) => event.product === 'autoconsumo' && GAP_PLANTS.includes(event.stationId ?? '');
    expect(inMonth(2026, 1, atGapPlants)).toBe(0);
    expect(inMonth(2026, 1, (event) => event.product === 'autoconsumo')).toBeGreaterThan(0);
    expect(inMonth(2026, 0, atGapPlants)).toBeGreaterThan(0);
    expect(inMonth(2026, 2, atGapPlants)).toBeGreaterThan(0);
  });

  it('the monthly chart leaves the month blank for Autoconsumo: null, not zero and not interpolated', () => {
    const chart = monthlyConsumption(DEFAULT_FILTERS, AT);
    expect(chart.labels).toHaveLength(12);
    expect(chart.labels[0]).toBe('oct 25');
    const feb = chart.labels.indexOf('feb 26');
    const autoconsumo = chart.series.find((series) => series.name === 'Autoconsumo')!;
    expect(autoconsumo.values[feb]).toBeNull();
    expect(autoconsumo.values.filter((value) => value === null)).toHaveLength(1);
    expect(autoconsumo.gapLabel).toBe('Sin datos de Autoconsumo para este periodo');
    expect(chart.series.find((series) => series.name === 'TicketCar+')!.values.every((value) => value !== null && value > 0)).toBe(true);
    expect(chart.gaps).toEqual(['feb 2026: Sin datos de Autoconsumo para este periodo (plantas de Hermosillo y Culiacán, División Noroeste).']);
  });

  it('a user whose scope has no unit at those plants sees February complete', () => {
    setSessionPrincipal(portalPrincipals.find((principal) => principal.userId === 'u-2')!);
    const chart = monthlyConsumption(DEFAULT_FILTERS, AT);
    const autoconsumo = chart.series.find((series) => series.name === 'Autoconsumo')!;
    expect(autoconsumo.values.every((value) => value !== null)).toBe(true);
    expect(chart.gaps).toEqual([]);
  });
});

describe('monthly seasonality, visible over twelve months', () => {
  const litersByMonth = Array.from({ length: 12 }, () => 0);
  // TicketCar+ has every month (two Autoconsumo plants miss February), so it shows the season cleanly.
  for (const event of fills) if (event.product === 'ticketcar_plus') litersByMonth[new Date(event.at).getMonth()] += event.liters;
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

  it('20–25 % of the recommendations have a negative net saving, and the total still wins', () => {
    const share = losing.length / redirectable.length;
    expect(share).toBeGreaterThanOrEqual(0.2);
    expect(share).toBeLessThanOrEqual(0.25);
    expect(redirectable.reduce((sum, load) => sum + netSaving(load, DEFAULT_ASSUMPTIONS), 0)).toBeGreaterThan(0);
  });

  it('the cause is that the cheap station is far: every losing recommendation is off the route', () => {
    expect(losing.every((load) => load.offRoute && load.detourM > 0)).toBe(true);
    // On the route the cheap station costs no extra kilometres, so it always pays off.
    expect(redirectable.filter((load) => !load.offRoute).every((load) => load.detourM === 0)).toBe(true);
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
