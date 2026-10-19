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
 * Los registros salen del padrón de flota de la cuenta (mismas placas, mismos
 * conductores) con un PRNG de semilla fija.
 *
 * ── Doce meses: octubre de 2025 a septiembre de 2026 ─────────────────────
 * Julio–septiembre de 2026 es el tramo original y se genera EXACTAMENTE igual
 * que antes (misma semilla, mismo orden de sorteos, mismos folios): ninguna
 * cifra ya revisada cambia. Octubre de 2025–junio de 2026 es histórico nuevo,
 * con su propia semilla y su propia serie de folios, y dos rasgos de flota
 * real:
 *   · ESTACIONALIDAD — más cargas en noviembre–diciembre (cierre de año y
 *     reparto navideño), menos en enero–febrero y en Semana Santa (abril).
 *   · PRECIO — el litro sube poco a poco a lo largo del año.
 *
 * ── Un hueco a propósito ─────────────────────────────────────────────────
 * TicketCar+ NO entregó el flujo de febrero de 2026 (`SOURCE_GAPS`): las
 * cargas existieron, pero no llegaron. El reporte no lo sabe por esta
 * constante —lo detecta en los datos (`coverage.ts`)— y lo avisa.
 */
import { createRandom, randomInt } from '../engine/prng'
import { fleetDriversOf, fleetUnitsOf } from '../datasource/active'
import type { Account } from '../data/accounts'
import type { FuelProduct, FuelType } from '../dashboard/types'

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

/** Tramo original: julio–septiembre de 2026. */
export const SOURCE_FROM = { year: 2026, month: 7, day: 1 }
export const SOURCE_DAYS = 92

/** Histórico añadido: octubre de 2025–junio de 2026. */
export const HISTORY_FROM = { year: 2025, month: 10, day: 1 }
export const HISTORY_DAYS = 273

/** Cobertura total de las fuentes, en ISO. */
export const COVERAGE = { from: '2025-10-01', to: '2026-09-30' }

/**
 * Entregas que faltan, para la documentación y las pruebas. El reporte NO lee
 * esto: detecta el hueco en los datos.
 */
export const SOURCE_GAPS: { source: FuelProduct; from: string; to: string }[] = [
  { source: 'ticketcar_plus', from: '2026-02-01', to: '2026-02-28' },
]

/**
 * Probabilidad de carga por unidad y día en cada mes del histórico, relativa
 * a la del tramo original (0,33). Clave = `Date#getMonth()`.
 */
const SEASONALITY: Record<number, number> = {
  9: 1.0, // octubre
  10: 1.05, // noviembre
  11: 1.12, // diciembre
  0: 0.84, // enero
  1: 0.9, // febrero
  2: 0.98, // marzo
  3: 0.92, // abril, Semana Santa
  4: 1.02, // mayo
  5: 1.0, // junio
}

const PRICE: Record<FuelType, number> = { magna: 23.9, premium: 25.95, diesel: 25.4 }
const PRODUCT_CODE: Record<FuelType, AutoconsumoRow['producto']> = { diesel: 'DIESEL', magna: 'MAGNA', premium: 'PREMIUM' }
const FUEL_CODE: Record<FuelType, TicketCarTxn['fuelCode']> = { diesel: 'D', magna: 'M', premium: 'P' }

const pad = (n: number, width = 2) => String(n).padStart(width, '0')
const commaDecimal = (value: number) => value.toFixed(2).replace('.', ',')
const isoOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

