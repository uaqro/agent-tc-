/** Fleet master data for the Flota and Medios de pago pages. Keys match the vehicles in `data/dispersion`. */

export type FuelType = 'Magna' | 'Premium' | 'Diésel';
export type VehicleStatus = 'active' | 'maintenance' | 'inactive';

export interface VehicleDetail {
  vehicleId: string;
  brand: string;
  model: string;
  year: number;
  fuel: FuelType;
  tankLiters: number;
  expectedKmPerLiter: number;
  odometerKm: number;
  status: VehicleStatus;
}

export interface Driver {
  id: string;
  name: string;
  employeeNumber: string;
  group: string;
  vehicleId: string | null;
  licenseType: string;
  licenseExpires: string;
  fillsThisMonth: number;
  kmPerLiter: number | null;
  active: boolean;
}

export type PaymentMediumType = 'chip-card' | 'tag' | 'virtual';
export type PaymentMediumStatus = 'active' | 'blocked' | 'unassigned';

export interface PaymentMedium {
  id: string;
  type: PaymentMediumType;
  number: string;
  vehicleId: string | null;
  status: PaymentMediumStatus;
  expires: string;
  lastUse: string | null;
  lastStation: string | null;
}

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  active: 'Activo',
  maintenance: 'En taller',
  inactive: 'Inactivo',
};

