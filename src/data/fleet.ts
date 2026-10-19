/**
 * Fleet master data for the Flota and Medios de pago pages, derived from the common padrón in `data/client`.
 *
 * eOne models the unit, its driver and its fuelling activity. What it does not model — expected performance, licence
 * type, card numbers — is derived here deterministically from the unit, so it never changes between reloads.
 */
import { FUEL_LABELS, registryStatusOf, type FleetUnit, type FuelProduct, type UnitClass } from '../domain/dashboard/types';
import {
  assignedDriverName,
  clientDrivers,
  clientSnapshot,
  CLIENT_ACCOUNT_ID,
  clientUnits,
  groupLabel,
  orgPathOf,
  operatingUnits,
  stableFraction,
  unitById,
} from './client';
import { cardLast4Of } from '../domain/data/cards';
import { unassignedNodeId } from '../domain/org/types';
import { allServiceOrders } from './maintenance';
import { onSessionChange, sessionPrincipal, unitInScope } from './session';

export type FuelType = 'Magna' | 'Premium' | 'Diésel';

/**
 * What a unit's record is missing. The padrón leaves these on purpose (`fleet-activity`): no VIN from the
 * manufacturer, no registered driver, no org chart node, no odometer reading. They are data gaps, not errors, and the
 * Vehículos page shows them as such.
 */
export type RegistryGap = 'vin' | 'driver' | 'org' | 'odometer';

export const REGISTRY_GAP_LABEL: Record<RegistryGap, string> = {
  vin: 'Sin VIN',
  driver: 'Sin conductor',
  org: 'Sin nodo de organigrama',
  odometer: 'Sin odómetro',
};
export type VehicleStatus = 'active' | 'maintenance' | 'inactive';

