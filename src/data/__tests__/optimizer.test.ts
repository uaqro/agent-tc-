import { afterEach, describe, expect, it } from 'vitest';
import { computeOptimizerKpis } from '../../domain/optimizer/metrics';
import { departmentNodeIdOf } from '../../domain/optimizer/org';
import { DEFAULT_ASSUMPTIONS } from '../../domain/optimizer/rules';
import { canSession } from '../../domain/rbac/portal-roles';
import { portalPrincipals } from '../access';
import { apiCapabilities } from '../apiCoverage';
import { CLIENT_ACCOUNT_ID, orgPathOf } from '../client';
import { paymentMedia } from '../fleet';
import { unitAssignments } from '../limits';
import { cardHolder, optimizerLoads, regionSummaries } from '../optimizer';
import * as recommendations from '../recommendations';
import { DEFAULT_PRINCIPAL, setSessionPrincipal } from '../session';

const principal = (userId: string) => portalPrincipals.find((candidate) => candidate.userId === userId)!;

afterEach(() => {
  setSessionPrincipal(DEFAULT_PRINCIPAL);
  recommendations.resetRecommendations();
});

describe('optimizer data in the portal', () => {
  it('a user limited to División Noreste only sees Monterrey and Saltillo', () => {
    const all = optimizerLoads.length;
    setSessionPrincipal(principal('u-2'));
    expect(new Set(optimizerLoads.map((load) => load.zone))).toEqual(new Set(['monterrey', 'saltillo']));
    expect(optimizerLoads.length).toBeLessThan(all);
  });

  it('a user limited to a department sees only that zone', () => {
    setSessionPrincipal(principal('u-7'));
    expect(new Set(optimizerLoads.map((load) => load.zone))).toEqual(new Set(['guadalajara']));
  });

  it('a user limited below department level sees no loads: the dataset does not go below zones', () => {
    setSessionPrincipal({ ...principal('u-7'), scopeNodeId: `org:${CLIENT_ACCOUNT_ID}:area-zapopan` });
    expect(optimizerLoads).toEqual([]);
  });

  it('every card belongs to a TicketCar+ unit of the department of its zone', () => {
    const checked = new Set<string>();
    for (const load of optimizerLoads.slice(0, 2000)) {
      if (checked.has(load.cardId)) continue;
      checked.add(load.cardId);
      const holder = cardHolder(load.cardId)!;
      expect(holder.unit.product).toBe('ticketcar_plus');
      expect(orgPathOf(holder.unit.id)).toContain(departmentNodeIdOf(load.zone));
    }
    expect(checked.size).toBeGreaterThan(50);
  });

  it('the view by region adds up to the optimizer total', () => {
    const regions = regionSummaries(optimizerLoads, DEFAULT_ASSUMPTIONS, 'bruto');
    const kpis = computeOptimizerKpis(optimizerLoads, DEFAULT_ASSUMPTIONS, 'bruto', 30);
    expect(regions.reduce((sum, region) => sum + region.saving, 0)).toBeCloseTo(kpis.saving, 2);
    expect(regions.map((region) => region.name)).toContain('División Noreste');
  });
});

describe('Enviar al conductor', () => {
  it('logs who sent it, to which driver and when', () => {
    setSessionPrincipal(principal('u-2'));
    const load = optimizerLoads.find((candidate) => candidate.recommendedStationId !== null)!;
    const holder = cardHolder(load.cardId)!;
    const entry = recommendations.sendStationRecommendation({
      cardId: load.cardId,
      maskedCard: '•••• 0000',
      unitId: holder.unit.id,
      plate: holder.unit.plate,
      driverName: holder.driverName,
      fromStation: 'Origen',
      toStation: 'Destino',
    });
    expect(entry.sentBy).toBe('Mariana Treviño');
    expect(entry.sentByRole).toBe('Operador de flota');
    expect(entry.driverName).toBe(holder.driverName);
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
    const load = optimizerLoads.find((candidate) => candidate.recommendedStationId !== null)!;
    const holder = cardHolder(load.cardId)!;
    recommendations.sendStationRecommendation({
      cardId: load.cardId,
      maskedCard: '•••• 0000',
      unitId: holder.unit.id,
      plate: holder.unit.plate,
      driverName: holder.driverName,
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
