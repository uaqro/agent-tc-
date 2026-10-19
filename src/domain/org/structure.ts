/**
 * US-013 — Organigramas de las cuentas piloto (datos mock).
 * ════════════════════════════════════════════════════════
 * No hay backend: la estructura de partida sale de aquí. Las plantillas están
 * escritas a mano, no generadas al azar, porque un organigrama inventado por
 * un PRNG —«División 3 · Departamento 7»— no se parece a nada y no deja ver si
 * la jerarquía de la pantalla dice algo. Los nombres son los de una operación
 * de transporte mexicana real: corredores, plazas y centros de distribución.
 *
 * Lo que SÍ es aleatorio y determinista es el REPARTO de las 1 174 unidades
 * entre los nodos: escribir a mano de qué departamento cuelga cada camión no
 * habría añadido nada y habría hecho el fichero ilegible.
 *
 * Casos límite metidos a propósito, y anotados:
 *
 *   · PROFUNDIDADES DISTINTAS. Logística Peninsular tiene tres niveles
 *     (empresa → división → unidad) y Grupo Alimentario Norte llega a los
 *     CINCO del tope del MVP. Si todas las cuentas tuvieran cuatro, la vista
 *     multi-nivel nunca demostraría ser multi-nivel.
 *   · UN DEPARTAMENTO VACÍO. «Mantenimiento y Relevo» no tiene ni una unidad.
 *     Sus KPIs son ceros legítimos, no un error, y hay que poder distinguirlo.
 *   · UNIDADES SIN ASIGNAR. Un 3 % de las dos cuentas mayores no cuelga de
 *     ningún nodo: son altas recientes sin clasificar. Suman en el total de la
 *     empresa —si no, la raíz no cuadraría con el padrón— y aparecen bajo un
 *     nodo sintético «Sin asignar» que el panel de administración deja vaciar.
 *   · ASIGNACIÓN MIXTA. Algunas unidades cuelgan de una división directamente,
 *     sin pasar por departamento: son las de supervisión, y en una flota real
 *     existen siempre.
 *   · LA CUENTA DADA DE BAJA conserva su organigrama sin actividad ninguna.
 */
import { createRandom, pick } from '../engine/prng'
import { fleetUnitsOf } from '../datasource/active'
import type { Account } from '../data/accounts'
import { rootNodeId, unassignedNodeId, type OrgNode, type OrgTree } from './types'

const SEED = 20260913

/** Un nodo de la plantilla: nombre y, si los tiene, sus hijos. */
type Template = {
  name: string
  /** Fracción de la flota que cuelga de este nodo o de sus descendientes. */
  weight: number
  /**
   * Unidades que cuelgan de ESTE nodo directamente, aunque tenga hijos.
   * Es la supervisión: existe en toda flota y rompe la suposición de que solo
   * las hojas tienen unidades.
   */
  ownShare?: number
  children?: Template[]
}

type AccountTemplate = {
  levelNames: string[]
  /** Fracción de la flota que se queda sin clasificar. */
  unassignedShare?: number
  divisions: Template[]
}

