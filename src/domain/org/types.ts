/**
 * EP-02 · US-013 — Vocabulario de la estructura organizacional.
 * ════════════════════════════════════════════════════════════
 * «El dashboard refleja la jerarquía: empresa → división → departamento →
 * unidad», con un máximo de cinco niveles en el MVP.
 *
 * Tres decisiones sostienen el resto del módulo:
 *
 *   1. LA UNIDAD ES EL ÚLTIMO NIVEL, SIEMPRE. `levelNames` incluye su nombre
 *      al final, así que la profundidad de NODOS es `levelNames.length - 1`.
 *      Contar la unidad como nivel es lo que hace que «máximo 5» signifique lo
 *      mismo aquí y en el criterio de aceptación, en vez de dejar la duda de
 *      si son cinco de nodos o cuatro y la unidad.
 *
 *   2. LOS NOMBRES DE NIVEL SON DE LA CUENTA, NO DE LA PLATAFORMA. Una flota
 *      de última milla organiza por áreas y una de larga distancia por
 *      corredores. Fijar «División» y «Departamento» en el código obligaría a
 *      cada cliente a traducir mentalmente su propio organigrama, y la
 *      historia dice que la estructura SE CONFIGURA.
 *
 *   3. UNA UNIDAD PUEDE COLGAR DE CUALQUIER NODO, NO SOLO DE UNA HOJA. Un
 *      camión de supervisión que depende de la división directamente es lo
 *      normal en una flota real. Por eso el corte se hace por RUTA —«¿está
 *      este nodo en el camino de la unidad hasta la raíz?»— y no por igualdad
 *      con la hoja: la igualdad se rompería con el primer caso mixto.
 */

/** Niveles del MVP, contando la unidad como el último. Criterio 5. */
export const MAX_ORG_LEVELS = 5

/** Profundidad máxima de NODOS: la unidad ocupa el nivel que sobra. */
export const MAX_NODE_DEPTH = MAX_ORG_LEVELS - 1

/** Nombres de nivel por defecto, los que nombra el criterio 2. */
export const DEFAULT_LEVEL_NAMES = ['Empresa', 'División', 'Departamento', 'Unidad']

export type OrgNode = {
  id: string
  accountId: string
  /** `null` solo en la raíz: la empresa. */
  parentId: string | null
  name: string
  /** 0 = empresa. Nunca llega a `MAX_NODE_DEPTH`. */
  level: number
  /**
   * Nodo que la plataforma crea sola y nadie edita.
   *
   * Hoy solo hay uno —«Sin asignar»—, y existe porque las unidades que no
   * cuelgan de ningún sitio tienen que sumar igualmente en el total de la
   * empresa. Sin él, el total de la raíz no cuadraría con el padrón y nadie
   * sabría por qué.
   */
  synthetic?: boolean
}

export type OrgTree = {
  accountId: string
  /** Nombre de cada nivel, del 0 al último. El último es SIEMPRE la unidad. */
  levelNames: string[]
  nodes: OrgNode[]
  /** `unitId` → identificador del nodo del que cuelga. */
  assignment: Record<string, string>
}

/** Identificador del nodo sintético de una cuenta. */
export function unassignedNodeId(accountId: string): string {
  return `org:${accountId}:sin-asignar`
}

/** Identificador de la raíz de una cuenta. */
export function rootNodeId(accountId: string): string {
  return `org:${accountId}:empresa`
}

// ── Consultas puras sobre el árbol ───────────────────────────────────────

export function findNode(tree: OrgTree, nodeId: string): OrgNode | undefined {
  return tree.nodes.find((node) => node.id === nodeId)
}

export function rootOf(tree: OrgTree): OrgNode | undefined {
  return tree.nodes.find((node) => node.parentId === null)
}

export function childrenOf(tree: OrgTree, nodeId: string): OrgNode[] {
  return tree.nodes.filter((node) => node.parentId === nodeId)
}

/**
 * Ruta de un nodo hasta la raíz, de la raíz al propio nodo.
 *
 * Devuelve la lista vacía si la cadena está rota —un nodo cuyo padre ya no
 * existe—, que es lo que puede pasar cuando una configuración guardada se lee
 * después de que alguien haya borrado un nivel. Vale más una ruta vacía, que
 * se ve, que un bucle infinito.
 */
