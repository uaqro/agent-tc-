// US-111 · US-013
/**
 * Zona, división y centro de costo del optimizador, desde el organigrama.
 * ══════════════════════════════════════════════════════════════════════
 * Sprint 8 dejaba estas tres listas como vocabulario propio del dataset. Aquí
 * salen del maestro de organización de US-013 —el árbol VIGENTE de la cuenta,
 * con las ediciones del panel de Estructura—, con su jerarquía y sus
 * permisos: el árbol solo existe para las cuentas del alcance de la sesión.
 *
 *   · ZONA → el DEPARTAMENTO del organigrama que corresponde a la plaza de la
 *     carga (Monterrey → «Departamento Monterrey»). Se ata por el id de nodo,
 *     que es estable: renombrar el departamento renombra la zona.
 *   · DIVISIÓN → el nodo de nivel 1 por encima de ese departamento, leído del
 *     árbol en cada momento. Mover un departamento a otra división mueve sus
 *     cargas con él. Las divisiones sin cargas siguen en la lista (la división
 *     vacía de fábrica es un vacío legítimo).
 *   · CENTRO DE COSTO → los de las unidades que cuelgan del árbol de la cuenta.
 *     El organigrama no tiene un nivel «centro de costo»: es un atributo de la
 *     unidad, y la unidad es el último nivel del árbol.
 *
 * Si un departamento se borra, sus cargas pasan a «Sin asignar», como las
 * unidades huérfanas del organigrama, y la zona se nombra por su plaza.
 */
import { ACCOUNTS } from '../data/accounts'
import { fleetUnitsOf } from '../datasource/active'
import { baseOrgTreeOf } from '../org/structure'
import { findNode, pathOf, unassignedNodeId, type OrgTree } from '../org/types'
import { OPTIMIZER_ACCOUNT_ID, ZONES } from './dataset'
import type { Load, ZoneId } from './types'

/** Departamento de fábrica de cada plaza del dataset. */
const ZONE_DEPARTMENT: Record<ZoneId, string> = {
  monterrey: 'departamento-monterrey',
  saltillo: 'departamento-saltillo',
  hermosillo: 'departamento-hermosillo',
  culiacan: 'departamento-culiacan',
  guadalajara: 'departamento-guadalajara',
}

export function departmentNodeIdOf(zone: ZoneId): string {
  return `org:${OPTIMIZER_ACCOUNT_ID}:${ZONE_DEPARTMENT[zone]}`
}

export type OptimizerOrg = {
  /** División (id de nodo) de cada zona según el árbol vigente. */
  divisionOfZone: Record<ZoneId, string>
  /** Divisiones del árbol, en su orden, y «Sin asignar» si alguna zona cae ahí. */
  divisions: string[]
  /** Zonas, en el orden del árbol (departamentos), las huérfanas al final. */
  zones: ZoneId[]
  /** Centros de costo de las unidades del árbol de la cuenta. */
  costCenters: string[]
  divisionLabel: (nodeId: string) => string
  zoneLabel: (zone: string) => string
}

/** Árbol de la cuenta del dataset: el vigente si está en el alcance, si no el de fábrica. */
export function optimizerTreeOf(trees: ReadonlyMap<string, OrgTree> | null): OrgTree | null {
  const live = trees?.get(OPTIMIZER_ACCOUNT_ID)
  if (live !== undefined) return live
  const account = ACCOUNTS.find((candidate) => candidate.id === OPTIMIZER_ACCOUNT_ID)
  return account === undefined ? null : baseOrgTreeOf(account)
}

export function optimizerOrg(tree: OrgTree | null): OptimizerOrg {
  const unassigned = unassignedNodeId(OPTIMIZER_ACCOUNT_ID)
  const divisionOfZone = {} as Record<ZoneId, string>
  const zoneNames = new Map<string, string>()

  for (const zone of ZONES) {
    const node = tree === null ? undefined : findNode(tree, departmentNodeIdOf(zone.id))
    if (tree === null || node === undefined) {
      divisionOfZone[zone.id] = unassigned
      zoneNames.set(zone.id, zone.name)
      continue
    }
    zoneNames.set(zone.id, node.name)
    const path = pathOf(tree, node.id)
    const division = path.map((id) => findNode(tree, id)).find((candidate) => candidate?.level === 1)
    divisionOfZone[zone.id] = division?.id ?? unassigned
  }

  const treeDivisions = tree === null ? [] : tree.nodes.filter((node) => node.level === 1 && !node.synthetic)
  const divisions = treeDivisions.map((node) => node.id)
  if (Object.values(divisionOfZone).includes(unassigned)) divisions.push(unassigned)

  const order = tree === null ? [] : tree.nodes.map((node) => node.id)
  const rank = (zone: ZoneId) => {
    const index = order.indexOf(departmentNodeIdOf(zone))
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  const zones = ZONES.map((zone) => zone.id).sort((a, b) => rank(a) - rank(b))

  const account = ACCOUNTS.find((candidate) => candidate.id === OPTIMIZER_ACCOUNT_ID)
  const inTree = new Set(tree === null ? [] : Object.keys(tree.assignment))
  const costCenters =
    account === undefined
      ? []
      : [...new Set(fleetUnitsOf(account).filter((unit) => inTree.size === 0 || inTree.has(unit.id)).map((unit) => unit.costCenter))].sort()

  return {
    divisionOfZone,
    divisions,
    zones,
    costCenters,
    divisionLabel: (nodeId) =>
      nodeId === unassigned ? 'Sin asignar' : ((tree === null ? undefined : findNode(tree, nodeId))?.name ?? nodeId),
    zoneLabel: (zone) => zoneNames.get(zone) ?? zone,
  }
}

/** Las cargas con la división que les da el árbol vigente (id de nodo). */
export function withOrgDivision(loads: Load[], org: OptimizerOrg): Load[] {
  return loads.map((load) => ({ ...load, division: org.divisionOfZone[load.zone] }))
}
