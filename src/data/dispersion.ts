import { UNIT_GROUPS } from '../domain/data/fleet-activity';
import type { FleetUnit } from '../domain/dashboard/types';
import type { AttentionItem, FundingRule, Receipt, RunSimulation, Vehicle, VehicleGroup } from '../types/dispersion';
import {
  assignedDriverName,
  clientAccount,
  clientSnapshot,
  groupId,
  groupLabel,
  operatingUnits,
  stableFraction,
  unitById,
} from './client';
import { onSessionChange, unitInScope } from './session';

/** Reference price used for the litres ⇄ money conversion shown next to every amount. */
export const PRICE_PER_LITER = 24.8;

export const toLiters = (mxn: number): number => mxn / PRICE_PER_LITER;
export const toMoney = (liters: number): number => liters * PRICE_PER_LITER;

export const account = {
  name: clientAccount.name,
  user: 'U. Aquino',
  availableMXN: 1_418_700,
  monthBudgetMXN: 1_380_000,
};

export const fundingRules: FundingRule[] = [
  {
    id: 'r-norte',
    name: 'Reposición a tope · Corredor Norte',
    type: 'top-off',
    scopeLabel: 'Grupo Corredor Norte',
    units: 71,
    summary: 'Reponer a tope 600 L por unidad',
    triggerText: 'Cada quincena · días 1 y 15',
    measure: 'liters',
    nextRun: '2026-11-15',
    status: 'active',
    projectedMXN: 127_300,
    newUnits: 3,
    excludedUnits: 2,
    deltaPct: 4.2,
    previousPeriodLabel: 'octubre',
  },
  {
    id: 'r-umbral',
    name: 'Umbral 10% · Reserva y sustitución',
    type: 'balance-threshold',
    scopeLabel: 'Grupo Reserva y sustitución',
    units: 8,
    summary: 'Si el saldo baja del 10% del depósito, recargar a tope',
    triggerText: 'Automático · al cruzar el umbral',
    measure: 'liters',
    nextRun: null,
    status: 'active',
    projectedMXN: 12_400,
    newUnits: 0,
    excludedUnits: 1,
    deltaPct: 9.4,
    previousPeriodLabel: 'septiembre',
  },
  {
    id: 'r-centro',
    name: 'Consumo histórico · Zona Metropolitana',
    type: 'consumption',
    scopeLabel: 'Grupo Zona Metropolitana',
    units: 60,
    summary: 'Promedio de los últimos 30 días + 10% de colchón',
    triggerText: 'Mensual · día 1',
    measure: 'money',
    nextRun: '2026-12-01',
    status: 'active',
    projectedMXN: 103_900,
    newUnits: 1,
    excludedUnits: 0,
    deltaPct: 18.6,
    previousPeriodLabel: 'octubre',
  },
  {
    id: 'r-sur',
    name: 'Monto fijo · Sureste',
    type: 'schedule-fixed',
    scopeLabel: 'Grupo Sureste',
    units: 38,
    summary: 'Fondear $3,500 por unidad',
    triggerText: 'Semanal · lunes',
    measure: 'money',
    nextRun: '2026-10-19',
    status: 'paused',
    statusNote: 'Pausada desde el 28 de septiembre',
    projectedMXN: 133_000,
    newUnits: 0,
    excludedUnits: 4,
    deltaPct: 0,
    previousPeriodLabel: 'septiembre',
  },
];

/** Padrón groups with the units still under contract that the session can see. */
function groupsOf(units: FleetUnit[]): VehicleGroup[] {
  return [
    ...UNIT_GROUPS.map((group) => ({
      id: groupId(group),
      label: groupLabel(group),
      units: units.filter((unit) => unit.group === group).length,
    })),
    { id: 'g-all', label: 'Toda la flota', units: units.length },
  ];
}

/** Groups with the TicketCar+ units in scope: what funding rules and limit policies cover. */
export let vehicleGroups: VehicleGroup[] = groupsOf(operatingUnits.filter((unit) => unit.product === 'ticketcar_plus'));

