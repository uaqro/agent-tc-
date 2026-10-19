import type { Vehicle } from '../types/dispersion';
import type {
  FuelType,
  LimitMeasure,
  LimitPeriod,
  LimitPolicy,
  PolicySettings,
  TimeRange,
  OverrideDuration,
  UnitAssignment,
} from '../types/limits';
import { formatCount, formatLiters, formatMoney } from '../utils/format';
import { toLiters, toMoney, vehicleGroups } from './dispersion';
import { seedStationNetworks, networkModeLabel, type StationNetwork } from './stationNetworks';

/** "Toda la flota" is a reporting group, a policy is never assigned to it. */
export const assignableGroups = vehicleGroups.filter((group) => group.id !== 'g-all');

export const fleetUnits = assignableGroups.reduce((sum, group) => sum + group.units, 0);

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
    name: 'Carga pesada · Ruta Norte',
    status: 'active',
    groupIds: ['g-norte'],
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
    name: 'Reparto urbano · Ruta Centro',
    status: 'active',
    groupIds: ['g-centro'],
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
    name: 'Estándar · Ruta Sur',
    status: 'active',
    groupIds: ['g-sur'],
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
    name: 'Flota ejecutiva',
    status: 'active',
    groupIds: ['g-exec'],
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

export const unitAssignments: UnitAssignment[] = [
  { vehicleId: 'v-1', policyId: 'p-norte', individual: false, tankLiters: 400, usedLiters: 412, rejections7d: 0 },
  { vehicleId: 'v-2', policyId: 'p-centro', individual: false, tankLiters: 70, usedLiters: 61, rejections7d: 5 },
  { vehicleId: 'v-3', policyId: 'p-sur', individual: false, tankLiters: 80, usedLiters: 0, rejections7d: 0 },
  { vehicleId: 'v-4', policyId: 'p-norte', individual: false, tankLiters: 400, usedLiters: 538, rejections7d: 1 },
  { vehicleId: 'v-5', policyId: 'p-exec', individual: false, tankLiters: 55, usedLiters: 74, rejections7d: 0 },
  { vehicleId: 'v-6', policyId: 'p-centro', individual: false, tankLiters: 70, usedLiters: 96.8, rejections7d: 2 },
  { vehicleId: 'v-7', policyId: null, individual: false, tankLiters: 400, usedLiters: 180, rejections7d: 0 },
  { vehicleId: 'v-8', policyId: 'p-sur', individual: false, tankLiters: 70, usedLiters: 88, rejections7d: 1 },
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

export function policySettings(policy: LimitPolicy): PolicySettings {
  const defaults = {
    minTransactionVolume: null,
    maxTransactionVolume: policy.maxLitersPerFill || null,
    showAvailableLiters: false,
    showAvailableBalance: false,
    showPreviousKm: false,
    allowKmChanges: false,
  };
  if (policy.settings) return {
    ...defaults,
    ...policy.settings,
    controls: { ...policy.settings.controls, plateRequired: policy.settings.controls.plateRequired ?? false },
  };
  const periods: PolicySettings['periods'] = {
    day: { amount: null, volume: null, transactions: policy.maxFillsPerDay || null },
    week: { amount: null, volume: null, transactions: null },
    fortnight: { amount: null, volume: null, transactions: null },
    month: { amount: null, volume: null, transactions: null },
  };
  periods[policy.period][policy.measure === 'money' ? 'amount' : 'volume'] = policy.periodLimit || null;
  const ranges: TimeRange[] = policy.timeFrom < policy.timeTo
    ? [{ from: policy.timeFrom, to: policy.timeTo }]
    : [{ from: '00:00', to: policy.timeTo }, { from: policy.timeFrom, to: '23:59' }];
  const unrestricted = policy.days.length === 7 && policy.timeFrom === '00:00' && policy.timeTo === '23:59';
  const scheduleBlocks = unrestricted || policy.days.length === 0 ? null : [{ days: [...policy.days], ranges }];
  return {
    ...defaults,
    controls: {
      plateRequired: false, driverRequired: false, driverPin: false,
      odometerRequired: policy.odometerRequired, kmPerformance: policy.odometerRequired && policy.minKmPerLiter !== null,
      kmRange: null, hourmeterRequired: false, hourPerformance: false,
    },
    periods, scheduleBlocks, minTransactionAmount: null, maxTransactionAmount: null,
  };
}

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
  if (policy.settings) {
    const blocks = policy.settings.scheduleBlocks;
    if (!blocks) return 'Sin restricción de horario';
    return blocks
      .map((block) => `${daysLabel(block.days)} · ${block.ranges.map((range) => `${range.from}–${range.to}`).join(', ')}`)
      .join(' / ');
  }
  const allDay = policy.timeFrom === '00:00' && policy.timeTo === '23:59';
  return `${daysLabel(policy.days)} · ${allDay ? 'las 24 horas' : `${policy.timeFrom}–${policy.timeTo}`}`;
}

export const fuelsLabel = (policy: LimitPolicy): string => policy.fuels.map((fuel) => FUEL_LABEL[fuel]).join(', ');

