import { afterEach, describe, expect, it } from 'vitest';
import { portalPrincipals } from '../access';
import { CLIENT_ACCOUNT_ID, orgPathOf, scopeNodeOptions } from '../client';
import { vehicles } from '../dispersion';
import { DEFAULT_PRINCIPAL, setSessionPrincipal } from '../session';
import { addToSelection, searchUnits, selectableNodes, unitsUnderNode } from '../unitSelection';

const NORESTE = `org:${CLIENT_ACCOUNT_ID}:division-noreste`;

afterEach(() => setSessionPrincipal(DEFAULT_PRINCIPAL));

describe('unit selector of the funding rules', () => {
  it('finds a unit by plate, by economic number and by driver, ignoring case and accents', () => {
    const unit = vehicles.find((vehicle) => /[áéíóúñ]/i.test(vehicle.driver))!;
    expect(searchUnits(vehicles, unit.plate.toLowerCase())).toContainEqual(unit);
    expect(searchUnits(vehicles, unit.id)).toEqual([unit]);
    const plainDriver = unit.driver.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    expect(searchUnits(vehicles, plainDriver)).toContainEqual(unit);
  });

  it('an empty search shows every unit', () => {
    expect(searchUnits(vehicles, '  ')).toHaveLength(vehicles.length);
  });

  it('marking an org node takes its whole subtree', () => {
    const under = unitsUnderNode(vehicles, NORESTE);
    expect(under.length).toBeGreaterThan(0);
    expect(under.every((vehicle) => orgPathOf(vehicle.id).includes(NORESTE))).toBe(true);
    const departments = scopeNodeOptions.filter((node) => node.name.startsWith('Departamento') && orgPathOf(under[0].id).includes(node.id));
    expect(departments.length).toBe(1);
  });

  it('adding to the selection keeps the order and never duplicates', () => {
    expect(addToSelection(['a', 'b'], ['b', 'c', 'a', 'd'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('a user limited to a division can only pick nodes of that division', () => {
    setSessionPrincipal(portalPrincipals.find((principal) => principal.userId === 'u-2')!);
    const nodes = selectableNodes();
    expect(nodes[0].id).toBe(NORESTE);
    expect(nodes.every((node) => node.id === NORESTE || node.name !== 'División Occidente')).toBe(true);
    expect(nodes.length).toBeLessThan(scopeNodeOptions.length);
  });
});
