/**
 * Electromovilidad follows the EV Manager business rules (docs/06-business-rules.md of ER-Mobility-MX/EV-Manager).
 * These tests pin the money rules (RN-FND) and the PolicyEngine precedence (RN-RES-3), so a change to the mock
 * shows up here and not as a page that quietly disagrees with the product.
 */
import { describe, expect, it } from 'vitest';
import {
  EV_RATES,
  buildEvFundings,
  buildEvLedger,
  buildEvSessions,
  evAccountTotals,
  evAuthorize,
  evCards,
  evFundingQuote,
  evPolicies,
  evPoliciesFor,
  evStations,
  evVehicles,
  stationById,
  vehicleById,
} from '../electromobility';
import type { EvPolicy } from '../../types/electromobility';

const NOW = new Date(2026, 9, 16, 13, 30).getTime();
// A Wednesday in the demo month, inside every seeded schedule.
const WEDNESDAY_NOON = new Date(2026, 9, 14, 12, 0);

describe('fondeo (RN-FND)', () => {
  it('modo neto: abona exactamente el monto y cobra comisión + IVA encima', () => {
    const quote = evFundingQuote('stp', 'net', 100_000);
    expect(quote.credited).toBe(100_000);
    expect(quote.commission).toBe(1_500);
    expect(quote.commissionTax).toBe(240);
    expect(quote.processingFee).toBe(0);
    expect(quote.totalToPay).toBe(101_740);
  });

  it('modo bruto: lo pagado alcanza exactamente para abono + comisión + IVA', () => {
    const quote = evFundingQuote('transfer', 'gross', 101_740);
    expect(quote.totalToPay).toBe(101_740);
    expect(quote.credited).toBeCloseTo(100_000, 2);
  });

  it('tarjeta añade la comisión de procesamiento y su IVA', () => {
    const quote = evFundingQuote('card', 'net', 10_000);
    expect(quote.processingFee).toBe(10_000 * EV_RATES.cardProcessing);
    expect(quote.processingTax).toBeCloseTo(quote.processingFee * EV_RATES.iva, 2);
    expect(quote.totalToPay).toBeCloseTo(10_000 + 150 + 24 + 290 + 46.4, 2);
  });
});

describe('PolicyEngine (RN-RES)', () => {
  const ventas01 = vehicleById('ev-01')!;
  const reparto01 = vehicleById('ev-03')!;
  const vallejo = stationById('st-vallejo')!;

  const authorize = (overrides: Partial<Parameters<typeof evAuthorize>[0]> = {}) =>
    evAuthorize({
      vehicle: ventas01,
      station: stationById('st-reforma')!,
      at: WEDNESDAY_NOON,
      energyKwh: 30,
      policies: evPolicies,
      cards: evCards,
      sessions: [],
      availableBalance: 50_000,
      ...overrides,
    });

  it('ordena las políticas de la más específica a la más general', () => {
    expect(evPoliciesFor(ventas01, evPolicies).map((policy) => policy.scope)).toEqual(['vehicle', 'company']);
    expect(evPoliciesFor(reparto01, evPolicies).map((policy) => policy.scope)).toEqual(['group', 'cost-center', 'company']);
  });

  it('una recarga dentro de todas las reglas se autoriza y compromete el estimado', () => {
    const result = authorize();
    expect(result.allowed).toBe(true);
    expect(result.hold).toBeGreaterThan(0);
  });

  it('el horario lo decide la política más específica', () => {
    // Company allows until 23:00, Ventas-01's own policy only until 22:00.
    const result = authorize({ at: new Date(2026, 9, 14, 22, 30) });
    expect(result.allowed).toBe(false);
    expect(result.checks.find((check) => check.id === 'schedule')?.source).toBe('Política Ventas-01');
  });

  it('los límites cuantitativos toman el mínimo de todas las políticas', () => {
    // Company: 120 kWh/day, Ventas-01: 80 kWh/day → 80 applies.
    expect(authorize({ energyKwh: 85 }).allowed).toBe(false);
    expect(authorize({ energyKwh: 75 }).allowed).toBe(true);
  });

  it('una política deshabilitada no aplica', () => {
    // Servicios-01 on a Saturday, without its group policy: only the company one (Mon–Sat) and the
    // disabled «Bloqueo fin de semana — Servicios» (Mon–Fri) are left.
    const servicios = vehicleById('ev-08')!;
    const saturday = new Date(2026, 9, 17, 12, 0);
    const withoutGroup: EvPolicy[] = evPolicies.filter((policy) => policy.scope !== 'group');
    const run = (policies: EvPolicy[]) =>
      evAuthorize({ vehicle: servicios, station: vallejo, at: saturday, energyKwh: 10, policies, cards: evCards, sessions: [], availableBalance: 50_000 });

    expect(run(withoutGroup).allowed).toBe(true);
    const enabled = withoutGroup.map((policy) => (policy.id === 'evp-5' ? { ...policy, enabled: true } : policy));
    expect(run(enabled).allowed).toBe(false);
    expect(run(enabled).checks.find((check) => check.id === 'days')?.source).toBe('Bloqueo fin de semana — Servicios');
  });

  it('sin saldo disponible suficiente no se autoriza', () => {
    expect(authorize({ availableBalance: 10 }).allowed).toBe(false);
  });

  it('una unidad sin tarjeta activa no carga', () => {
    const blocked = evCards.map((card) => (card.vehicleId === ventas01.id ? { ...card, status: 'blocked' as const } : card));
    expect(authorize({ cards: blocked }).checks[0]!.ok).toBe(false);
  });
});

describe('historial de demo', () => {
  const sessions = buildEvSessions(NOW);
  const ledger = buildEvLedger(sessions, buildEvFundings(NOW));

  it('es determinista', () => {
    expect(buildEvSessions(NOW)).toEqual(sessions);
  });

  it('cada recarga apunta a una unidad, estación y tarjeta que existen', () => {
    for (const session of sessions) {
      expect(evVehicles.some((vehicle) => vehicle.id === session.vehicleId)).toBe(true);
      expect(evStations.some((station) => station.id === session.stationId)).toBe(true);
      expect(evCards.some((card) => card.id === session.cardId)).toBe(true);
    }
  });

  it('las denegadas no cobran y llevan motivo', () => {
    const denied = sessions.filter((session) => session.status === 'denied');
    expect(denied.length).toBeGreaterThan(0);
    for (const session of denied) {
      expect(session.total).toBe(0);
      expect(session.denyReason).toBeTruthy();
    }
  });

  it('el saldo disponible es contable − comprometido y nunca negativo (RN-ACC-3, RN-ACC-6)', () => {
    const totals = evAccountTotals(ledger);
    expect(totals.available).toBeCloseTo(totals.book - totals.committed, 2);
    expect(totals.available).toBeGreaterThan(0);
  });
});
