/**
 * Alcance de datos de una sesión del portal — ADR-TCP-001.
 * ══════════════════════════════════════════════════════
 * Dos recortes, en este orden, y los dos se aplican AQUÍ, en el dominio, no
 * en las pantallas:
 *
 *   1. CUENTA. La analítica siempre está limitada a la cuenta activa. No hay
 *      comparación entre cuentas, tampoco para los roles internos que el modo
 *      Dev permite simular: el aislamiento de tenant de ADR-001 sin la
 *      excepción cross-account.
 *   2. NODO DEL ORGANIGRAMA. Un usuario puede estar acotado a un nodo —una
 *      división, un departamento, un área—. Ve ese subárbol y nada más. Es la
 *      misma regla de subárbol que el filtro global por organigrama (US-013):
 *      el registro entra si el nodo está en su `orgPath`.
 *
 * La diferencia con el filtro global es quién la decide. El filtro lo pone y
 * lo quita la persona; el alcance viene de su usuario y no se puede quitar.
 * Por eso no se expresa como un filtro: un filtro aparece en el indicador de
 * filtros activos con su botón de quitar, y esto no debe tenerlo.
 */
import type { AccountActivity, ActivitySnapshot, DayPoint, FuelEvent } from '../dashboard/types'
import type { FilterOptions } from '../filters/options'
import { subtreeOf, type OrgTree } from '../org/types'
import type { SessionRoleId } from './portal-roles'

export type PortalPrincipal = {
  userId: string
  name: string
  role: SessionRoleId
  /** Cuenta activa de la sesión. Toda la analítica queda dentro de ella. */
  accountId: string
  /** Nodo del organigrama al que está acotado. `null` = toda la cuenta. */
  scopeNodeId: string | null
}

/** La cuenta es la de la sesión. Sin excepciones, tampoco para los internos. */
export function isAccountInSessionScope(principal: PortalPrincipal, accountId: string): boolean {
  return accountId === principal.accountId
}

/** ¿Cae un registro con esta ruta organizativa dentro del alcance? */
export function inOrgScope(principal: PortalPrincipal, orgPath: readonly string[]): boolean {
  return principal.scopeNodeId === null || orgPath.includes(principal.scopeNodeId)
}

function scopeEvents(principal: PortalPrincipal, events: FuelEvent[]): FuelEvent[] {
  return principal.scopeNodeId === null ? events : events.filter((event) => inOrgScope(principal, event.orgPath))
}

function scopeDay(principal: PortalPrincipal, point: DayPoint): DayPoint {
  if (principal.scopeNodeId === null) return point
  return {
    ...point,
    rows: point.rows.filter((row) => inOrgScope(principal, row.orgPath)),
    events: scopeEvents(principal, point.events),
  }
}

function scopeAccount(principal: PortalPrincipal, account: AccountActivity): AccountActivity {
  if (principal.scopeNodeId === null) return account
  const units = account.units.filter((unit) => inOrgScope(principal, unit.orgPath))
  return {
    ...account,
    fleetSize: units.length,
    units,
    todayEvents: scopeEvents(principal, account.todayEvents),
    yesterdayEvents: scopeEvents(principal, account.yesterdayEvents),
    // El recuento de ayer viene agregado: con alcance no hay forma honesta de
    // recortarlo, así que se recalcula como desconocido en vez de enseñar el
    // de la cuenta entera.
    activeUnitsYesterday: 0,
    period: account.period.map((point) => scopeDay(principal, point)),
    previousPeriod: account.previousPeriod.map((point) => scopeDay(principal, point)),
  }
}

/**
 * La foto de actividad tal como la puede ver la sesión: solo su cuenta y,
 * dentro de ella, solo su subárbol. Unidades, cargas, filas del histórico y el
 * periodo anterior se recortan igual, para que ningún indicador derivado pueda
 * colar datos de fuera.
 */
export function scopeSnapshot(snapshot: ActivitySnapshot, principal: PortalPrincipal): ActivitySnapshot {
  const accounts = snapshot.accounts
    .filter((account) => isAccountInSessionScope(principal, account.accountId))
    .map((account) => scopeAccount(principal, account))
  return {
    ...snapshot,
    accounts,
    fleetSize: accounts.reduce((total, account) => total + account.fleetSize, 0),
  }
}

/** Nodos que la sesión puede ver: su subárbol, o el árbol entero sin alcance. */
export function visibleOrgNodeIds(principal: PortalPrincipal, tree: OrgTree): Set<string> {
  const nodes = principal.scopeNodeId === null ? tree.nodes : subtreeOf(tree, principal.scopeNodeId)
  return new Set(nodes.map((node) => node.id))
}

/**
 * Catálogo de filtros recortado al alcance: no se ofrece elegir lo que no se
 * puede ver. Los conductores no tienen ruta organizativa propia, así que se
 * pasan los permitidos (los de las unidades del alcance).
 */
export function scopeFilterOptions(
  options: FilterOptions,
  principal: PortalPrincipal,
  tree: OrgTree,
  allowedDriverIds: ReadonlySet<string>,
): FilterOptions {
  if (principal.scopeNodeId === null) return options
  const nodes = visibleOrgNodeIds(principal, tree)
  return {
    ...options,
    units: options.units.filter((unit) => inOrgScope(principal, unit.orgPath)),
    drivers: options.drivers.filter((driver) => allowedDriverIds.has(driver.value)),
    orgNodes: options.orgNodes.filter((node) => nodes.has(node.value)),
  }
}
