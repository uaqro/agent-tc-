import { fleetVehicles } from './dispersion';
import { MOVEMENT_LABEL, TOLL_CATEGORY_LABEL, TOLL_TAG_TYPE_LABEL, tollMovements, tollPolicies, tollTags } from './toll';
import type { TollMovementKind } from '../types/toll';
import type { ReportPeriod } from '../domain/reporting/periods';

export const TOLL_MOVEMENT_KINDS: TollMovementKind[] = ['crossing', 'top-up', 'cut', 'rejected'];
export const TOLL_MOVEMENT_KIND_LABEL: Record<TollMovementKind, string> = Object.fromEntries(
  TOLL_MOVEMENT_KINDS.map((kind) => [kind, MOVEMENT_LABEL[kind].label]),
) as Record<TollMovementKind, string>;

export const TOLL_REPORT_COLUMN_GROUPS = [
  {
    id: 'movement',
    label: 'Movimiento',
    columns: ['Fecha', 'Hora', 'Tipo de movimiento', 'Importe (MXN)', 'Detalle'],
  },
  {
    id: 'tag',
    label: 'TAG y unidad',
    columns: ['TAG', 'Tipo de TAG', 'Unidad', 'Placa', 'Conductor', 'Grupo', 'Categoría vehicular'],
  },
  {
    id: 'toll',
    label: 'Peaje',
    columns: ['Autopista / plaza', 'Política aplicada', 'Estado del TAG', 'Saldo del TAG (MXN)'],
  },
] as const;

export const allTollReportColumns = TOLL_REPORT_COLUMN_GROUPS.flatMap((group) => [...group.columns]);
export const defaultTollReportColumns = [
  'Fecha', 'Hora', 'Tipo de movimiento', 'TAG', 'Unidad', 'Placa', 'Categoría vehicular',
  'Autopista / plaza', 'Importe (MXN)', 'Saldo del TAG (MXN)', 'Detalle',
];

export const TOLL_ADVANCED_FILTER_FIELDS = [
  'TAG', 'Unidad', 'Placa', 'Conductor', 'Grupo', 'Categoría vehicular', 'Tipo de TAG', 'Autopista / plaza', 'Política aplicada',
] as const;

export interface TollReportRow {
  id: string;
  date: string;
  time: string;
  kind: TollMovementKind;
  tag: string;
  tagType: string;
  unit: string;
  plate: string;
  driver: string;
  group: string;
  category: string;
  road: string;
  policy: string;
  tagStatus: string;
  balanceMXN: number;
  amountMXN: number;
  detail: string;
}

export interface TollReportFilter {
  id: number;
  field: (typeof TOLL_ADVANCED_FILTER_FIELDS)[number];
  operator: 'Igual a' | 'Contiene';
  value: string;
}

export interface TollReportQuery extends ReportPeriod {
  kinds: TollMovementKind[];
  filters: TollReportFilter[];
}

export function createTollReportRows(): TollReportRow[] {
  const tagById = new Map(tollTags.map((tag) => [tag.id, tag]));
  const vehicleById = new Map(fleetVehicles.map((vehicle) => [vehicle.id, vehicle]));
  const policyById = new Map(tollPolicies.map((policy) => [policy.id, policy]));

  return tollMovements.map((movement) => {
    const tag = tagById.get(movement.tagId);
    const vehicle = tag?.vehicleId ? vehicleById.get(tag.vehicleId) : undefined;
    const policy = tag?.policyId ? policyById.get(tag.policyId) : undefined;
    const date = new Date(movement.at);
    const detailParts = movement.detail.split(' · ');
    return {
      id: movement.id,
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
      kind: movement.kind,
      tag: tag?.number ?? movement.tagId,
      tagType: tag ? TOLL_TAG_TYPE_LABEL[tag.type] : 'TAG no disponible',
      unit: tag?.vehicleId ?? 'Sin unidad asignada',
      plate: vehicle?.plate ?? '—',
      driver: vehicle?.driver ?? '—',
      group: vehicle?.group ?? '—',
      category: tag ? TOLL_CATEGORY_LABEL[tag.category] : '—',
      road: detailParts.length > 1 ? detailParts.slice(0, 2).join(' · ') : movement.detail,
      policy: policy?.name ?? 'Sin política',
      tagStatus: tag?.status ?? 'Desconocido',
      balanceMXN: tag?.balanceMXN ?? 0,
      amountMXN: movement.amountMXN,
      detail: movement.detail,
    };
  }).sort((left, right) => `${right.date} ${right.time}`.localeCompare(`${left.date} ${left.time}`));
}

export function tollReportValue(row: TollReportRow, column: string): string | number {
  const values: Record<string, string | number> = {
    Fecha: row.date,
    Hora: row.time,
    'Tipo de movimiento': TOLL_MOVEMENT_KIND_LABEL[row.kind],
    'Importe (MXN)': row.amountMXN,
    Detalle: row.detail,
    TAG: row.tag,
    'Tipo de TAG': row.tagType,
    Unidad: row.unit,
    Placa: row.plate,
    Conductor: row.driver,
    Grupo: row.group,
    'Categoría vehicular': row.category,
    'Autopista / plaza': row.road,
    'Política aplicada': row.policy,
    'Estado del TAG': row.tagStatus,
    'Saldo del TAG (MXN)': row.balanceMXN,
  };
  return values[column] ?? '';
}

export function filterTollReportRows(rows: TollReportRow[], query: TollReportQuery): TollReportRow[] {
  return rows.filter((row) => {
    if (row.date < query.from || row.date > query.to || !query.kinds.includes(row.kind)) return false;
    return query.filters.every((filter) => {
      if (!filter.value.trim()) return true;
      const value = String(tollReportValue(row, filter.field)).toLocaleLowerCase('es-MX');
      const expected = filter.value.trim().toLocaleLowerCase('es-MX');
      return filter.operator === 'Contiene' ? value.includes(expected) : value === expected;
    });
  });
}

export function reorderTollColumns(columns: string[], dragged: string, target: string): string[] {
  const from = columns.indexOf(dragged);
  const to = columns.indexOf(target);
  if (from < 0 || to < 0 || from === to) return columns;
  const reordered = [...columns];
  reordered.splice(to, 0, ...reordered.splice(from, 1));
  return reordered;
}