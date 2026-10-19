import type {
  TollAutoTopUp,
  TollCategory,
  TollMovement,
  TollMovementKind,
  TollPeriod,
  TollPolicy,
  TollRoad,
  TollTag,
  TollTagStatus,
  TollTagType,
} from '../types/toll';
import { formatMoney } from '../utils/format';
import { daysLabel } from './limits';

export const tollAccount = {
  name: 'EDENRED MEXICO1 · Peaje',
  availableMXN: 186_400,
  monthBudgetMXN: 240_000,
  spentMonthMXN: 131_850,
};

export const TOLL_TAG_TYPE_LABEL: Record<TollTagType, string> = {
  'drive-tag': 'Drive Tag · combustible y peaje',
  'toll-tag': 'TAG de peaje',
};

export const TOLL_TAG_STATUS_LABEL: Record<TollTagStatus, string> = {
  active: 'Activo',
  blocked: 'Bloqueado',
  unassigned: 'Sin asignar',
  replacement: 'En reposición',
};

export const TOLL_CATEGORY_LABEL: Record<TollCategory, string> = {
  A: 'A · Automóvil',
  B: 'B · Autobús',
  C2: 'C2 · Camión 2 ejes',
  C3: 'C3 · Camión 3 ejes',
  C5: 'C5 · Camión 5 ejes',
  T3S2: 'T3S2 · Tractocamión 5 ejes',
};

export const TOLL_PERIOD_META: Record<TollPeriod, { noun: string; adjective: string }> = {
  day: { noun: 'día', adjective: 'diario' },
  week: { noun: 'semana', adjective: 'semanal' },
  month: { noun: 'mes', adjective: 'mensual' },
};

export const MOVEMENT_LABEL: Record<TollMovementKind, { label: string; chip: string }> = {
  crossing: { label: 'Cruce', chip: 'chip--info' },
  'top-up': { label: 'Recarga', chip: 'chip--active' },
  cut: { label: 'Recorte', chip: 'chip--paused' },
  rejected: { label: 'Rechazado', chip: 'chip--danger' },
};

export const tollRoads: TollRoad[] = [
  { id: 'r-mex-qro', label: 'México–Querétaro', plazas: 4 },
  { id: 'r-qro-irap', label: 'Querétaro–Irapuato', plazas: 3 },
  { id: 'r-arco', label: 'Arco Norte', plazas: 6 },
  { id: 'r-mty-nld', label: 'Monterrey–Nuevo Laredo', plazas: 3 },
  { id: 'r-mty-saltillo', label: 'Monterrey–Saltillo', plazas: 2 },
  { id: 'r-mex-pue', label: 'México–Puebla', plazas: 3 },
  { id: 'r-gdl-col', label: 'Guadalajara–Colima', plazas: 2 },
  { id: 'r-sonora', label: 'Corredor Sonora (Hermosillo–Nogales)', plazas: 3 },
];

export const tollPolicies: TollPolicy[] = [
  {
    id: 'tp-norte',
    name: 'Corredor de carga · Ruta Norte',
    status: 'active',
    groupIds: ['g-norte'],
    period: 'week',
    periodLimitMXN: 9_500,
    maxCrossingsPerDay: 8,
    roadIds: ['r-mex-qro', 'r-arco', 'r-mty-nld', 'r-mty-saltillo'],
    allowUrbanHighways: false,
    days: [0, 1, 2, 3, 4, 5],
    timeFrom: '04:00',
    timeTo: '23:00',
    categoryLock: true,
  },
  {
    id: 'tp-centro',
    name: 'Reparto metropolitano · Ruta Centro',
    status: 'active',
    groupIds: ['g-centro'],
    period: 'week',
    periodLimitMXN: 1_200,
    maxCrossingsPerDay: 6,
    roadIds: ['r-mex-qro', 'r-mex-pue'],
    allowUrbanHighways: true,
    days: [0, 1, 2, 3, 4, 5],
    timeFrom: '06:00',
    timeTo: '21:00',
    categoryLock: true,
  },
  {
    id: 'tp-sur',
    name: 'Estándar · Ruta Sur',
    status: 'active',
    groupIds: ['g-sur'],
    period: 'month',
    periodLimitMXN: 6_000,
    maxCrossingsPerDay: 4,
    roadIds: ['r-sonora', 'r-gdl-col'],
    allowUrbanHighways: false,
    days: [0, 1, 2, 3, 4],
    timeFrom: '06:00',
    timeTo: '20:00',
    categoryLock: false,
  },
  {
    id: 'tp-exec',
    name: 'Flota ejecutiva',
    status: 'active',
    groupIds: ['g-exec'],
    period: 'month',
    periodLimitMXN: 2_500,
    maxCrossingsPerDay: 10,
    roadIds: [],
    allowUrbanHighways: true,
    days: [0, 1, 2, 3, 4, 5, 6],
    timeFrom: '00:00',
    timeTo: '23:59',
    categoryLock: false,
  },
];

