/** Maintenance mock data. Vehicle ids are padrón units of the client account (`data/client`). */

export type OrderKind = 'preventive' | 'corrective';
export type OrderStatus = 'scheduled' | 'in-shop' | 'waiting-parts' | 'done';

export interface ServiceOrder {
  folio: string;
  vehicleId: string;
  kind: OrderKind;
  system: string;
  workshop: string;
  status: OrderStatus;
  opened: string;
  promised: string;
  costMXN: number;
  description: string;
}

export interface UpcomingService {
  vehicleId: string;
  service: string;
  dueDate: string;
  dueKm: number;
}

export const ORDER_KIND_LABEL: Record<OrderKind, string> = {
  preventive: 'Preventivo',
  corrective: 'Correctivo',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  scheduled: 'Programada',
  'in-shop': 'En taller',
  'waiting-parts': 'Esperando refacciones',
  done: 'Cerrada',
};

export const MAINTENANCE_SYSTEMS = [
  'Motor y transmisión',
  'Frenos',
  'Neumáticos',
  'Suspensión y dirección',
  'Sistema eléctrico',
  'Aceite y filtros',
];

export const WORKSHOPS = ['TallerMax Norte', 'AutoServicio Sur', 'Servicio Diésel Bajío', 'Agencia Nissan Vallejo', 'Llantera del Centro'];

export const serviceOrders: ServiceOrder[] = [
  {
    folio: 'OS-2026-0418',
    vehicleId: 'ECO-3253',
    kind: 'corrective',
    system: 'Motor y transmisión',
    workshop: 'Servicio Diésel Bajío',
    status: 'waiting-parts',
    opened: '2026-10-09',
    promised: '2026-10-18',
    costMXN: 38_400,
    description: 'Fuga en el retén del cigüeñal y cambio de embrague.',
  },
  {
    folio: 'OS-2026-0421',
    vehicleId: 'ECO-3033',
    kind: 'corrective',
    system: 'Frenos',
    workshop: 'Agencia Nissan Vallejo',
    status: 'in-shop',
    opened: '2026-10-14',
    promised: '2026-10-16',
    costMXN: 6_850,
    description: 'Balatas delanteras al límite y rectificado de discos.',
  },
  {
    folio: 'OS-2026-0423',
    vehicleId: 'ECO-3004',
    kind: 'preventive',
    system: 'Aceite y filtros',
    workshop: 'TallerMax Norte',
    status: 'scheduled',
    opened: '2026-10-15',
    promised: '2026-10-21',
    costMXN: 9_200,
    description: 'Servicio de 220,000 km: aceite, filtros de aire, combustible y aceite.',
  },
  {
    folio: 'OS-2026-0424',
    vehicleId: 'ECO-3113',
    kind: 'preventive',
    system: 'Neumáticos',
    workshop: 'Llantera del Centro',
    status: 'scheduled',
    opened: '2026-10-15',
    promised: '2026-10-24',
    costMXN: 14_600,
    description: 'Cambio de 4 llantas y alineación.',
  },
  {
    folio: 'OS-2026-0409',
    vehicleId: 'ECO-3215',
    kind: 'preventive',
    system: 'Suspensión y dirección',
    workshop: 'TallerMax Norte',
    status: 'done',
    opened: '2026-10-02',
    promised: '2026-10-04',
    costMXN: 12_300,
    description: 'Revisión de muelles y cambio de terminales de dirección.',
  },
  {
    folio: 'OS-2026-0402',
    vehicleId: 'ECO-3035',
    kind: 'corrective',
    system: 'Sistema eléctrico',
    workshop: 'AutoServicio Sur',
    status: 'done',
    opened: '2026-10-01',
    promised: '2026-10-02',
    costMXN: 4_150,
    description: 'Alternador sin carga; se reemplazó el regulador.',
  },
];

export const upcomingServices: UpcomingService[] = [
  { vehicleId: 'ECO-3240', service: 'Servicio de 75,000 km', dueDate: '2026-10-05', dueKm: 75_000 },
  { vehicleId: 'ECO-3260', service: 'Afinación 170,000 km', dueDate: '2026-10-12', dueKm: 170_000 },
  { vehicleId: 'ECO-3035', service: 'Cambio de aceite 120,000 km', dueDate: '2026-10-29', dueKm: 120_000 },
  { vehicleId: 'ECO-3215', service: 'Servicio mayor 240,000 km', dueDate: '2026-11-08', dueKm: 240_000 },
  { vehicleId: 'ECO-3033', service: 'Rotación de llantas', dueDate: '2026-11-20', dueKm: 45_000 },
];

/** Spend of the current month by system, in MXN. */
export const spendBySystem = [
  { system: 'Motor y transmisión', amountMXN: 38_400, color: '#0060df' },
  { system: 'Neumáticos', amountMXN: 14_600, color: '#0a7a7a' },
  { system: 'Suspensión y dirección', amountMXN: 12_300, color: '#bf410f' },
  { system: 'Aceite y filtros', amountMXN: 9_200, color: '#475569' },
  { system: 'Frenos', amountMXN: 6_850, color: '#ca0e00' },
  { system: 'Sistema eléctrico', amountMXN: 4_150, color: '#6b4dc7' },
];
