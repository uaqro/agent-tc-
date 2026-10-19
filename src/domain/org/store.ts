/**
 * US-013 · criterio 1 — Persistencia del organigrama configurado.
 * ══════════════════════════════════════════════════════════════
 * La estructura es un activo de la CUENTA, no de quien la configura: la
 * cambia el Admin de Cuenta o un Admin Edenred desde fuera, y los dos tienen
 * que ver la misma. Por eso el propietario es el tenant —igual que la
 * disposición de widgets de US-009 y al revés que los filtros de US-010, que
 * son contexto de trabajo de una persona—.
 *
 * No se guarda el árbol entero, sino lo que se APARTA del de fábrica:
 *
 *   · `levelNames`, si se han renombrado o ha cambiado la profundidad;
 *   · `nodes`, la lista de nodos tras las altas, bajas y renombrados;
 *   · `moved`, solo las unidades cuya asignación difiere de la de fábrica.
 *
 * Guardar las 512 asignaciones de la cuenta mayor en cada cambio de nombre
 * habría metido veinte kilobytes en `localStorage` para registrar que a un
 * departamento le cambiaron una tilde.
 */
import { createKeyedStore } from '../storage/keyed-store'
import type { OrgNode, OrgTree } from './types'

export type OrgOverrides = {
  levelNames?: string[]
  nodes?: OrgNode[]
  moved?: Record<string, string>
}

/** El organigrama es del tenant: la clave es la cuenta. */
export function orgOwnerKeyFor(accountId: string | null): string {
  return accountId === null ? '' : `cuenta:${accountId}`
}

function parseNodes(raw: unknown): OrgNode[] | null {
  if (!Array.isArray(raw)) return null

  const nodes: OrgNode[] = []
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue
    const candidate = entry as Record<string, unknown>
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.accountId !== 'string' ||
      typeof candidate.name !== 'string' ||
      typeof candidate.level !== 'number'
    ) {
      continue
    }
    nodes.push({
      id: candidate.id,
      accountId: candidate.accountId,
      parentId: typeof candidate.parentId === 'string' ? candidate.parentId : null,
      name: candidate.name,
      level: candidate.level,
    })
  }

  // Un organigrama sin raíz no es un organigrama: se descarta entero y manda
  // el de fábrica. Media estructura es peor que ninguna.
  return nodes.some((node) => node.parentId === null) ? nodes : null
}

function parseOverrides(raw: unknown): OrgOverrides | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Record<string, unknown>

  const overrides: OrgOverrides = {}

  if (Array.isArray(candidate.levelNames)) {
    const levelNames = candidate.levelNames.filter(
      (entry): entry is string => typeof entry === 'string' && entry !== '',
    )
    // Con menos de dos no hay jerarquía que representar: empresa y unidad.
    if (levelNames.length >= 2) overrides.levelNames = levelNames
  }

  if (candidate.nodes !== undefined) {
    const nodes = parseNodes(candidate.nodes)
    if (nodes !== null) overrides.nodes = nodes
  }

  if (candidate.moved !== null && typeof candidate.moved === 'object' && !Array.isArray(candidate.moved)) {
    const moved: Record<string, string> = {}
    for (const [unitId, nodeId] of Object.entries(candidate.moved as Record<string, unknown>)) {
      if (typeof nodeId === 'string') moved[unitId] = nodeId
    }
    overrides.moved = moved
  }

  return overrides
}

const store = createKeyedStore<OrgOverrides>({
  key: 'tc.org-structure.v1',
  area: 'local',
  parse: parseOverrides,
  messages: {
    unavailable: 'Este navegador no permite guardar la estructura organizacional.',
    corrupt: 'La estructura guardada estaba dañada y se ha vuelto a la de fábrica.',
    malformed: 'La estructura guardada de esta cuenta no tenía el formato esperado.',
    full: 'No se pudo guardar la estructura: el almacenamiento del navegador está lleno o bloqueado.',
  },
})

export function readOrgOverrides(ownerKey: string) {
  return store.read(ownerKey)
}

export function writeOrgOverrides(ownerKey: string, overrides: OrgOverrides) {
  return store.write(ownerKey, overrides)
}

export function clearOrgOverrides(ownerKey: string) {
  return store.clear(ownerKey)
}

/** Solo para los tests. */
export function resetOrgStore() {
  store.reset()
}

// ── Diferencia y aplicación ──────────────────────────────────────────────

/**
 * Qué se aparta del organigrama de fábrica.
 *
 * Las asignaciones se comparan una a una porque casi todas coinciden: mover un
 * departamento de sitio toca decenas de unidades, no quinientas.
 */
export function overridesFrom(base: OrgTree, edited: OrgTree): OrgOverrides {
  const moved: Record<string, string> = {}
  for (const [unitId, nodeId] of Object.entries(edited.assignment)) {
    if (base.assignment[unitId] !== nodeId) moved[unitId] = nodeId
  }
  // Una unidad que estaba asignada de fábrica y ahora no lo está: se marca con
  // cadena vacía para poder distinguir «sin cambio» de «desasignada».
  for (const unitId of Object.keys(base.assignment)) {
    if (edited.assignment[unitId] === undefined) moved[unitId] = ''
  }

  return {
    levelNames: edited.levelNames,
    // Los sintéticos los vuelve a poner `withUnassigned` al leer: guardarlos
    // los convertiría en permanentes.
    nodes: edited.nodes.filter((node) => node.synthetic !== true),
    moved,
  }
}

/** El organigrama de fábrica con lo configurado encima. */
export function applyOverrides(base: OrgTree, overrides: OrgOverrides | null): OrgTree {
  if (overrides === null) return base

  const nodes = overrides.nodes ?? base.nodes
  const alive = new Set(nodes.map((node) => node.id))

  const assignment: Record<string, string> = {}
  for (const [unitId, nodeId] of Object.entries(base.assignment)) {
    if (alive.has(nodeId)) assignment[unitId] = nodeId
  }
  for (const [unitId, nodeId] of Object.entries(overrides.moved ?? {})) {
    if (nodeId === '') delete assignment[unitId]
    else if (alive.has(nodeId)) assignment[unitId] = nodeId
  }

  return {
    accountId: base.accountId,
    levelNames: overrides.levelNames ?? base.levelNames,
    nodes,
    assignment,
  }
}
