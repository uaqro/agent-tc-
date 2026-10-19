// US-024
/**
 * EP-04 · US-024 — ¿Están todos los datos del periodo?
 * ═══════════════════════════════════════════════════
 * Un reporte que suma dos fuentes puede salir con una de ellas a medias sin
 * que nadie lo note: las cifras cuadran, solo que son menores. Aquí se mira,
 * en los propios datos, qué falta, y el reporte lo dice en pantalla, en la
 * portada del documento y en el PDF.
 *
 *   · FUERA DE COBERTURA — la parte del periodo pedido que cae antes o
 *     después de los datos disponibles.
 *   · HUECO DE UNA FUENTE — tres días seguidos o más sin un solo registro de
 *     una fuente que sí trae datos el resto del tiempo. Con flotas de decenas
 *     de unidades cargando a diario, un día suelto en blanco puede ser
 *     casualidad; tres no.
 *
 * Se mide sobre TODA la cuenta, no sobre el alcance: una unidad que solo
 * carga en estación propia no tiene «hueco» de TicketCar+.
 */
import { FUEL_PRODUCT_LABELS, type FuelProduct } from '../dashboard/types'
import type { Dispatch } from './normalize'
import { COVERAGE } from './sources'
import { stationNameOf } from '../stations/directory'

/** Días seguidos sin registros a partir de los cuales se avisa. */
export const MIN_GAP_DAYS = 3

export type CoverageWarning =
  | { kind: 'fuera_de_cobertura'; from: string; to: string; message: string }
  | {
      kind: 'hueco_de_fuente'
      source: FuelProduct
      /** Planta que no entregó; `null` si falta la fuente entera. */
      plant: string | null
      from: string
      to: string
      message: string
    }

const pad = (n: number) => String(n).padStart(2, '0')
export const isoOfTime = (time: number) => {
  const date = new Date(time)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const timeOfIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!).getTime()
}
const addDays = (iso: string, days: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  return isoOfTime(new Date(y!, m! - 1, d! + days).getTime())
}

const longDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

/** «del 1 al 28 de febrero de 2026», «del 20 de diciembre de 2025 al 3 de enero de 2026». */
export function rangeText(from: string, to: string): string {
  if (from === to) return `el ${longDate.format(timeOfIso(from))}`
  const [fy, fm] = from.split('-')
  const [ty, tm] = to.split('-')
  const toText = longDate.format(timeOfIso(to))
  if (fy === ty && fm === tm) return `del ${Number(from.split('-')[2])} al ${toText}`
  const fromText = longDate.format(timeOfIso(from))
  return `del ${fy === ty ? fromText.replace(/ de \d{4}$/, '') : fromText} al ${toText}`
}

/**
 * Avisos de cobertura de un periodo `[from, to]` (ISO, ambos incluidos) para
 * los despachos de TODA la cuenta.
 */
export function coverageWarnings(accountDispatches: readonly Dispatch[], from: string, to: string): CoverageWarning[] {
  const warnings: CoverageWarning[] = []

  if (from < COVERAGE.from) {
    const end = to < COVERAGE.from ? to : addDays(COVERAGE.from, -1)
    warnings.push({
      kind: 'fuera_de_cobertura',
      from,
      to: end,
      message: `No hay datos ${rangeText(from, end)}: las fuentes empiezan el ${longDate.format(timeOfIso(COVERAGE.from))}.`,
    })
  }
  if (to > COVERAGE.to) {
    const start = from > COVERAGE.to ? from : addDays(COVERAGE.to, 1)
    warnings.push({
      kind: 'fuera_de_cobertura',
      from: start,
      to,
      message: `No hay datos ${rangeText(start, to)}: las fuentes llegan hasta el ${longDate.format(timeOfIso(COVERAGE.to))}.`,
    })
  }

  const start = from > COVERAGE.from ? from : COVERAGE.from
  const end = to < COVERAGE.to ? to : COVERAGE.to
  if (start > end) return warnings

  // Días con datos de cada fuente y de cada planta. Una planta es una entrega más:
  // si falta, faltan sus cargas aunque la fuente siga llegando de las demás.
  const daysBy = new Map<string, { source: FuelProduct; plant: string | null; days: Set<string> }>()
  const mark = (source: FuelProduct, plant: string | null, day: string) => {
    const key = `${source}|${plant ?? ''}`
    const entry = daysBy.get(key) ?? { source, plant, days: new Set<string>() }
    entry.days.add(day)
    daysBy.set(key, entry)
  }
  for (const d of accountDispatches) {
    const day = isoOfTime(d.at)
    mark(d.source, null, day)
    if (d.plant !== null) mark(d.source, d.plant, day)
  }

  const sources = Object.keys(FUEL_PRODUCT_LABELS) as FuelProduct[]
  const feeds = [...daysBy.values()].sort(
    (a, b) => sources.indexOf(a.source) - sources.indexOf(b.source) || (a.plant ?? '').localeCompare(b.plant ?? ''),
  )
  for (const { source, plant, days } of feeds) {
    // Una fuente que la cuenta no usa no tiene huecos: no tiene datos.
    if (days.size === 0) continue
    const what = plant === null ? '' : ` de la ${plantLabel(plant)}`

    let runStart: string | null = null
    let runLength = 0
    const close = (last: string) => {
      if (runStart !== null && runLength >= MIN_GAP_DAYS) {
        warnings.push({
          kind: 'hueco_de_fuente',
          source,
          plant,
          from: runStart,
          to: last,
          message: `${FUEL_PRODUCT_LABELS[source]} no entregó datos${what} ${rangeText(runStart, last)}: esas cargas no están en el reporte.`,
        })
      }
      runStart = null
      runLength = 0
    }
    for (let day = start; day <= end; day = addDays(day, 1)) {
      if (days.has(day)) {
        close(addDays(day, -1))
      } else {
        runStart ??= day
        runLength += 1
      }
    }
    close(end)
  }

  return warnings
}

/** «AUTO-HMO» → «planta de Hermosillo». */
function plantLabel(plant: string): string {
  const name = stationNameOf(plant)
  const place = name.includes('Planta ') ? name.slice(name.indexOf('Planta ') + 'Planta '.length) : plant
  return `planta de ${place}`

}
