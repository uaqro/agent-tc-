import type { FundingRule, RuleType, Vehicle } from '../types/dispersion';
import { PRICE_PER_LITER, vehicleGroups } from './dispersion';
import { formatMoney } from '../utils/format';

export interface RuleTypeMeta {
  id: RuleType;
  group: string;
  label: string;
  hint: string;
  example: string;
}

/** The catalogue the user picks from when creating an automation. */
export const RULE_TYPES: RuleTypeMeta[] = [
  {
    id: 'balance-threshold',
    group: 'Automática por saldo',
    label: 'Umbral de saldo',
    hint: 'Se dispara sola cuando el saldo baja del límite.',
    example: 'Si baja del 10% → recargar a tope',
  },
  {
    id: 'consumption',
    group: 'Automática por consumo',
    label: 'Consumo histórico',
    hint: 'Iguala el consumo promedio más un colchón.',
    example: 'Promedio de 30 días + 10%',
  },
  {
    id: 'top-off',
    group: 'Por calendario',
    label: 'Reposición a tope',
    hint: 'Llena cada unidad hasta el tope en la fecha indicada.',
    example: 'A tope 600 L cada quincena',
  },
  {
    id: 'schedule-fixed',
    group: 'Por calendario',
    label: 'Monto fijo',
    hint: 'Dispersa el mismo monto a cada unidad.',
    example: '$3,500 por unidad cada semana',
  },
];

export const CADENCES = [
  { id: 'weekly', label: 'Semanal · lunes' },
  { id: 'biweekly', label: 'Cada quincena · días 1 y 15' },
  { id: 'monthly', label: 'Mensual · día 1' },
];

export interface RuleDraft {
  type: RuleType;
  scopeKind: 'group' | 'units';
  groupId: string;
  vehicleIds: string[];
  cadence: string;
  capLiters: number;
  fixedAmountMXN: number;
  thresholdPct: number;
  refillMode: 'top-off' | 'fixed';
  refillAmountMXN: number;
  windowDays: number;
  bufferPct: number;
}

export const emptyDraft: RuleDraft = {
  type: 'balance-threshold',
  scopeKind: 'group',
  groupId: 'g-norte',
  vehicleIds: [],
  cadence: 'biweekly',
  capLiters: 600,
  fixedAmountMXN: 3_500,
  thresholdPct: 10,
  refillMode: 'top-off',
  refillAmountMXN: 2_000,
  windowDays: 30,
  bufferPct: 10,
};

export function scopeOf(draft: RuleDraft, vehicles: Vehicle[]): { label: string; units: number } {
  if (draft.scopeKind === 'units') {
    const picked = vehicles.filter((vehicle) => draft.vehicleIds.includes(vehicle.id));
    return {
      label: picked.length === 1 ? picked[0].plate : `${picked.length} unidades seleccionadas`,
      units: picked.length,
    };
  }
  const group = vehicleGroups.find((candidate) => candidate.id === draft.groupId) ?? vehicleGroups[0];
  return { label: `Grupo ${group.label}`, units: group.units };
}

export function summaryOf(draft: RuleDraft): string {
  switch (draft.type) {
    case 'top-off':
      return `Reponer a tope ${draft.capLiters} L por unidad`;
    case 'schedule-fixed':
      return `Fondear ${formatMoney(draft.fixedAmountMXN)} por unidad`;
    case 'balance-threshold':
      return draft.refillMode === 'top-off'
        ? `Si el saldo baja del ${draft.thresholdPct}% del depósito, recargar a tope`
        : `Si el saldo baja del ${draft.thresholdPct}% del depósito, cargar ${formatMoney(draft.refillAmountMXN)}`;
    case 'consumption':
      return `Promedio de los últimos ${draft.windowDays} días + ${draft.bufferPct}% de colchón`;
  }
}

export function triggerOf(draft: RuleDraft): string {
  if (draft.type === 'balance-threshold') return 'Automático · al cruzar el umbral';
  return CADENCES.find((cadence) => cadence.id === draft.cadence)?.label ?? '';
}

/** Estimated spend per unit and period, used only to preview the projected amount. */
function perUnitMXN(draft: RuleDraft): number {
  switch (draft.type) {
    case 'top-off':
      return draft.capLiters * PRICE_PER_LITER * 0.12;
    case 'schedule-fixed':
      return draft.fixedAmountMXN;
    case 'balance-threshold':
      return draft.refillMode === 'top-off' ? 1_550 : draft.refillAmountMXN * 0.45;
    case 'consumption':
      return 1_800 * (draft.windowDays / 30) * (1 + draft.bufferPct / 100);
  }
}

const toIso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function nextRunOf(draft: RuleDraft, today = new Date()): string | null {
  if (draft.type === 'balance-threshold') return null;

  if (draft.cadence === 'weekly') {
    const date = new Date(today);
    const daysToMonday = (8 - date.getDay()) % 7 || 7;
    date.setDate(date.getDate() + daysToMonday);
    return toIso(date);
  }

  if (draft.cadence === 'biweekly' && today.getDate() < 15) {
    return toIso(new Date(today.getFullYear(), today.getMonth(), 15));
  }

  return toIso(new Date(today.getFullYear(), today.getMonth() + 1, 1));
}

export function buildRule(draft: RuleDraft, vehicles: Vehicle[]): FundingRule {
  const scope = scopeOf(draft, vehicles);
  const meta = RULE_TYPES.find((type) => type.id === draft.type) as RuleTypeMeta;

  return {
    id: `r-${Date.now()}`,
    name: `${meta.label} · ${scope.label.replace('Grupo ', '')}`,
    type: draft.type,
    scopeLabel: scope.label,
    units: scope.units,
    summary: summaryOf(draft),
    triggerText: triggerOf(draft),
    measure: draft.type === 'top-off' ? 'liters' : 'money',
    nextRun: nextRunOf(draft),
    status: 'active',
    projectedMXN: Math.round(perUnitMXN(draft) * scope.units),
    newUnits: 0,
    excludedUnits: 0,
    deltaPct: 0,
    previousPeriodLabel: 'periodo anterior',
  };
}