export const emptyTollPolicy: Omit<TollPolicy, 'id'> = {
  name: '',
  status: 'active',
  groupIds: [],
  period: 'week',
  periodLimitMXN: 1_500,
  maxCrossingsPerDay: 4,
  roadIds: [],
  allowUrbanHighways: false,
  days: [0, 1, 2, 3, 4, 5],
  timeFrom: '06:00',
  timeTo: '22:00',
  categoryLock: true,
};

export const tollTags: TollTag[] = [
  { id: 'tt-1', type: 'drive-tag', number: 'TLV-0451-2B', vehicleId: 'v-1', status: 'active', category: 'T3S2', balanceMXN: 2_840, policyId: 'tp-norte', spentPeriodMXN: 6_120, crossingsToday: 3, rejections7d: 0, lastCrossing: '2026-10-15T09:42:00', lastPlaza: 'Palmillas · México–Querétaro' },
  { id: 'tt-2', type: 'toll-tag', number: 'TLV-0917-7K', vehicleId: 'v-2', status: 'active', category: 'A', balanceMXN: 310, policyId: 'tp-centro', spentPeriodMXN: 1_040, crossingsToday: 2, rejections7d: 3, lastCrossing: '2026-10-15T08:15:00', lastPlaza: 'Tepotzotlán · México–Querétaro' },
  { id: 'tt-3', type: 'drive-tag', number: 'TLV-1293-9D', vehicleId: 'v-3', status: 'blocked', category: 'C2', balanceMXN: 1_150, policyId: 'tp-sur', spentPeriodMXN: 0, crossingsToday: 0, rejections7d: 0, lastCrossing: '2026-09-24T07:10:00', lastPlaza: 'Magdalena · Corredor Sonora' },
  { id: 'tt-4', type: 'drive-tag', number: 'TLV-3344-4A', vehicleId: 'v-4', status: 'active', category: 'T3S2', balanceMXN: 4_610, policyId: 'tp-norte', spentPeriodMXN: 8_870, crossingsToday: 5, rejections7d: 1, lastCrossing: '2026-10-15T10:05:00', lastPlaza: 'Sabinas Hidalgo · Monterrey–Nuevo Laredo' },
  { id: 'tt-5', type: 'toll-tag', number: 'TLV-7712-1C', vehicleId: 'v-5', status: 'active', category: 'A', balanceMXN: 920, policyId: 'tp-exec', spentPeriodMXN: 640, crossingsToday: 0, rejections7d: 0, lastCrossing: '2026-10-12T19:20:00', lastPlaza: 'Tlalpan · México–Cuernavaca' },
  { id: 'tt-6', type: 'drive-tag', number: 'TLV-0855-5E', vehicleId: 'v-6', status: 'active', category: 'C2', balanceMXN: 140, policyId: 'tp-centro', spentPeriodMXN: 980, crossingsToday: 4, rejections7d: 2, lastCrossing: '2026-10-15T07:55:00', lastPlaza: 'San Martín · México–Puebla' },
  { id: 'tt-7', type: 'toll-tag', number: 'TLV-6234-3F', vehicleId: 'v-7', status: 'replacement', category: 'C3', balanceMXN: 0, policyId: 'tp-norte', spentPeriodMXN: 0, crossingsToday: 0, rejections7d: 0, lastCrossing: '2026-10-08T16:30:00', lastPlaza: 'Arco Norte · Tula' },
  { id: 'tt-8', type: 'drive-tag', number: 'TLV-2988-8T', vehicleId: 'v-8', status: 'active', category: 'C2', balanceMXN: 1_780, policyId: 'tp-sur', spentPeriodMXN: 3_960, crossingsToday: 1, rejections7d: 1, lastCrossing: '2026-10-15T05:12:00', lastPlaza: 'Hermosillo · Corredor Sonora' },
  { id: 'tt-9', type: 'toll-tag', number: 'TLV-8810-0X', vehicleId: null, status: 'unassigned', category: 'C2', balanceMXN: 0, policyId: null, spentPeriodMXN: 0, crossingsToday: 0, rejections7d: 0, lastCrossing: null, lastPlaza: null },
  { id: 'tt-10', type: 'drive-tag', number: 'TLV-4471-0Y', vehicleId: null, status: 'unassigned', category: 'A', balanceMXN: 0, policyId: null, spentPeriodMXN: 0, crossingsToday: 0, rejections7d: 0, lastCrossing: null, lastPlaza: null },
];

