import { businessNow } from '../domain/demo/clock';
import type {
  EvCard,
  EvCardStatus,
  EvCardType,
  EvChargeType,
  EvChargerRequest,
  EvChargerRequestStatus,
  EvChargerStatus,
  EvCostCenter,
  EvDay,
  EvFunding,
  EvFundingMethod,
  EvFundingMode,
  EvFundingQuote,
  EvGroup,
  EvLedgerEntry,
  EvLedgerType,
  EvNetwork,
  EvPolicy,
  EvPolicyRules,
  EvPolicyScope,
  EvPrivateCharger,
  EvSession,
  EvSessionStatus,
  EvStation,
  EvVehicle,
  EvVehicleStatus,
} from '../types/electromobility';

/*
 * Electromovilidad. Concepts and rules come from ER-Mobility-MX/EV-Manager (docs/06-business-rules.md):
 * one corporate account funds every charge, vehicles carry no balance, and consumption is governed by rules.
 * All data here is mock data, seeded like the EV Manager demo (Grupo Logística Demo).
 */

// ─── Configuration (EV Manager seed: fundingCommissionRate, taxRate, cardProcessingRate, PLATFORM_FEE_RATE) ───

export const EV_RATES = {
  fundingCommission: 0.015,
  iva: 0.16,
  cardProcessing: 0.029,
  platformFee: 0.03,
} as const;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// ─── Catalogs ───

export const evCostCenters: EvCostCenter[] = [
  { id: 'cc-ven', code: 'VEN', name: 'Ventas' },
  { id: 'cc-log', code: 'LOG', name: 'Logística' },
  { id: 'cc-dir', code: 'DIR', name: 'Dirección' },
  { id: 'cc-srv', code: 'SRV', name: 'Servicios de Campo' },
];

export const evGroups: EvGroup[] = [
  { id: 'evg-reparto', name: 'Reparto Última Milla' },
  { id: 'evg-ejecutivos', name: 'Ejecutivos' },
];

export const evVehicles: EvVehicle[] = [
  { id: 'ev-01', alias: 'Ventas-01', brand: 'Tesla', model: 'Model 3', trim: 'Long Range', year: 2025, vin: '5YJ3E1EA7KF000001', plate: 'ABC-123', type: 'electric', batteryKwh: 75, rangeKm: 500, connector: 'CCS2', maxPowerKw: 250, costCenterId: 'cc-ven', groupId: 'evg-ejecutivos', status: 'active' },
  { id: 'ev-02', alias: 'Ventas-02', brand: 'Tesla', model: 'Model Y', trim: 'Performance', year: 2024, vin: '5YJYGDEE0MF000002', plate: 'ABC-124', type: 'electric', batteryKwh: 82, rangeKm: 480, connector: 'CCS2', maxPowerKw: 250, costCenterId: 'cc-ven', groupId: 'evg-ejecutivos', status: 'active' },
  { id: 'ev-03', alias: 'Reparto-01', brand: 'Nissan', model: 'Leaf', trim: 'e+', year: 2023, vin: '1N4AZ1CP4KC000003', plate: 'DEF-201', type: 'electric', batteryKwh: 62, rangeKm: 380, connector: 'CHAdeMO', maxPowerKw: 100, costCenterId: 'cc-log', groupId: 'evg-reparto', status: 'active' },
  { id: 'ev-04', alias: 'Reparto-02', brand: 'BYD', model: 'Dolphin', trim: 'Plus', year: 2025, vin: 'LGXCE4CB0N0000004', plate: 'DEF-202', type: 'electric', batteryKwh: 60, rangeKm: 340, connector: 'CCS2', maxPowerKw: 88, costCenterId: 'cc-log', groupId: 'evg-reparto', status: 'active' },
  { id: 'ev-05', alias: 'Reparto-03', brand: 'Chevrolet', model: 'Bolt EUV', trim: 'Premier', year: 2023, vin: '1G1FZ6S00P4000005', plate: 'DEF-203', type: 'electric', batteryKwh: 65, rangeKm: 400, connector: 'CCS2', maxPowerKw: 55, costCenterId: 'cc-log', groupId: 'evg-reparto', status: 'maintenance' },
  { id: 'ev-06', alias: 'Dirección-01', brand: 'Volkswagen', model: 'ID.4', trim: 'Pro', year: 2024, vin: 'WVGZZZE2XPP000006', plate: 'GHI-301', type: 'electric', batteryKwh: 77, rangeKm: 520, connector: 'CCS2', maxPowerKw: 135, costCenterId: 'cc-dir', groupId: 'evg-ejecutivos', status: 'active' },
  { id: 'ev-07', alias: 'Dirección-02', brand: 'Kia', model: 'EV6', trim: 'GT-Line', year: 2025, vin: 'KNDC3DLC5N5000007', plate: 'GHI-302', type: 'electric', batteryKwh: 77, rangeKm: 500, connector: 'CCS2', maxPowerKw: 240, costCenterId: 'cc-dir', groupId: 'evg-ejecutivos', status: 'active' },
  { id: 'ev-08', alias: 'Servicios-01', brand: 'Hyundai', model: 'Ioniq 5', trim: 'Limited', year: 2024, vin: 'KM8KRDAF5PU000008', plate: 'JKL-401', type: 'electric', batteryKwh: 74, rangeKm: 460, connector: 'CCS2', maxPowerKw: 220, costCenterId: 'cc-srv', groupId: 'evg-reparto', status: 'active' },
  { id: 'ev-09', alias: 'Servicios-02', brand: 'Volvo', model: 'XC40 Recharge', trim: 'Ultimate', year: 2023, vin: 'YV4ED3UR5P2000009', plate: 'JKL-402', type: 'electric', batteryKwh: 78, rangeKm: 420, connector: 'CCS2', maxPowerKw: 150, costCenterId: 'cc-srv', groupId: 'evg-reparto', status: 'inactive' },
  { id: 'ev-10', alias: 'Servicios-03', brand: 'Toyota', model: 'RAV4 Prime', trim: 'XSE', year: 2024, vin: 'JTMEB3FV0RD000010', plate: 'MNO-501', type: 'hybrid', batteryKwh: 18, rangeKm: 100, connector: 'Type2', maxPowerKw: 22, costCenterId: 'cc-srv', groupId: 'evg-reparto', status: 'active' },
  { id: 'ev-11', alias: 'Ventas-03', brand: 'Ford', model: 'Escape PHEV', trim: 'Titanium', year: 2024, vin: '1FMCU0F1XRU000011', plate: 'MNO-502', type: 'hybrid', batteryKwh: 14, rangeKm: 60, connector: 'Type2', maxPowerKw: 19, costCenterId: 'cc-ven', groupId: 'evg-ejecutivos', status: 'active' },
];

