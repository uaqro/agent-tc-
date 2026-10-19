import type { Vehicle } from '../types/dispersion';
import type {
  FuelType,
  LimitMeasure,
  LimitPeriod,
  LimitPolicy,
  OverrideDuration,
  StationSubnet,
  UnitAssignment,
} from '../types/limits';
import { today as businessToday } from '../domain/demo/clock';
import { formatCount, formatLiters, formatMoney } from '../utils/format';
import { fleetGroups, toLiters, toMoney, vehicleGroups } from './dispersion';
import { onSessionChange, unitInScope } from './session';

// TODO(producto): ¿Autoconsumo tiene límites propios? De momento Límites solo cubre unidades TicketCar+: los grupos y
// las asignaciones salen de `vehicleGroups` y `vehicles` de `./dispersion`, que excluyen Autoconsumo. Ver `DevNote`.

/** "Toda la flota" is a reporting group, a policy is never assigned to it. */
export let assignableGroups = vehicleGroups.filter((group) => group.id !== 'g-all');

export let fleetUnits = assignableGroups.reduce((sum, group) => sum + group.units, 0);

/** Groups with both products, for toll policies: tolls are paid by every unit, Autoconsumo included. */
export let fleetAssignableGroups = fleetGroups.filter((group) => group.id !== 'g-all');

export const stationSubnets: StationSubnet[] = [
  { id: 's-norte', label: 'Corredor Norte', stations: 42 },
  { id: 's-sur', label: 'Corredor Sur', stations: 28 },
  { id: 's-pref', label: 'Estaciones preferentes', stations: 115 },
];

export const FUEL_LABEL: Record<FuelType, string> = {
  magna: 'Magna',
  premium: 'Premium',
  diesel: 'Diésel',
};

export const PERIOD_META: Record<LimitPeriod, { noun: string; adjective: string }> = {
  day: { noun: 'día', adjective: 'diario' },
  week: { noun: 'semana', adjective: 'semanal' },
  fortnight: { noun: 'quincena', adjective: 'quincenal' },
  month: { noun: 'mes', adjective: 'mensual' },
};

export const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const OVERRIDE_DURATIONS: { id: OverrideDuration; label: string }[] = [
  { id: 'period', label: 'Hasta el cierre del periodo' },
  { id: '24h', label: '24 horas' },
  { id: '7d', label: '7 días' },
];

export const OVERRIDE_REASONS = [
  'Ruta extraordinaria',
  'Cobertura de otra unidad',
  'Contingencia operativa',
  'Otro',
];

export const limitPolicies: LimitPolicy[] = [
  {
    id: 'p-norte',
    name: 'Carga pesada · Corredor Norte',
    status: 'active',
    groupIds: ['grp-02'],
    measure: 'liters',
    period: 'fortnight',
    periodLimit: 600,
    maxLitersPerFill: 300,
    maxFillsPerDay: 2,
    minHoursBetweenFills: 4,
    tankCapacityLock: true,
    fuels: ['diesel'],
    days: [0, 1, 2, 3, 4, 5],
    timeFrom: '05:00',
    timeTo: '22:00',
    stationSubnetId: 's-norte',
    odometerRequired: true,
    minKmPerLiter: 2.8,
  },
  {
    id: 'p-centro',
    name: 'Reparto urbano · Zona Metropolitana',
    status: 'active',
    groupIds: ['grp-01'],
    measure: 'money',
    period: 'week',
    periodLimit: 2_500,
    maxLitersPerFill: 70,
    maxFillsPerDay: 1,
    minHoursBetweenFills: 12,
    tankCapacityLock: true,
    fuels: ['magna', 'diesel'],
    days: [0, 1, 2, 3, 4, 5],
    timeFrom: '06:00',
    timeTo: '20:00',
    stationSubnetId: null,
    odometerRequired: true,
    minKmPerLiter: 7.5,
  },
  {
    id: 'p-sur',
    name: 'Estándar · Sureste',
    status: 'active',
    groupIds: ['grp-05'],
    measure: 'money',
    period: 'week',
    periodLimit: 3_500,
    maxLitersPerFill: 90,
    maxFillsPerDay: 1,
    minHoursBetweenFills: 8,
    tankCapacityLock: false,
    fuels: ['magna', 'diesel'],
    days: [0, 1, 2, 3, 4],
    timeFrom: '06:00',
    timeTo: '21:00',
    stationSubnetId: 's-sur',
    odometerRequired: true,
    minKmPerLiter: null,
  },
  {
    id: 'p-exec',
    name: 'Reserva y sustitución',
    status: 'active',
    groupIds: ['grp-06'],
    measure: 'liters',
    period: 'month',
    periodLimit: 220,
    maxLitersPerFill: 60,
    maxFillsPerDay: 1,
    minHoursBetweenFills: 6,
    tankCapacityLock: true,
    fuels: ['magna', 'premium'],
    days: [0, 1, 2, 3, 4, 5, 6],
    timeFrom: '00:00',
    timeTo: '23:59',
    stationSubnetId: null,
    odometerRequired: false,
    minKmPerLiter: null,
  },
];

const allUnitAssignments: UnitAssignment[] = [
  { vehicleId: 'ECO-3004', policyId: 'p-norte', individual: false, tankLiters: 518, usedLiters: 412, rejections7d: 0 },
  { vehicleId: 'ECO-3033', policyId: 'p-centro', individual: false, tankLiters: 71, usedLiters: 61, rejections7d: 5 },
  { vehicleId: 'ECO-3240', policyId: 'p-sur', individual: false, tankLiters: 81, usedLiters: 0, rejections7d: 0 },
  { vehicleId: 'ECO-3215', policyId: 'p-norte', individual: false, tankLiters: 451, usedLiters: 538, rejections7d: 1 },
  { vehicleId: 'ECO-3260', policyId: 'p-exec', individual: false, tankLiters: 89, usedLiters: 74, rejections7d: 0 },
  { vehicleId: 'ECO-3035', policyId: 'p-centro', individual: false, tankLiters: 55, usedLiters: 96.8, rejections7d: 2 },
  { vehicleId: 'ECO-3253', policyId: null, individual: false, tankLiters: 496, usedLiters: 180, rejections7d: 0 },
  { vehicleId: 'ECO-3113', policyId: 'p-sur', individual: false, tankLiters: 125, usedLiters: 88, rejections7d: 1 },
];

