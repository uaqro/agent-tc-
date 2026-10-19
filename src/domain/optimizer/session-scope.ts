/**
 * Alcance de la sesión sobre las cargas del optimizador — ADR-TCP-001.
 * ══════════════════════════════════════════════════════════════════
 * Las cargas del dataset no traen unidad: traen su ZONA, y cada zona es un
 * departamento del organigrama de la cuenta (`departmentNodeIdOf`). Por eso el
 * alcance se resuelve por la ruta del departamento: la carga entra si el nodo
 * de la sesión está en el camino de su departamento hasta la raíz.
 *
 * Límite conocido, y escrito para que no sorprenda: un usuario acotado a un
 * nodo POR DEBAJO del departamento —un área— no ve ninguna carga, porque el
 * dataset no baja de zona. Es honesto (no se le enseña el departamento entero,
 * que excede su alcance), pero deja su optimizador vacío.
 */
import { pathOf, type OrgTree } from '../org/types'
import { departmentNodeIdOf } from './org'
import type { Load, ZoneId } from './types'

/** Zonas cuyo departamento cae dentro del nodo. `null` = sin alcance, todas. */
export function zonesInScope(scopeNodeId: string | null, tree: OrgTree, zones: readonly ZoneId[]): Set<ZoneId> | null {
  if (scopeNodeId === null) return null
  return new Set(zones.filter((zone) => pathOf(tree, departmentNodeIdOf(zone)).includes(scopeNodeId)))
}

export function loadsInScope(loads: Load[], scopeNodeId: string | null, tree: OrgTree, zones: readonly ZoneId[]): Load[] {
  const allowed = zonesInScope(scopeNodeId, tree, zones)
  return allowed === null ? loads : loads.filter((load) => allowed.has(load.zone))
}
