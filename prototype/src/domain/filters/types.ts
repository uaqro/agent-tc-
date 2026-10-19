/**
 * EP-02 · US-010 — Contexto de filtros globales.
 * ═════════════════════════════════════════════
 * «Filtros globales de contexto que afecten a todos los módulos visibles
 * simultáneamente».
 *
 * Este módulo es la parte TRANSVERSAL de la historia y por eso vive fuera de
 * `dashboard/`: hoy el único módulo que consume el contexto es el dashboard,
 * pero consumos (EP-03) e inventario (EP-04) tienen que heredarlo sin
 * refactorizar nada. Lo único que se les va a pedir es que sus registros
 * expongan la forma `Filterable`.
 *
 * Tres decisiones sostienen el resto:
 *
 *   1. UNA SOLA FUNCIÓN DE CORTE. `matches` decide para cualquier registro y
 *      cualquier combinación. No hay un camino para las tarjetas y otro para
 *      la serie histórica: los dos preguntan aquí, así que no pueden
 *      contradecirse.
 *
 *   2. EL CORTE ES ESTRUCTURAL, NO NOMINAL. `matches` no sabe qué es un
 *      `UnitDay`, un `FuelEvent` ni una fila del histórico. Sabe que le llega
 *      algo con unidad, combustible, centro de coste, grupo, conductor, ruta
 *      organizativa, ruta operativa y comportamiento. Los tres tipos del
 *      dominio ya encajan, y los de EP-04 encajarán igual.
 *
 *   3. EL PERIODO NO RECORTA, CAMBIA LA CONSULTA. Las otras ocho dimensiones
 *      se aplican sobre datos ya traídos; el periodo decide CUÁNTOS días se
 *      piden. Por eso `narrows` lo deja fuera: un periodo de siete días no es
 *      un dato recortado, es otro dato.
 */
import type { DrivingBehavior, FuelProduct, FuelType, RouteId, UnitGroup } from '../dashboard/types'

/** Valor de una dimensión sin recortar. */
export const ANY = 'todos'

/**
 * Conductor ausente.
 *
 * No es «cualquiera»: es exactamente las unidades-día que NO tuvieron
 * conductor, que en el mock son las que estaban en taller. Sin un valor
 * propio, ese conjunto no se puede pedir —quedaría escondido detrás de
 * «todos»— y es justo el que interesa cuando se audita una flota.
 */
export const NO_DRIVER = 'sin_conductor'

export type GlobalFilters = {
  /** Días cerrados del periodo, sin contar el día en curso. */
  periodDays: number
  fuel: FuelType | typeof ANY
  /**
   * Producto de Edenred — sesión con Joaquín Miguens (20-ago), el «superfiltro».
   *
   * Entra al contexto GLOBAL y no como control de una pantalla porque eso es
   * literalmente lo que se pidió: que corte a la vez dashboard, flota y
   * consumos. Es la novena dimensión y no estrena mecanismo ninguno — ver
   * `FuelProduct` para por qué cuelga de la unidad.
   */
  product: FuelProduct | typeof ANY
  costCenter: string | typeof ANY
  group: UnitGroup | typeof ANY
  unitId: string | typeof ANY
  driverId: string | typeof ANY | typeof NO_DRIVER
  /**
   * Nodo del organigrama seleccionado — US-013.
   *
   * Recorta al SUBÁRBOL, no al nodo: elegir una división incluye todo lo que
   * cuelga de ella. Es la única dimensión que no es una etiqueta plana, y por
   * eso su control no es un desplegable sino el propio navegador jerárquico:
   * una lista plana de veinte nodos miente sobre lo que representa.
   */
  orgNodeId: string | typeof ANY
  /**
   * Ruta operativa recorrida — EP-03 · US-016.
   *
   * Entra al contexto GLOBAL y no como control propio del ranking porque el
   * eje del ranking es una dimensión del filtro, no un vocabulario paralelo.
   * Que el dashboard la herede es la consecuencia buscada: preguntarle a los
   * KPIs «¿y solo la Sierra Madre?» es la misma pregunta que ordenar el gasto
   * por ruta, y tiene que dar la misma cifra.
   */
  routeId: RouteId | typeof ANY
  /** Comportamiento de conducción del día — EP-03 · US-016. */
  behavior: DrivingBehavior | typeof ANY
}