function seedOf(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

export type AccountSources = {
  autoconsumo: AutoconsumoRow[]
  ticketcar: TicketCarTxn[]
}

type GenerationPlan = {
  from: { year: number; month: number; day: number }
  days: number
  /** Primer folio menos uno. */
  folioBase: number
  /** Probabilidad de carga de cada unidad ese día. */
  probability: (date: Date) => number
  /** Ajuste del precio por litro ese día. */
  priceShift: (date: Date) => number
  /** `true` si la fuente no entregó ese día. La carga se sortea igual: existió. */
  missing: (source: FuelProduct, date: Date) => boolean
}

function generate(account: Account, seed: string, plan: GenerationPlan, into: AccountSources): void {
  const rnd = createRandom(seedOf(seed))
  const units = fleetUnitsOf(account)
  const drivers = new Set(fleetDriversOf(account).map((d) => d.id))
  let folio = plan.folioBase

  for (let d = 0; d < plan.days; d++) {
    const date = new Date(plan.from.year, plan.from.month - 1, plan.from.day + d)
    const probability = plan.probability(date)
    const shift = plan.priceShift(date)
    for (const unit of units) {
      if (rnd() > probability) continue
      const liters = Math.round(randomInt(rnd, 25, unit.tankLiters > 0 ? Math.max(40, Math.round(unit.tankLiters * 0.8)) : 120) * 10 + rnd() * 10) / 10
      const price = PRICE[unit.fuel] + shift + (rnd() - 0.5) * 0.6
      const amount = Math.round(liters * price * 100) / 100
      const hour = randomInt(rnd, 5, 21)
      const minute = randomInt(rnd, 0, 59)
      const driver = drivers.has(unit.assignedDriverId) && rnd() > 0.06 ? unit.assignedDriverId : null
      folio += 1
      if (unit.product === 'autoconsumo') {
        if (plan.missing('autoconsumo', date)) continue
        into.autoconsumo.push({
          folio: `AC-${pad(folio, 7)}`,
          fecha: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
          hora: `${pad(hour)}:${pad(minute)}`,
          economico: unit.plate,
          numEmpleado: driver ?? '',
          producto: PRODUCT_CODE[unit.fuel],
          litros: commaDecimal(liters),
          importe: commaDecimal(amount),
          centroCosto: unit.costCenter.split(' ')[0]!,
        })
      } else {
        if (plan.missing('ticketcar_plus', date)) continue
        into.ticketcar.push({
          txnId: `TCP-${pad(folio, 8)}`,
          timestamp: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:${pad(minute)}:00-06:00`,
          vehicle: { plate: unit.plate },
          driverId: driver,
          fuelCode: FUEL_CODE[unit.fuel],
          volumeMl: Math.round(liters * 1000),
          amountCents: Math.round(amount * 100),
          costCenter: unit.costCenter,
        })
      }
    }
  }
}

/** El litro de octubre de 2025 sale unos 0,45 $ más barato que el de julio de 2026. */
function historyPriceShift(date: Date): number {
  const monthsBeforeJuly = (2026 - date.getFullYear()) * 12 + (6 - date.getMonth())
  return -0.05 * monthsBeforeJuly
}

const cache = new Map<string, AccountSources>()

export function sourcesOf(account: Account): AccountSources {
  const hit = cache.get(account.id)
  if (hit) return hit

  const sources: AccountSources = { autoconsumo: [], ticketcar: [] }

  if (account.active) {
    // Histórico: semilla y folios propios, para no mover el tramo original.
    generate(
      account,
      `consolidado-historico:${account.id}`,
      {
        from: HISTORY_FROM,
        days: HISTORY_DAYS,
        folioBase: 5_000_000,
        probability: (date) => 0.33 * (SEASONALITY[date.getMonth()] ?? 1),
        priceShift: historyPriceShift,
        missing: (source, date) => {
          const iso = isoOf(date)
          return SOURCE_GAPS.some((gap) => gap.source === source && iso >= gap.from && iso <= gap.to)
        },
      },
      sources,
    )

    // Tramo original: el mismo de siempre, sorteo a sorteo.
    generate(
      account,
      `consolidado:${account.id}`,
      { from: SOURCE_FROM, days: SOURCE_DAYS, folioBase: 0, probability: () => 0.33, priceShift: () => 0, missing: () => false },
      sources,
    )
  }

  cache.set(account.id, sources)
  return sources
}
