import type { AttentionItem, FundingRule, Receipt, RunSimulation, Vehicle, VehicleGroup } from '../types/dispersion';

/** Reference price used for the litres ⇄ money conversion shown next to every amount. */
export const PRICE_PER_LITER = 24.8;

export const toLiters = (mxn: number): number => mxn / PRICE_PER_LITER;
export const toMoney = (liters: number): number => liters * PRICE_PER_LITER;

export const account = {
  name: 'EDENRED MEXICO1',
  user: 'U. Aquino',
  availableMXN: 1_418_700,
  monthBudgetMXN: 1_380_000,
};

export const fundingRules: FundingRule[] = [
  {
    id: 'r-norte',
    name: 'Reposición a tope · Ruta Norte',
    type: 'top-off',
    scopeLabel: 'Grupo Ruta Norte',
    units: 230,
    summary: 'Reponer a tope 600 L por unidad',
    triggerText: 'Cada quincena · días 1 y 15',
    measure: 'liters',
    nextRun: '2026-11-15',
    status: 'active',
    projectedMXN: 412_300,
    newUnits: 3,
    excludedUnits: 2,
    deltaPct: 4.2,
    previousPeriodLabel: 'octubre',
  },
  {
    id: 'r-umbral',
    name: 'Umbral 10% · Flota ejecutiva',
    type: 'balance-threshold',
    scopeLabel: 'Grupo Flota ejecutiva',
    units: 24,
    summary: 'Si el saldo baja del 10% del depósito, recargar a tope',
    triggerText: 'Automático · al cruzar el umbral',
    measure: 'liters',
    nextRun: null,
    status: 'active',
    projectedMXN: 37_200,
    newUnits: 0,
    excludedUnits: 1,
    deltaPct: 9.4,
    previousPeriodLabel: 'septiembre',
  },
  {
    id: 'r-centro',
    name: 'Consumo histórico · Ruta Centro',
    type: 'consumption',
    scopeLabel: 'Grupo Ruta Centro',
    units: 86,
    summary: 'Promedio de los últimos 30 días + 10% de colchón',
    triggerText: 'Mensual · día 1',
    measure: 'money',
    nextRun: '2026-12-01',
    status: 'active',
    projectedMXN: 148_900,
    newUnits: 1,
    excludedUnits: 0,
    deltaPct: 18.6,
    previousPeriodLabel: 'octubre',
  },
  {
    id: 'r-sur',
    name: 'Monto fijo · Ruta Sur',
    type: 'schedule-fixed',
    scopeLabel: 'Grupo Ruta Sur',
    units: 45,
    summary: 'Fondear $3,500 por unidad',
    triggerText: 'Semanal · lunes',
    measure: 'money',
    nextRun: '2026-10-19',
    status: 'paused',
    statusNote: 'Pausada desde el 28 de septiembre',
    projectedMXN: 157_500,
    newUnits: 0,
    excludedUnits: 4,
    deltaPct: 0,
    previousPeriodLabel: 'septiembre',
  },
];

export const vehicleGroups: VehicleGroup[] = [
  { id: 'g-norte', label: 'Ruta Norte', units: 230 },
  { id: 'g-centro', label: 'Ruta Centro', units: 86 },
  { id: 'g-sur', label: 'Ruta Sur', units: 45 },
  { id: 'g-exec', label: 'Flota ejecutiva', units: 24 },
  { id: 'g-all', label: 'Toda la flota', units: 385 },
];