/** Balances the attention list and the rules talk about. Every other unit gets a balance derived from its spend. */
const SCENARIO_BALANCES: Record<string, number> = {
  'ECO-3004': 0,
  'ECO-3033': 1_240,
  'ECO-3240': 4_280,
  'ECO-3215': 860,
  'ECO-3260': 2_150,
  'ECO-3035': 95,
  'ECO-3253': 1_700,
  'ECO-3113': 320,
};

/** Average weekly spend of each unit over the last 30 closed days of the common activity. */
function weeklySpendByUnit(): Map<string, number> {
  const totals = new Map<string, number>();
  const closedDays = clientSnapshot(30).accounts[0].period.filter((point) => !point.partial);
  for (const point of closedDays) {
    for (const row of point.rows) totals.set(row.unitId, (totals.get(row.unitId) ?? 0) + row.amountMxn);
  }
  const weeks = Math.max(1, closedDays.length) / 7;
  return new Map([...totals].map(([unitId, total]) => [unitId, Math.max(0, Math.round(total / weeks / 10) * 10)]));
}

const weeklySpend = weeklySpendByUnit();

/** Units under contract, both products. Deregistered units have no card to fund and no toll tag to top up. */
const allVehicles: Vehicle[] = operatingUnits.map((unit) => {
  const avgWeeklySpendMXN = weeklySpend.get(unit.id) ?? 0;
  const derived = Math.round((avgWeeklySpendMXN * (0.3 + stableFraction(`${unit.id}:saldo`) * 1.1)) / 10) * 10;
  return {
    id: unit.id,
    plate: unit.plate,
    device: `${unit.product === 'autoconsumo' ? 'AC' : 'TC'}-1${unit.id.slice(4)}`,
    driver: assignedDriverName(unit),
    group: groupLabel(unit.group),
    balanceMXN: SCENARIO_BALANCES[unit.id] ?? derived,
    avgWeeklySpendMXN,
  };
});

const isTicketCar = (unitId: string): boolean => unitById(unitId)?.product === 'ticketcar_plus';

/**
 * Units Saldos and the funding rules work with: TicketCar+ only. Autoconsumo units fuel at the client's own stations
 * and have no prepaid balance; their consumption is in Resumen and Reportes.
 */
export let vehicles: Vehicle[] = allVehicles.filter((vehicle) => isTicketCar(vehicle.id));

/** Every operating unit, both products, for the pages that are not about prepaid balance (Mantenimiento, Peaje). */
export let fleetVehicles: Vehicle[] = allVehicles;

/** Groups with every operating unit, both products. */
export let fleetGroups: VehicleGroup[] = groupsOf(operatingUnits);

/** Autoconsumo units in scope, for the note in Saldos. */
export let autoconsumoUnits = 0;

const allAttentionItems: AttentionItem[] = [
  {
    id: 'a-0',
    kind: 'balance-request',
    vehicleId: 'ECO-3035',
    detail: 'Rodrigo Estrada Sarmiento solicitó saldo desde la app hace 40 minutos. Saldo actual insuficiente para su ruta.',
    amountMXN: 600,
  },
  {
    id: 'a-4',
    kind: 'balance-request',
    vehicleId: 'ECO-3113',
    detail: 'Aristeo Sarmiento Nájera solicitó saldo para carga en ruta. Supervisor de Sureste ya validó el viaje.',
    amountMXN: 800,
  },
  {
    id: 'a-1',
    kind: 'zero-balance',
    vehicleId: 'ECO-3004',
    detail: 'Saldo en $0.00 desde hace 2 días. El conductor reportó carga pendiente.',
    amountMXN: 500,
  },
  {
    id: 'a-2',
    kind: 'anomalous-consumption',
    vehicleId: 'ECO-3033',
    detail: 'Consumo 42% arriba de su promedio de 30 días en las últimas 2 cargas.',
    amountMXN: 0,
  },
  {
    id: 'a-3',
    kind: 'trapped-balance',
    vehicleId: 'ECO-3240',
    detail: 'Unidad sin conductor titular en el padrón: el saldo lo consumen relevos sin responsable asignado.',
    amountMXN: 4_280,
  },
];

