/**
 * US-013 · criterio 4 — «KPIs agregados automáticamente por nivel jerárquico».
 * ═══════════════════════════════════════════════════════════════════════════
 * Una pasada sobre las unidades del día y cada una suma en TODOS los nodos de
 * su ruta, no solo en el suyo. De ahí sale el agregado de cada nivel sin
 * recorrer el árbol una vez por nodo, y de ahí sale también la propiedad que
 * hace creíble la pantalla: **el total de un nodo es la suma de sus hijos más
 * lo que cuelga de él directamente**. Un organigrama en el que las cifras del
 * padre no cuadran con las de los hijos no sirve para decidir nada.
 *
 * Las unidades entran YA filtradas por el contexto global de US-010 —salvo por
 * la propia dimensión de jerarquía—. Es deliberado: si el nodo seleccionado
 * recortara también el árbol, al bajar a un departamento desaparecerían sus
 * hermanos y no habría con qué compararlo, que es justo para lo que sirve una
 * vista multi-nivel.
 *
 * El rendimiento se calcula sobre el CONJUNTO —kilómetros entre litros—, no
 * como media de las medias de cada unidad: la media de medias le da el mismo
 * peso a un tractocamión que a una furgoneta.
 */
import type { UnitDay } from '../dashboard/types'
import { levelName, type OrgNode, type OrgTree } from './types'

export type OrgRollup = {
  node: OrgNode
  /** Nombre del nivel al que pertenece: «División», «Área»… */
  levelName: string
  /** Unidades del padrón bajo este nodo, contando descendientes. */
  fleetUnits: number
  /** De esas, las que han reportado hoy. */
  activeUnits: number
  /** Unidades colgadas de este nodo exactamente, sin descendientes. */
  ownUnits: number
  liters: number
  amountMxn: number
  savingMxn: number
  km: number
  refuels: number
  /** Rendimiento del conjunto. `null` sin litros con los que calcularlo. */
  efficiency: number | null
  /** Unidades sin reportar bajo este nodo: lo que hay que mirar primero. */
  unreported: number
  children: OrgRollup[]
}

type Accumulator = {
  fleetUnits: number
  activeUnits: number
  ownUnits: number
  liters: number
  amountMxn: number
  savingMxn: number
  km: number
  refuels: number
  unreported: number
}

function empty(): Accumulator {
  return {
    fleetUnits: 0,
    activeUnits: 0,
    ownUnits: 0,
    liters: 0,
    amountMxn: 0,
    savingMxn: 0,
    km: 0,
    refuels: 0,
    unreported: 0,
  }
}

/**
 * Agregado de todo el organigrama, en forma de árbol.
 *
 * Devuelve `null` cuando el árbol no tiene raíz —una estructura guardada que
 * quedó rota—, que es un estado que la vista tiene que poder contar en vez de
 * pintar un organigrama a medias.
 */
export function rollupOrg(tree: OrgTree, units: UnitDay[]): OrgRollup | null {
  const totals = new Map<string, Accumulator>()
  for (const node of tree.nodes) totals.set(node.id, empty())

  for (const unit of units) {
    const path = unit.orgPath
    if (path.length === 0) continue

    for (const nodeId of path) {
      const accumulator = totals.get(nodeId)
      if (accumulator === undefined) continue

      accumulator.fleetUnits += 1
      accumulator.liters += unit.liters
      accumulator.amountMxn += unit.amountMxn
      accumulator.savingMxn += unit.savingMxn
      accumulator.km += unit.km
      accumulator.refuels += unit.refuels
      if (unit.lastReportAt !== null) accumulator.activeUnits += 1
      if (unit.status === 'sin_reportar') accumulator.unreported += 1
    }

    // El último de la ruta es el nodo del que cuelga de verdad.
    const own = totals.get(path[path.length - 1]!)
    if (own !== undefined) own.ownUnits += 1
  }

  const root = tree.nodes.find((node) => node.parentId === null)
  if (root === undefined) return null

  const childrenByParent = new Map<string, OrgNode[]>()
  for (const node of tree.nodes) {
    if (node.parentId === null) continue
    const siblings = childrenByParent.get(node.parentId)
    if (siblings) siblings.push(node)
    else childrenByParent.set(node.parentId, [node])
  }

  const build = (node: OrgNode): OrgRollup => {
    const accumulator = totals.get(node.id) ?? empty()
    const children = (childrenByParent.get(node.id) ?? [])
      .map(build)
      // Lo que más consume, arriba: en un organigrama de veinte nodos, el
      // orden alfabético esconde justo lo que se está buscando.
      .sort((a, b) => b.liters - a.liters || a.node.name.localeCompare(b.node.name, 'es-MX'))

    return {
      node,
      levelName: levelName(tree, node.level),
      fleetUnits: accumulator.fleetUnits,
      activeUnits: accumulator.activeUnits,
      ownUnits: accumulator.ownUnits,
      liters: round(accumulator.liters),
      amountMxn: round(accumulator.amountMxn),
      savingMxn: round(accumulator.savingMxn),
      km: accumulator.km,
      refuels: accumulator.refuels,
      efficiency: accumulator.liters > 0 ? accumulator.km / accumulator.liters : null,
      unreported: accumulator.unreported,
      children,
    }
  }

  return build(root)
}

/** El agregado de un nodo concreto dentro del árbol ya calculado. */
export function findRollup(rollup: OrgRollup | null, nodeId: string): OrgRollup | null {
  if (rollup === null) return null
  if (rollup.node.id === nodeId) return rollup

  for (const child of rollup.children) {
    const found = findRollup(child, nodeId)
    if (found !== null) return found
  }

  return null
}

/**
 * Todos los agregados de un nivel, para la tabla comparativa.
 *
 * Es la lectura que pide el criterio 4 leído en voz alta: «enséñame los KPIs
 * de todas mis divisiones», no «enséñame el árbol».
 */
export function rollupsAtLevel(rollup: OrgRollup | null, level: number): OrgRollup[] {
  if (rollup === null) return []
  if (rollup.node.level === level) return [rollup]
  return rollup.children.flatMap((child) => rollupsAtLevel(child, level))
}

/** Ruta de agregados desde la raíz hasta el nodo, para las migas de pan. */
export function rollupPath(rollup: OrgRollup | null, nodeId: string): OrgRollup[] {
  if (rollup === null) return []
  if (rollup.node.id === nodeId) return [rollup]

  for (const child of rollup.children) {
    const path = rollupPath(child, nodeId)
    if (path.length > 0) return [rollup, ...path]
  }

  return []
}

/**
 * ¿Cuadran las cifras de un nodo con las de sus hijos?
 *
 * No es una comprobación defensiva de producción: es la invariante del módulo,
 * y la vista la publica en el panel de diagnóstico para que se pueda ver que
 * el agregado no está inventado.
 */
export function totalsAddUp(rollup: OrgRollup): boolean {
  if (rollup.children.length === 0) return true

  const fromChildren = rollup.children.reduce((total, child) => total + child.fleetUnits, 0)
  if (fromChildren + rollup.ownUnits !== rollup.fleetUnits) return false

  return rollup.children.every(totalsAddUp)
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
