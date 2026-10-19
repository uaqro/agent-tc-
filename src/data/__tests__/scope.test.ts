/**
 * Session scope (ADR-TCP-001): a fleet operator limited to one division does not see units, fuelling or indicators
 * from any other part of the org chart, on any page, nor can they pick them in the global filters.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '../../domain/filters/types';
import { buildFilterOptions } from '../../domain/filters/options';
import { scopeFilterOptions } from '../../domain/rbac/scope';
import { canAccessRoute, portalPrincipals } from '../access';
import { CLIENT_ACCOUNT_ID, clientAccount, clientOrgTree, operatingUnits, orgPathOf } from '../client';
import { attentionItems, vehicleGroups, vehicles } from '../dispersion';
import { driverIdsInScope, drivers, paymentMedia, vehicleDetails } from '../fleet';
import { unitAssignments } from '../limits';
import { serviceOrders, upcomingServices } from '../maintenance';
import { DEFAULT_PRINCIPAL, scopedSnapshot, setSessionPrincipal } from '../session';
import { summaryMetricsFor } from '../summary';
import { tollMovements, tollTags } from '../toll';

const AT = new Date(2026, 9, 16, 11, 0).getTime();
const NORESTE = `org:${CLIENT_ACCOUNT_ID}:division-noreste`;
const fleetNoreste = portalPrincipals.find((principal) => principal.userId === 'u-2')!;

const inNoreste = (unitId: string) => orgPathOf(unitId).includes(NORESTE);

/** The account-wide figures, read before the session is narrowed, to compare against. */
const adminVehicles = vehicles.length;
const adminDrivers = drivers.length;
const adminWithNoresteFilter = summaryMetricsFor({ ...DEFAULT_FILTERS, orgNodeId: NORESTE }, AT);
const adminWholeAccount = summaryMetricsFor(DEFAULT_FILTERS, AT);

beforeAll(() => setSessionPrincipal(fleetNoreste));
afterAll(() => setSessionPrincipal(DEFAULT_PRINCIPAL));

describe('a fleet operator limited to División Noreste', () => {
  it('is the user the portal says it is', () => {
    expect(fleetNoreste.role).toBe('flota');
    expect(fleetNoreste.scopeNodeId).toBe(NORESTE);
  });

  it('only sees units of the division, and fewer than the account', () => {
    expect(vehicles.length).toBeGreaterThan(0);
    expect(vehicles.length).toBeLessThan(adminVehicles);
    expect(vehicles.every((vehicle) => inNoreste(vehicle.id))).toBe(true);
    expect(vehicleDetails.every((detail) => inNoreste(detail.vehicleId))).toBe(true);
    expect(vehicleGroups.find((group) => group.id === 'g-all')!.units).toBe(
      operatingUnits.filter((unit) => inNoreste(unit.id) && unit.product === 'ticketcar_plus').length,
    );
  });

  it('does not see a unit from another division anywhere', () => {
    const outside = operatingUnits.find((unit) => !inNoreste(unit.id))!;
    expect(vehicles.some((vehicle) => vehicle.id === outside.id)).toBe(false);
    expect(paymentMedia.some((medium) => medium.vehicleId === outside.id)).toBe(false);
  });

  it('every hand-written scenario it sees is about its own units', () => {
    const ids = [
      ...attentionItems.map((item) => item.vehicleId),
      ...unitAssignments.map((assignment) => assignment.vehicleId),
      ...serviceOrders.map((order) => order.vehicleId),
      ...upcomingServices.map((service) => service.vehicleId),
      ...tollTags.flatMap((tag) => (tag.vehicleId ? [tag.vehicleId] : [])),
      ...paymentMedia.flatMap((medium) => (medium.vehicleId ? [medium.vehicleId] : [])),
    ];
    expect(ids.every(inNoreste)).toBe(true);
    const tags = new Set(tollTags.map((tag) => tag.id));
    expect(tollMovements.every((movement) => tags.has(movement.tagId))).toBe(true);
  });

  it('only sees drivers who are assigned to or drove its units', () => {
    expect(drivers.length).toBeGreaterThan(0);
    expect(drivers.length).toBeLessThan(adminDrivers);
    const assignedInside = drivers.filter((driver) => driver.vehicleId !== null && inNoreste(driver.vehicleId));
    expect(assignedInside.length).toBeGreaterThan(0);
  });

  it('gets no fuelling from other divisions: units, history rows, events and the previous period', () => {
    const snapshot = scopedSnapshot(30, AT);
    expect(snapshot.accounts.map((account) => account.accountId)).toEqual([CLIENT_ACCOUNT_ID]);
    const activity = snapshot.accounts[0];
    expect(activity.units.every((unit) => unit.orgPath.includes(NORESTE))).toBe(true);
    for (const point of [...activity.period, ...activity.previousPeriod]) {
      expect(point.rows.every((row) => row.orgPath.includes(NORESTE))).toBe(true);
      expect(point.events.every((event) => event.orgPath.includes(NORESTE))).toBe(true);
    }
    expect(activity.todayEvents.every((event) => event.orgPath.includes(NORESTE))).toBe(true);
  });

  it('reads the same indicators an admin reads with the division filter, not the account totals', () => {
    const scoped = summaryMetricsFor(DEFAULT_FILTERS, AT);
    expect(scoped.map((metric) => metric.currentMonth)).toEqual(adminWithNoresteFilter.map((metric) => metric.currentMonth));
    expect(scoped.map((metric) => metric.previousMonth)).toEqual(adminWithNoresteFilter.map((metric) => metric.previousMonth));
    expect(scoped[0].currentMonth).toBeLessThan(adminWholeAccount[0].currentMonth);
  });

  it('cannot pick units, drivers or nodes outside the division in the global filters', () => {
    const options = scopeFilterOptions(
      buildFilterOptions([clientAccount], AT, new Map([[CLIENT_ACCOUNT_ID, clientOrgTree]])),
      fleetNoreste,
      clientOrgTree,
      driverIdsInScope(),
    );
    expect(options.units.every((unit) => unit.orgPath.includes(NORESTE))).toBe(true);
    expect(options.orgNodes.every((node) => node.value === NORESTE || node.hint?.includes('División Noreste'))).toBe(true);
    expect(options.drivers.every((driver) => driverIdsInScope().has(driver.value))).toBe(true);
  });
});

describe('what each role opens', () => {
  it('flota opera límites y mantenimiento, pero no saldos ni facturas', () => {
    expect(canAccessRoute('flota', 'limits')).toBe(true);
    expect(canAccessRoute('flota', 'maintenance')).toBe(true);
    expect(canAccessRoute('flota', 'dispersion')).toBe(false);
    expect(canAccessRoute('flota', 'company-invoices')).toBe(false);
  });

  it('finanzas opera saldos, medios de pago y facturas, pero no límites', () => {
    expect(canAccessRoute('finanzas', 'dispersion')).toBe(true);
    expect(canAccessRoute('finanzas', 'payment-media')).toBe(true);
    expect(canAccessRoute('finanzas', 'company-invoices')).toBe(true);
    expect(canAccessRoute('finanzas', 'limits')).toBe(false);
  });

  it('consulta solo ve resumen, análisis e inventario', () => {
    const open = (['dashboard', 'reports', 'insights', 'optimizer', 'ted', 'vehicles', 'drivers'] as const).every((route) =>
      canAccessRoute('consulta', route),
    );
    expect(open).toBe(true);
    for (const route of ['dispersion', 'limits', 'payment-media', 'maintenance', 'company-users', 'company-parameters'] as const) {
      expect(canAccessRoute('consulta', route), route).toBe(false);
    }
  });
});