export let attentionItems: AttentionItem[] = allAttentionItems;

// The session scope (ADR-TCP-001) narrows what every funding page sees: units, their groups and the attention list.
onSessionChange(() => {
  const inScope = operatingUnits.filter((unit) => unitInScope(unit.id));
  fleetVehicles = allVehicles.filter((vehicle) => unitInScope(vehicle.id));
  vehicles = fleetVehicles.filter((vehicle) => isTicketCar(vehicle.id));
  fleetGroups = groupsOf(inScope);
  vehicleGroups = groupsOf(inScope.filter((unit) => unit.product === 'ticketcar_plus'));
  autoconsumoUnits = inScope.filter((unit) => unit.product === 'autoconsumo').length;
  attentionItems = allAttentionItems.filter((item) => unitInScope(item.vehicleId));
});

export const pastReceipts: Receipt[] = [
  {
    folio: 'DIS-2026-10-0188',
    kind: 'rule',
    issuedAt: '2026-10-01T08:12:00',
    user: account.user,
    sourceLabel: 'Reposición a tope · Corredor Norte',
    scopeLabel: 'Grupo Corredor Norte',
    units: 70,
    totalMXN: 122_020,
    lines: [],
  },
  {
    folio: 'DIS-2026-10-0205',
    kind: 'one-off',
    issuedAt: '2026-10-07T17:45:00',
    user: account.user,
    sourceLabel: 'Dispersión puntual',
    scopeLabel: 'EFG-44-35 · Rodrigo Estrada Sarmiento',
    units: 1,
    totalMXN: 500,
    lines: [{ plate: 'EFG-44-35', driver: 'Rodrigo Estrada Sarmiento', amountMXN: 500 }],
  },
  {
    folio: 'DIS-2026-10-0211',
    kind: 'cut',
    issuedAt: '2026-10-09T11:02:00',
    user: account.user,
    sourceLabel: 'Recorte de saldo',
    scopeLabel: 'Grupo Sureste · 2 unidades',
    units: 2,
    totalMXN: -7_340,
    lines: [],
  },
];

/** Quick amounts for the urgent top-up, derived from the historic spend of the unit. */
export function suggestedTopUps(vehicle: Vehicle): number[] {
  const fromHistory = Math.max(200, Math.round(vehicle.avgWeeklySpendMXN / 100) * 100);
  return [...new Set([200, 500, fromHistory])].sort((a, b) => a - b).slice(0, 3);
}

export function buildSimulation(rule: FundingRule): RunSimulation {
  const unitsAffected = rule.units - rule.excludedUnits;
  const availableAfterMXN = account.availableMXN - rule.projectedMXN;
  const sample = vehicles
    .filter((vehicle) => rule.scopeLabel.includes(vehicle.group))
    .slice(0, 5)
    .map((vehicle) => ({
      plate: vehicle.plate,
      driver: vehicle.driver,
      amountMXN: Math.round(rule.projectedMXN / rule.units),
    }));

  return {
    rule,
    unitsAffected,
    newUnits: rule.newUnits,
    excludedUnits: rule.excludedUnits,
    totalMXN: rule.projectedMXN,
    totalLiters: toLiters(rule.projectedMXN),
    availableBeforeMXN: account.availableMXN,
    availableAfterMXN,
    budgetMXN: account.monthBudgetMXN,
    budgetShare: availableAfterMXN / account.monthBudgetMXN,
    deltaPct: rule.deltaPct,
    previousPeriodLabel: rule.previousPeriodLabel,
    flagged: Math.abs(rule.deltaPct) > 15,
    sample,
  };
}
