import { ADVANCED_FILTER_FIELDS } from '../../data/reports';
import { today } from '../demo/clock';
import type { ReportPeriod } from './periods';

export type TransactionStatus = 'Conciliada' | 'En tránsito' | 'Rechazada';
export type TransactionFilterField = (typeof ADVANCED_FILTER_FIELDS)[number];
export type FilterOperator = 'Igual a' | 'Contiene';

export interface AdvancedTransactionFilter {
  id: number;
  field: TransactionFilterField;
  operator: FilterOperator;
  value: string;
}

export interface FuelTransaction extends Record<string, string | number> {
  id: string;
  status: TransactionStatus;
}

export interface TransactionQuery extends ReportPeriod {
  statuses: TransactionStatus[];
  filters: AdvancedTransactionFilter[];
}

const UNITS = [
  { unit: 'Unidad 04', plate: 'ABC-123-D', brand: 'Nissan', model: 'NP300', driver: 'Mariana López', device: 'TC+ 000104', medium: 'Tarjeta 000104', costCenter: 'Operaciones' },
  { unit: 'Unidad 12', plate: 'DEF-456-E', brand: 'Volkswagen', model: 'Saveiro', driver: 'Carlos Ramírez', device: 'TC+ 000212', medium: 'Tarjeta 000212', costCenter: 'Ventas' },
  { unit: 'Unidad 18', plate: 'GHI-789-F', brand: 'Ford', model: 'Ranger', driver: 'Sofía Hernández', device: 'TC+ 000318', medium: 'Tag 000318', costCenter: 'Logística' },
  { unit: 'Unidad 23', plate: 'JKL-012-G', brand: 'Toyota', model: 'Hilux', driver: 'Diego Torres', device: 'TC+ 000423', medium: 'Tarjeta 000423', costCenter: 'Operaciones' },
];

const STATIONS = [
  { name: 'Servicio Reforma', code: 'EST-014', city: 'Ciudad de México', flag: 'Red Nacional' },
  { name: 'Estación del Valle', code: 'EST-027', city: 'Monterrey', flag: 'Red Nacional' },
  { name: 'Gasolinera Central', code: 'EST-039', city: 'Guadalajara', flag: 'Red Afiliada' },
  { name: 'Servicio Aeropuerto', code: 'EST-052', city: 'Querétaro', flag: 'Red Afiliada' },
];

const REJECTION_REASONS = ['Saldo insuficiente', 'Transacción fuera de política', 'Medio de pago bloqueado'];