/**
 * Granularidad temporal — EP-03 · US-016, criterio 4.
 * ══════════════════════════════════════════════════
 * «Día, semana, mes, periodo personalizado». Sustituye a los `[7, 15, 30]`
 * sueltos de US-008: eran longitudes sin nombre, y el criterio pide nombres y
 * además una ventana libre.
 *
 * El periodo sigue siendo UN NÚMERO DE DÍAS en `GlobalFilters` y no un enum: la
 * granularidad es cómo se ELIGE la ventana, no cómo se guarda. Guardar el enum
 * obligaría a traducirlo en cada consumidor y dejaría «personalizado» sin sitio
 * donde poner su número.
 */
export type PeriodGranularity = 'dia' | 'semana' | 'mes' | 'personalizado'

export const PERIOD_PRESETS: { id: PeriodGranularity; label: string; days: number }[] = [
  { id: 'dia', label: 'Día', days: 1 },
  { id: 'semana', label: 'Semana', days: 7 },
  { id: 'mes', label: 'Mes', days: 30 },
]

/** Un día cerrado es el mínimo que se puede comparar contra el anterior. */
export const MIN_PERIOD_DAYS = 1

/**
 * Tope de la ventana personalizada.
 *
 * No es estético: la comparación del criterio 3 trae ADEMÁS el periodo
 * anterior, así que el tope real de días generados es el doble. 90 deja el
 * peor caso en 180 días de histórico, que sigue holgadamente dentro del SLO de
 * carga de US-008.
 */
export const MAX_PERIOD_DAYS = 90

/** Qué granularidad representa una ventana de `days` días. */
export function granularityOf(days: number): PeriodGranularity {
  return PERIOD_PRESETS.find((preset) => preset.days === days)?.id ?? 'personalizado'
}

/** Deja una ventana pedida dentro de lo que el prototipo puede sostener. */
export function clampPeriodDays(days: number): number {
  if (!Number.isFinite(days)) return DEFAULT_FILTERS.periodDays
  return Math.min(MAX_PERIOD_DAYS, Math.max(MIN_PERIOD_DAYS, Math.round(days)))
}

export const DEFAULT_FILTERS: GlobalFilters = {
  periodDays: 30,
  fuel: ANY,
  product: ANY,
  costCenter: ANY,
  group: ANY,
  unitId: ANY,
  driverId: ANY,
  orgNodeId: ANY,
  routeId: ANY,
  behavior: ANY,
}

/**
 * Lo que un registro tiene que exponer para que los filtros lo recorten.
 *
 * `UnitDay`, `FuelEvent` y `DayUnitRow` lo cumplen de forma estructural, sin
 * declararlo ni heredar de nada. Un módulo nuevo entra en el contexto global
 * el día que sus registros llevan estos ocho campos.
 */
export type Filterable = {
  unitId: string
  fuel: FuelType
  /** Producto de Edenred de la unidad — ver `FuelProduct`. */
  product: FuelProduct
  costCenter: string
  group: UnitGroup
  /** `null` cuando no hubo conductor: la unidad estaba en taller. */
  driverId: string | null
  /**
   * Ruta organizativa, de la empresa al nodo del que cuelga — US-013.
   *
   * Es la única dimensión que llega como LISTA y no como valor, porque el
   * corte es por SUBÁRBOL: el registro casa si el nodo elegido está en su
   * camino. Llevar la ruta en el propio registro es lo que permite que
   * `matches` siga decidiendo con dos argumentos, sin consultar el árbol ni
   * recibir un índice que alguien acabaría olvidándose de pasar.
   */
  orgPath: readonly string[]
  /** Ruta operativa recorrida ese día — US-016. */
  routeId: RouteId
  /** Comportamiento de conducción de la jornada — US-016. */
  behavior: DrivingBehavior
}

/**
 * Qué puede filtrar el rol activo, según `dashboard.filtros` en ADR-001.
 *
 * Sale del NIVEL de la matriz, nunca del nombre del rol: si mañana el ADR le
 * da nivel Completo al Gestor de Alertas, la barra global le aparece sin tocar
 * una línea de este módulo.
 */
export type FilterScope =
  /** Nivel Completo: filtra todos los módulos que consumen el contexto. */
  | 'global'
  /** Nivel Limitado: «solo filtros del módulo de alertas». */
  | 'alertas'
  /** Sin acceso a filtros. */
  | 'ninguno'

/** Dimensiones que recortan datos, en el orden en que se leen en pantalla. */
export const FILTER_DIMENSIONS = [
  'orgNodeId',
  'product',
  'group',
  'costCenter',
  'routeId',
  'fuel',
  'behavior',
  'unitId',
  'driverId',
] as const