/** Public stations come from the CPO networks (OCPI / eMSP); private ones are the company's own sites. */
export const evStations: EvStation[] = [
  { id: 'st-reforma', name: 'CFE Reforma', operator: 'CFE Carga', city: 'Ciudad de México', network: 'public', chargeType: 'fast', maxPowerKw: 150, connectors: ['CCS2', 'Type2'], tariffPerKwh: 6.9 },
  { id: 'st-santafe', name: 'CFE Santa Fe', operator: 'CFE Carga', city: 'Ciudad de México', network: 'public', chargeType: 'fast', maxPowerKw: 120, connectors: ['CCS2', 'CHAdeMO'], tariffPerKwh: 6.9 },
  { id: 'st-polanco', name: 'Supercharger Polanco', operator: 'Tesla Supercharger', city: 'Ciudad de México', network: 'public', chargeType: 'ultra', maxPowerKw: 250, connectors: ['CCS2'], tariffPerKwh: 8.9 },
  { id: 'st-interlomas', name: 'Supercharger Interlomas', operator: 'Tesla Supercharger', city: 'Huixquilucan', network: 'public', chargeType: 'ultra', maxPowerKw: 250, connectors: ['CCS2'], tariffPerKwh: 8.9 },
  { id: 'st-angelopolis', name: 'Evergo Angelópolis', operator: 'Evergo', city: 'Puebla', network: 'public', chargeType: 'slow', maxPowerKw: 60, connectors: ['CCS2', 'Type2'], tariffPerKwh: 5.2 },
  { id: 'st-gdl-centro', name: 'Chargenet Guadalajara Centro', operator: 'Chargenet', city: 'Guadalajara', network: 'public', chargeType: 'fast', maxPowerKw: 90, connectors: ['CCS2', 'Type2'], tariffPerKwh: 6.5 },
  { id: 'st-mty-sanpedro', name: 'Evergo San Pedro', operator: 'Evergo', city: 'San Pedro Garza García', network: 'public', chargeType: 'fast', maxPowerKw: 120, connectors: ['CCS2', 'Type2'], tariffPerKwh: 6.7 },
  { id: 'st-qro-centro', name: 'CFE Querétaro Centro', operator: 'CFE Carga', city: 'Querétaro', network: 'public', chargeType: 'fast', maxPowerKw: 90, connectors: ['CCS2', 'Type2'], tariffPerKwh: 6.5 },
  { id: 'st-leon', name: 'Chargenet León', operator: 'Chargenet', city: 'León', network: 'public', chargeType: 'slow', maxPowerKw: 60, connectors: ['CCS2'], tariffPerKwh: 5.2 },
  { id: 'st-cuernavaca', name: 'Evergo Cuernavaca', operator: 'Evergo', city: 'Cuernavaca', network: 'public', chargeType: 'slow', maxPowerKw: 22, connectors: ['Type2'], tariffPerKwh: 4.6 },
  { id: 'st-vallejo', name: 'Cedis Vallejo', operator: 'Grupo Logística Demo', city: 'Ciudad de México', network: 'private', chargeType: 'fast', maxPowerKw: 60, connectors: ['CCS2', 'Type2', 'CHAdeMO'], tariffPerKwh: 2.85 },
  { id: 'st-corporativo', name: 'Corporativo Santa Fe', operator: 'Grupo Logística Demo', city: 'Ciudad de México', network: 'private', chargeType: 'slow', maxPowerKw: 22, connectors: ['Type2', 'CCS2'], tariffPerKwh: 2.85 },
];