export function stationsLabel(policy: LimitPolicy, networks: StationNetwork[] = seedStationNetworks): string {
  if (policy.stationSubnetId === null) return 'Toda la red';
  const network = networks.find((candidate) => candidate.id === policy.stationSubnetId);
  return network ? `${network.name} · ${networkModeLabel(network.mode)} · ${formatCount(network.stationIds.length)} estaciones` : 'Red no disponible';
}

export function perFillLabel(policy: LimitPolicy): string {
  const settings = policy.settings;
  const labels = [
    !settings && policy.maxLitersPerFill > 0 && `Máx. ${formatLiters(policy.maxLitersPerFill)}`,
    settings?.minTransactionVolume != null && `Mín. ${formatLiters(settings.minTransactionVolume)}`,
    settings?.maxTransactionVolume != null && `Máx. ${formatLiters(settings.maxTransactionVolume)}`,
    !settings && `${policy.maxFillsPerDay} cargas al día`,
    settings?.minTransactionAmount != null && `Mín. ${formatMoney(settings.minTransactionAmount)}`,
    settings?.maxTransactionAmount != null && `Máx. ${formatMoney(settings.maxTransactionAmount)}`,
  ].filter(Boolean);
  return labels.length ? labels.join(' · ') : 'Sin límites adicionales por carga';
}

export function periodLimitsLabel(policy: LimitPolicy): string {
  const settings = policySettings(policy);
  const labels = (Object.keys(PERIOD_META) as LimitPeriod[]).flatMap((period) => {
    const restriction = settings.periods[period];
    const values = [
      restriction.amount !== null && formatMoney(restriction.amount),
      restriction.volume !== null && formatLiters(restriction.volume),
      restriction.transactions !== null && `${restriction.transactions} transacciones`,
    ].filter(Boolean);
    return values.length ? [`${PERIOD_META[period].adjective}: ${values.join(' · ')}`] : [];
  });
  return labels.length ? labels.join(' / ') : 'Sin límites acumulados por periodo';
}

export function validationLabel(policy: LimitPolicy): string {
  const controls = policySettings(policy).controls;
  const locks = [
    controls.plateRequired && 'Validar valor numérico de la placa del vehículo',
    controls.driverRequired && (controls.driverPin ? 'Número y NIP de conductor' : 'Número de conductor'),
    controls.odometerRequired && 'Kilometraje obligatorio',
    controls.kmPerformance && 'Rendimiento km/L del vehículo',
    controls.kmRange && `Recorrido ${formatCount(controls.kmRange.min)}–${formatCount(controls.kmRange.max)} km`,
    controls.hourmeterRequired && 'Horómetro obligatorio',
    controls.hourPerformance && 'Rendimiento h/L del vehículo',
  ].filter(Boolean);
  return locks.length > 0 ? locks.join(' · ') : 'Sin controles solicitados';
}

export function additionalSettingsLabel(policy: LimitPolicy): string {
  const settings = policySettings(policy);
  const labels = [
    policy.tankCapacityLock && 'Limitar a la capacidad del tanque del vehículo',
    policy.minHoursBetweenFills > 0 && `${policy.minHoursBetweenFills} h de intervalo mínimo entre cargas`,
    settings.showAvailableLiters && 'Mostrar litros disponibles al transaccionar',
    settings.showAvailableBalance && 'Mostrar saldo disponible al transaccionar y en medios de consulta',
    settings.showPreviousKm && 'Mostrar kilometraje anterior al transaccionar',
    settings.allowKmChanges && 'Permitir cambios de kilometraje',
  ].filter(Boolean);
  return labels.length ? labels.join(' · ') : 'Sin configuraciones adicionales activas';
}

export function policySummary(policy: LimitPolicy): { controls: number; restrictions: number; additional: number } {
  const settings = policySettings(policy);
  const controls = settings.controls;
  return {
    controls: [controls.plateRequired, controls.driverRequired, controls.odometerRequired, controls.hourmeterRequired].filter(Boolean).length,
    restrictions: Object.values(settings.periods).reduce((total, period) => total +
      [period.amount, period.volume, period.transactions].filter((value) => value !== null).length, 0) +
      [settings.minTransactionAmount, settings.maxTransactionAmount, settings.minTransactionVolume, settings.maxTransactionVolume]
        .filter((value) => value !== null).length +
      Number(settings.scheduleBlocks !== null) + Number(policy.stationSubnetId !== null),
    additional: [policy.tankCapacityLock, policy.minHoursBetweenFills > 0, settings.showAvailableLiters,
      settings.showAvailableBalance, settings.showPreviousKm, settings.allowKmChanges].filter(Boolean).length,
  };
}

const toIso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Last day of the running period. Weeks close on Sunday, fortnights on the 15th and month end. */
export function periodEnd(period: LimitPeriod, today = new Date()): string {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (period === 'week') end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
  if (period === 'fortnight' && end.getDate() <= 15) end.setDate(15);
  else if (period === 'fortnight' || period === 'month') end.setMonth(end.getMonth() + 1, 0);
  return toIso(end);
}

export function overrideUntil(duration: OverrideDuration, period: LimitPeriod, today = new Date()): string {
  if (duration === 'period') return periodEnd(period, today);
  const until = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (duration === '24h' ? 1 : 7));
  return toIso(until);
}
