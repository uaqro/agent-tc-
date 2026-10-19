/**
 * US-013 · criterio 1 — Lo que el panel de administración puede hacerle a un
 * organigrama.
 * ═══════════════════════════════════════════════════════════════════════════
 * Funciones puras: entra un árbol, sale otro árbol o un motivo por el que no.
 * Ni React, ni almacén, ni permisos. El permiso lo comprueba el hook antes de
 * llamar aquí, contra `admin.estructura` y con la cuenta como objetivo, que es
 * lo que separa «Gestión · Global» de «Gestión · Solo su cuenta».
 *
 * Que las reglas de negocio vivan en funciones puras es lo que permite
 * comprobarlas —el tope de cinco niveles, el nombre repetido entre hermanos,
 * la raíz que no se borra— sin montar un formulario.
 */
import {
  MAX_NODE_DEPTH,
  MAX_ORG_LEVELS,
  childrenOf,
  findNode,
  rootOf,
  subtreeOf,
  unitsAtNode,
  type OrgNode,
  type OrgTree,
} from './types'

/** Nombre máximo de un nodo o de un nivel. */
export const MAX_NAME = 48

export type OrgResult =
  | { ok: true; tree: OrgTree; message: string }
  | { ok: false; message: string }

function fail(message: string): OrgResult {
  return { ok: false, message }
}