export const evPrivateChargers: EvPrivateCharger[] = [
  { id: 'chg-vlj-1', stationId: 'st-vallejo', name: 'Vallejo DC-1', status: 'in-use', powerKw: 60, connector: 'CCS2' },
  { id: 'chg-vlj-2', stationId: 'st-vallejo', name: 'Vallejo DC-2', status: 'available', powerKw: 60, connector: 'CHAdeMO' },
  { id: 'chg-vlj-3', stationId: 'st-vallejo', name: 'Vallejo AC-1', status: 'available', powerKw: 22, connector: 'Type2' },
  { id: 'chg-vlj-4', stationId: 'st-vallejo', name: 'Vallejo AC-2', status: 'out-of-service', powerKw: 22, connector: 'Type2' },
  { id: 'chg-cor-1', stationId: 'st-corporativo', name: 'Santa Fe AC-1', status: 'available', powerKw: 22, connector: 'Type2' },
  { id: 'chg-cor-2', stationId: 'st-corporativo', name: 'Santa Fe AC-2', status: 'in-use', powerKw: 22, connector: 'CCS2' },
];

export const evCards: EvCard[] = [
  ...evVehicles.map<EvCard>((vehicle, index) => ({
    id: `evc-${String(index + 1).padStart(2, '0')}`,
    type: index % 3 === 2 ? 'virtual' : 'rfid',
    masked: `•••• ${String(4201 + index * 37).slice(-4)}`,
    status: vehicle.status === 'inactive' ? 'blocked' : 'active',
    vehicleId: vehicle.id,
    expires: index % 4 === 0 ? '2027-03-31' : '2028-09-30',
  })),
  { id: 'evc-12', type: 'rfid', masked: '•••• 4655', status: 'unassigned', vehicleId: null, expires: '2028-09-30' },
  { id: 'evc-13', type: 'virtual', masked: '•••• 4692', status: 'unassigned', vehicleId: null, expires: '2028-09-30' },
  { id: 'evc-14', type: 'rfid', masked: '•••• 3980', status: 'expired', vehicleId: null, expires: '2026-06-30' },
];

