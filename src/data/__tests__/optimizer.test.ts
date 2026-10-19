import { afterEach, describe, expect, it } from 'vitest';
import { computeOptimizerKpis } from '../../domain/optimizer/metrics';
import { DEFAULT_ASSUMPTIONS } from '../../domain/optimizer/rules';
import { canSession } from '../../domain/rbac/portal-roles';
import { portalPrincipals } from '../access';
import { apiCapabilities } from '../apiCoverage';
import { CLIENT_ACCOUNT_ID, unitById } from '../client';
import { paymentMedia } from '../fleet';
import { unitAssignments } from '../limits';
import { driverNameOf, scopedOptimizerLoads, regionSummaries } from '../optimizer';

/** Loads the optimizer page reads for the current session. */
const loadsOfSession = () => scopedOptimizerLoads(new Date(2026, 9, 16, 11, 0).getTime());
import * as recommendations from '../recommendations';
import { DEFAULT_PRINCIPAL, setSessionPrincipal } from '../session';

const principal = (userId: string) => portalPrincipals.find((candidate) => candidate.userId === userId)!;

afterEach(() => {
  setSessionPrincipal(DEFAULT_PRINCIPAL);
  recommendations.resetRecommendations();
});

describe('optimizer data in the portal', () => {
  it('a user limited to División Noreste only sees Monterrey and Saltillo', () => {
    const all = loadsOfSession().length;
    setSessionPrincipal(principal('u-2'));
    expect(new Set(loadsOfSession().map((load) => load.zone))).toEqual(new Set(['monterrey', 'saltillo']));
    expect(loadsOfSession().length).toBeLessThan(all);
  });

  it('a user limited to a department sees only that zone', () => {
    setSessionPrincipal(principal('u-7'));
    expect(new Set(loadsOfSession().map((load) => load.zone))).toEqual(new Set(['guadalajara']));
  });

  it('a user limited to an area sees the loads of that area, and only those', () => {
    const area = `org:${CLIENT_ACCOUNT_ID}:area-zapopan`;
    setSessionPrincipal({ ...principal('u-7'), scopeNodeId: area });
    expect(loadsOfSession().length).toBeGreaterThan(0);
    expect(loadsOfSession().every((load) => load.orgPath.includes(area))).toBe(true);
  });

  it('card, unit and driver come from the data: the card is the unit\'s, the driver is the one of that day', () => {
    for (const load of loadsOfSession().slice(0, 2000)) {
      const unit = unitById(load.unitId)!;
      expect(load.cardId).toBe(`TAR-${unit.id}`);
      expect(load.product).toBe(unit.product);
      expect(load.vehicleType).toBe(unit.vehicleClass);
    }
    expect(loadsOfSession().some((load) => load.driverId !== null && driverNameOf(load.driverId) !== load.driverId)).toBe(true);
  });

  it('the view by region adds up to the optimizer total', () => {
    const regions = regionSummaries(loadsOfSession(), DEFAULT_ASSUMPTIONS, 'bruto');
    const kpis = computeOptimizerKpis(loadsOfSession(), DEFAULT_ASSUMPTIONS, 'bruto', 30);
    expect(regions.reduce((sum, region) => sum + region.saving, 0)).toBeCloseTo(kpis.saving, 2);
    expect(regions.map((region) => region.name)).toContain('División Noreste');
  });
});

describe('Enviar al conductor', () => {
  it('logs who sent it, to which driver and when', () => {
    setSessionPrincipal(principal('u-2'));
    const load = loadsOfSession().find((candidate) => candidate.recommendedStationId !== null)!;
    const unit = unitById(load.unitId)!;
    const entry = recommendations.sendStationRecommendation({
      cardId: load.cardId,
      maskedCard: '•••• 0000',
      unitId: unit.id,
      plate: unit.plate,
      driverName: driverNameOf(load.driverId),
      fromStation: 'Origen',
      toStation: 'Destino',
    });
    expect(entry.sentBy).toBe('Mariana Treviño');
    expect(entry.sentByRole).toBe('Operador de flota');
    expect(entry.driverName).toBe(driverNameOf(load.driverId));
    expect(entry.at).toBeGreaterThan(0);
    expect(recommendations.recommendationLog()).toEqual([entry]);
  });

  it('is manual and one at a time: there is no bulk or rule-based send', () => {
    const sends = Object.keys(recommendations).filter((name) => /send/i.test(name));
    expect(sends).toEqual(['sendStationRecommendation']);
  });

  it('says it does not touch the card, and does not touch it', () => {
    expect(recommendations.RECOMMENDATION_DISCLAIMER).toBe(
      'Recomendación de estación — no modifica las restricciones de la tarjeta',
    );
    const mediaBefore = JSON.stringify(paymentMedia);
    const limitsBefore = JSON.stringify(unitAssignments);
    const load = loadsOfSession().find((candidate) => candidate.recommendedStationId !== null)!;
    const unit = unitById(load.unitId)!;
    recommendations.sendStationRecommendation({
      cardId: load.cardId,
      maskedCard: '•••• 0000',
      unitId: unit.id,
      plate: unit.plate,
      driverName: driverNameOf(load.driverId),
      fromStation: 'Origen',
      toStation: 'Destino',
    });
    expect(JSON.stringify(paymentMedia)).toBe(mediaBefore);
    expect(JSON.stringify(unitAssignments)).toBe(limitsBefore);
  });

  it('is marked as a mock channel in the API coverage', () => {
    const capability = apiCapabilities.find((candidate) => candidate.id === 'opt-send-driver')!;
    expect(capability.status).toBe('unavailable');
    expect(capability.label).toContain('MOCK');
    expect(capability.note).toContain('SIMULADO');
  });

  it('only admin and flota may send; finanzas and consulta may not', () => {
    expect(canSession('admin', 'tc.recomendaciones', 'escribir')).toBe(true);
    expect(canSession('flota', 'tc.recomendaciones', 'escribir')).toBe(true);
    expect(canSession('finanzas', 'tc.recomendaciones', 'escribir')).toBe(false);
    expect(canSession('consulta', 'tc.recomendaciones', 'escribir')).toBe(false);
  });
});
