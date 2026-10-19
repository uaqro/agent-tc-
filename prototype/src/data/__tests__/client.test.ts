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
import { attentionItems, autoconsumoUnits, fleetGroups, fleetVehicles, fundingRules, retiredUnits, vehicleGroups, vehicles } from '../dispersion';
import { drivers, paymentMedia, vehicleDetails, vehicleMedia } from '../fleet';
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
    expect(fleetVehicles).toHaveLength(operatingUnits.length);
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
    for (const [groups, units] of [
      [fleetGroups, operatingUnits],
      [vehicleGroups, operatingUnits.filter((unit) => unit.product === 'ticketcar_plus')],
    ] as const) {
      const all = groups.find((group) => group.id === 'g-all')!;
      const parts = groups.filter((group) => group.id !== 'g-all');
      expect(parts).toHaveLength(6);
      expect(parts.reduce((sum, group) => sum + group.units, 0)).toBe(all.units);
      expect(all.units).toBe(units.length);
    }
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
    const assigned = vehicleMedia.filter((medium) => medium.vehicleId !== null);
    expect(assigned).toHaveLength(clientUnits.length);
    for (const medium of assigned) {
      const unit = unitById(medium.vehicleId!)!;
      if (medium.type === 'virtual') continue;
      expect(medium.type).toBe(unit.product === 'autoconsumo' ? 'tag' : 'chip-card');
    }
    expect(paymentMedia.some((medium) => medium.status === 'unassigned')).toBe(true);
  });
});

describe('Saldos and Autoconsumo', () => {
  it('Saldos and the funding rules only work with TicketCar+ units', () => {
    expect(vehicles.length).toBeGreaterThan(0);
    expect(vehicles.every((vehicle) => unitById(vehicle.id)!.product === 'ticketcar_plus')).toBe(true);
    expect(vehicles.length + autoconsumoUnits).toBe(operatingUnits.length);
  });

  it('the Saldos note counts the Autoconsumo units left out', () => {
    expect(autoconsumoUnits).toBe(operatingUnits.filter((unit) => unit.product === 'autoconsumo').length);
    expect(autoconsumoUnits).toBeGreaterThan(0);
  });

  it('Medios de pago leaves Autoconsumo out for now, the vehicle catalogue keeps it', () => {
    const autoconsumo = (id: string | null) => id !== null && unitById(id)!.product === 'autoconsumo';
    expect(paymentMedia.some((medium) => autoconsumo(medium.vehicleId))).toBe(false);
    expect(vehicleMedia.some((medium) => autoconsumo(medium.vehicleId))).toBe(true);
  });

  it('Límites leaves Autoconsumo out for now', () => {
    expect(unitAssignments.every((assignment) => unitById(assignment.vehicleId)!.product === 'ticketcar_plus')).toBe(true);
  });
});

describe('the 512 units of the padrón add up', () => {
  it('TicketCar+ + Autoconsumo + deregistered = the whole padrón', () => {
    expect(vehicles.length).toBe(292);
    expect(autoconsumoUnits).toBe(206);
    expect(retiredUnits).toBe(14);
    expect(vehicles.length + autoconsumoUnits + retiredUnits).toBe(clientUnits.length);
    expect(vehicleDetails.filter((detail) => detail.status === 'inactive')).toHaveLength(retiredUnits);
  });

  it('a deregistered unit stops fuelling from the day it is deregistered', () => {
    const retired = clientUnits.filter((unit) => registryStatusOf(unit) === 'baja');
    const ids = new Set(retired.map((unit) => unit.id));
    const snapshot = clientSnapshot(30, new Date(2026, 9, 16, 11, 0).getTime());
    for (const point of snapshot.accounts[0].period) {
      expect(point.events.some((event) => ids.has(event.unitId))).toBe(false);
      expect(point.rows.filter((row) => ids.has(row.unitId)).every((row) => !row.active && row.liters === 0)).toBe(true);
    }
  });
});