export const tollAutoTopUps: TollAutoTopUp[] = [
  { groupId: 'g-norte', enabled: true, thresholdMXN: 1_000, targetMXN: 5_000 },
  { groupId: 'g-centro', enabled: true, thresholdMXN: 200, targetMXN: 800 },
  { groupId: 'g-sur', enabled: false, thresholdMXN: 500, targetMXN: 2_500 },
  { groupId: 'g-exec', enabled: false, thresholdMXN: 300, targetMXN: 1_500 },
];

export const tollMovements: TollMovement[] = [
  { id: 'tm-1', kind: 'crossing', tagId: 'tt-4', at: '2026-10-15T10:05:00', amountMXN: -1_284, detail: 'Sabinas Hidalgo · Monterrey–Nuevo Laredo' },
  { id: 'tm-2', kind: 'crossing', tagId: 'tt-1', at: '2026-10-15T09:42:00', amountMXN: -1_037, detail: 'Palmillas · México–Querétaro' },
  { id: 'tm-3', kind: 'rejected', tagId: 'tt-2', at: '2026-10-15T08:40:00', amountMXN: 0, detail: 'Chalco · Fuera de las autopistas autorizadas' },
  { id: 'tm-4', kind: 'crossing', tagId: 'tt-2', at: '2026-10-15T08:15:00', amountMXN: -112, detail: 'Tepotzotlán · México–Querétaro' },
  { id: 'tm-5', kind: 'top-up', tagId: 'tt-6', at: '2026-10-15T06:00:00', amountMXN: 660, detail: 'Recarga automática · Ruta Centro' },
  { id: 'tm-6', kind: 'crossing', tagId: 'tt-8', at: '2026-10-15T05:12:00', amountMXN: -246, detail: 'Hermosillo · Corredor Sonora' },
  { id: 'tm-7', kind: 'cut', tagId: 'tt-3', at: '2026-10-14T17:30:00', amountMXN: -1_000, detail: 'Recorte a la bolsa de peaje · unidad inactiva' },
];

export const tollRoadsLabel = (policy: TollPolicy): string => {
  if (policy.roadIds.length === 0) return 'Toda la red de autopistas';
  const labels = tollRoads.filter((road) => policy.roadIds.includes(road.id)).map((road) => road.label);
  return labels.length > 2 ? `${labels.slice(0, 2).join(', ')} y ${labels.length - 2} más` : labels.join(', ');
};

export function tollScheduleLabel(policy: TollPolicy): string {
  const allDay = policy.timeFrom === '00:00' && policy.timeTo === '23:59';
  return `${daysLabel(policy.days)} · ${allDay ? 'las 24 horas' : `${policy.timeFrom}–${policy.timeTo}`}`;
}

export function tollLocksLabel(policy: TollPolicy): string {
  return [
    `Máx. ${policy.maxCrossingsPerDay} cruces al día`,
    policy.allowUrbanHighways ? 'Segundos pisos y vías urbanas permitidos' : 'Sin segundos pisos ni vías urbanas',
    policy.categoryLock && 'Candado de categoría vehicular',
  ]
    .filter(Boolean)
    .join(' · ');
}

export const tollLimitLabel = (policy: TollPolicy): string =>
  `${formatMoney(policy.periodLimitMXN)} por ${TOLL_PERIOD_META[policy.period].noun}`;