export const emptyPolicy: Omit<LimitPolicy, 'id'> = {
  name: '',
  status: 'active',
  groupIds: [],
  measure: 'liters',
  period: 'week',
  periodLimit: 200,
  maxLitersPerFill: 60,
  maxFillsPerDay: 1,
  minHoursBetweenFills: 8,
  tankCapacityLock: true,
  fuels: ['magna'],
  days: [0, 1, 2, 3, 4, 5],
  timeFrom: '06:00',
  timeTo: '22:00',
  stationSubnetId: null,
  odometerRequired: true,
  minKmPerLiter: null,
};

export const groupIdOf = (vehicle: Vehicle): string | null =>
  assignableGroups.find((group) => group.label === vehicle.group)?.id ?? null;

export const policyForGroup = (policies: LimitPolicy[], groupId: string | null): LimitPolicy | null =>
  (groupId && policies.find((policy) => policy.groupIds.includes(groupId))) || null;

export const policyUnits = (policy: LimitPolicy): number =>
  assignableGroups
    .filter((group) => policy.groupIds.includes(group.id))
    .reduce((sum, group) => sum + group.units, 0);

export const formatMeasure = (value: number, measure: LimitMeasure): string =>
  measure === 'liters' ? formatLiters(value) : formatMoney(value);

/** The same amount in the other measure, shown next to every limit. */
export const formatEquivalent = (value: number, measure: LimitMeasure): string =>
  measure === 'liters' ? formatMoney(toMoney(value)) : formatLiters(toLiters(value));

export const usedInMeasure = (assignment: UnitAssignment, policy: LimitPolicy): number =>
  policy.measure === 'liters' ? assignment.usedLiters : toMoney(assignment.usedLiters);

export const effectiveLimit = (assignment: UnitAssignment, policy: LimitPolicy): number =>
  policy.periodLimit + (assignment.override?.extra ?? 0);

export function daysLabel(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return 'Todos los días';
  const contiguous = sorted.every((day, index) => index === 0 || day === sorted[index - 1] + 1);
  if (contiguous && sorted.length > 2) return `${DAY_LABELS[sorted[0]]}–${DAY_LABELS[sorted[sorted.length - 1]]}`;
  return sorted.map((day) => DAY_LABELS[day]).join(', ');
}

export function scheduleLabel(policy: LimitPolicy): string {
  const allDay = policy.timeFrom === '00:00' && policy.timeTo === '23:59';
  return `${daysLabel(policy.days)} · ${allDay ? 'las 24 horas' : `${policy.timeFrom}–${policy.timeTo}`}`;
}

export const fuelsLabel = (policy: LimitPolicy): string => policy.fuels.map((fuel) => FUEL_LABEL[fuel]).join(', ');

export function stationsLabel(policy: LimitPolicy): string {
  const subnet = stationSubnets.find((candidate) => candidate.id === policy.stationSubnetId);
  return subnet ? `${subnet.label} · ${formatCount(subnet.stations)} estaciones` : 'Toda la red';
}

export function perFillLabel(policy: LimitPolicy): string {
  const fills = policy.maxFillsPerDay === 1 ? '1 carga al día' : `${policy.maxFillsPerDay} cargas al día`;
  return `Máx. ${formatLiters(policy.maxLitersPerFill)} · ${fills} · ${policy.minHoursBetweenFills} h entre cargas`;
}

export function validationLabel(policy: LimitPolicy): string {
  const locks = [
    policy.tankCapacityLock && 'Candado de tanque',
    policy.odometerRequired && 'Odómetro obligatorio',
    policy.minKmPerLiter !== null && `Rendimiento mín. ${policy.minKmPerLiter} km/L`,
  ].filter(Boolean);
  return locks.length > 0 ? locks.join(' · ') : 'Sin validaciones';
}

const toIso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Last day of the running period. Weeks close on Sunday, fortnights on the 15th and month end.
 * "Today" is the business date (the demo date by default), never the computer's: an exception's validity has to
 * match the data it is set against.
 */
export function periodEnd(period: LimitPeriod, today = businessToday()): string {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (period === 'week') end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
  if (period === 'fortnight' && end.getDate() <= 15) end.setDate(15);
  else if (period === 'fortnight' || period === 'month') end.setMonth(end.getMonth() + 1, 0);
  return toIso(end);
}

export function overrideUntil(duration: OverrideDuration, period: LimitPeriod, today = businessToday()): string {
  if (duration === 'period') return periodEnd(period, today);
  const until = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (duration === '24h' ? 1 : 7));
  return toIso(until);
}

/** Assignments of the units inside the session scope, and the groups and fleet size they add up to (ADR-TCP-001). */
export let unitAssignments: UnitAssignment[] = allUnitAssignments;

onSessionChange(() => {
  assignableGroups = vehicleGroups.filter((group) => group.id !== 'g-all');
  fleetUnits = assignableGroups.reduce((sum, group) => sum + group.units, 0);
  fleetAssignableGroups = fleetGroups.filter((group) => group.id !== 'g-all');
  unitAssignments = allUnitAssignments.filter((assignment) => unitInScope(assignment.vehicleId));
});