export type FilterDimension = (typeof FILTER_DIMENSIONS)[number]

export const DIMENSION_LABELS: Record<FilterDimension, string> = {
  orgNodeId: 'Organigrama',
  product: 'Producto',
  group: 'Grupo',
  costCenter: 'Centro de coste',
  routeId: 'Ruta',
  fuel: 'Combustible',
  behavior: 'Comportamiento',
  unitId: 'Unidad',
  driverId: 'Conductor',
}

/**
 * ¿Casa este registro con el filtro activo?
 *
 * El único sitio del prototipo donde se decide si un dato entra o no.
 */
export function matches(record: Filterable, filters: GlobalFilters): boolean {
  if (filters.fuel !== ANY && record.fuel !== filters.fuel) return false
  if (filters.product !== ANY && record.product !== filters.product) return false
  if (filters.costCenter !== ANY && record.costCenter !== filters.costCenter) return false
  if (filters.group !== ANY && record.group !== filters.group) return false
  if (filters.routeId !== ANY && record.routeId !== filters.routeId) return false
  if (filters.behavior !== ANY && record.behavior !== filters.behavior) return false
  if (filters.unitId !== ANY && record.unitId !== filters.unitId) return false

  // Subárbol, no nodo: la unidad casa si el nodo elegido está en su camino.
  if (filters.orgNodeId !== ANY && !record.orgPath.includes(filters.orgNodeId)) return false

  if (filters.driverId === NO_DRIVER) return record.driverId === null
  if (filters.driverId !== ANY && record.driverId !== filters.driverId) return false

  return true
}

/** `true` si hay alguna dimensión que recorte los datos. El periodo no recorta. */
export function narrows(filters: GlobalFilters): boolean {
  return FILTER_DIMENSIONS.some((dimension) => filters[dimension] !== ANY)
}

/** Cuántas dimensiones están recortando. Es el número del indicador. */
export function activeCount(filters: GlobalFilters): number {
  return FILTER_DIMENSIONS.filter((dimension) => filters[dimension] !== ANY).length
}

/** Los mismos filtros sin ninguna dimensión activa, conservando el periodo. */
export function clearDimensions(filters: GlobalFilters): GlobalFilters {
  return { ...DEFAULT_FILTERS, periodDays: filters.periodDays }
}

/** Dos filtros son el mismo si coinciden en todas las dimensiones. */
export function sameFilters(a: GlobalFilters, b: GlobalFilters): boolean {
  return (
    a.periodDays === b.periodDays &&
    FILTER_DIMENSIONS.every((dimension) => a[dimension] === b[dimension])
  )
}

/**
 * Normaliza cualquier cosa que venga de fuera —almacén del navegador, una
 * vista guardada por una versión anterior— a un filtro utilizable.
 *
 * Devuelve el filtro por defecto en lugar de lanzar: un valor corrupto no
 * puede tumbar la pantalla, y silenciarlo tampoco vale —quien llama recibe
 * `null` cuando el valor no era reconocible y decide si lo cuenta—.
 */
export function parseFilters(value: unknown): GlobalFilters | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>

  /**
   * Ya no se comprueba contra una lista cerrada — US-016, criterio 4.
   *
   * Con «periodo personalizado» cualquier entero del rango es legítimo, así
   * que lo que se valida es el RANGO. Un valor fuera se acota en vez de tirar
   * el filtro entero: quien guardó una vista de 45 días con una versión que
   * permitía 120 prefiere que se le queden 90 a perder también los otros siete
   * filtros que llevaba puestos.
   */
  const periodDays = typeof raw.periodDays === 'number' ? raw.periodDays : null
  if (periodDays === null || !Number.isFinite(periodDays)) return null

  const dimension = (key: FilterDimension): string =>
    typeof raw[key] === 'string' && raw[key] !== '' ? (raw[key] as string) : ANY

  return {
    periodDays: clampPeriodDays(periodDays),
    fuel: dimension('fuel') as GlobalFilters['fuel'],
    product: dimension('product') as GlobalFilters['product'],
    costCenter: dimension('costCenter'),
    group: dimension('group'),
    routeId: dimension('routeId'),
    behavior: dimension('behavior') as GlobalFilters['behavior'],
    unitId: dimension('unitId'),
    orgNodeId: dimension('orgNodeId'),
    driverId: dimension('driverId'),
  }
}