export const vehicles: Vehicle[] = [
  { id: 'v-1', plate: 'RAM-45-2B', device: 'TC-100451', driver: 'Rodolfo Aguirre', group: 'Ruta Norte', balanceMXN: 0, avgWeeklySpendMXN: 1_850 },
  { id: 'v-2', plate: 'TGP-91-7K', device: 'TC-100917', driver: 'Marisol Vega', group: 'Ruta Centro', balanceMXN: 1_240, avgWeeklySpendMXN: 2_100 },
  { id: 'v-3', plate: 'VLQ-12-9D', device: 'TC-101293', driver: 'Sin conductor asignado', group: 'Ruta Sur', balanceMXN: 4_280, avgWeeklySpendMXN: 0 },
  { id: 'v-4', plate: 'JKM-33-4A', device: 'TC-103344', driver: 'Luis Beltrán', group: 'Ruta Norte', balanceMXN: 860, avgWeeklySpendMXN: 1_600 },
  { id: 'v-5', plate: 'PQR-77-1C', device: 'TC-107712', driver: 'Ana Sandoval', group: 'Flota ejecutiva', balanceMXN: 2_150, avgWeeklySpendMXN: 980 },
  { id: 'v-6', plate: 'ZUT-08-5E', device: 'TC-100855', driver: 'Javier Ortiz', group: 'Ruta Centro', balanceMXN: 95, avgWeeklySpendMXN: 2_450 },
  { id: 'v-7', plate: 'NBV-62-3F', device: 'TC-106234', driver: 'Carla Ramos', group: 'Ruta Norte', balanceMXN: 1_700, avgWeeklySpendMXN: 1_420 },
  { id: 'v-8', plate: 'HGF-29-8T', device: 'TC-102988', driver: 'Miguel Santoyo', group: 'Ruta Sur', balanceMXN: 320, avgWeeklySpendMXN: 1_900 },
];

export const attentionItems: AttentionItem[] = [
  {
    id: 'a-0',
    kind: 'balance-request',
    vehicleId: 'v-6',
    detail: 'Javier Ortiz solicitó saldo desde la app hace 40 minutos. Saldo actual insuficiente para su ruta.',
    amountMXN: 600,
  },
  {
    id: 'a-4',
    kind: 'balance-request',
    vehicleId: 'v-8',
    detail: 'Miguel Santoyo solicitó saldo para carga en ruta. Supervisor de Ruta Sur ya validó el viaje.',
    amountMXN: 800,
  },
  {
    id: 'a-1',
    kind: 'zero-balance',
    vehicleId: 'v-1',
    detail: 'Saldo en $0.00 desde hace 2 días. El conductor reportó carga pendiente.',
    amountMXN: 500,
  },
  {
    id: 'a-2',
    kind: 'anomalous-consumption',
    vehicleId: 'v-2',
    detail: 'Consumo 42% arriba de su promedio de 30 días en las últimas 2 cargas.',
    amountMXN: 0,
  },
  {
    id: 'a-3',
    kind: 'trapped-balance',
    vehicleId: 'v-3',
    detail: 'Dispositivo inactivo 38 días con saldo atrapado que no regresa a la cuenta.',
    amountMXN: 4_280,
  },
];

export const pastReceipts: Receipt[] = [
  {
    folio: 'DIS-2026-10-0188',
    kind: 'rule',
    issuedAt: '2026-10-01T08:12:00',
    user: account.user,
    sourceLabel: 'Reposición a tope · Ruta Norte',
    scopeLabel: 'Grupo Ruta Norte',
    units: 227,
    totalMXN: 395_680,
    lines: [],
  },
  {
    folio: 'DIS-2026-10-0205',
    kind: 'one-off',
    issuedAt: '2026-10-07T17:45:00',
    user: account.user,
    sourceLabel: 'Dispersión puntual',
    scopeLabel: 'ZUT-08-5E · Javier Ortiz',
    units: 1,
    totalMXN: 500,
    lines: [{ plate: 'ZUT-08-5E', driver: 'Javier Ortiz', amountMXN: 500 }],
  },
  {
    folio: 'DIS-2026-10-0211',
    kind: 'cut',
    issuedAt: '2026-10-09T11:02:00',
    user: account.user,
    sourceLabel: 'Recorte de saldo',
    scopeLabel: 'Grupo Ruta Sur · 2 unidades',
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