const TEMPLATES: Record<string, AccountTemplate> = {
  // Cuatro niveles: el organigrama que nombra el criterio 2.
  acc_transportes_bajio: {
    levelNames: ['Empresa', 'División', 'Departamento', 'Unidad'],
    unassignedShare: 0.03,
    divisions: [
      {
        name: 'División Centro-Occidente',
        weight: 3,
        ownShare: 0.02,
        children: [
          { name: 'Departamento Querétaro', weight: 1 },
          { name: 'Departamento León', weight: 1 },
          { name: 'Departamento Irapuato', weight: 1 },
        ],
      },
      {
        name: 'División Metropolitana',
        weight: 2,
        children: [
          { name: 'Departamento Reparto CDMX', weight: 2 },
          { name: 'Departamento Reparto Estado de México', weight: 1 },
        ],
      },
      {
        name: 'División Larga Distancia',
        weight: 4,
        ownShare: 0.03,
        children: [
          { name: 'Departamento Corredor Norte', weight: 2 },
          { name: 'Departamento Corredor del Golfo', weight: 1 },
          { name: 'Departamento Corredor Pacífico', weight: 1 },
        ],
      },
    ],
  },

  // Tres niveles: las divisiones son las hojas. Prueba que la profundidad es
  // de la cuenta y no de la plataforma.
  acc_logistica_peninsular: {
    levelNames: ['Empresa', 'División', 'Unidad'],
    divisions: [
      { name: 'División Cadena de Frío', weight: 4 },
      { name: 'División Distribución Seca', weight: 2 },
      { name: 'División Última Milla Cancún', weight: 2 },
    ],
  },

  // Cinco niveles: el tope del MVP, con un departamento vacío a propósito.
  acc_grupo_alimentario: {
    levelNames: ['Empresa', 'División', 'Departamento', 'Área', 'Unidad'],
    unassignedShare: 0.03,
    divisions: [
      {
        name: 'División Noreste',
        weight: 4,
        children: [
          {
            name: 'Departamento Monterrey',
            weight: 3,
            ownShare: 0.01,
            children: [
              { name: 'Área Monterrey Norte', weight: 2 },
              { name: 'Área Monterrey Sur', weight: 2 },
              { name: 'Área Guadalupe', weight: 1 },
            ],
          },
          {
            name: 'Departamento Saltillo',
            weight: 1,
            children: [{ name: 'Área Saltillo Centro', weight: 1 }],
          },
        ],
      },
      {
        name: 'División Noroeste',
        weight: 3,
        children: [
          {
            name: 'Departamento Hermosillo',
            weight: 1,
            children: [{ name: 'Área Hermosillo Poniente', weight: 1 }],
          },
          {
            name: 'Departamento Culiacán',
            weight: 2,
            children: [{ name: 'Área Culiacán Valle', weight: 1 }],
          },
        ],
      },
      {
        name: 'División Occidente',
        weight: 3,
        children: [
          {
            name: 'Departamento Guadalajara',
            weight: 3,
            children: [
              { name: 'Área Zapopan', weight: 2 },
              { name: 'Área Tlaquepaque', weight: 1 },
            ],
          },
        ],
      },
      {
        name: 'División Servicios',
        weight: 0,
        children: [
          // Sin peso y sin hijos con peso: se queda a cero unidades. Es el
          // nodo con el que se comprueba que un vacío legítimo no es un error.
          { name: 'Departamento Mantenimiento y Relevo', weight: 0 },
        ],
      },
    ],
  },

  acc_distribuidora_centro: {
    levelNames: ['Empresa', 'División', 'Departamento', 'Unidad'],
    divisions: [
      {
        name: 'División Valle de México',
        weight: 3,
        children: [
          { name: 'Departamento Norte', weight: 2 },
          { name: 'Departamento Sur', weight: 1 },
        ],
      },
      {
        name: 'División Bajío Centro',
        weight: 1,
        children: [{ name: 'Departamento Toluca', weight: 1 }],
      },
    ],
  },

  // Cuenta dada de baja: el organigrama se conserva, la actividad no existe.
  acc_farmaceutica_azteca: {
    levelNames: ['Empresa', 'División', 'Unidad'],
    divisions: [
      { name: 'División Farmacéutica', weight: 3 },
      { name: 'División Transporte Especializado', weight: 1 },
    ],
  },
}

/** Plantilla mínima para una cuenta que no tenga la suya escrita. */
const FALLBACK: AccountTemplate = {
  levelNames: ['Empresa', 'División', 'Unidad'],
  divisions: [{ name: 'División Única', weight: 1 }],
}

// ── Construcción del árbol ───────────────────────────────────────────────

function slug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const treeCache = new Map<string, OrgTree>()

