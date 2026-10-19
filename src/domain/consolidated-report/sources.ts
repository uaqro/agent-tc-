// US-024
/**
 * EP-04 · US-024 — Las dos fuentes, cada una con SU formato (datos mock).
 * ═════════════════════════════════════════════════════════════════════
 * El reporte consolidado junta Autoconsumo y TicketCar+, y en la vida real no
 * llegan igual. Aquí tampoco, a propósito: la diferencia de formato se resuelve
 * en la capa de datos (`normalize.ts`), no en la pantalla.
 *
 *   · AUTOCONSUMO — lote del ERP del cliente, una fila de texto por despacho
 *     en estación propia: fecha `DD/MM/AAAA`, decimales con COMA, centro de
 *     costo como código corto (`CC-01`) y producto en mayúsculas.
 *   · TICKETCAR+ — flujo JSON de la red externa: marca ISO con zona horaria,
 *     volumen en MILILITROS, importe en CENTAVOS y combustible como código de
 *     una letra.
 *
 * ── Unificación de datos (Ticket Car+) ────────────────────────────────────
 * En eOne las dos fuentes sorteaban sus propios despachos con otra semilla y
 * otros precios, así que el reporte no cuadraba con el dashboard. Aquí son los
 * despachos del padrón (`fleet-activity.eventsBetween`), los mismos que suman
 * el Resumen y el optimizador, escritos en el formato de cada fuente. Los
 * abonos van como líneas negativas, igual que en el Resumen.
 *
 * El hueco de febrero de 2026 vuelve, pero ya no lo pone el reporte: lo trae el
 * generador (`FEED_GAPS`), así que el Resumen ve el mismo hueco. Es de la fuente
 * externa, Autoconsumo, y solo de dos plantas: el lote del ERP lleva la planta de
 * cada despacho y el reporte detecta el hueco planta a planta, sin leer la constante.
 */
import { eventsBetween } from '../datasource/active'
import { FEED_GAPS } from '../data/fleet-activity'
import type { Account } from '../data/accounts'
import type { FuelProduct, FuelType } from '../dashboard/types'
import { DEFAULT_DEMO_DATE } from '../demo/clock'

export type AutoconsumoRow = {
  folio: string
  /** `DD/MM/AAAA`. */
  fecha: string
  /** `HH:MM`. */
  hora: string
  economico: string
  /** Vacío si el despacho no trae operador. */
  numEmpleado: string
  producto: 'DIESEL' | 'MAGNA' | 'PREMIUM'
  /** Decimales con coma: «123,40». */
  litros: string
  /** Decimales con coma: «3120,50». */
  importe: string
  /** Código corto: «CC-01». */
  centroCosto: string
  /** Planta (tanque) del despacho: «AUTO-MTY». Vacía si el ERP no la trae. */
  planta: string
}

export type TicketCarTxn = {
  txnId: string
  /** ISO 8601 con zona: «2026-09-15T07:42:00-06:00». */
  timestamp: string
  vehicle: { plate: string }
  driverId: string | null
  fuelCode: 'D' | 'M' | 'P'
  volumeMl: number
  amountCents: number
  costCenter: string
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0')
const isoOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/**
 * Doce meses y medio de datos: del 1 de octubre de 2025 a la víspera de la
 * fecha de demo. Son días CERRADOS, los mismos que el Resumen puede pedir.
 */
export const COVERAGE = (() => {
  const [y, m, d] = DEFAULT_DEMO_DATE.split('-').map(Number)
  return { from: '2025-10-01', to: isoOf(new Date(y!, m! - 1, d! - 1)) }
})()

/** Entregas que faltan, para la documentación y las pruebas: las del generador. El reporte NO lee esto. */
export const SOURCE_GAPS: { source: FuelProduct; from: string; to: string; plants: readonly string[] | null }[] = FEED_GAPS.map(
  (gap) => ({ source: gap.product, from: gap.from, to: gap.to, plants: gap.stations }),
)

const PRODUCT_CODE: Record<FuelType, AutoconsumoRow['producto']> = { diesel: 'DIESEL', magna: 'MAGNA', premium: 'PREMIUM' }
const FUEL_CODE: Record<FuelType, TicketCarTxn['fuelCode']> = { diesel: 'D', magna: 'M', premium: 'P' }
const commaDecimal = (value: number) => value.toFixed(2).replace('.', ',')

export type AccountSources = {
  autoconsumo: AutoconsumoRow[]
  ticketcar: TicketCarTxn[]
}

const timeOfIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!).getTime()
}

const cache = new Map<string, AccountSources>()

/** Las dos fuentes de la cuenta en toda la cobertura, a partir de los despachos del padrón. */
export function sourcesOf(account: Account): AccountSources {
  const hit = cache.get(account.id)
  if (hit) return hit

  const sources: AccountSources = { autoconsumo: [], ticketcar: [] }
  // «Hoy» es el día siguiente al último de la cobertura: todos sus días quedan cerrados.
  const now = timeOfIso(COVERAGE.to) + 36 * 3_600_000
  const events = eventsBetween(account, timeOfIso(COVERAGE.from), timeOfIso(COVERAGE.to), now).sort((a, b) => a.at - b.at)

  for (const [index, event] of events.entries()) {
    const date = new Date(event.at)
    if (event.product === 'autoconsumo') {
      sources.autoconsumo.push({
        folio: `AC-${pad(index + 1, 7)}`,
        fecha: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
        hora: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
        economico: event.plate,
        numEmpleado: event.driverId ?? '',
        producto: PRODUCT_CODE[event.fuel],
        litros: commaDecimal(event.liters),
        importe: commaDecimal(event.amountMxn),
        centroCosto: event.costCenter.split(' ')[0]!,
        planta: event.stationId ?? '',
      })
    } else {
      sources.ticketcar.push({
        txnId: `TCP-${pad(index + 1, 8)}`,
        timestamp: `${isoOf(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:00-06:00`,
        vehicle: { plate: event.plate },
        driverId: event.driverId,
        fuelCode: FUEL_CODE[event.fuel],
        volumeMl: Math.round(event.liters * 1000),
        amountCents: Math.round(event.amountMxn * 100),
        costCenter: event.costCenter,
      })
    }
  }

  cache.set(account.id, sources)
  return sources
}
