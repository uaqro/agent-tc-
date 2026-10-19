// US-024
/**
 * EP-04 · US-024 — Un solo formato a partir de dos.
 * ════════════════════════════════════════════════
 * Aquí, y solo aquí, se resuelven las diferencias entre Autoconsumo y
 * TicketCar+: fecha, decimales, unidades de volumen e importe, código de
 * combustible y código de centro de costo. La pantalla y el documento ya no
 * saben de dónde vino cada despacho más que por la columna `source`.
 */
import type { FuelProduct, FuelType } from '../dashboard/types'
import type { AutoconsumoRow, TicketCarTxn } from './sources'

export type Dispatch = {
  source: FuelProduct
  id: string
  /** Marca temporal local. */
  at: number
  plate: string
  driverId: string | null
  fuel: FuelType
  liters: number
  amountMxn: number
  costCenter: string
  /** Planta de Autoconsumo del despacho; `null` en TicketCar+ o si la fuente no la trae. */
  plant: string | null
}

const FROM_PRODUCT: Record<AutoconsumoRow['producto'], FuelType> = { DIESEL: 'diesel', MAGNA: 'magna', PREMIUM: 'premium' }
const FROM_CODE: Record<TicketCarTxn['fuelCode'], FuelType> = { D: 'diesel', M: 'magna', P: 'premium' }

/** «1234,50» → 1234.5. Acepta también punto, por si el ERP cambia de configuración. */
export function parseCommaDecimal(text: string): number {
  const clean = text.trim()
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean
  const value = Number(normalized)
  return Number.isFinite(value) ? value : 0
}

/** «CC-01» → «CC-01 · Reparto urbano», buscando en el catálogo de la cuenta. */
export function expandCostCenter(code: string, catalog: readonly string[]): string {
  return catalog.find((full) => full === code || full.startsWith(`${code} `)) ?? code
}

export function fromAutoconsumo(row: AutoconsumoRow, costCenters: readonly string[]): Dispatch {
  const [day, month, year] = row.fecha.split('/').map(Number)
  const [hour, minute] = row.hora.split(':').map(Number)
  return {
    source: 'autoconsumo',
    id: row.folio,
    at: new Date(year!, month! - 1, day!, hour!, minute!).getTime(),
    plate: row.economico,
    driverId: row.numEmpleado === '' ? null : row.numEmpleado,
    fuel: FROM_PRODUCT[row.producto],
    liters: parseCommaDecimal(row.litros),
    amountMxn: parseCommaDecimal(row.importe),
    costCenter: expandCostCenter(row.centroCosto, costCenters),
    plant: row.planta === '' || row.planta === undefined ? null : row.planta,
  }
}

export function fromTicketCar(txn: TicketCarTxn): Dispatch {
  // La hora se toma como hora LOCAL de la estación: los dos orígenes tienen
  // que caer en el mismo día del calendario del cliente.
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(txn.timestamp)
  const at = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5])).getTime()
    : Date.parse(txn.timestamp)
  return {
    source: 'ticketcar_plus',
    id: txn.txnId,
    at,
    plate: txn.vehicle.plate,
    driverId: txn.driverId,
    fuel: FROM_CODE[txn.fuelCode],
    liters: txn.volumeMl / 1000,
    amountMxn: txn.amountCents / 100,
    costCenter: txn.costCenter,
    plant: null,
  }
}

export function normalizeSources(
  sources: { autoconsumo: AutoconsumoRow[]; ticketcar: TicketCarTxn[] },
  costCenters: readonly string[],
): Dispatch[] {
  return [
    ...sources.autoconsumo.map((row) => fromAutoconsumo(row, costCenters)),
    ...sources.ticketcar.map(fromTicketCar),
  ].sort((a, b) => a.at - b.at)
}
