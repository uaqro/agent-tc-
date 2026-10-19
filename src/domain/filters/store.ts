/**
 * US-010 · criterios 3 y 4 — Qué se guarda de los filtros, y dónde.
 * ════════════════════════════════════════════════════════════════
 * Son dos cosas distintas y van a dos sitios distintos a propósito:
 *
 *   · criterio 4, «los filtros persisten en la SESIÓN ACTIVA» → los filtros
 *     activos viven en `sessionStorage`. Sobreviven a una recarga de la
 *     pestaña —perder el contexto por un F5 accidental es una manera tonta de
 *     perder el trabajo de cinco minutos— y mueren al cerrarla, que es
 *     exactamente lo que dice el criterio. También mueren al cerrar sesión,
 *     porque el propietario cambia.
 *
 *   · criterio 3, «guardar combinaciones de filtros como VISTAS» → una vista
 *     no es estado de sesión: es algo que alguien construyó para volver a
 *     usarlo mañana. Va a `localStorage`, como la disposición de widgets de
 *     US-009.
 *
 * ── Propietario ───────────────────────────────────────────────────────────
 * Las dos cosas se guardan por USUARIO Y CUENTA ACTIVA, y esto sí se aparta
 * de US-009, donde la disposición era del TENANT para que el Account Manager
 * pudiera leer la de su Admin de Cuenta.
 *
 * Aquí no procede: un filtro es el contexto de trabajo de una persona en un
 * momento dado, no la configuración de la cuenta. Que al Account Manager le
 * apareciera puesto el filtro que dejó a medias el Admin de Cuenta sería
 * enseñarle datos recortados por una decisión que no ha tomado él. Y la cuenta
 * entra en la clave porque los valores de tres de las ocho dimensiones
 * —unidad, conductor y, en la práctica, centro de coste— son de una cuenta
 * concreta: arrastrarlos al cambiar de cuenta deja la pantalla vacía sin que
 * nada lo explique.
 */
import { createKeyedStore } from '../storage/keyed-store'
import { parseFilters, type GlobalFilters } from './types'

/**
 * Lo único del principal de eOne que necesita la clave. Ticket Car+ todavía no
 * tiene motor de permisos: el shell pasa el usuario de la sesión y su cuenta.
 */
export type FilterOwner = {
  userId: string
  activeAccountId: string | null
}

/** Cuántas vistas puede guardar un propietario. */
export const MAX_SAVED_VIEWS = 12

/** Largo máximo del nombre de una vista. */
export const MAX_VIEW_NAME = 40

export type SavedView = {
  id: string
  name: string
  filters: GlobalFilters
  createdAt: number
}

/**
 * Clave del propietario: quién mira y desde qué cuenta.
 *
 * Cadena vacía cuando no hay sesión —no hay nada que guardar— o cuando el rol
 * no filtra: los almacenes la tratan como «no persistir».
 */
export function ownerKeyFor(principal: FilterOwner | null): string {
  if (principal === null) return ''
  return `usuario:${principal.userId}|cuenta:${principal.activeAccountId ?? 'global'}`
}

// ── Filtros activos · criterio 4 ─────────────────────────────────────────

const filtersStore = createKeyedStore<GlobalFilters>({
  key: 'tc.global-filters.v1',
  area: 'session',
  parse: parseFilters,
  messages: {
    unavailable: 'Este navegador no conserva los filtros al recargar la página.',
    corrupt: 'Los filtros de la sesión estaban dañados y se ha vuelto a empezar sin filtros.',
    malformed: 'Los filtros guardados de este alcance no tenían el formato esperado.',
    full: 'No se pudieron conservar los filtros: el almacenamiento del navegador está lleno o bloqueado.',
  },
})

export function readFilters(ownerKey: string) {
  return filtersStore.read(ownerKey)
}

export function writeFilters(ownerKey: string, filters: GlobalFilters) {
  return filtersStore.write(ownerKey, filters)
}

export function clearFilters(ownerKey: string) {
  return filtersStore.clear(ownerKey)
}

// ── Vistas guardadas · criterio 3 ────────────────────────────────────────

/**
 * Valida una lista de vistas venida del almacén.
 *
 * Una vista con filtros irreconocibles se DESCARTA en vez de tumbar la lista
 * entera: perder una vista de doce es molesto, perder las doce es peor.
 */
function parseViews(raw: unknown): SavedView[] | null {
  if (!Array.isArray(raw)) return null

  const views: SavedView[] = []
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue
    const candidate = entry as Record<string, unknown>
    if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') continue

    const filters = parseFilters(candidate.filters)
    if (filters === null) continue

    views.push({
      id: candidate.id,
      name: candidate.name.slice(0, MAX_VIEW_NAME),
      filters,
      createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : 0,
    })
  }

  return views.slice(0, MAX_SAVED_VIEWS)
}

const viewsStore = createKeyedStore<SavedView[]>({
  key: 'tc.saved-views.v1',
  area: 'local',
  parse: parseViews,
  messages: {
    unavailable: 'Este navegador no permite guardar vistas de filtros.',
    corrupt: 'Las vistas guardadas estaban dañadas y no se pudieron leer.',
    malformed: 'Las vistas guardadas de este alcance no tenían el formato esperado.',
    full: 'No se pudo guardar la vista: el almacenamiento del navegador está lleno o bloqueado.',
  },
})

export function readViews(ownerKey: string) {
  return viewsStore.read(ownerKey)
}

export function writeViews(ownerKey: string, views: SavedView[]) {
  return viewsStore.write(ownerKey, views)
}

/**
 * Identificador de una vista.
 *
 * Lleva el instante y una parte del nombre: no hace falta que sea imposible de
 * adivinar, hace falta que no choque con otra del mismo propietario.
 */
export function viewIdFor(name: string, at: number): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    // Los acentos quedan sueltos tras `NFD`; se descartan en vez de dejar que
    // el filtro de abajo los convierta en guiones.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24)
  return `vista_${at.toString(36)}_${slug || 'sin-nombre'}`
}

/** Nombre utilizable, o el motivo por el que no lo es. */
export function validateViewName(
  name: string,
  existing: SavedView[],
): { ok: true; name: string } | { ok: false; message: string } {
  const trimmed = name.trim().replace(/\s+/g, ' ')

  if (trimmed === '') return { ok: false, message: 'Ponle un nombre a la vista para poder guardarla.' }
  if (trimmed.length > MAX_VIEW_NAME) {
    return { ok: false, message: `El nombre no puede pasar de ${MAX_VIEW_NAME} caracteres.` }
  }
  if (existing.some((view) => view.name.toLowerCase() === trimmed.toLowerCase())) {
    return {
      ok: false,
      message: `Ya tienes una vista llamada «${trimmed}». Cámbiale el nombre o actualiza la que ya existe.`,
    }
  }
  if (existing.length >= MAX_SAVED_VIEWS) {
    return {
      ok: false,
      message: `Has llegado al máximo de ${MAX_SAVED_VIEWS} vistas guardadas. Borra alguna para guardar otra.`,
    }
  }

  return { ok: true, name: trimmed }
}

/** Solo para los tests: deja los dos almacenes como recién estrenados. */
export function resetFilterStores() {
  filtersStore.reset()
  viewsStore.reset()
}


