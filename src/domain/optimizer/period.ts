// US-111
/**
 * Periodo del optimizador = periodo global de US-010.
 * ═══════════════════════════════════════════════════
 * El optimizador no tiene periodo propio: lee el de los filtros globales
 * (`GlobalFilters.periodDays`, «N días cerrados» hasta ayer, con el reloj de
 * datos del dashboard) y lo cruza con su dataset, que es septiembre de 2026.
 * Como el control es el mismo (`filters/`), cambiar el periodo en el
 * optimizador cambia el del dashboard y al revés: una sola ventana, dos
 * lecturas.
 *
 * El cruce puede quedar vacío —«Día» un 15 de octubre mira el 14, y el
 * dataset acaba el 30 de septiembre—: entonces no hay recorte que pintar y
 * la vista lo dice («Sin datos del optimizador para este periodo») en vez de
 * enseñar KPIs a cero que parecerían un dato.
 */
import { DATASET_DAYS } from './dataset'

/** Primer día del dataset: 1 de septiembre de 2026, hora local. */
export const DATASET_YEAR = 2026
export const DATASET_MONTH = 8 // septiembre (0-based)

export type OptimizerWindow = {
  /** Primer día del dataset dentro de la ventana global (1–30). */
  fromDay: number
  /** Último día del dataset dentro de la ventana global (1–30). */
  toDay: number
}

/** Medianoche local de un día del dataset. */
export function datasetDayStart(day: number): number {
  return new Date(DATASET_YEAR, DATASET_MONTH, day).getTime()
}

function localMidnight(at: number): Date {
  const date = new Date(at)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Ventana global → días del dataset.
 *
 * La ventana global son los `periodDays` días CERRADOS antes del día de
 * `referenceAt` (el día en curso no entra), igual que en `fleet-activity`.
 * Devuelve `null` si no se solapa con septiembre de 2026.
 */
export function optimizerWindow(periodDays: number, referenceAt: number): OptimizerWindow | null {
  const today = localMidnight(referenceAt)
  const first = new Date(today.getFullYear(), today.getMonth(), today.getDate() - periodDays).getTime()
  const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).getTime()

  let fromDay: number | null = null
  let toDay: number | null = null
  for (let day = 1; day <= DATASET_DAYS; day++) {
    const start = datasetDayStart(day)
    if (start < first || start > last) continue
    if (fromDay === null) fromDay = day
    toDay = day
  }
  return fromDay === null || toDay === null ? null : { fromDay, toDay }
}

/**
 * Días cerrados que tiene que abarcar el periodo global para cubrir el
 * dataset entero desde `referenceAt` (del 1 de septiembre a ayer).
 * `null` si el reloj está antes del final del dataset y no hace falta.
 */
export function periodDaysToCoverDataset(referenceAt: number): number | null {
  const today = localMidnight(referenceAt).getTime()
  const firstDay = datasetDayStart(1)
  if (today <= datasetDayStart(DATASET_DAYS)) return null
  return Math.round((today - firstDay) / 86_400_000)
}
