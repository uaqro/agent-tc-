/**
 * US-010 · criterio 5 — Cómo se cuenta en pantalla lo que está filtrado.
 * ═════════════════════════════════════════════════════════════════════
 * «Indicador visual claro de filtros activos en todo momento».
 *
 * El indicador no puede limitarse a decir «hay filtros»: un aviso que no dice
 * CUÁL es el filtro obliga a ir a buscarlo, y para eso ya estaba el propio
 * selector. Así que cada dimensión activa se resuelve a su etiqueta legible
 * —el nombre del conductor, no `OP-3120`— y se devuelve por separado, para que
 * quien pinta pueda darle a cada una su propio botón de quitar.
 *
 * Funciones puras: entra el filtro y el catálogo, sale texto. Ninguna sabe de
 * React, y por eso el texto del indicador se puede comprobar en la suite sin
 * montar la interfaz.
 */
import {
  BEHAVIOR_LABELS,
  FUEL_LABELS,
  FUEL_PRODUCT_LABELS,
  type DrivingBehavior,
  type FuelProduct,
  type FuelType,
} from '../dashboard/types'
import type { FilterOptions } from './options'
import {
  ANY,
  DIMENSION_LABELS,
  FILTER_DIMENSIONS,
  NO_DRIVER,
  type FilterDimension,
  type GlobalFilters,
} from './types'

export type FilterChip = {
  dimension: FilterDimension
  /** Nombre de la dimensión: «Conductor». */
  name: string
  /** Valor legible: «Marisol Olvera Tirado». */
  label: string
}

/** Etiqueta legible del valor activo de una dimensión, o `null` si no lo está. */
function labelOf(
  dimension: FilterDimension,
  filters: GlobalFilters,
  options: FilterOptions,
): string | null {
  const value = filters[dimension]
  if (value === ANY) return null

  switch (dimension) {
    case 'fuel':
      return FUEL_LABELS[value as FuelType] ?? value
    case 'product':
      // Nombre comercial, no el identificador: en el indicador de filtros
      // activos «ticketcar_plus» se lee como una fuga del backend.
      return FUEL_PRODUCT_LABELS[value as FuelProduct] ?? value
    case 'behavior':
      // US-016. Va explícito y no por el `default` de abajo: el valor crudo es
      // el del contrato de telemetría —`ralenti`, `frenado_brusco`— y en un
      // indicador de filtros activos eso se lee como una fuga del backend.
      return BEHAVIOR_LABELS[value as DrivingBehavior] ?? value
    case 'unitId':
      return options.units.find((unit) => unit.value === value)?.label ?? value
    case 'driverId':
      if (value === NO_DRIVER) return 'Sin conductor asignado'
      return options.drivers.find((driver) => driver.value === value)?.label ?? value
    case 'orgNodeId': {
      // US-013: el nombre del nodo, con su nivel delante. «División Noreste» a
      // secas no dice si es una división o un área en una cuenta que renombró
      // sus niveles.
      const node = options.orgNodes.find((candidate) => candidate.value === value)
      return node === undefined ? value : `${node.levelName} · ${node.label}`
    }
    default:
      // Grupo, centro de coste y ruta ya son su propia etiqueta: «CC-02 ·
      // Larga distancia», «RT-04 · Sierra Madre Oriental».
      return value
  }
}

/** Una entrada por dimensión activa, en el orden en que se leen en pantalla. */
export function activeChips(filters: GlobalFilters, options: FilterOptions): FilterChip[] {
  const chips: FilterChip[] = []
  for (const dimension of FILTER_DIMENSIONS) {
    const label = labelOf(dimension, filters, options)
    if (label !== null) chips.push({ dimension, name: DIMENSION_LABELS[dimension], label })
  }
  return chips
}

/**
 * Una línea con todo el contexto, incluido el periodo.
 *
 * Es lo que acompaña a las gráficas: una serie sin decir qué está pintando es
 * una serie que se puede leer al revés.
 */
export function describeFilters(filters: GlobalFilters, options: FilterOptions): string {
  return `${describeDimensions(filters, options)} · periodo de ${filters.periodDays} días`
}

/**
 * Lo mismo SIN el periodo — EP-08 · US-050.
 *
 * El periodo es una dimensión global, pero no todas las pantallas lo usan: la
 * de comparativas trabaja con tramos de CALENDARIO —agosto contra julio— y su
 * gráfica cubre doce meses. Colgarle «periodo de 30 días» sería describir su
 * corte con un número que ahí no significa nada.
 *
 * Se separa aquí y no en cada consumidor para que solo haya una forma de
 * escribir el conjunto de dimensiones activas.
 */
export function describeDimensions(filters: GlobalFilters, options: FilterOptions): string {
  const chips = activeChips(filters, options)
  return chips.length === 0 ? 'toda la flota' : chips.map((chip) => chip.label).join(' · ')
}
