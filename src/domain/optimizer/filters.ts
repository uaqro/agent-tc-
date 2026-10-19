// US-111
/**
 * EP-03 · US-111 — Filtros del optimizador de cargas.
 * ══════════════════════════════════════════════════
 * Mismo comportamiento que el contexto global de US-010 —chips de lo activo,
 * «Limpiar todo», persistencia en la sesión por propietario— pero con su
 * PROPIO recorte, por dos razones que no se pueden esquivar:
 *
 *   1 · LA UNIDAD ES OTRA. US-010 recorta unidades-día del simulador del
 *       dashboard; esto recorta CARGAS del motor de optimización, que traen
 *       dimensiones que la unidad-día no tiene: zona, gasolinera, tarjeta.
 *   2 · ES MULTISELECCIÓN. US-010 elige un valor por dimensión; aquí se
 *       pueden marcar varios, con conteos facetados.
 *
 * La División es el nivel 1 del organigrama de la cuenta (US-013), con sus
 * mismos nombres.
 *
 * ── Conteos facetados ─────────────────────────────────────────────────────
 * Cada lista enseña cuántas cargas tiene cada valor CON LOS DEMÁS FILTROS
 * APLICADOS E IGNORANDO EL SUYO. Es lo que permite ver qué pasaría al marcar
 * otro valor de la misma lista sin que el propio filtro lo deje en cero. Los
 * valores sin cargas van al final y se pintan atenuados: siguen siendo
 * elegibles, porque otro filtro puede cambiar.
 */
import { DATASET_DAYS } from './dataset'
import type { Load } from './types'

export type OptimizerDimension =
  | 'fuel'
  | 'vehicleType'
  | 'zone'
  | 'division'
  | 'costCenter'
  | 'station'
  | 'card'

/** Visibles siempre. */
export const PRIMARY_DIMENSIONS: OptimizerDimension[] = ['fuel', 'vehicleType', 'zone']
/** Tras «Más filtros». Son las listas largas: llevan buscador. */
export const MORE_DIMENSIONS: OptimizerDimension[] = ['division', 'costCenter', 'station', 'card']
export const ALL_DIMENSIONS: OptimizerDimension[] = [...PRIMARY_DIMENSIONS, ...MORE_DIMENSIONS]

export const OPTIMIZER_DIMENSION_LABELS: Record<OptimizerDimension, string> = {
  fuel: 'Combustible',
  vehicleType: 'Tipo de vehículo',
  zone: 'Zona',
  division: 'División',
  costCenter: 'Centro de costo',
  station: 'Gasolinera',
  card: 'Tarjeta',
}

export type PeriodMode = 'dia' | 'rango'

export type OptimizerFilters = {
  /** Primer día del recorte, incluido. */
  fromDay: number
  /** Último día del recorte, incluido. Igual a `fromDay` en modo «día». */
  toDay: number
} & Record<OptimizerDimension, string[]>

export const DEFAULT_OPTIMIZER_FILTERS: OptimizerFilters = {
  fromDay: 1,
  toDay: DATASET_DAYS,
  fuel: [],
  vehicleType: [],
  zone: [],
  division: [],
  costCenter: [],
  station: [],
  card: [],
}

export function valueOf(load: Load, dimension: OptimizerDimension): string {
  switch (dimension) {
    case 'fuel':
      return load.fuel
    case 'vehicleType':
      return load.vehicleType
    case 'zone':
      return load.zone
    case 'division':
      return load.division
    case 'costCenter':
      return load.costCenter
    case 'station':
      return load.stationId
    case 'card':
      return load.cardId
  }
}

/** Días del recorte, incluidos los que no tuvieron cargas. */
export function periodDays(filters: Pick<OptimizerFilters, 'fromDay' | 'toDay'>): number {
  return Math.max(0, filters.toDay - filters.fromDay + 1)
}

export function periodModeOf(filters: Pick<OptimizerFilters, 'fromDay' | 'toDay'>): PeriodMode {
  return filters.fromDay === filters.toDay ? 'dia' : 'rango'
}