/**
 * Organigrama de partida de la cuenta.
 *
 * Es la estructura de FÁBRICA: lo que el panel de administración edita se
 * guarda aparte y se aplica encima (ver `org/store`). Separarlas es lo que
 * permite volver a la de fábrica sin perder el resto del prototipo, igual que
 * la disposición de widgets de US-009.
 */
export function baseOrgTreeOf(account: Account): OrgTree {
  const cached = treeCache.get(account.id)
  if (cached) return cached

  const template = TEMPLATES[account.id] ?? FALLBACK
  const rootId = rootNodeId(account.id)

  const nodes: OrgNode[] = [
    { id: rootId, accountId: account.id, parentId: null, name: account.name, level: 0 },
  ]

  /** Nodos que pueden recibir unidades, con el peso que les toca. */
  const slots: { nodeId: string; weight: number }[] = []

  const walk = (templates: Template[], parentId: string, level: number) => {
    for (const item of templates) {
      const id = `org:${account.id}:${slug(item.name)}`
      nodes.push({ id, accountId: account.id, parentId, name: item.name, level })

      if (item.children === undefined || item.children.length === 0) {
        slots.push({ nodeId: id, weight: item.weight })
      } else {
        // Supervisión: unidades colgadas del nodo intermedio, no de sus hojas.
        if (item.ownShare !== undefined) slots.push({ nodeId: id, weight: item.weight * item.ownShare })
        walk(item.children, id, level + 1)
      }
    }
  }

  walk(template.divisions, rootId, 1)

  const tree: OrgTree = {
    accountId: account.id,
    levelNames: template.levelNames,
    nodes,
    assignment: assignUnits(account, slots, template.unassignedShare ?? 0),
  }

  treeCache.set(account.id, tree)
  return tree
}

/**
 * Reparto de las unidades entre los nodos que aceptan flota.
 *
 * Determinista por cuenta, como todo el mock: el organigrama de la pantalla no
 * puede cambiar entre dos recargas. Un nodo con peso cero no recibe ninguna, y
 * ese es el caso del departamento vacío.
 */
function assignUnits(
  account: Account,
  slots: { nodeId: string; weight: number }[],
  unassignedShare: number,
): Record<string, string> {
  const usable = slots.filter((slot) => slot.weight > 0)
  const assignment: Record<string, string> = {}
  if (usable.length === 0) return assignment

  // La rifa reparte proporcionalmente al peso sin tener que normalizar nada.
  const raffle: string[] = []
  for (const slot of usable) {
    for (let i = 0; i < Math.max(1, Math.round(slot.weight * 10)); i++) raffle.push(slot.nodeId)
  }

  const rnd = createRandom(SEED + hashText(account.id))

  for (const unit of fleetUnitsOf(account)) {
    if (unassignedShare > 0 && rnd() < unassignedShare) continue
    assignment[unit.id] = pick(rnd, raffle)
  }

  return assignment
}

/**
 * Añade el nodo «Sin asignar» si —y solo si— hace falta.
 *
 * Se calcula al leer el árbol y no se guarda: en cuanto el administrador
 * reparte la última unidad huérfana, el nodo desaparece solo. Un nodo vacío
 * permanente invitaría a preguntarse qué hace ahí.
 */
export function withUnassigned(tree: OrgTree, unitIds: string[]): OrgTree {
  const orphans = unitIds.filter((unitId) => tree.assignment[unitId] === undefined)
  if (orphans.length === 0) return tree

  const id = unassignedNodeId(tree.accountId)
  if (tree.nodes.some((node) => node.id === id)) return tree

  const assignment = { ...tree.assignment }
  for (const unitId of orphans) assignment[unitId] = id

  return {
    ...tree,
    nodes: [
      ...tree.nodes,
      {
        id,
        accountId: tree.accountId,
        parentId: rootNodeId(tree.accountId),
        name: 'Sin asignar',
        level: 1,
        synthetic: true,
      },
    ],
    assignment,
  }
}

/** Hash estable de una cadena, para derivar semillas por cuenta. */
function hashText(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash % 1_000_003
}