/** Seeded like EV Manager: the most specific policy wins and quantitative limits take the minimum. */
export const evPolicies: EvPolicy[] = [
  { id: 'evp-1', name: 'Horario corporativo global', scope: 'company', targetId: null, enabled: true, rules: { schedule: { from: '05:00', to: '23:00' }, allowedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], maxKwhDay: 120 } },
  { id: 'evp-2', name: 'Reparto — solo horario laboral', scope: 'group', targetId: 'evg-reparto', enabled: true, rules: { schedule: { from: '06:00', to: '20:00' }, allowedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'], maxSessionsDay: 2, maxPowerKw: 150 } },
  { id: 'evp-3', name: 'Logística — tope diario de energía', scope: 'cost-center', targetId: 'cc-log', enabled: true, rules: { maxKwhDay: 90, maxAmountDay: 650 } },
  { id: 'evp-4', name: 'Política Ventas-01', scope: 'vehicle', targetId: 'ev-01', enabled: true, rules: { schedule: { from: '06:00', to: '22:00' }, allowedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'], maxSessionsDay: 3, maxKwhDay: 80, maxPowerKw: 250 } },
  { id: 'evp-5', name: 'Bloqueo fin de semana — Servicios', scope: 'cost-center', targetId: 'cc-srv', enabled: false, rules: { allowedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'] } },
];

export const evChargerRequests: EvChargerRequest[] = [
  { id: 'SOL-0007', type: 'install', location: 'Cedis Tlalnepantla', address: 'Av. Mario Colín 210, Tlalnepantla, Edo. Méx.', contact: 'Laura Méndez', email: 'laura.mendez@logisticademo.mx', createdAt: '2026-10-09', desiredDate: '2026-12-01', status: 'quoted', units: 6, powerKw: 22, connector: 'Type2', needsCivilWork: true },
  { id: 'SOL-0006', type: 'integrate', location: 'Sucursal Monterrey', address: 'Av. Constitución 1500, Monterrey, N.L.', contact: 'Jorge Treviño', email: 'jorge.trevino@logisticademo.mx', createdAt: '2026-09-28', desiredDate: '2026-11-15', status: 'integration-test', units: 2, powerKw: 60, connector: 'CCS2', needsCivilWork: false, existingBrand: 'ABB Terra 54', protocol: 'OCPP 1.6J' },
  { id: 'SOL-0005', type: 'install', location: 'Corporativo Santa Fe · nivel 2', address: 'Prol. Paseo de la Reforma 1015, CDMX', contact: 'Ana Ruiz', email: 'ana.ruiz@logisticademo.mx', createdAt: '2026-09-02', desiredDate: null, status: 'scheduled', units: 4, powerKw: 22, connector: 'Type2', needsCivilWork: false },
  { id: 'SOL-0004', type: 'integrate', location: 'Cedis Vallejo', address: 'Calz. Vallejo 1020, CDMX', contact: 'Laura Méndez', email: 'laura.mendez@logisticademo.mx', createdAt: '2026-06-17', desiredDate: '2026-08-01', status: 'live', units: 4, powerKw: 60, connector: 'CCS2', needsCivilWork: false, existingBrand: 'Wallbox Supernova', protocol: 'OCPP 2.0.1' },
  { id: 'SOL-0003', type: 'install', location: 'Bodega Iztapalapa', address: 'Eje 6 Sur 88, CDMX', contact: 'Jorge Treviño', email: 'jorge.trevino@logisticademo.mx', createdAt: '2026-05-04', desiredDate: null, status: 'rejected', units: 8, powerKw: 22, connector: 'Type2', needsCivilWork: true },
];

// ─── Labels ───

export const EV_SCOPE_LABEL: Record<EvPolicyScope, string> = {
  company: 'Empresa',
  'cost-center': 'Centro de costos',
  group: 'Grupo',
  vehicle: 'Vehículo',
};

export const EV_DAY_LABEL: Record<EvDay, string> = {
  MON: 'Lun',
  TUE: 'Mar',
  WED: 'Mié',
  THU: 'Jue',
  FRI: 'Vie',
  SAT: 'Sáb',
  SUN: 'Dom',
};

export const EV_DAYS: EvDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const EV_NETWORK_LABEL: Record<EvNetwork, string> = { public: 'Red pública', private: 'Red privada' };

export const EV_CHARGE_TYPE_LABEL: Record<EvChargeType, string> = { slow: 'Lenta (AC)', fast: 'Rápida (DC)', ultra: 'Ultrarrápida' };

export const EV_VEHICLE_STATUS: Record<EvVehicleStatus, { label: string; chip: string }> = {
  active: { label: 'Activo', chip: 'chip--active' },
  maintenance: { label: 'En taller', chip: 'chip--review' },
  inactive: { label: 'Inactivo', chip: 'chip--paused' },
};

export const EV_CARD_TYPE_LABEL: Record<EvCardType, string> = { rfid: 'Tarjeta RFID', virtual: 'Tarjeta virtual' };

export const EV_CARD_STATUS: Record<EvCardStatus, { label: string; chip: string }> = {
  unassigned: { label: 'Sin asignar', chip: 'chip--info' },
  active: { label: 'Activa', chip: 'chip--active' },
  blocked: { label: 'Bloqueada', chip: 'chip--danger' },
  cancelled: { label: 'Cancelada', chip: 'chip--paused' },
  expired: { label: 'Vencida', chip: 'chip--paused' },
};

export const EV_SESSION_STATUS: Record<EvSessionStatus, { label: string; chip: string }> = {
  completed: { label: 'Completada', chip: 'chip--active' },
  'in-progress': { label: 'En curso', chip: 'chip--info' },
  denied: { label: 'Denegada', chip: 'chip--danger' },
};

export const EV_CHARGER_STATUS: Record<EvChargerStatus, { label: string; chip: string }> = {
  available: { label: 'Disponible', chip: 'chip--active' },
  'in-use': { label: 'En uso', chip: 'chip--info' },
  'out-of-service': { label: 'Fuera de servicio', chip: 'chip--danger' },
};

export const EV_LEDGER_LABEL: Record<EvLedgerType, { label: string; chip: string }> = {
  funding: { label: 'Fondeo', chip: 'chip--active' },
  charge: { label: 'Recarga', chip: 'chip--info' },
  hold: { label: 'Saldo comprometido', chip: 'chip--review' },
  'hold-release': { label: 'Liberación', chip: 'chip--paused' },
  adjustment: { label: 'Ajuste', chip: 'chip--paused' },
};

export const EV_FUNDING_METHOD_LABEL: Record<EvFundingMethod, string> = {
  stp: 'STP (CLABE)',
  transfer: 'Transferencia referenciada',
  card: 'Tarjeta',
};

/** The implementation pipeline of a charger request, in order. `rejected` and `cancelled` leave it. */
export const EV_REQUEST_PIPELINE: EvChargerRequestStatus[] = [
  'submitted',
  'triage',
  'quoted',
  'approved',
  'scheduled',
  'in-implementation',
  'integration-test',
  'live',
];

export const EV_REQUEST_STATUS: Record<EvChargerRequestStatus, { label: string; chip: string }> = {
  submitted: { label: 'Recibida', chip: 'chip--info' },
  triage: { label: 'En revisión', chip: 'chip--review' },
  'needs-info': { label: 'Falta información', chip: 'chip--review' },
  quoted: { label: 'Cotizada', chip: 'chip--review' },
  approved: { label: 'Aprobada', chip: 'chip--info' },
  scheduled: { label: 'Programada', chip: 'chip--info' },
  'in-implementation': { label: 'En implementación', chip: 'chip--info' },
  'integration-test': { label: 'Prueba de integración', chip: 'chip--info' },
  live: { label: 'En operación', chip: 'chip--active' },
  rejected: { label: 'Rechazada', chip: 'chip--danger' },
  cancelled: { label: 'Cancelada', chip: 'chip--paused' },
};

export const vehicleById = (id: string) => evVehicles.find((vehicle) => vehicle.id === id);
export const stationById = (id: string) => evStations.find((station) => station.id === id);

export function evScopeTargetLabel(policy: Pick<EvPolicy, 'scope' | 'targetId'>): string {
  switch (policy.scope) {
    case 'company':
      return 'Toda la empresa';
    case 'cost-center':
      return evCostCenters.find((center) => center.id === policy.targetId)?.name ?? '—';
    case 'group':
      return evGroups.find((group) => group.id === policy.targetId)?.name ?? '—';
    case 'vehicle': {
      const vehicle = evVehicles.find((candidate) => candidate.id === policy.targetId);
      return vehicle ? `${vehicle.alias} · ${vehicle.plate}` : '—';
    }
  }
}

export function evRuleSummary(rules: EvPolicyRules): string[] {
  const parts: string[] = [];
  if (rules.schedule) parts.push(`${rules.schedule.from}–${rules.schedule.to}`);
  if (rules.allowedDays) parts.push(rules.allowedDays.map((day) => EV_DAY_LABEL[day]).join(' '));
  if (rules.maxSessionsDay !== undefined) parts.push(`${rules.maxSessionsDay} recargas/día`);
  if (rules.maxKwhDay !== undefined) parts.push(`${rules.maxKwhDay} kWh/día`);
  if (rules.maxAmountDay !== undefined) parts.push(`$${rules.maxAmountDay.toLocaleString('es-MX')}/día`);
  if (rules.network) parts.push(`Solo ${EV_NETWORK_LABEL[rules.network].toLowerCase()}`);
  if (rules.chargeTypes) parts.push(rules.chargeTypes.map((type) => EV_CHARGE_TYPE_LABEL[type]).join(', '));
  if (rules.maxPowerKw !== undefined) parts.push(`≤ ${rules.maxPowerKw} kW`);
  return parts;
}

// ─── Funding (RN-FND-1…7) ───

/**
 * Net mode: `amount` is what reaches the account; the fees go on top.
 * Gross mode: `amount` is what the user pays; the credit is solved so that credit + fees = amount.
 * A card adds its processing fee and that fee's IVA (RN-FND-5).
 */
export function evFundingQuote(method: EvFundingMethod, mode: EvFundingMode, amount: number): EvFundingQuote {
  const { fundingCommission: rate, iva, cardProcessing } = EV_RATES;
  const processing = method === 'card' ? cardProcessing : 0;
  const factor = 1 + rate * (1 + iva) + processing * (1 + iva);
  const credited = round2(mode === 'net' ? amount : amount / factor);
  const commission = round2(credited * rate);
  const commissionTax = round2(commission * iva);
  const processingFee = round2(credited * processing);
  const processingTax = round2(processingFee * iva);
  const totalToPay = mode === 'gross' ? round2(amount) : round2(credited + commission + commissionTax + processingFee + processingTax);
  return { credited, commission, commissionTax, processingFee, processingTax, totalToPay };
}

// ─── Charging cost (RN-CHG-3) and hold (RN-CHG-2) ───

export function evChargeCost(energyKwh: number, station: EvStation) {
  const cost = round2(energyKwh * station.tariffPerKwh);
  const tax = round2(cost * EV_RATES.iva);
  const commission = round2(cost * EV_RATES.platformFee);
  return { cost, tax, commission, total: round2(cost + tax + commission) };
}

// ─── PolicyEngine (RN-RES-1…6, RN-CHG-1) ───

const SPECIFICITY: Record<EvPolicyScope, number> = { company: 0, 'cost-center': 1, group: 2, vehicle: 3 };

export const EV_JS_DAYS: EvDay[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function evPoliciesFor(vehicle: EvVehicle, policies: EvPolicy[]): EvPolicy[] {
  return policies
    .filter(
      (policy) =>
        policy.enabled &&
        (policy.scope === 'company' ||
          (policy.scope === 'cost-center' && policy.targetId === vehicle.costCenterId) ||
          (policy.scope === 'group' && policy.targetId === vehicle.groupId) ||
          (policy.scope === 'vehicle' && policy.targetId === vehicle.id)),
    )
    .sort((a, b) => SPECIFICITY[b.scope] - SPECIFICITY[a.scope]);
}

export interface EvCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  /** Policy the rule came from, when it came from one. */
  source?: string;
}

export interface EvAuthorizationRequest {
  vehicle: EvVehicle;
  station: EvStation;
  at: Date;
  energyKwh: number;
  policies: EvPolicy[];
  cards: EvCard[];
  /** Sessions already on the books; today's completed ones feed the daily counters. */
  sessions: EvSession[];
  availableBalance: number;
}

export interface EvAuthorization {
  allowed: boolean;
  checks: EvCheck[];
  hold: number;
  powerKw: number;
  /** First failed check, for the denial reason. */
  reason?: string;
}

const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours! * 60 + minutes!;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Order of RN-CHG-1: active card → active vehicle → policies → available balance ≥ estimate. */
export function evAuthorize(request: EvAuthorizationRequest): EvAuthorization {
  const { vehicle, station, at, energyKwh, policies, cards, sessions, availableBalance } = request;
  const checks: EvCheck[] = [];
  const applicable = evPoliciesFor(vehicle, policies);
  const powerKw = Math.min(station.maxPowerKw, vehicle.maxPowerKw);
  const estimate = evChargeCost(energyKwh, station).total;

  const card = cards.find((candidate) => candidate.vehicleId === vehicle.id && candidate.status === 'active');
  checks.push({
    id: 'card',
    label: 'Medio de pago',
    ok: !!card,
    detail: card ? `Tarjeta ${card.masked} activa` : 'La unidad no tiene una tarjeta activa',
  });
  checks.push({
    id: 'vehicle',
    label: 'Unidad',
    ok: vehicle.status === 'active',
    detail: vehicle.status === 'active' ? 'Unidad activa' : `Unidad ${EV_VEHICLE_STATUS[vehicle.status].label.toLowerCase()}`,
  });
  checks.push({
    id: 'connector',
    label: 'Conector',
    ok: station.connectors.includes(vehicle.connector),
    detail: station.connectors.includes(vehicle.connector)
      ? `${vehicle.connector} disponible en la estación`
      : `La estación no tiene ${vehicle.connector}`,
  });

  /** Qualitative rules: the most specific policy that defines one decides it. */
  const decide = <K extends keyof EvPolicyRules>(key: K) => applicable.find((policy) => policy.rules[key] !== undefined);
  /** Quantitative limits: the minimum over every policy that defines one. */
  const tightest = (key: 'maxSessionsDay' | 'maxKwhDay' | 'maxAmountDay' | 'maxPowerKw') =>
    applicable
      .filter((policy) => policy.rules[key] !== undefined)
      .reduce<EvPolicy | undefined>((best, policy) => (!best || policy.rules[key]! < best.rules[key]! ? policy : best), undefined);

  const schedule = decide('schedule');
  if (schedule) {
    const { from, to } = schedule.rules.schedule!;
    const minute = at.getHours() * 60 + at.getMinutes();
    const ok = minute >= minutesOf(from) && minute < minutesOf(to);
    checks.push({ id: 'schedule', label: 'Horario', ok, detail: `Permitido de ${from} a ${to}`, source: schedule.name });
  }

  const days = decide('allowedDays');
  if (days) {
    const day = EV_JS_DAYS[at.getDay()]!;
    const ok = days.rules.allowedDays!.includes(day);
    checks.push({
      id: 'days',
      label: 'Día',
      ok,
      detail: ok ? `${EV_DAY_LABEL[day]} permitido` : `${EV_DAY_LABEL[day]} no permitido`,
      source: days.name,
    });
  }

  const network = decide('network');
  if (network) {
    const ok = network.rules.network === station.network;
    checks.push({ id: 'network', label: 'Tipo de red', ok, detail: `Solo ${EV_NETWORK_LABEL[network.rules.network!].toLowerCase()}`, source: network.name });
  }

  const chargeTypes = decide('chargeTypes');
  if (chargeTypes) {
    const ok = chargeTypes.rules.chargeTypes!.includes(station.chargeType);
    checks.push({ id: 'charge-type', label: 'Tipo de carga', ok, detail: `${EV_CHARGE_TYPE_LABEL[station.chargeType]} ${ok ? 'permitida' : 'no permitida'}`, source: chargeTypes.name });
  }

  const power = tightest('maxPowerKw');
  if (power) {
    const limit = power.rules.maxPowerKw!;
    checks.push({ id: 'power', label: 'Potencia', ok: powerKw <= limit, detail: `${powerKw} kW de ${limit} kW máximos`, source: power.name });
  }

  const today = sessions.filter(
    (session) => session.vehicleId === vehicle.id && session.status !== 'denied' && sameDay(new Date(session.at), at) && new Date(session.at) < at,
  );

  const sessionLimit = tightest('maxSessionsDay');
  if (sessionLimit) {
    const limit = sessionLimit.rules.maxSessionsDay!;
    checks.push({ id: 'sessions', label: 'Recargas del día', ok: today.length + 1 <= limit, detail: `Sería la ${today.length + 1}ª de ${limit}`, source: sessionLimit.name });
  }

  const kwhLimit = tightest('maxKwhDay');
  if (kwhLimit) {
    const limit = kwhLimit.rules.maxKwhDay!;
    const used = today.reduce((sum, session) => sum + session.energyKwh, 0);
    checks.push({
      id: 'kwh',
      label: 'Energía del día',
      ok: used + energyKwh <= limit,
      detail: `${Math.round(used)} + ${Math.round(energyKwh)} kWh de ${limit} kWh`,
      source: kwhLimit.name,
    });
  }

  const amountLimit = tightest('maxAmountDay');
  if (amountLimit) {
    const limit = amountLimit.rules.maxAmountDay!;
    const used = today.reduce((sum, session) => sum + session.total, 0);
    checks.push({
      id: 'amount',
      label: 'Monto del día',
      ok: used + estimate <= limit,
      detail: `$${Math.round(used + estimate).toLocaleString('es-MX')} de $${limit.toLocaleString('es-MX')}`,
      source: amountLimit.name,
    });
  }

  checks.push({
    id: 'balance',
    label: 'Saldo disponible',
    ok: availableBalance >= estimate,
    detail: `Se comprometen $${estimate.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de la cuenta`,
  });

  const failed = checks.find((check) => !check.ok);
  return { allowed: !failed, checks, hold: estimate, powerKw, reason: failed ? `${failed.label}: ${failed.detail}` : undefined };
}

// ─── Demo history: 30 days of sessions, every one run through the PolicyEngine ───

/** Deterministic PRNG so the history is the same on every load. */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HISTORY_DAYS = 30;
const METRO_PUBLIC = ['st-reforma', 'st-santafe', 'st-polanco', 'st-interlomas'];
const ROAD_PUBLIC = ['st-angelopolis', 'st-gdl-centro', 'st-mty-sanpedro', 'st-qro-centro', 'st-leon', 'st-cuernavaca'];

export function buildEvSessions(now = businessNow(), policies = evPolicies, cards = evCards): EvSession[] {
  const random = mulberry32(20261016);
  const sessions: EvSession[] = [];
  const end = new Date(now);
  let sequence = 0;

  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset -= 1) {
    const day = new Date(end.getFullYear(), end.getMonth(), end.getDate() - offset);
    for (const vehicle of evVehicles) {
      if (vehicle.status === 'inactive') continue;
      const weekend = day.getDay() === 0 || day.getDay() === 6;
      const fleetUse = vehicle.groupId === 'evg-reparto' ? (weekend ? 0.06 : 0.55) : weekend ? 0.15 : 0.32;
      const chance = vehicle.status === 'maintenance' ? 0.08 : fleetUse;
      const roll = random();
      const hourRoll = random();
      const stationRoll = random();
      const fillRoll = random();
      const powerRoll = random();
      if (roll > chance) continue;

      const hour = hourRoll < 0.03 ? 23 : hourRoll < 0.05 ? 5 : 7 + Math.floor(hourRoll * 14);
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, Math.floor(fillRoll * 60));
      if (at.getTime() > now) continue;

      const prefersDepot = vehicle.costCenterId === 'cc-log' || vehicle.costCenterId === 'cc-srv';
      const stationId =
        stationRoll < (prefersDepot ? 0.55 : 0.2)
          ? stationRoll < 0.12 ? 'st-corporativo' : 'st-vallejo'
          : stationRoll < 0.9
            ? METRO_PUBLIC[Math.floor(stationRoll * 97) % METRO_PUBLIC.length]!
            : ROAD_PUBLIC[Math.floor(stationRoll * 131) % ROAD_PUBLIC.length]!;
      let station = stationById(stationId)!;
      if (!station.connectors.includes(vehicle.connector)) station = stationById('st-vallejo')!;

      const share = vehicle.type === 'hybrid' ? 0.6 + fillRoll * 0.35 : 0.3 + fillRoll * 0.45;
      const energyKwh = Math.round(vehicle.batteryKwh * share * 10) / 10;
      const auth = evAuthorize({ vehicle, station, at, energyKwh, policies, cards, sessions, availableBalance: Number.POSITIVE_INFINITY });
      const powerKw = Math.round(auth.powerKw * (0.55 + powerRoll * 0.35));
      const durationMin = Math.max(12, Math.round((energyKwh / powerKw) * 60));
      const price = evChargeCost(energyKwh, station);
      const running = now - at.getTime() < durationMin * 60_000;
      const status: EvSessionStatus = !auth.allowed ? 'denied' : running ? 'in-progress' : 'completed';

      sessions.push({
        id: `RC-${String(++sequence).padStart(5, '0')}`,
        at: at.toISOString(),
        vehicleId: vehicle.id,
        cardId: cards.find((card) => card.vehicleId === vehicle.id)?.id ?? '',
        stationId: station.id,
        energyKwh: status === 'denied' ? 0 : energyKwh,
        powerKw: status === 'denied' ? 0 : powerKw,
        durationMin: status === 'denied' ? 0 : durationMin,
        ...(status === 'denied' ? { cost: 0, tax: 0, commission: 0, total: 0 } : price),
        status,
        denyReason: auth.reason,
      });
    }
  }

  return sessions.sort((a, b) => b.at.localeCompare(a.at));
}

// ─── Account (RN-ACC-1…6) ───

const OPENING_BALANCE = 18_000;

export function buildEvFundings(now = businessNow()): EvFunding[] {
  const end = new Date(now);
  const at = (daysAgo: number, hour: number) => new Date(end.getFullYear(), end.getMonth(), end.getDate() - daysAgo, hour, 15).toISOString();
  return [
    { id: 'FND-0412', at: at(27, 9), method: 'stp', reference: '646180157000004121', quote: evFundingQuote('stp', 'net', 30_000), status: 'confirmed' },
    { id: 'FND-0418', at: at(20, 10), method: 'transfer', reference: 'EVM-4418-7731', quote: evFundingQuote('transfer', 'net', 25_000), status: 'confirmed' },
    { id: 'FND-0425', at: at(13, 9), method: 'stp', reference: '646180157000004255', quote: evFundingQuote('stp', 'net', 30_000), status: 'confirmed' },
    { id: 'FND-0431', at: at(6, 11), method: 'card', reference: 'Visa •••• 8820', quote: evFundingQuote('card', 'net', 15_000), status: 'confirmed' },
  ];
}

/** The book balance is the sum of the ledger (2.3 of the ER model); holds only reduce what is available. */
export function buildEvLedger(sessions: EvSession[], fundings: EvFunding[]): EvLedgerEntry[] {
  const entries: EvLedgerEntry[] = [];
  for (const funding of fundings) {
    if (funding.status !== 'confirmed') continue;
    entries.push({ id: `L-${funding.id}`, at: funding.at, type: 'funding', amount: funding.quote.credited, description: `${EV_FUNDING_METHOD_LABEL[funding.method]} · ${funding.id}` });
  }
  for (const session of sessions) {
    const vehicle = vehicleById(session.vehicleId);
    const station = stationById(session.stationId);
    if (session.status === 'completed') {
      entries.push({
        id: `L-${session.id}`,
        at: session.at,
        type: 'charge',
        amount: -session.total,
        description: `${vehicle?.alias} · ${station?.name} · ${session.energyKwh} kWh (energía + IVA + comisión)`,
      });
    } else if (session.status === 'in-progress') {
      entries.push({ id: `H-${session.id}`, at: session.at, type: 'hold', amount: -session.total, description: `${vehicle?.alias} · ${station?.name} · recarga en curso` });
    }
  }
  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

export function evAccountTotals(ledger: EvLedgerEntry[]) {
  const book = round2(OPENING_BALANCE + ledger.filter((entry) => entry.type !== 'hold').reduce((sum, entry) => sum + entry.amount, 0));
  const committed = round2(-ledger.filter((entry) => entry.type === 'hold').reduce((sum, entry) => sum + entry.amount, 0));
  return { book, committed, available: round2(book - committed) };
}

export function formatKwh(value: number): string {
  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: value < 100 ? 1 : 0 }).format(value)} kWh`;
}