function inPeriod(load: Load, filters: OptimizerFilters): boolean {
  return load.day >= filters.fromDay && load.day <= filters.toDay
}

/**
 * ¿Pasa la carga el recorte? Con `except`, ignora esa dimensión: es la base
 * de los conteos facetados. El periodo no se ignora nunca.
 */
export function matchesOptimizer(load: Load, filters: OptimizerFilters, except?: OptimizerDimension): boolean {
  if (!inPeriod(load, filters)) return false
  for (const dimension of ALL_DIMENSIONS) {
    if (dimension === except) continue
    const selected = filters[dimension]
    if (selected.length > 0 && !selected.includes(valueOf(load, dimension))) return false
  }
  return true
}

export function applyOptimizerFilters(loads: Load[], filters: OptimizerFilters): Load[] {
  return loads.filter((load) => matchesOptimizer(load, filters))
}

export type FacetCount = {
  value: string
  count: number
}

/**
 * Conteo facetado de una dimensión sobre su universo de valores.
 *
 * Los valores con cargas conservan el orden del universo; los que no tienen
 * ninguna van detrás, en el mismo orden relativo.
 */
export function facetCounts(
  loads: Load[],
  filters: OptimizerFilters,
  dimension: OptimizerDimension,
  universe: readonly string[],
): FacetCount[] {
  const counts = new Map<string, number>(universe.map((value) => [value, 0]))
  for (const load of loads) {
    if (!matchesOptimizer(load, filters, dimension)) continue
    const value = valueOf(load, dimension)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  const all = [...counts.entries()].map(([value, count]) => ({ value, count }))
  return [...all.filter((f) => f.count > 0), ...all.filter((f) => f.count === 0)]
}

export function activeDimensions(filters: OptimizerFilters): OptimizerDimension[] {
  return ALL_DIMENSIONS.filter((dimension) => filters[dimension].length > 0)
}

export type OptimizerChip = {
  dimension: OptimizerDimension
  value: string
  label: string
}

/** Un chip por valor marcado, para quitarlos de uno en uno. */
export function optimizerChips(
  filters: OptimizerFilters,
  labelOf: (dimension: OptimizerDimension, value: string) => string,
): OptimizerChip[] {
  return activeDimensions(filters).flatMap((dimension) =>
    filters[dimension].map((value) => ({
      dimension,
      value,
      label: `${OPTIMIZER_DIMENSION_LABELS[dimension]}: ${labelOf(dimension, value)}`,
    })),
  )
}

export function withoutValue(
  filters: OptimizerFilters,
  dimension: OptimizerDimension,
  value: string,
): OptimizerFilters {
  return { ...filters, [dimension]: filters[dimension].filter((v) => v !== value) }
}

/** «Limpiar todo»: suelta las dimensiones. El periodo se queda: no es un filtro de valor. */
export function clearOptimizerDimensions(filters: OptimizerFilters): OptimizerFilters {
  const next = { ...filters }
  for (const dimension of ALL_DIMENSIONS) next[dimension] = []
  return next
}

export function clampDay(day: number): number {
  if (!Number.isFinite(day)) return 1
  return Math.min(DATASET_DAYS, Math.max(1, Math.round(day)))
}

/** Valida lo leído del almacén. `null` si no es reconocible. */
export function parseOptimizerFilters(raw: unknown): OptimizerFilters | null {
  if (raw === null || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const fromDay = Number(record.fromDay)
  const toDay = Number(record.toDay)
  if (!Number.isFinite(fromDay) || !Number.isFinite(toDay)) return null
  const next: OptimizerFilters = {
    ...DEFAULT_OPTIMIZER_FILTERS,
    fromDay: clampDay(Math.min(fromDay, toDay)),
    toDay: clampDay(Math.max(fromDay, toDay)),
  }
  for (const dimension of ALL_DIMENSIONS) {
    const value = record[dimension]
    if (value === undefined) continue
    if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) return null
    next[dimension] = value as string[]
  }
  return next
}
