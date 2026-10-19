// US-111 · US-112 · US-087
/**
 * Etiquetas visibles de los valores del recorte.
 *
 * La tarjeta se nombra SIEMPRE enmascarada: ni en el filtro ni en un chip
 * aparece el identificador interno, solo `•••• 1234`.
 */
import { FUEL_LABELS, FUEL_TYPES, UNIT_CLASS_LABELS, type FuelType, type UnitClass } from '../dashboard/types'
import { cardLast4Of, unitIdOfCard } from '../data/cards'
import { COST_CENTER_IDS } from '../data/fleet-activity'
import { ZONES, stationNameOf, stations } from '../stations/directory'
import type { OptimizerDimension } from './filters'
import { maskCard } from './masking'
import type { OptimizerOrg } from './org'

const UNIT_CLASSES: UnitClass[] = ['pesado', 'mediano', 'ligero', 'van']

export function zoneName(id: string): string {
  return ZONES.find((zone) => zone.id === id)?.name ?? id
}

export function stationName(id: string): string {
  return stationNameOf(id)
}

/** Tarjeta enmascarada: los cuatro dígitos ficticios de la tarjeta de su unidad (`data/cards`). */
export function maskedCardOf(cardId: string): string {
  const unitId = unitIdOfCard(cardId)
  return maskCard(unitId === null ? '0000' : cardLast4Of(unitId))
}

/**
 * Etiqueta de un valor. Con `org` (US-111 · US-013), zona y división se
 * nombran como en el organigrama vigente; sin él, como en el dataset.
 */
export function optimizerValueLabel(dimension: OptimizerDimension, value: string, org?: OptimizerOrg): string {
  switch (dimension) {
    case 'fuel':
      return FUEL_LABELS[value as FuelType] ?? value
    case 'vehicleType':
      return UNIT_CLASS_LABELS[value as UnitClass] ?? value
    case 'zone':
      return org ? org.zoneLabel(value) : zoneName(value)
    case 'division':
      return org ? org.divisionLabel(value) : value
    case 'costCenter':
      return value
    case 'station':
      return stationName(value)
    case 'card':
      return maskedCardOf(value)
  }
}

/**
 * Todos los valores posibles de una dimensión, en su orden natural. Con
 * `org`, zona, división y centro de costo salen del organigrama (US-013).
 */
export function optimizerUniverse(dimension: OptimizerDimension, org?: OptimizerOrg): string[] {
  switch (dimension) {
    case 'fuel':
      return [...FUEL_TYPES]
    case 'vehicleType':
      return UNIT_CLASSES
    case 'zone':
      return org ? org.zones : ZONES.map((zone) => zone.id)
    case 'division':
      return org ? org.divisions : []
    case 'costCenter':
      return org && org.costCenters.length > 0 ? org.costCenters : COST_CENTER_IDS
    case 'station':
      return stations().map((station) => station.id)
    case 'card':
      // Una tarjeta por unidad del padrón: la lista sale de las cargas, no de un universo fijo.
      return []
  }
}
