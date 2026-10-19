/** Maintenance mock data. Vehicle ids match `data/dispersion` and `data/fleet`. */

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
    vehicleId: 'v-7',
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
    vehicleId: 'v-2',
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
    vehicleId: 'v-1',
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
    vehicleId: 'v-8',
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
    vehicleId: 'v-4',
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
    vehicleId: 'v-6',
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
  { vehicleId: 'v-3', service: 'Servicio de 130,000 km', dueDate: '2026-10-05', dueKm: 130_000 },
  { vehicleId: 'v-5', service: 'Afinación híbrido 20,000 km', dueDate: '2026-10-12', dueKm: 20_000 },
  { vehicleId: 'v-6', service: 'Cambio de aceite 60,000 km', dueDate: '2026-10-29', dueKm: 60_000 },
  { vehicleId: 'v-4', service: 'Servicio mayor 300,000 km', dueDate: '2026-11-08', dueKm: 300_000 },
  { vehicleId: 'v-2', service: 'Rotación de llantas', dueDate: '2026-11-20', dueKm: 65_000 },
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
