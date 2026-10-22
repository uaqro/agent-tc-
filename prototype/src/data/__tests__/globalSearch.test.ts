import { afterEach, describe, expect, it } from 'vitest';
import { canAccessRoute } from '../access';
import { globalSearchCatalog, searchEntities } from '../globalSearch';
import { DEFAULT_PRINCIPAL, setSessionPrincipal, unitInScope } from '../session';
import { drivers, paymentMedia, vehicleDetails } from '../fleet';
import { orgPathOf } from '../client';

afterEach(() => setSessionPrincipal(DEFAULT_PRINCIPAL));

describe('global entity search', () => {
  it('uses typed stable identities and excludes VIN and account-external data', () => {
    const catalog = globalSearchCatalog();
    expect(new Set(catalog.map((item) => item.id)).size).toBe(catalog.length);
    expect(catalog.filter((item) => item.route === 'vehicles')).toHaveLength(vehicleDetails.length);
    expect(catalog.filter((item) => item.route === 'drivers')).toHaveLength(drivers.length);
    expect(catalog.filter((item) => item.route === 'devices')).toHaveLength(paymentMedia.length);
    for (const unit of vehicleDetails.filter((unit) => unit.vin)) {
      expect(catalog.find((item) => item.id === `vehicles:${unit.vehicleId}`)?.searchText).not.toContain(unit.vin);
    }
  });

  it('normalizes spaces, case and accents and prioritizes exact labels', () => {
    const catalog = globalSearchCatalog();
    const driver = catalog.find((item) => item.route === 'drivers')!;
    expect(searchEntities(`  ${driver.label.toUpperCase()}  `, catalog)[0]?.label).toBe(driver.label);
    const query = driver.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    expect(searchEntities(query, catalog).some((item) => item.id === driver.id)).toBe(true);
    expect(searchEntities('   ', catalog)).toEqual([]);
  });

  it('does not let a result group starve other matching entity types', () => {
    const results = searchEntities('ECO', globalSearchCatalog());
    expect(results.some((item) => item.route === 'vehicles')).toBe(true);
    expect(results.some((item) => item.route === 'devices')).toBe(true);
    for (const group of new Set(results.map((item) => item.group))) {
      expect(results.filter((item) => item.group === group).length).toBeLessThanOrEqual(10);
    }
    expect(searchEntities('ECO', globalSearchCatalog())).toEqual(results);
  });

  it('rebuilds from the live session scope before returning entities', () => {
    const before = vehicleDetails.length;
    const path = orgPathOf(vehicleDetails[0].vehicleId);
    setSessionPrincipal({ ...DEFAULT_PRINCIPAL, scopeNodeId: path[path.length - 1] });
    const catalog = globalSearchCatalog();
    expect(vehicleDetails.length).toBeGreaterThan(0);
    expect(vehicleDetails.length).toBeLessThan(before);
    expect(catalog.filter((item) => item.route === 'vehicles').every((item) => unitInScope(item.entityId))).toBe(true);
    expect(catalog.filter((item) => item.route === 'drivers')).toHaveLength(drivers.length);
  });

  it('only indexes routes the current role may open', () => {
    setSessionPrincipal({ ...DEFAULT_PRINCIPAL, role: 'consulta' });
    expect(globalSearchCatalog().every((item) => canAccessRoute('consulta', item.route))).toBe(true);
  });
});