function monthLabel(date: Date): string {
  return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function createDemoFuelTransactions(referenceDate = today()): FuelTransaction[] {
  const transactions = Array.from({ length: 45 }, (_, index) => {
    const unit = UNITS[index % UNITS.length]!;
    const station = STATIONS[Math.floor(index / 2) % STATIONS.length]!;
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    date.setDate(date.getDate() - ((index * 2) % 90));
    const liters = 24 + ((index * 13) % 36);
    const unitPrice = index % 3 === 0 ? 25.15 : 23.89;
    const total = Math.round(liters * unitPrice * 100) / 100;
    const status: TransactionStatus = index % 9 === 0 ? 'Rechazada' : index % 4 === 0 ? 'En tránsito' : 'Conciliada';
    const reason = status === 'Rechazada' ? REJECTION_REASONS[Math.floor(index / 9) % REJECTION_REASONS.length]! : '';
    const row = Object.fromEntries(ADVANCED_FILTER_FIELDS.map((field) => [field, ''])) as Record<string, string | number>;
    const fields: Record<string, string | number> = {
      FECHA: isoDay(date),
      HORA: `${String(7 + (index % 12)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}:00`,
      MES: monthLabel(date),
      GLOBAL: 'CLIENTE DEMO',
      CÓDIGO: 'CTA-10428',
      GRUPO: 'Flota operativa',
      EMPRESA: 'Cliente Demo, S.A. de C.V.',
      ÁREA: 'Norte',
      UNIDAD: unit.unit,
      'PLACA / IDENTIFICACIÓN': unit.plate,
      MARCA: unit.brand,
      MODELO: unit.model,
      DISPOSITIVO: unit.device,
      FUENTE: 'Ticket Car+',
      MONEDERO: 'Combustible',
      'PRODUCTO/SERVICIO': index % 3 === 0 ? 'Diésel' : 'Gasolina regular',
      'ID POS': `POS-${String(4000 + index)}`,
      VIN: `DEMO${String(index).padStart(14, '0')}`,
      'CAPACIDAD DE TANQUE': 80,
      'CÓDIGO DE PRODUCTO': index % 3 === 0 ? 'DIE-01' : 'GAS-87',
      TRANSACCIÓN: `TRX-26-${String(10001 + index)}`,
      'MEDIO DE PAGO': unit.medium,
      'EN LÍNEA': index % 5 === 0 ? 'No' : 'Sí',
      'NÚMERO DE CONDUCTOR': `CON-${String(index % UNITS.length + 1).padStart(3, '0')}`,
      CONDUCTOR: unit.driver,
      'CENTRO DE COSTOS': unit.costCenter,
      'COD. ESTACIÓN': station.code,
      'ESTACIÓN DE SERVICIO': station.name,
      BANDERA: station.flag,
      'DIRECCIÓN ESTACIÓN': `Av. Principal ${100 + index}, ${station.city}`,
      MUNICIPIO: station.city,
      CIUDAD: station.city,
      TALONARIO: `TAL-${String(70 + index)}`,
      CUPÓN: `CUP-${String(900 + index)}`,
      'FOLIO DE CARGA': `FC-${String(60001 + index)}`,
      'ODÓMETRO ANTERIOR': 22400 + index * 182,
      'ÚLTIMO ODÓMETRO': 22400 + index * 182 + 420,
      'KM RECORRIDO': 420,
      'RENDIMIENTO KM/LTS': Math.round((420 / liters) * 100) / 100,
      'RENDIMIENTO TEÓRICO KM/LTS': 10.5,
      CERTIFICACIÓN: 'Validada',
      DISPONIBLE: status === 'Rechazada' ? 'No' : 'Sí',
      'NÚMERO DE FACTURA': `FAC-${String(70001 + index)}`,
      'FECHA DE FACTURA': isoDay(date),
      'FECHA DE LIQUIDACIÓN': status === 'En tránsito' ? '' : isoDay(date),
      'FECHA DE PROCESO': isoDay(date),
      'FECHA DE LIQUIDACIÓN DE BANCO': status === 'Conciliada' ? isoDay(date) : '',
      'AUTORIZADO DE BANCO': status === 'Conciliada' ? 'Sí' : 'Pendiente',
      'REFERENCIA DE BANCO': status === 'Conciliada' ? `REF-${String(80001 + index)}` : '',
      LITROS: liters,
      GALONES: Math.round((liters / 3.78541) * 100) / 100,
      'PRECIO LTS CON DESCUENTO': unitPrice,
      'PRECIO NETO': unitPrice,
      'PRECIO DE DESCUENTO': 0.4,
      'PRECIO LTS SIN DESCUENTO': unitPrice + 0.4,
      'M.N.': total,
      'M.E.': Math.round((total / 18.2) * 100) / 100,
      NETO: Math.round((total / 1.16) * 100) / 100,
      'NETO SIN DESCUENTO': Math.round((liters * (unitPrice + 0.4) / 1.16) * 100) / 100,
      IMPUESTOS: Math.round((total * 0.16) * 100) / 100,
      IVA: Math.round((total * 0.16) * 100) / 100,
      IEPS: Math.round((liters * 0.55) * 100) / 100,
      'ESTATUS DE CONCILIACIÓN': status,
      'MOTIVO DE RECHAZO': reason,
    };
    Object.assign(row, fields);
    return { ...row, id: `fuel-${index + 1}`, status } as FuelTransaction;
  });

  return transactions.sort((left, right) => `${right.FECHA} ${right.HORA}`.localeCompare(`${left.FECHA} ${left.HORA}`));
}

export function filterFuelTransactions(records: FuelTransaction[], query: TransactionQuery): FuelTransaction[] {
  return records.filter((record) => {
    const date = String(record.FECHA);
    if (date < query.from || date > query.to || !query.statuses.includes(record.status)) return false;

    return query.filters.every((filter) => {
      if (!filter.value.trim()) return true;
      const actual = String(record[filter.field] ?? '').toLocaleLowerCase('es-MX');
      const expected = filter.value.trim().toLocaleLowerCase('es-MX');
      return filter.operator === 'Contiene' ? actual.includes(expected) : actual === expected;
    });
  });
}

export function valuesForFilter(records: FuelTransaction[], field: TransactionFilterField): string[] {
  return [...new Set(records.map((record) => String(record[field] ?? '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es-MX'));
}

export function reorderColumns(columns: string[], dragged: string, target: string): string[] {
  const from = columns.indexOf(dragged);
  const to = columns.indexOf(target);
  if (from < 0 || to < 0 || from === to) return columns;
  const reordered = [...columns];
  reordered.splice(to, 0, ...reordered.splice(from, 1));
  return reordered;
}

export type AccountMovementType = 'Dispersión' | 'Abono del cliente' | 'Comisión' | 'Servicio' | 'Ajuste' | 'Reverso';

export interface AccountMovement {
  id: string;
  date: string;
  type: AccountMovementType;
  reference: string;
  description: string;
  amount: number;
  balanceAfter: number;
}

const ACCOUNT_OPENING_BALANCE = 185000;
const ACCOUNT_MOVEMENT_TYPES: AccountMovementType[] = ['Dispersión', 'Abono del cliente', 'Comisión', 'Servicio', 'Ajuste', 'Reverso'];

export function createDemoAccountMovements(referenceDate = today()): AccountMovement[] {
  let balance = ACCOUNT_OPENING_BALANCE;
  const movements = Array.from({ length: 19 }, (_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    date.setDate(date.getDate() - (90 - index * 5));
    const type = ACCOUNT_MOVEMENT_TYPES[index % ACCOUNT_MOVEMENT_TYPES.length]!;
    const amount = type === 'Abono del cliente' ? 28000 + (index % 3) * 5000
      : type === 'Dispersión' ? -(9500 + (index % 4) * 1250)
        : type === 'Reverso' ? 450
          : type === 'Ajuste' ? (index % 2 ? -350 : 250)
            : -(type === 'Comisión' ? 180 : 650);
    balance = Math.round((balance + amount) * 100) / 100;
    return {
      id: `account-${index + 1}`,
      date: isoDay(date),
      type,
      reference: `CTA-${String(26001 + index)}`,
      description: type === 'Dispersión' ? 'Fondos enviados a medios de pago'
        : type === 'Abono del cliente' ? 'Pago recibido del cliente'
          : type === 'Comisión' ? 'Comisión por servicio'
            : type === 'Servicio' ? 'Cargo por servicio contratado'
              : type === 'Reverso' ? 'Reverso de cargo anterior'
                : 'Ajuste de cuenta corriente',
      amount,
      balanceAfter: balance,
    };
  });

  return movements;
}

export function accountPeriodBalances(movements: AccountMovement[], period: ReportPeriod): { opening: number; closing: number } {
  const opening = [...movements].reverse().find((movement) => movement.date < period.from)?.balanceAfter ?? ACCOUNT_OPENING_BALANCE;
  const closing = [...movements].reverse().find((movement) => movement.date <= period.to)?.balanceAfter ?? opening;
  return { opening, closing };
}

export function filterAccountMovements(movements: AccountMovement[], period: ReportPeriod, type: AccountMovementType | 'Todos'): AccountMovement[] {
  return movements.filter((movement) => movement.date >= period.from && movement.date <= period.to && (type === 'Todos' || movement.type === type));
}

export type BalanceMovementType = 'Asignación' | 'Recorte' | 'Consumo' | 'Devolución';

export interface PaymentBalanceMovement {
  id: string;
  date: string;
  medium: string;
  device: string;
  unit: string;
  type: BalanceMovementType;
  reference: string;
  amount: number;
  balanceAfter: number;
  startingBalance: number;
}

const PAYMENT_MEDIA = [
  { medium: 'Tarjeta 000104', device: 'TC+ 000104', unit: 'Unidad 04', startingBalance: 1800 },
  { medium: 'Tarjeta 000212', device: 'TC+ 000212', unit: 'Unidad 12', startingBalance: 2050 },
  { medium: 'Tag 000318', device: 'TC+ 000318', unit: 'Unidad 18', startingBalance: 2300 },
];

export function createDemoBalanceMovements(referenceDate = today()): PaymentBalanceMovement[] {
  const offsets = [78, 54, 32, 15, 4];
  const types: BalanceMovementType[] = ['Asignación', 'Consumo', 'Recorte', 'Consumo', 'Devolución'];
  const amounts = [2500, -480, -200, -620, 90];
  return PAYMENT_MEDIA.flatMap((medium, mediumIndex) => {
    let balance = medium.startingBalance;
    return offsets.map((offset, index) => {
      const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
      date.setDate(date.getDate() - offset);
      balance = Math.round((balance + amounts[index]!) * 100) / 100;
      return {
        id: `balance-${mediumIndex}-${index}`,
        date: isoDay(date),
        ...medium,
        type: types[index]!,
        reference: `MOV-${String(31001 + mediumIndex * 10 + index)}`,
        amount: amounts[index]!,
        balanceAfter: balance,
      };
    });
  }).sort((left, right) => right.date.localeCompare(left.date));
}

export function filterBalanceMovements(movements: PaymentBalanceMovement[], period: ReportPeriod, medium: string | 'Todos'): PaymentBalanceMovement[] {
  return movements.filter((movement) => movement.date >= period.from && movement.date <= period.to && (medium === 'Todos' || movement.medium === medium));
}

export interface PaymentBalanceSummary {
  opening: number;
  closing: number;
}

export function balancePeriodByMedium(movements: PaymentBalanceMovement[], period: ReportPeriod): Map<string, PaymentBalanceSummary> {
  const byMedium = new Map<string, PaymentBalanceMovement[]>();
  for (const movement of movements) {
    const entries = byMedium.get(movement.medium) ?? [];
    entries.push(movement);
    byMedium.set(movement.medium, entries);
  }

  const summaries = new Map<string, PaymentBalanceSummary>();
  for (const [medium, entries] of byMedium) {
    const chronological = entries.sort((left, right) => left.date.localeCompare(right.date));
    const beforePeriod = chronological.filter((movement) => movement.date < period.from);
    const throughPeriod = chronological.filter((movement) => movement.date <= period.to);
    const opening = beforePeriod.length > 0
      ? beforePeriod[beforePeriod.length - 1]!.balanceAfter
      : chronological[0]!.startingBalance;
    const closing = throughPeriod.length > 0
      ? throughPeriod[throughPeriod.length - 1]!.balanceAfter
      : opening;
    summaries.set(medium, { opening, closing });
  }
  return summaries;
}