function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/** Nombre utilizable para un nodo, o el motivo por el que no lo es. */
function validateName(
  raw: string,
  siblings: OrgNode[],
  exceptId: string | null,
): { ok: true; name: string } | { ok: false; message: string } {
  const name = cleanName(raw)

  if (name === '') return { ok: false, message: 'Ponle un nombre al nivel para poder guardarlo.' }
  if (name.length > MAX_NAME) {
    return { ok: false, message: `El nombre no puede pasar de ${MAX_NAME} caracteres.` }
  }
  if (
    siblings.some(
      (sibling) => sibling.id !== exceptId && sibling.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return {
      ok: false,
      message: `Ya hay un «${name}» colgando del mismo nivel. Dos hermanos con el mismo nombre no se distinguen en el dashboard.`,
    }
  }

  return { ok: true, name }
}

/**
 * Identificador de un nodo nuevo.
 *
 * Lleva un sufijo numérico cuando el nombre ya se usó en otra rama: los
 * nombres se repiten entre divisiones —«Departamento Norte» hay en muchas— y
 * dos nodos distintos no pueden compartir identificador.
 */
function newNodeId(tree: OrgTree, name: string): string {
  const base = `org:${tree.accountId}:${name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`

  if (!tree.nodes.some((node) => node.id === base)) return base

  let suffix = 2
  while (tree.nodes.some((node) => node.id === `${base}-${suffix}`)) suffix++
  return `${base}-${suffix}`
}

// ── Operaciones ──────────────────────────────────────────────────────────

export function renameNode(tree: OrgTree, nodeId: string, raw: string): OrgResult {
  const node = findNode(tree, nodeId)
  if (node === undefined) return fail('Ese nivel ya no existe en el organigrama.')
  if (node.synthetic === true) {
    return fail('«Sin asignar» lo mantiene la plataforma: no se renombra ni se borra.')
  }

  const siblings = tree.nodes.filter((candidate) => candidate.parentId === node.parentId)
  const validation = validateName(raw, siblings, nodeId)
  if (!validation.ok) return fail(validation.message)

  return {
    ok: true,
    tree: {
      ...tree,
      nodes: tree.nodes.map((candidate) =>
        candidate.id === nodeId ? { ...candidate, name: validation.name } : candidate,
      ),
    },
    message: `«${node.name}» ahora se llama «${validation.name}».`,
  }
}

export function addChild(tree: OrgTree, parentId: string, raw: string): OrgResult {
  const parent = findNode(tree, parentId)
  if (parent === undefined) return fail('Ese nivel ya no existe en el organigrama.')
  if (parent.synthetic === true) {
    return fail('«Sin asignar» no admite niveles por debajo: es donde esperan las unidades sueltas.')
  }

  const level = parent.level + 1

  /**
   * Criterio 5 · «Máximo 5 niveles de jerarquía en MVP».
   *
   * La unidad ocupa el último, así que los nodos llegan hasta el cuarto. El
   * tope se comprueba contra `levelNames` Y contra la constante: una cuenta
   * puede haber declarado menos niveles de los que el MVP permite, y entonces
   * manda el suyo.
   */
  if (level >= tree.levelNames.length - 1) {
    return fail(
      `«${tree.accountId}» tiene declarados ${tree.levelNames.length} niveles contando la unidad. Para colgar algo por debajo de «${parent.name}», añade antes un nivel al organigrama.`,
    )
  }
  if (level >= MAX_NODE_DEPTH) {
    return fail(
      `El MVP admite ${MAX_ORG_LEVELS} niveles contando la unidad, y «${parent.name}» ya está en el último que puede tener hijos.`,
    )
  }

  const validation = validateName(raw, childrenOf(tree, parentId), null)
  if (!validation.ok) return fail(validation.message)

  const node: OrgNode = {
    id: newNodeId(tree, validation.name),
    accountId: tree.accountId,
    parentId,
    name: validation.name,
    level,
  }

  return {
    ok: true,
    tree: { ...tree, nodes: [...tree.nodes, node] },
    message: `«${validation.name}» colgado de «${parent.name}».`,
  }
}

/**
 * Borra un nivel y todo lo que cuelga de él.
 *
 * Las unidades del subárbol NO se pierden: suben al padre del nodo borrado.
 * Dejarlas huérfanas las mandaría a «Sin asignar», que es un sitio peor: quien
 * borra un departamento sabe a qué división pertenecían sus camiones, y la
 * plataforma también.
 */
export function removeNode(tree: OrgTree, nodeId: string): OrgResult {
  const node = findNode(tree, nodeId)
  if (node === undefined) return fail('Ese nivel ya no existe en el organigrama.')
  if (node.parentId === null) return fail('La empresa es la raíz del organigrama: no se puede borrar.')
  if (node.synthetic === true) {
    return fail('«Sin asignar» desaparece solo en cuanto repartes las unidades que tiene.')
  }

  const doomed = new Set(subtreeOf(tree, nodeId).map((candidate) => candidate.id))
  const assignment: Record<string, string> = {}
  let rescued = 0

  for (const [unitId, assignedTo] of Object.entries(tree.assignment)) {
    if (doomed.has(assignedTo)) {
      assignment[unitId] = node.parentId
      rescued += 1
    } else {
      assignment[unitId] = assignedTo
    }
  }

  const parent = findNode(tree, node.parentId)

  return {
    ok: true,
    tree: {
      ...tree,
      nodes: tree.nodes.filter((candidate) => !doomed.has(candidate.id)),
      assignment,
    },
    message:
      rescued === 0
        ? `«${node.name}» borrado. No tenía unidades.`
        : `«${node.name}» borrado. Sus ${rescued} ${rescued === 1 ? 'unidad pasa' : 'unidades pasan'} a «${parent?.name ?? 'el nivel superior'}».`,
  }
}

/** Cambia de nivel a un conjunto de unidades. */
export function moveUnits(tree: OrgTree, unitIds: string[], targetNodeId: string): OrgResult {
  const target = findNode(tree, targetNodeId)
  if (target === undefined) return fail('Ese nivel ya no existe en el organigrama.')
  if (target.synthetic === true) {
    return fail('«Sin asignar» no es un destino: es donde caen las unidades que no tienen ninguno.')
  }
  if (unitIds.length === 0) return fail('Elige al menos una unidad para moverla.')

  const assignment = { ...tree.assignment }
  for (const unitId of unitIds) assignment[unitId] = targetNodeId

  return {
    ok: true,
    tree: { ...tree, assignment },
    message: `${unitIds.length} ${unitIds.length === 1 ? 'unidad movida' : 'unidades movidas'} a «${target.name}».`,
  }
}

/**
 * Renombra un NIVEL entero: «Departamento» pasa a ser «Plaza».
 *
 * Es lo que hace que la estructura sea de la cuenta y no de la plataforma. El
 * último nombre —el de la unidad— también se puede cambiar: hay flotas que las
 * llaman «económicos» y otras «vehículos».
 */
export function renameLevel(tree: OrgTree, level: number, raw: string): OrgResult {
  if (level < 0 || level >= tree.levelNames.length) return fail('Ese nivel no existe.')

  const name = cleanName(raw)
  if (name === '') return fail('Ponle un nombre al nivel para poder guardarlo.')
  if (name.length > MAX_NAME) return fail(`El nombre no puede pasar de ${MAX_NAME} caracteres.`)
  if (
    tree.levelNames.some(
      (existing, index) => index !== level && existing.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return fail(`Ya hay un nivel llamado «${name}». Dos niveles con el mismo nombre no se leen.`)
  }

  const previous = tree.levelNames[level]!

  return {
    ok: true,
    tree: {
      ...tree,
      levelNames: tree.levelNames.map((existing, index) => (index === level ? name : existing)),
    },
    message: `El nivel «${previous}» ahora se llama «${name}».`,
  }
}

/**
 * Añade un nivel de profundidad al organigrama, por encima de la unidad.
 *
 * Sin esto, `addChild` se topa con el tope de la cuenta y no hay forma de
 * subirlo desde la pantalla: la estructura sería configurable a medias.
 */
export function addLevel(tree: OrgTree, raw: string): OrgResult {
  if (tree.levelNames.length >= MAX_ORG_LEVELS) {
    return fail(
      `El MVP admite ${MAX_ORG_LEVELS} niveles contando la unidad, y este organigrama ya los tiene.`,
    )
  }

  const name = cleanName(raw)
  if (name === '') return fail('Ponle un nombre al nivel para poder añadirlo.')
  if (name.length > MAX_NAME) return fail(`El nombre no puede pasar de ${MAX_NAME} caracteres.`)
  if (tree.levelNames.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
    return fail(`Ya hay un nivel llamado «${name}».`)
  }

  // El nuevo va justo antes de la unidad, que siempre es el último.
  const levelNames = [...tree.levelNames]
  levelNames.splice(levelNames.length - 1, 0, name)

  return {
    ok: true,
    tree: { ...tree, levelNames },
    message: `Nivel «${name}» añadido. Ya puedes colgar ${name.toLowerCase()}s de los niveles de arriba.`,
  }
}

/** Quita el último nivel de nodos, si nadie lo está ocupando. */
export function removeLevel(tree: OrgTree): OrgResult {
  const level = tree.levelNames.length - 2
  if (level < 1) return fail('El organigrama necesita al menos la empresa y la unidad.')

  const occupied = tree.nodes.filter((node) => node.level === level && node.synthetic !== true)
  if (occupied.length > 0) {
    return fail(
      `«${tree.levelNames[level]}» todavía tiene ${occupied.length} ${occupied.length === 1 ? 'nivel' : 'niveles'} creados. Bórralos antes de quitar el nivel.`,
    )
  }

  const name = tree.levelNames[level]!

  return {
    ok: true,
    tree: { ...tree, levelNames: tree.levelNames.filter((_, index) => index !== level) },
    message: `Nivel «${name}» retirado del organigrama.`,
  }
}

/** Unidades que cuelgan de un nodo y de todos sus descendientes. */
export function unitsUnder(tree: OrgTree, nodeId: string): string[] {
  const under = new Set(subtreeOf(tree, nodeId).map((node) => node.id))
  return Object.entries(tree.assignment)
    .filter(([, assignedTo]) => under.has(assignedTo))
    .map(([unitId]) => unitId)
}

export { unitsAtNode, rootOf }
