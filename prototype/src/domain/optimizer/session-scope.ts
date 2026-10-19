/**
 * Alcance de la sesión sobre las cargas del optimizador — ADR-TCP-001.
 * ══════════════════════════════════════════════════════════════════
 * Las cargas salen ya de los despachos del padrón y traen la ruta del
 * organigrama de su unidad, así que el alcance es la misma regla de subárbol
 * que en el resto del portal: la carga entra si el nodo de la sesión está en
 * su ruta. Funciona a cualquier nivel, también por área (antes, con el dataset
 * por plazas, un usuario acotado a un área veía el optimizador vacío).
 */
import type { Load } from './types'

export function loadsInScope(loads: Load[], scopeNodeId: string | null): Load[] {
  return scopeNodeId === null ? loads : loads.filter((load) => load.orgPath.includes(scopeNodeId))
}