export const PAYMENT_TYPE_LABEL: Record<PaymentMediumType, string> = {
  'chip-card': 'Tarjeta chip',
  tag: 'Tag de cristal',
  virtual: 'Tarjeta virtual',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentMediumStatus, string> = {
  active: 'Activo',
  blocked: 'Bloqueado',
  unassigned: 'Sin asignar',
};

export const vehicleDetails: VehicleDetail[] = [
  { vehicleId: 'v-1', brand: 'Freightliner', model: 'Cascadia', year: 2022, fuel: 'Diésel', tankLiters: 400, expectedKmPerLiter: 2.9, odometerKm: 218_400, status: 'active' },
  { vehicleId: 'v-2', brand: 'Nissan', model: 'NP300', year: 2023, fuel: 'Magna', tankLiters: 80, expectedKmPerLiter: 9.4, odometerKm: 64_120, status: 'active' },
  { vehicleId: 'v-3', brand: 'Isuzu', model: 'ELF 400', year: 2021, fuel: 'Diésel', tankLiters: 100, expectedKmPerLiter: 7.8, odometerKm: 132_870, status: 'inactive' },
  { vehicleId: 'v-4', brand: 'Kenworth', model: 'T680', year: 2021, fuel: 'Diésel', tankLiters: 450, expectedKmPerLiter: 2.7, odometerKm: 301_550, status: 'active' },
  { vehicleId: 'v-5', brand: 'Toyota', model: 'Camry Híbrido', year: 2024, fuel: 'Premium', tankLiters: 50, expectedKmPerLiter: 19.5, odometerKm: 22_310, status: 'active' },
  { vehicleId: 'v-6', brand: 'Chevrolet', model: 'Tornado Van', year: 2023, fuel: 'Magna', tankLiters: 70, expectedKmPerLiter: 11.2, odometerKm: 58_900, status: 'active' },
  { vehicleId: 'v-7', brand: 'Freightliner', model: 'M2 106', year: 2020, fuel: 'Diésel', tankLiters: 300, expectedKmPerLiter: 3.6, odometerKm: 245_020, status: 'maintenance' },
  { vehicleId: 'v-8', brand: 'Volkswagen', model: 'Crafter', year: 2022, fuel: 'Diésel', tankLiters: 75, expectedKmPerLiter: 8.6, odometerKm: 97_640, status: 'active' },
];

export const drivers: Driver[] = [
  { id: 'd-1', name: 'Rodolfo Aguirre', employeeNumber: 'CND-0441', group: 'Ruta Norte', vehicleId: 'v-1', licenseType: 'Federal E', licenseExpires: '2027-03-18', fillsThisMonth: 9, kmPerLiter: 2.8, active: true },
  { id: 'd-2', name: 'Marisol Vega', employeeNumber: 'CND-0218', group: 'Ruta Centro', vehicleId: 'v-2', licenseType: 'Estatal C', licenseExpires: '2026-11-02', fillsThisMonth: 14, kmPerLiter: 7.1, active: true },
  { id: 'd-3', name: 'Luis Beltrán', employeeNumber: 'CND-0377', group: 'Ruta Norte', vehicleId: 'v-4', licenseType: 'Federal E', licenseExpires: '2028-01-09', fillsThisMonth: 8, kmPerLiter: 2.6, active: true },
  { id: 'd-4', name: 'Ana Sandoval', employeeNumber: 'CND-0509', group: 'Flota ejecutiva', vehicleId: 'v-5', licenseType: 'Estatal A', licenseExpires: '2029-06-30', fillsThisMonth: 3, kmPerLiter: 19.8, active: true },
  { id: 'd-5', name: 'Javier Ortiz', employeeNumber: 'CND-0162', group: 'Ruta Centro', vehicleId: 'v-6', licenseType: 'Estatal C', licenseExpires: '2026-10-28', fillsThisMonth: 12, kmPerLiter: 10.4, active: true },
  { id: 'd-6', name: 'Carla Ramos', employeeNumber: 'CND-0290', group: 'Ruta Norte', vehicleId: 'v-7', licenseType: 'Federal B', licenseExpires: '2027-08-14', fillsThisMonth: 6, kmPerLiter: 3.5, active: true },
  { id: 'd-7', name: 'Miguel Santoyo', employeeNumber: 'CND-0333', group: 'Ruta Sur', vehicleId: 'v-8', licenseType: 'Estatal C', licenseExpires: '2027-02-21', fillsThisMonth: 11, kmPerLiter: 6.9, active: true },
  { id: 'd-8', name: 'Ernesto Fuentes', employeeNumber: 'CND-0418', group: 'Ruta Sur', vehicleId: null, licenseType: 'Federal E', licenseExpires: '2026-12-05', fillsThisMonth: 0, kmPerLiter: null, active: false },
];

export const paymentMedia: PaymentMedium[] = [
  { id: 'pm-1', type: 'chip-card', number: '5062 •••• •••• 0451', vehicleId: 'v-1', status: 'active', expires: '2028-09', lastUse: '2026-10-14T18:22:00', lastStation: 'Hidrosina Apodaca' },
  { id: 'pm-2', type: 'chip-card', number: '5062 •••• •••• 0917', vehicleId: 'v-2', status: 'active', expires: '2028-03', lastUse: '2026-10-15T11:05:00', lastStation: 'BP Vallejo' },
  { id: 'pm-3', type: 'tag', number: 'TAG-01-1293', vehicleId: 'v-3', status: 'active', expires: '2029-01', lastUse: '2026-09-24T07:40:00', lastStation: 'PEMEX Toluca Centro' },
  { id: 'pm-4', type: 'chip-card', number: '5062 •••• •••• 3344', vehicleId: 'v-4', status: 'active', expires: '2027-11', lastUse: '2026-10-13T06:10:00', lastStation: 'Shell San Nicolás' },
  { id: 'pm-5', type: 'virtual', number: 'APP •••• 7712', vehicleId: 'v-5', status: 'active', expires: '2027-05', lastUse: '2026-10-11T19:45:00', lastStation: 'Mobil Santa Fe' },
  { id: 'pm-6', type: 'tag', number: 'TAG-01-0855', vehicleId: 'v-6', status: 'active', expires: '2029-04', lastUse: '2026-10-14T21:30:00', lastStation: 'PEMEX Autopista km 142' },
  { id: 'pm-7', type: 'chip-card', number: '5062 •••• •••• 6234', vehicleId: 'v-7', status: 'active', expires: '2028-07', lastUse: '2026-10-09T08:15:00', lastStation: 'PEMEX Gdl Oriente' },
  { id: 'pm-8', type: 'chip-card', number: '5062 •••• •••• 2988', vehicleId: 'v-8', status: 'blocked', expires: '2027-12', lastUse: '2026-10-15T04:38:00', lastStation: 'PEMEX Hermosillo Norte' },
  { id: 'pm-9', type: 'chip-card', number: '5062 •••• •••• 8810', vehicleId: null, status: 'unassigned', expires: '2029-02', lastUse: null, lastStation: null },
  { id: 'pm-10', type: 'tag', number: 'TAG-01-4471', vehicleId: null, status: 'unassigned', expires: '2029-06', lastUse: null, lastStation: null },
];
