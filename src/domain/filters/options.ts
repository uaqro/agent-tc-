/**
 * US-010 — Catálogo de valores filtrables del alcance.
 * ═══════════════════════════════════════════════════
 * Lo que puede elegirse en cada dimensión sale del PADRÓN de las cuentas del
 * alcance, no de los datos que se estén viendo. La diferencia importa: si las
 * opciones salieran de la foto cargada, una unidad que hoy no ha repostado
 * desaparecería del selector, y no poder preguntar por ella es justo lo
 * contrario de lo que hace útil un filtro.
 *
 * Por eso el catálogo se construye sin esperar a la carga: está disponible
 * mientras el dashboard todavía muestra el esqueleto.
 */
import { COST_CENTER_IDS, ROUTE_IDS, UNIT_GROUPS, fleetDriversOf, fleetUnitsOf } from '../datasource/active'
import { BEHAVIOR_LABELS, DRIVING_BEHAVIORS, type UnitGroup } from '../dashboard/types'
import { levelName, pathOf, unitPathIndex, type OrgTree } from '../org/types'
import type { Account } from '../data/accounts'
import { ANY, NO_DRIVER, type GlobalFilters } from './types'

export type FilterOption = {
  value: string
  label: string
  /** Segunda línea del selector: matrícula, grupo, cuenta, aviso de licencia. */
  hint?: string
}

export type UnitOption = FilterOption & {
  accountId: string
  group: UnitGroup
  costCenter: string
  fuel: string
  /** Producto de Edenred de la unidad — sesión con Joaquín Miguens (20-ago). */
  product: string
  /** Ruta organizativa — US-013. Vacía si el organigrama no la sitúa. */
  orgPath: readonly string[]
}

export type DriverOption = FilterOption & {
  accountId: string
  group: UnitGroup
  licenseExpired: boolean
}

/**
 * Nodo del organigrama como valor filtrable — US-013.
 *
 * No se pinta en un desplegable: existe para que el indicador de filtros
 * activos pueda escribir «División Larga Distancia» en vez del identificador,
 * y para que `reconcile` sepa si el nodo guardado sigue existiendo.
 */
export type OrgNodeOption = FilterOption & {
  accountId: string
  level: number
  /** Nombre del nivel: «División», «Área»… */
  levelName: string
}

export type FilterOptions = {
  costCenters: FilterOption[]
  groups: FilterOption[]
  /** Rutas operativas — US-016. Del catálogo, no de la foto cargada. */
  routes: FilterOption[]
  /** Comportamientos de conducción — US-016. */
  behaviors: FilterOption[]
  units: UnitOption[]
  drivers: DriverOption[]
  orgNodes: OrgNodeOption[]
  /** Cuentas del alcance. Con más de una, las etiquetas la llevan delante. */
  accountCount: number
}

export const EMPTY_OPTIONS: FilterOptions = {
  costCenters: [],
  groups: [],
  routes: [],
  behaviors: [],
  units: [],
  drivers: [],
  orgNodes: [],
  accountCount: 0,
}

/**
 * Catálogo del alcance.
 *
 * `at` fija el instante contra el que se mide la vigencia de las licencias:
 * llega por parámetro, como todo lo demás del módulo, para que la etiqueta de
 * un conductor no dependa de a qué hora se abriera la pantalla.
 */
export function buildFilterOptions(
  accounts: Account[],
  at: number,
  /**
   * Organigramas vigentes por cuenta — US-013.
   *
   * Llegan por parámetro y no se leen del módulo de estructura porque son
   * EDITABLES: el catálogo tiene que reflejar lo que el administrador acaba de
   * cambiar, no lo que venía de fábrica.
   */
  trees: ReadonlyMap<string, OrgTree> = new Map(),
): FilterOptions {
  const multi = accounts.length > 1
  const units: UnitOption[] = []
  const drivers: DriverOption[] = []
  const orgNodes: OrgNodeOption[] = []

  for (const account of accounts) {
    const tree = trees.get(account.id)
    const paths = tree === undefined ? new Map<string, readonly string[]>() : unitPathIndex(tree)
    const nodeNames = new Map(tree?.nodes.map((node) => [node.id, node.name]) ?? [])

    if (tree !== undefined) {
      for (const node of tree.nodes) {
        orgNodes.push({
          value: node.id,
          label: node.name,
          // La ruta hasta él, para distinguir dos «Departamento Norte» de
          // divisiones distintas sin tener que abrir el árbol.
          hint: pathOf(tree, node.id)
            .slice(0, -1)
            .map((ancestorId) => nodeNames.get(ancestorId) ?? ancestorId)
            .join(' › '),
          accountId: account.id,
          level: node.level,
          levelName: levelName(tree, node.level),
        })
      }
    }

    for (const unit of fleetUnitsOf(account)) {
      units.push({
        value: unit.id,
        label: `${unit.id} · ${unit.plate}`,
        hint: multi ? `${account.name} · ${unit.group}` : unit.group,
        accountId: account.id,
        group: unit.group,
        costCenter: unit.costCenter,
        fuel: unit.fuel,
        product: unit.product,
        orgPath: paths.get(unit.id) ?? [],
      })
    }

    for (const driver of fleetDriversOf(account)) {
      const licenseExpired = driver.licenseExpiresAt < at
      drivers.push({
        value: driver.id,
        label: driver.name,
        hint: [driver.id, multi ? account.name : null, licenseExpired ? 'licencia vencida' : null]
          .filter((part): part is string => part !== null)
          .join(' · '),
        accountId: account.id,
        group: driver.group,
        licenseExpired,
      })
    }
  }

  // El padrón sale ordenado por identificador; los conductores, por nombre,
  // que es como los busca quien los conoce.
  drivers.sort((a, b) => a.label.localeCompare(b.label, 'es-MX'))

  return {
    costCenters: COST_CENTER_IDS.map((id) => ({ value: id, label: id })),
    groups: UNIT_GROUPS.map((group) => ({ value: group, label: group })),
    routes: ROUTE_IDS.map((id) => ({ value: id, label: id })),
    behaviors: DRIVING_BEHAVIORS.map((id) => ({ value: id, label: BEHAVIOR_LABELS[id] })),
    units,
    drivers,
    orgNodes,
    accountCount: accounts.length,
  }
}