export function pathOf(tree: OrgTree, nodeId: string): string[] {
  const path: string[] = []
  const seen = new Set<string>()
  let current = findNode(tree, nodeId)

  while (current !== undefined) {
    if (seen.has(current.id)) return []
    seen.add(current.id)
    path.unshift(current.id)
    if (current.parentId === null) return path
    current = findNode(tree, current.parentId)
  }

  return []
}

/** El nodo y todos sus descendientes. */
export function subtreeOf(tree: OrgTree, nodeId: string): OrgNode[] {
  const node = findNode(tree, nodeId)
  if (node === undefined) return []

  const collected: OrgNode[] = [node]
  const pending = [nodeId]

  while (pending.length > 0) {
    const parentId = pending.pop()!
    for (const child of tree.nodes) {
      if (child.parentId !== parentId) continue
      collected.push(child)
      pending.push(child.id)
    }
  }

  return collected
}

/** Ruta de una unidad: la de su nodo. Vacía si no está asignada. */
export function unitPathOf(tree: OrgTree, unitId: string): string[] {
  const nodeId = tree.assignment[unitId]
  return nodeId === undefined ? [] : pathOf(tree, nodeId)
}

/**
 * Índice `unitId` → ruta, construido una vez.
 *
 * El generador de actividad sella la ruta en cada unidad-día: para una cuenta
 * de 512 unidades y 31 días son ~16 000 consultas por construcción. Resolver
 * el árbol en cada una convertiría una historia de organigramas en un problema
 * de rendimiento.
 */
export function unitPathIndex(tree: OrgTree): Map<string, readonly string[]> {
  const byNode = new Map<string, readonly string[]>()
  const index = new Map<string, readonly string[]>()

  for (const [unitId, nodeId] of Object.entries(tree.assignment)) {
    let path = byNode.get(nodeId)
    if (path === undefined) {
      path = Object.freeze(pathOf(tree, nodeId))
      byNode.set(nodeId, path)
    }
    index.set(unitId, path)
  }

  return index
}

/** Profundidad de nodos usada de verdad. La raíz sola cuenta como 1. */
export function depthOf(tree: OrgTree): number {
  return tree.nodes.reduce((deepest, node) => Math.max(deepest, node.level + 1), 0)
}

/** Nombre del nivel `level`, o uno derivado si la cuenta no lo declaró. */
export function levelName(tree: OrgTree, level: number): string {
  return tree.levelNames[level] ?? `Nivel ${level + 1}`
}

/**
 * Plural del nombre de un nivel.
 *
 * Los nombres de nivel los escribe el cliente, así que no valen ni una tabla
 * fija ni añadir una «s» al final: «4 divisións» y «12 unidads» son la clase de
 * detalle que hace que una pantalla parezca a medio hacer. Las tres reglas del
 * español regular cubren todo lo que un organigrama de flota va a contener.
 */
export function pluralOf(name: string): string {
  if (name === '') return name

  const last = name[name.length - 1]!.toLowerCase()

  // «División» → «Divisiones», «Camión» → «Camiones»: el acento se cae.
  if (/ión$/i.test(name)) return `${name.slice(0, -3)}iones`
  // «Andaluz» → «Andaluces».
  if (last === 'z') return `${name.slice(0, -1)}ces`
  // Vocal átona final: basta la «s».
  if ('aeiou'.includes(last)) return `${name}s`
  // Consonante: «Unidad» → «Unidades», «Sector» → «Sectores».
  return `${name}es`
}

/** `true` si todavía caben hijos por debajo de este nodo. Criterio 5. */
export function canHaveChildren(tree: OrgTree, node: OrgNode): boolean {
  if (node.synthetic === true) return false
  // El último nombre de nivel es el de la unidad: un nodo no puede ocuparlo.
  return node.level + 1 < tree.levelNames.length - 1 && node.level + 1 < MAX_NODE_DEPTH
}

/** Unidades asignadas a este nodo exactamente, sin contar descendientes. */
export function unitsAtNode(tree: OrgTree, nodeId: string): string[] {
  return Object.entries(tree.assignment)
    .filter(([, assigned]) => assigned === nodeId)
    .map(([unitId]) => unitId)
}
