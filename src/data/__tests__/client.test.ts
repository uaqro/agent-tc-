/**
 * Ticket Car's own mocks sit on top of the common padrón ported from eOne. These tests keep both in step: every
 * hand-written scenario has to point at a unit that exists, and every count the pages show has to add up to the
 * padrón, so a change in the generator shows up here instead of as a silent mismatch between two pages.
 */
import { describe, expect, it } from 'vitest';
import { registryStatusOf } from '../../domain/dashboard/types';
import {
  clientAccount,
  clientDrivers,
  clientSnapshot,
  clientUnits,
  groupLabel,
  operatingUnits,
  unitById,
} from '../client';
import { attentionItems, fundingRules, vehicleGroups, vehicles } from '../dispersion';
import { drivers, paymentMedia, vehicleDetails } from '../fleet';
import { unitAssignments } from '../limits';
import { serviceOrders, upcomingServices } from '../maintenance';
import { tollTags } from '../toll';

const SCENARIO_REFERENCES = [
  ...attentionItems.map((item) => item.vehicleId),
  ...unitAssignments.map((assignment) => assignment.vehicleId),
  ...serviceOrders.map((order) => order.vehicleId),
  ...upcomingServices.map((service) => service.vehicleId),
  ...tollTags.flatMap((tag) => (tag.vehicleId ? [tag.vehicleId] : [])),
];

describe('the client account', () => {
  it('is Grupo Alimentario Norte, active, with its whole padrón', () => {
    expect(clientAccount.name).toBe('Grupo Alimentario Norte');
    expect(clientAccount.active).toBe(true);
    expect(clientUnits).toHaveLength(clientAccount.fleetSize);
  });

  it('keeps deregistered units in the catalogue but not in the operating list', () => {
    const deregistered = clientUnits.filter((unit) => registryStatusOf(unit) === 'baja');
    expect(deregistered.length).toBeGreaterThan(0);
    expect(operatingUnits).toHaveLength(clientUnits.length - deregistered.length);
    expect(vehicleDetails).toHaveLength(clientUnits.length);
    expect(vehicles).toHaveLength(operatingUnits.length);
    expect(vehicleDetails.filter((detail) => detail.status === 'inactive')).toHaveLength(deregistered.length);
  });

  it('builds the same snapshot twice for the same day', () => {
    const at = new Date(2026, 9, 16, 11, 0).getTime();
    expect(clientSnapshot(7, at).accounts[0].period).toEqual(clientSnapshot(7, at + 60_000).accounts[0].period);
  });
});

describe('hand-written scenarios point at real units', () => {
  it.each(SCENARIO_REFERENCES.map((id) => [id]))('%s is an operating unit of the padrón', (id) => {
    const unit = unitById(id);
    expect(unit).toBeDefined();
    expect(registryStatusOf(unit!)).toBe('alta');
  });

  it('limit assignments use the tank of the padrón', () => {
    for (const assignment of unitAssignments) {
      expect(assignment.tankLiters, assignment.vehicleId).toBe(unitById(assignment.vehicleId)!.tankLiters);
    }
  });

  it('the attention list keeps its scenario balances', () => {
    const zero = vehicles.find((vehicle) => vehicle.id === 'ECO-3004')!;
    expect(zero.balanceMXN).toBe(0);
    expect(attentionItems.find((item) => item.kind === 'zero-balance')!.vehicleId).toBe(zero.id);
  });
});

describe('groups and counts add up', () => {
  it('the groups split the operating fleet without overlap', () => {
    const all = vehicleGroups.find((group) => group.id === 'g-all')!;
    const parts = vehicleGroups.filter((group) => group.id !== 'g-all');
    expect(parts).toHaveLength(6);
    expect(parts.reduce((sum, group) => sum + group.units, 0)).toBe(all.units);
    expect(all.units).toBe(operatingUnits.length);
  });

  it('each funding rule covers the units of its group', () => {
    for (const rule of fundingRules) {
      const group = vehicleGroups.find((candidate) => rule.scopeLabel === `Grupo ${candidate.label}`);
      expect(group, rule.name).toBeDefined();
      expect(rule.units, rule.name).toBe(group!.units);
    }
  });

  it('a vehicle shows the group and driver of its padrón unit', () => {
    for (const vehicle of vehicles.slice(0, 50)) {
      const unit = unitById(vehicle.id)!;
      expect(vehicle.plate).toBe(unit.plate);
      expect(vehicle.group).toBe(groupLabel(unit.group));
    }
  });
});

describe('drivers and payment media', () => {
  it('lists every driver of the padrón, and the unit each one is assigned to', () => {
    expect(drivers).toHaveLength(clientDrivers.length);
    for (const driver of drivers.filter((candidate) => candidate.vehicleId !== null)) {
      expect(unitById(driver.vehicleId!)!.assignedDriverId).toBe(driver.id);
    }
  });

  it('flags drivers with an expired licence and drivers who did not drive', () => {
    expect(drivers.some((driver) => driver.licenseExpires < '2026-10-16')).toBe(true);
    expect(drivers.some((driver) => driver.active)).toBe(true);
    expect(drivers.some((driver) => !driver.active)).toBe(true);
  });

  it('gives every unit one medium: a chip card for TicketCar+, a tag for Autoconsumo', () => {
    const assigned = paymentMedia.filter((medium) => medium.vehicleId !== null);
    expect(assigned).toHaveLength(clientUnits.length);
    for (const medium of assigned) {
      const unit = unitById(medium.vehicleId!)!;
      if (medium.type === 'virtual') continue;
      expect(medium.type).toBe(unit.product === 'autoconsumo' ? 'tag' : 'chip-card');
    }
    expect(paymentMedia.some((medium) => medium.status === 'unassigned')).toBe(true);
  });
});