/**
 * Unidades que siguen teniendo sentido con los OTROS filtros puestos.
 *
 * Las dimensiones se encadenan: elegido «Corredor Norte», ofrecer las unidades
 * de la Zona Metropolitana solo sirve para que quien las elija se quede con la
 * pantalla vacía sin entender por qué.
 */
export function visibleUnits(options: FilterOptions, filters: GlobalFilters): UnitOption[] {
  return options.units.filter((unit) => {
    if (filters.group !== ANY && unit.group !== filters.group) return false
    if (filters.costCenter !== ANY && unit.costCenter !== filters.costCenter) return false
    if (filters.fuel !== ANY && unit.fuel !== filters.fuel) return false
    if (filters.product !== ANY && unit.product !== filters.product) return false
    // US-013: dentro de una división solo se ofrecen sus unidades.
    if (filters.orgNodeId !== ANY && !unit.orgPath.includes(filters.orgNodeId)) return false
    return true
  })
}

/** Lo mismo para conductores: el grupo es lo único que los acota en el padrón. */
export function visibleDrivers(options: FilterOptions, filters: GlobalFilters): DriverOption[] {
  if (filters.group === ANY) return options.drivers
  return options.drivers.filter((driver) => driver.group === filters.group)
}

/**
 * Suelta las elecciones que la última acaba de dejar imposibles.
 *
 * Elegida la unidad ECO-3042 del Corredor Norte y cambiado después el grupo a
 * Occidente, las dos condiciones no se cumplen a la vez y la pantalla queda
 * vacía. Nadie quiso pedir eso: quiso mirar Occidente. Así que la elección
 * ANTIGUA cede ante la nueva, en vez de dejar que el filtro se contradiga.
 *
 * «Sin conductor» no cede nunca: no pertenece a ningún grupo y sigue teniendo
 * sentido con cualquier combinación.
 */
export function cascade(filters: GlobalFilters, options: FilterOptions): GlobalFilters {
  const next = { ...filters }

  if (
    next.unitId !== ANY &&
    !visibleUnits(options, next).some((unit) => unit.value === next.unitId)
  ) {
    next.unitId = ANY
  }

  if (
    next.driverId !== ANY &&
    next.driverId !== NO_DRIVER &&
    !visibleDrivers(options, next).some((driver) => driver.value === next.driverId)
  ) {
    next.driverId = ANY
  }

  return next
}

/**
 * Deja el filtro dentro de lo que el alcance actual permite elegir.
 *
 * Se aplica al cambiar de cuenta activa, al recuperar los filtros de la sesión
 * y al aplicar una vista guardada. Sin esto, un Account Manager que salta de
 * cuenta arrastraría la unidad de la anterior —un identificador que en la
 * nueva cuenta no existe— y vería una pantalla vacía sin ninguna explicación:
 * el filtro seguiría diciendo «ECO-1042» y no habría ningún ECO-1042 que ver.
 *
 * Devuelve también QUÉ se cayó, porque quitarle a alguien un filtro en
 * silencio es peor que no quitárselo.
 */
export type Reconciled = {
  filters: GlobalFilters
  /** Dimensiones cuyo valor no existe en este alcance y se han soltado. */
  dropped: string[]
}

export function reconcile(filters: GlobalFilters, options: FilterOptions): Reconciled {
  const dropped: string[] = []
  const next = { ...filters }

  const keep = (
    dimension: 'costCenter' | 'group' | 'unitId' | 'driverId' | 'orgNodeId' | 'routeId' | 'behavior',
    valid: boolean,
  ) => {
    if (filters[dimension] === ANY || valid) return
    next[dimension] = ANY
    dropped.push(filters[dimension])
  }

  keep('orgNodeId', options.orgNodes.some((option) => option.value === filters.orgNodeId))
  keep('costCenter', options.costCenters.some((option) => option.value === filters.costCenter))
  keep('group', options.groups.some((option) => option.value === filters.group))
  keep('routeId', options.routes.some((option) => option.value === filters.routeId))
  keep('behavior', options.behaviors.some((option) => option.value === filters.behavior))
  keep('unitId', options.units.some((option) => option.value === filters.unitId))
  keep(
    'driverId',
    filters.driverId === NO_DRIVER ||
      options.drivers.some((option) => option.value === filters.driverId),
  )

  return { filters: next, dropped }
}