export interface VehicleDetail {
  vehicleId: string;
  plate: string;
  group: string;
  driver: string;
  product: FuelProduct;
  /** Empty when the manufacturer has not delivered it yet. */
  vin: string;
  brand: string;
  model: string;
  year: number;
  fuel: FuelType;
  tankLiters: number;
  expectedKmPerLiter: number;
  /** Null when the unit never reported telemetry and nobody captured a reading. */
  odometerKm: number | null;
  status: VehicleStatus;
  /** Missing pieces of the record. Empty when it is complete. */
  gaps: RegistryGap[];
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

export const PRODUCT_LABEL: Record<FuelProduct, string> = {
  ticketcar_plus: 'TicketCar+',
  autoconsumo: 'Autoconsumo',
};

/** Manufacturer performance by vehicle class. The class decides it far more than the brand does. */
const EXPECTED_KM_PER_LITER: Record<UnitClass, number> = {
  pesado: 2.8,
  mediano: 6.4,
  ligero: 8.9,
  van: 9.6,
};

/** Manufacturer km/L expected for a vehicle class. */
export const expectedKmPerLiter = (vehicleClass: UnitClass): number => EXPECTED_KM_PER_LITER[vehicleClass];

/** Licence a driver needs for the class of the unit they are assigned to. */
const LICENSE_FOR_CLASS: Record<UnitClass, string> = {
  pesado: 'Federal E',
  mediano: 'Federal B',
  ligero: 'Estatal C',
  van: 'Estatal C',
};

// ── Activity of the last 30 days ────────────────────────────────────────

interface UnitActivity {
  lastUse: number | null;
}

interface DriverActivity {
  fills: number;
  /** Units the driver drove in the period: a driver is in a scope when one of them is. */
  units: Set<string>;
  km: number;
  liters: number;
}

function activityOfLast30Days() {
  const snapshot = clientSnapshot(30);
  const account = snapshot.accounts[0];
  const units = new Map<string, UnitActivity>();
  const drivers = new Map<string, DriverActivity>();

  for (const point of account.period) {
    for (const row of point.rows) {
      if (row.driverId === null) continue;
      const driver = drivers.get(row.driverId) ?? { fills: 0, km: 0, liters: 0, units: new Set<string>() };
      driver.km += row.km;
      driver.liters += row.liters;
      driver.units.add(row.unitId);
      drivers.set(row.driverId, driver);
    }
    for (const event of point.events) {
      if (event.refund) continue;
      const unit = units.get(event.unitId) ?? { lastUse: null };
      unit.lastUse = Math.max(unit.lastUse ?? 0, event.at);
      units.set(event.unitId, unit);
      if (event.driverId !== null) {
        const driver = drivers.get(event.driverId) ?? { fills: 0, km: 0, liters: 0, units: new Set<string>() };
        driver.fills += 1;
        drivers.set(event.driverId, driver);
      }
    }
  }

  return { units, drivers, todayUnits: new Map(account.units.map((unit) => [unit.unitId, unit])) };
}

const activity = activityOfLast30Days();

// ── Vehicles ────────────────────────────────────────────────────────────

const inShop = new Set(
  allServiceOrders.filter((order) => order.status === 'in-shop' || order.status === 'waiting-parts').map((order) => order.vehicleId),
);

function statusOf(unit: FleetUnit): VehicleStatus {
  if (registryStatusOf(unit) === 'baja') return 'inactive';
  if (inShop.has(unit.id) || activity.todayUnits.get(unit.id)?.status === 'en_taller') return 'maintenance';
  return 'active';
}

const UNASSIGNED_NODE = unassignedNodeId(CLIENT_ACCOUNT_ID);

function registryGapsOf(unit: FleetUnit): RegistryGap[] {
  const gaps: RegistryGap[] = [];
  if (unit.vin === '') gaps.push('vin');
  if (unit.assignedDriverId === '') gaps.push('driver');
  if (orgPathOf(unit.id).length === 0 || orgPathOf(unit.id).includes(UNASSIGNED_NODE)) gaps.push('org');
  if (unit.odometerKm === null) gaps.push('odometer');
  return gaps;
}

/** Every unit of the padrón, deregistered ones included: their history is still theirs. */
const allVehicleDetails: VehicleDetail[] = clientUnits.map((unit) => ({
  vehicleId: unit.id,
  plate: unit.plate,
  group: groupLabel(unit.group),
  driver: assignedDriverName(unit),
  product: unit.product,
  vin: unit.vin,
  brand: unit.brand,
  model: unit.model,
  year: unit.year,
  fuel: FUEL_LABELS[unit.fuel] as FuelType,
  tankLiters: unit.tankLiters,
  expectedKmPerLiter: EXPECTED_KM_PER_LITER[unit.vehicleClass],
  odometerKm: unit.odometerKm,
  status: statusOf(unit),
  gaps: registryGapsOf(unit),
}));

// ── Drivers ─────────────────────────────────────────────────────────────

const unitOfDriver = new Map<string, FleetUnit>();
for (const unit of operatingUnits) {
  if (unit.assignedDriverId !== '' && !unitOfDriver.has(unit.assignedDriverId)) unitOfDriver.set(unit.assignedDriverId, unit);
}

const isoDay = (at: number): string => {
  const date = new Date(at);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const isoMinute = (at: number): string => `${isoDay(at)}T${new Date(at).toTimeString().slice(0, 5)}:00`;

/** A driver is active when they drove at least one day of the last 30. */
const allDrivers: Driver[] = clientDrivers.map((driver) => {
  const unit = unitOfDriver.get(driver.id) ?? null;
  const stats = activity.drivers.get(driver.id);
  return {
    id: driver.id,
    name: driver.name,
    employeeNumber: driver.id,
    group: groupLabel(driver.group),
    vehicleId: unit?.id ?? null,
    licenseType: LICENSE_FOR_CLASS[unit?.vehicleClass ?? 'ligero'],
    licenseExpires: isoDay(driver.licenseExpiresAt),
    fillsThisMonth: stats?.fills ?? 0,
    kmPerLiter: stats && stats.liters > 0 ? Math.round((stats.km / stats.liters) * 10) / 10 : null,
    active: stats !== undefined && stats.km > 0,
  };
});

// ── Payment media ───────────────────────────────────────────────────────

/** Stations each group fuels at, for the "last use" column. */
const STATIONS_BY_GROUP: Record<string, string[]> = {
  'Zona Metropolitana': ['BP Vallejo', 'PEMEX Vallejo 2', 'G500 Cuautitlán Norte', 'Mobil Santa Fe'],
  'Corredor Norte': ['Hidrosina Apodaca', 'Shell San Nicolás', 'Gulf Monterrey Sur', 'PEMEX Universidad'],
  'Corredor del Golfo': ['PEMEX Veracruz Puerto', 'Oxxo Gas Coatzacoalcos', 'G500 Poza Rica'],
  Occidente: ['PEMEX Gdl Oriente', 'Fuelgas Tlaquepaque', 'Orsan Zapopan'],
  Sureste: ['PEMEX Mérida Norte', 'Shell Villahermosa', 'Orsan Campeche'],
  'Reserva y sustitución': ['PEMEX Toluca Centro', 'Orsan Metepec'],
};

/** Hand-written situations the other pages refer to: a blocked card and an executive virtual card. */
const SCENARIO_MEDIA: Record<string, Partial<PaymentMedium>> = {
  'ECO-3113': { status: 'blocked' },
  'ECO-3260': { type: 'virtual' },
};

function cardNumber(type: PaymentMediumType, unitId: string): string {
  // Same four digits the optimizer shows for the unit's card (`domain/data/cards`).
  const digits = cardLast4Of(unitId);
  if (type === 'tag') return `TAG-03-${digits}`;
  if (type === 'virtual') return `APP •••• ${digits}`;
  return `5062 •••• •••• ${digits}`;
}

function expiryOf(key: string): string {
  const months = Math.floor(stableFraction(`${key}:vigencia`) * 30);
  const date = new Date(2027, 2 + months, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function mediumOf(unit: FleetUnit, index: number): PaymentMedium {
  // TicketCar+ units pay with a chip card on the external network; Autoconsumo units are identified at the client's
  // own stations by a windshield tag.
  const type: PaymentMediumType = unit.product === 'autoconsumo' ? 'tag' : 'chip-card';
  const scenario = SCENARIO_MEDIA[unit.id] ?? {};
  const finalType = scenario.type ?? type;
  const lastUse = activity.units.get(unit.id)?.lastUse ?? null;
  const stations = STATIONS_BY_GROUP[groupLabel(unit.group)] ?? ['PEMEX'];
  return {
    id: `pm-${index + 1}`,
    type: finalType,
    number: cardNumber(finalType, unit.id),
    vehicleId: unit.id,
    // A deregistered unit keeps its card blocked until the medium is reassigned.
    status: scenario.status ?? (registryStatusOf(unit) === 'baja' ? 'blocked' : 'active'),
    expires: expiryOf(unit.id),
    lastUse: lastUse === null ? null : isoMinute(lastUse),
    lastStation: lastUse === null ? null : stations[Math.floor(stableFraction(`${unit.id}:estacion`) * stations.length)],
  };
}

/** Spare media in stock, not yet assigned to a unit. */
const SPARES: PaymentMediumType[] = ['chip-card', 'chip-card', 'chip-card', 'chip-card', 'tag', 'tag'];

const allPaymentMedia: PaymentMedium[] = [
  ...clientUnits.map(mediumOf),
  ...SPARES.map((type, index) => {
    const key = `repuesto-${index}`;
    return {
      id: `pm-r${index + 1}`,
      type,
      number: cardNumber(type, key),
      vehicleId: null,
      status: 'unassigned' as const,
      expires: expiryOf(key),
      lastUse: null,
      lastStation: null,
    };
  }),
];


// ── Session scope (ADR-TCP-001) ─────────────────────────────────────────

const driverInScope = (driver: Driver): boolean =>
  sessionPrincipal().scopeNodeId === null ||
  (driver.vehicleId !== null && unitInScope(driver.vehicleId)) ||
  [...(activity.drivers.get(driver.id)?.units ?? [])].some(unitInScope);

export let vehicleDetails: VehicleDetail[] = allVehicleDetails;
export let drivers: Driver[] = allDrivers;
const isTicketCarMedium = (medium: PaymentMedium): boolean =>
  medium.vehicleId === null || unitById(medium.vehicleId)?.product === 'ticketcar_plus';

/** Media of every unit in scope, both products, for the vehicle catalogue. */
export let vehicleMedia: PaymentMedium[] = allPaymentMedia;

/**
 * Media the Medios de pago page manages: TicketCar+ units plus the stock not yet assigned.
 *
 * TODO(producto): ¿Autoconsumo tiene límites propios? Hasta decidirlo, Medios de pago y Límites excluyen las unidades
 * de Autoconsumo (sus tags de estación propia). Lo recuerda `DevNote` en las dos páginas con el modo Dev activo.
 */
export let paymentMedia: PaymentMedium[] = allPaymentMedia.filter(isTicketCarMedium);

onSessionChange(() => {
  vehicleDetails = allVehicleDetails.filter((detail) => unitInScope(detail.vehicleId));
  drivers = allDrivers.filter(driverInScope);
  vehicleMedia = allPaymentMedia.filter((medium) => medium.vehicleId === null || unitInScope(medium.vehicleId));
  paymentMedia = vehicleMedia.filter(isTicketCarMedium);
});

/** Ids of the drivers the session can see, for the driver selector of the global filters. */
export const driverIdsInScope = (): Set<string> => new Set(drivers.map((driver) => driver.id));
