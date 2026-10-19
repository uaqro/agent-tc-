/**
 * Agregaciones del dashboard — criterio de aceptación 2 de US-008 y de US-010.
 * ══════════════════════════════════════════════════════════════════════════
 * Funciones puras sobre la foto de actividad: entra `ActivitySnapshot`, sale
 * lo que pintan las tarjetas, la gráfica y la tabla. Sin React, sin estado y
 * sin relojes propios —el instante llega siempre por parámetro—, que es lo que
 * las hace verificables en la suite sin montar la interfaz.
 *
 * El corte lo decide `filters/types`, no este módulo. Aquí solo se elige QUÉ
 * colección se recorre —filas del histórico, unidades del día, despachos— y se
 * le pregunta a `matches` por cada elemento. Es lo que garantiza el criterio 2
 * de US-010: los widgets no pueden discrepar entre sí sobre qué está filtrado,
 * porque ninguno decide nada.
 *
 * Los filtros componen de forma exacta: cada unidad-día cae en una única fila,
 * así que cualquier combinación se resuelve sumando las que casan. No hay
 * reparto proporcional en ningún punto.
 */
import type { FleetAlert } from '../data/fleet-alerts'
import { matches, narrows, type GlobalFilters } from '../filters/types'
import { FUEL_LABELS } from './types'
import type {
  AccountActivity,
  ActivitySnapshot,
  DayPoint,
  FuelEvent,
  FuelType,
  UnitDay,
} from './types'

const DAY = 24 * 60 * 60_000

// ── Resúmenes por día y por periodo ──────────────────────────────────────

export type DaySummary = {
  liters: number
  amountMxn: number
  savingMxn: number
  activeUnits: number
  fleetUnits: number
}

const EMPTY_SUMMARY: DaySummary = {
  liters: 0,
  amountMxn: 0,
  savingMxn: 0,
  activeUnits: 0,
  fleetUnits: 0,
}

export function summarizeDay(point: DayPoint, filters: GlobalFilters): DaySummary {
  const summary = { ...EMPTY_SUMMARY }
  for (const row of point.rows) {
    if (!matches(row, filters)) continue
    summary.liters += row.liters
    summary.amountMxn += row.amountMxn
    summary.savingMxn += row.savingMxn
    // Una fila es una unidad del padrón de ese día: contarlas es contar flota.
    summary.fleetUnits += 1
    if (row.active) summary.activeUnits += 1
  }
  return summary
}

/** Serie del periodo, un punto por día, ya filtrada. */
export type SeriesPoint = DaySummary & {
  at: number
  label: string
  partial: boolean
}

export function periodSeries(snapshot: ActivitySnapshot, filters: GlobalFilters): SeriesPoint[] {
  // Los días de todas las cuentas del alcance se suman por fecha: un Admin
  // Edenred sin cuenta activa ve la serie consolidada de su cartera.
  const byDate = new Map<number, SeriesPoint>()

  for (const account of snapshot.accounts) {
    for (const point of account.period) {
      const summary = summarizeDay(point, filters)
      const existing = byDate.get(point.at)
      if (!existing) {
        byDate.set(point.at, { at: point.at, label: point.label, partial: point.partial, ...summary })
        continue
      }
      existing.liters += summary.liters
      existing.amountMxn += summary.amountMxn
      existing.savingMxn += summary.savingMxn
      existing.activeUnits += summary.activeUnits
      existing.fleetUnits += summary.fleetUnits
    }
  }

  return [...byDate.values()].sort((a, b) => a.at - b.at)
}

export function totalOf(points: SeriesPoint[]): DaySummary {
  const total = { ...EMPTY_SUMMARY }
  for (const point of points) {
    total.liters += point.liters
    total.amountMxn += point.amountMxn
    total.savingMxn += point.savingMxn
  }
  return total
}

// ── Serie horaria del día en curso ───────────────────────────────────────

export type HourPoint = {
  hour: number
  liters: number
  amountMxn: number
  savingMxn: number
  refuels: number
}

/**
 * Litros por hora del día. `lastHour` acota el eje a la hora en curso: pintar
 * las 24 horas cuando son las once de la mañana sugeriría que la flota dejó de
 * repostar, que es justo lo contrario de lo que pasa.
 */
export function hourSeries(
  events: FuelEvent[],
  dayStart: number,
  lastHour: number,
  filters: GlobalFilters,
): HourPoint[] {
  const points: HourPoint[] = []
  for (let hour = 0; hour <= Math.min(23, lastHour); hour++) {
    points.push({ hour, liters: 0, amountMxn: 0, savingMxn: 0, refuels: 0 })
  }

  for (const event of events) {
    if (!matches(event, filters)) continue
    const point = points[Math.floor((event.at - dayStart) / 3_600_000)]
    if (!point) continue
    point.liters += event.liters
    point.amountMxn += event.amountMxn
    point.savingMxn += event.listAmountMxn - event.amountMxn
    if (!event.refund) point.refuels += 1
  }

  return points
}

// ── Unidades del día ─────────────────────────────────────────────────────

export function unitsOf(snapshot: ActivitySnapshot, filters: GlobalFilters): UnitDay[] {
  const units: UnitDay[] = []
  for (const account of snapshot.accounts) {
    for (const unit of account.units) {
      if (matches(unit, filters)) units.push(unit)
    }
  }
  return units
}

/**
 * Las unidades de la jornada, de mayor a menor importe — decisión de Álvaro
 * (25-ago), tras revisar el orden que Joaquín pidió mirar.
 * ════════════════════════════════════════════════════════════════════════
 * La tabla no ordenaba: salía en orden de padrón, y era su pie el que sugería
 * ordenar por importe. Ahora el orden sugerido es el real.
 *
 * Es un `sort` y nada más: no calcula anomalías, ni desviación sobre la media,
 * ni umbrales. Esa lógica ya vive en `incidents` y en el análisis de drivers de
 * US-016, y una segunda definición de «unidad que llama la atención» acabaría
 * diciendo algo distinto de la primera.
 *
 * Devuelve una COPIA. Ordenar en el sitio le cambiaría el orden a quien haya
 * pasado la lista para otra cosa —los KPIs y el panel de incidencias comen de
 * la misma—, y sería un fallo silencioso: no rompe nada, solo desordena algo
 * lejos de aquí.
 */
export function unitsByAmount(units: UnitDay[]): UnitDay[] {
  // Descendente: la pregunta de la mañana es quién se está gastando el dinero.
  // Los abonos —importe negativo— quedan al final y se llega a ellos con un
  // clic en la cabecera, que es lo que explica el pie de la tabla.
  return [...units].sort((a, b) => b.amountMxn - a.amountMxn)
}

// ── Alertas dentro del contexto ──────────────────────────────────────────

/**
 * Alertas que casan con los filtros globales — criterio 2 de US-010.
 *
 * Hasta US-009 el panel de alertas era el único widget que se quedaba fuera
 * del filtrado, y con dos dimensiones se defendía: una alerta no tiene
 * combustible ni centro de coste. Con unidad y conductor sí los tiene, y
 * dejarla al margen pasó a ser una contradicción en pantalla: filtrar por una
 * unidad y seguir viendo el recuento de alertas de toda la flota, con la
 * etiqueta «Datos filtrados» puesta encima.
 *
 * Las dimensiones de la unidad se resuelven contra el padrón del día; el
 * conductor sale de la propia alerta, no del padrón, porque la alerta la
 * levantó quien conducía ENTONCES y hoy puede llevarla otro.
 *
 * Una alerta cuya unidad no está en la foto cargada se descarta cuando hay
 * filtros puestos: no se puede afirmar que case, y afirmarlo sería inflar un
 * recuento que alguien va a usar para decidir.
 */
export function alertsMatching(
  alerts: FleetAlert[],
  snapshot: ActivitySnapshot | null,
  filters: GlobalFilters,
): FleetAlert[] {
  if (!narrows(filters)) return alerts

  const padron = new Map<string, UnitDay>()
  for (const account of snapshot?.accounts ?? []) {
    for (const unit of account.units) padron.set(unit.unitId, unit)
  }

  return alerts.filter((alert) => {
    const unit = padron.get(alert.unitId)
    if (unit === undefined) return false
    return matches(
      {
        unitId: alert.unitId,
        fuel: unit.fuel,
        // El producto es de la unidad, como el combustible.
        product: unit.product,
        costCenter: unit.costCenter,
        group: unit.group,
        // La jerarquía es de la unidad, como el combustible: la alerta no
        // pertenece a un departamento, la unidad sí.
        orgPath: unit.orgPath,
        /**
         * Ruta y conducción salen de la JORNADA DE HOY de la unidad — US-016.
         *
         * Es el mismo compromiso que ya se hacía con el combustible y el
         * grupo, y tiene el mismo límite: la alerta no lleva dentro por qué
         * ruta iba la unidad cuando saltó. El conductor sigue siendo la
         * excepción porque la alerta sí lo lleva. Si algún día la alerta trae
         * su propia ruta, se cambian estas dos líneas y nada más.
         */
        routeId: unit.routeId,
        behavior: unit.behavior,
        driverId: alert.driverId,
      },
      filters,
    )
  })
}

// ── Variaciones ──────────────────────────────────────────────────────────

export type Delta = {
  /** Variación relativa. `null` cuando no hay base con la que comparar. */
  pct: number | null
  direction: 'up' | 'down' | 'neutral'
}

const NO_DELTA: Delta = { pct: null, direction: 'neutral' }

export function delta(current: number, previous: number): Delta {
  if (previous === 0) return NO_DELTA
  const pct = (current - previous) / Math.abs(previous)
  // Menos de medio punto no es una tendencia, es ruido.
  if (Math.abs(pct) < 0.005) return { pct, direction: 'neutral' }
  return { pct, direction: pct > 0 ? 'up' : 'down' }
}

/** Suma de los eventos que casan con el filtro hasta un instante dado. */
function sumEvents(
  events: FuelEvent[],
  filters: GlobalFilters,
  until: number,
): { liters: number; amountMxn: number } {
  let liters = 0
  let amountMxn = 0
  for (const event of events) {
    if (event.at > until || !matches(event, filters)) continue
    liters += event.liters
    amountMxn += event.amountMxn
  }
  return { liters, amountMxn }
}

// ── KPIs del día ─────────────────────────────────────────────────────────

export type DashboardKpis = {
  // Consumo del día
  litersToday: number
  amountToday: number
  refuelsToday: number
  litersDelta: Delta
  amountDelta: Delta

  /**
   * Precio medio del litro de HOY, al contrato de Edenred.
   * ═════════════════════════════════════════════════════
   * Sesión con Joaquín Miguens (20-ago): entra como KPI de la fila. Estaba en
   * el listado original que él mismo había compartido y se había quedado solo
   * dentro del panel de precios, que es una serie de treinta días: para saber
   * a cuánto está saliendo el litro hoy había que leer un gráfico.
   *
   * `null` sin litros despachados —o con el neto en negativo por un abono—:
   * dividir por cero no da un precio de cero, da que no hay precio.
   */
  contractPriceToday: number | null
  /** Lo que habría costado ese mismo litro a precio de calle. `null` igual. */
  listPriceToday: number | null

  /**
   * Rendimiento de la FLOTA, en km/L — sesión con Joaquín Miguens (20-ago).
   * ══════════════════════════════════════════════════════════════════════
   * «Pongámosle el rendimiento de la flota, no le pongas el conjunto, no media
   * de medias».
   *
   * Kilómetros TOTALES entre litros TOTALES de las unidades del alcance. No es
   * el promedio de los rendimientos por unidad ni el de los rendimientos por
   * centro de coste: promediar ratios le daría el mismo peso a la unidad que
   * hizo 40 km que a la que hizo 600, y la cifra resultante no sería el
   * rendimiento de nada —no se puede reconstruir con ella ni los kilómetros ni
   * los litros de los que salió—.
   */
  fleetKm: number
  fleetEfficiency: number | null

  /**
   * Unidades activas · criterio 2.
   *
   * «Activa» es «ha reportado hoy», y es la MISMA definición que usan las
   * filas del histórico. Contar aquí el padrón de unidades operativas y allí
   * las que reportaron daría dos cifras distintas para el mismo concepto, y la
   * comparación entre ambas saldría disparatada.
   */
  activeUnits: number
  /** Padrón completo del alcance. */
  fleetUnits: number
  /** Unidades que se espera que operen hoy: el padrón menos las de taller. */
  expectedUnits: number
  /** Esperadas que todavía no han reportado. */
  unreported: number
  /** De esas, las que no van a reportar: el dispositivo está mudo. */
  mute: number
  inWorkshop: number
  activeUnitsDelta: Delta

  // Alertas pendientes
  pendingAlerts: number
  criticalAlerts: number
  acknowledgedAlerts: number

  // Ahorro del periodo
  savingPeriodMxn: number
  amountPeriodMxn: number
  /** Ahorro sobre lo que habría costado a precio de lista. */
  savingPeriodPct: number
  savingTodayMxn: number
  savingDelta: Delta
  /** Días cerrados del periodo en los que el ahorro salió negativo. */
  negativeSavingDays: number
}

/**
 * Los KPIs del día, ya recortados por el contexto global.
 *
 * `alerts` llega ya acotado por el alcance del rol Y por los filtros: quien
 * llama las pasa por `alertsMatching`, y así el recuento de la tarjeta y la
 * lista del panel salen de la misma colección. Filtrarlas aquí dentro y
 * también fuera sería contarlas dos veces con dos criterios.
 */
export function computeKpis(
  snapshot: ActivitySnapshot,
  alerts: FleetAlert[],
  filters: GlobalFilters,
  at: number,
): DashboardKpis {
  const dayStart = startOfDayLocal(at)
  const elapsedMs = at - dayStart

  const units = unitsOf(snapshot, filters)
  const series = periodSeries(snapshot, filters)
  const today = series.length > 0 ? series[series.length - 1]! : null
  const closed = series.filter((point) => !point.partial)

  // Ayer a esta misma hora: la única comparación honesta a media jornada.
  let yesterdayLiters = 0
  let yesterdayAmount = 0
  for (const account of snapshot.accounts) {
    const yesterdayStart = dayStart - DAY
    const partial = sumEvents(account.yesterdayEvents, filters, yesterdayStart + elapsedMs)
    yesterdayLiters += partial.liters
    yesterdayAmount += partial.amountMxn
  }

  // Ha reportado hoy: la misma regla que aplican las filas del histórico.
  const activeUnits = units.filter((unit) => unit.lastReportAt !== null).length
  const expectedUnits = units.filter((unit) => unit.status !== 'en_taller').length
  const activeYesterday = snapshot.accounts.reduce(
    (total, account) => total + account.activeUnitsYesterday,
    0,
  )

  const totals = totalOf(series)
  const listAmount = totals.amountMxn + totals.savingMxn
  const dailySavingAverage = closed.length > 0 ? totalOf(closed).savingMxn / closed.length : 0

  // Precio medio del litro de hoy. El importe de lista es lo cobrado más lo
  // ahorrado, por definición: la misma identidad que usa `pricePoints`.
  const litersToday = today?.liters ?? 0
  const hasVolumeToday = litersToday > 0

  // Rendimiento agregado: kilómetros totales entre litros totales. Se suman
  // los DOS numeradores antes de dividir una sola vez, que es lo que separa el
  // agregado de la media de medias.
  const fleetKm = units.reduce((total, unit) => total + unit.km, 0)
  const fleetLiters = units.reduce((total, unit) => total + unit.liters, 0)

  return {
    litersToday,
    amountToday: today?.amountMxn ?? 0,
    refuelsToday: units.reduce((count, unit) => count + unit.refuels, 0),
    litersDelta: delta(today?.liters ?? 0, yesterdayLiters),
    amountDelta: delta(today?.amountMxn ?? 0, yesterdayAmount),

    contractPriceToday: hasVolumeToday ? (today?.amountMxn ?? 0) / litersToday : null,
    listPriceToday: hasVolumeToday
      ? ((today?.amountMxn ?? 0) + (today?.savingMxn ?? 0)) / litersToday
      : null,

    fleetKm,
    fleetEfficiency: fleetLiters > 0 ? fleetKm / fleetLiters : null,

    activeUnits,
    fleetUnits: units.length,
    expectedUnits,
    unreported: expectedUnits - activeUnits,
    mute: units.filter((unit) => unit.status === 'sin_reportar').length,
    inWorkshop: units.filter((unit) => unit.status === 'en_taller').length,
    // El recuento de ayer viene agregado, sin desglosar por ninguna de las
    // cinco dimensiones: con un filtro puesto no hay comparación honesta que
    // dar, y una deshonesta es peor que ninguna.
    activeUnitsDelta: narrows(filters) ? NO_DELTA : delta(activeUnits, activeYesterday),

    pendingAlerts: alerts.filter((alert) => alert.state !== 'resuelta').length,
    criticalAlerts: alerts.filter((alert) => alert.state !== 'resuelta' && alert.severity === 'critica')
      .length,
    acknowledgedAlerts: alerts.filter((alert) => alert.state === 'reconocida').length,

    savingPeriodMxn: totals.savingMxn,
    amountPeriodMxn: totals.amountMxn,
    savingPeriodPct: listAmount > 0 ? totals.savingMxn / listAmount : 0,
    savingTodayMxn: today?.savingMxn ?? 0,
    savingDelta: delta(today?.savingMxn ?? 0, dailySavingAverage),
    negativeSavingDays: closed.filter((point) => point.savingMxn < 0).length,
  }
}

// ── Objetivos del periodo ────────────────────────────────────────────────

/**
 * Metas sobre las que se mide cada KPI.
 *
 * Es la única escritura del dashboard en US-008, y por eso está gobernada por
 * `dashboard.kpis` en intención «escribir»: los roles de lectura las ven, no
 * las tocan.
 *
 * ── Dos metas dadas de baja — sesión con Joaquín Miguens (20-ago) ───────
 * Eran cuatro. Salen `pendingAlerts` y `savingPeriodMxn` porque los KPIs que
 * medían ya no existen en la pantalla: las alertas se fueron del dashboard y
 * el ahorro acumulado depende de un optimizador de cargas que todavía no está.
 *
 * Podrían haberse quedado escondiendo el problema —el panel de metas es otro
 * componente y nadie las habría echado de menos—, y es justo lo que no se
 * puede hacer: una meta sin su KPI es un número que alguien puede negociar,
 * fijar en un contrato y luego pedir que se le rinda cuentas, sin que la
 * plataforma tenga con qué contestarle. Y el log inmutable de `admin.log`
 * estaría registrando ajustes sobre magnitudes que la pantalla no publica.
 *
 * No se archivan «por si vuelven»: si el optimizador llega, la meta de ahorro
 * vuelve con él y con la tarjeta que la mide.
 */
export type KpiTargets = {
  /** Litros/día que la operación se marca como techo. */
  litersPerDay: number
  /** Porcentaje mínimo de flota activa. */
  activeUnitsPct: number
}

/**
 * Metas por defecto derivadas del propio histórico: un objetivo inventado a
 * mano no diría nada sobre esta flota. Se calculan una vez, al primer dato, y
 * a partir de ahí manda lo que edite el usuario con permiso de escritura.
 */
export function defaultTargets(snapshot: ActivitySnapshot, filters: GlobalFilters): KpiTargets {
  const closed = periodSeries(snapshot, filters).filter((point) => !point.partial)
  const days = Math.max(1, closed.length)
  const averageLiters = totalOf(closed).liters / days

  return {
    // Un 3 % por debajo de la media: el objetivo es consumir menos.
    litersPerDay: Math.round(averageLiters * 0.97),
    activeUnitsPct: 92,
  }
}

/** Cumplimiento de un objetivo, acotado a [0, 2] para que la barra no se dispare. */
export function attainment(value: number, target: number): number {
  if (target <= 0) return 0
  return Math.max(0, Math.min(2, value / target))
}

// ── Utilidades ───────────────────────────────────────────────────────────

export function startOfDayLocal(at: number): number {
  const date = new Date(at)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Cuentas del alcance que sí tienen actividad. */
export function accountsWithData(snapshot: ActivitySnapshot): AccountActivity[] {
  return snapshot.accounts.filter((account) => account.fleetSize > 0)
}

// ── Agregaciones de los widgets de US-009 ────────────────────────────────
//
// Cada widget nuevo del catálogo se apoya en una de estas funciones. Siguen
// siendo puras y siguen recibiendo el instante por parámetro: lo que cambia es
// el corte de los datos, no de dónde salen.

/** Fila de un ranking o de un reparto: etiqueta, valor y peso relativo. */
export type RankedRow = {
  id: string
  label: string
  /** Texto ya formateado por quien lo pinta; aquí solo va el número. */
  value: number
  /** Segunda magnitud, para el subtítulo de la fila. */
  secondary: number
  /** Proporción sobre el mayor valor de la lista, en [0, 1]. */
  share: number
}

function ranked(
  rows: { id: string; label: string; value: number; secondary: number }[],
): RankedRow[] {
  const max = rows.reduce((top, row) => Math.max(top, Math.abs(row.value)), 0)
  return rows.map((row) => ({ ...row, share: max === 0 ? 0 : Math.abs(row.value) / max }))
}

/** Las unidades que más han consumido hoy. Ignora las que no han repostado. */
export function topUnitsByConsumption(units: UnitDay[], limit = 10): RankedRow[] {
  const consuming = units
    .filter((unit) => unit.liters > 0)
    .sort((a, b) => b.liters - a.liters)
    .slice(0, limit)

  return ranked(
    consuming.map((unit) => ({
      id: unit.unitId,
      label: `${unit.unitId} · ${unit.plate}`,
      value: unit.liters,
      secondary: unit.amountMxn,
    })),
  )
}

/** Reparto del consumo del día por combustible. */
export function fuelSplit(units: UnitDay[]): RankedRow[] {
  const totals = new Map<FuelType, { liters: number; amountMxn: number }>()

  for (const unit of units) {
    const current = totals.get(unit.fuel) ?? { liters: 0, amountMxn: 0 }
    current.liters += unit.liters
    current.amountMxn += unit.amountMxn
    totals.set(unit.fuel, current)
  }

  const rows = [...totals.entries()]
    .map(([fuel, total]) => ({
      id: fuel,
      label: FUEL_LABELS[fuel],
      value: total.liters,
      secondary: total.amountMxn,
    }))
    .sort((a, b) => b.value - a.value)

  return ranked(rows)
}

/**
 * Rendimiento de la flota entera — sesión con Joaquín Miguens (20-ago).
 * ════════════════════════════════════════════════════════════════════
 * La misma cuenta que hace `efficiencyByCostCenter` para cada centro, hecha
 * una sola vez sobre todas las unidades del alcance. Es el número que el panel
 * enseña primero: el desglose por centro contesta «¿dónde?», pero antes hay
 * que poder contestar «¿cuánto?».
 *
 * NO se obtiene promediando las filas del desglose. Un centro con dos unidades
 * y otro con doscientas pesarían igual, y el resultado no sería el rendimiento
 * de ninguna flota. Se suman kilómetros y litros, y se divide al final.
 */
export type FleetEfficiency = {
  /** Σ km ÷ Σ litros. `null` sin litros con los que dividir. */
  efficiency: number | null
  km: number
  liters: number
  units: number
  /** Centros de coste que aportan al agregado, para poder situarlo. */
  costCenters: number
}

export function fleetEfficiency(units: UnitDay[]): FleetEfficiency {
  let km = 0
  let liters = 0
  const centers = new Set<string>()

  for (const unit of units) {
    km += unit.km
    liters += unit.liters
    centers.add(unit.costCenter)
  }

  return {
    efficiency: liters > 0 ? km / liters : null,
    km,
    liters,
    units: units.length,
    costCenters: centers.size,
  }
}

/** Rendimiento medio de cada centro de coste, en km/L. */
export type EfficiencyRow = {
  costCenter: string
  /** Kilómetros entre litros del conjunto, no la media de las medias. */
  efficiency: number | null
  km: number
  liters: number
  units: number
}

export function efficiencyByCostCenter(units: UnitDay[]): EfficiencyRow[] {
  const totals = new Map<string, { km: number; liters: number; units: number }>()

  for (const unit of units) {
    const current = totals.get(unit.costCenter) ?? { km: 0, liters: 0, units: 0 }
    current.km += unit.km
    current.liters += unit.liters
    current.units += 1
    totals.set(unit.costCenter, current)
  }

  return [...totals.entries()]
    .map(([costCenter, total]) => ({
      costCenter,
      // Con litros en cero —o en negativo por un abono— no hay rendimiento que
      // calcular: es «sin dato», no un cero ni un infinito.
      efficiency: total.liters > 0 ? total.km / total.liters : null,
      km: total.km,
      liters: total.liters,
      units: total.units,
    }))
    .sort((a, b) => (b.efficiency ?? -1) - (a.efficiency ?? -1))
}

/**
 * Precio medio del litro, día a día: lo que marca la calle y lo que cobra el
 * contrato. El día en que las dos líneas se cruzan es el del ahorro negativo.
 */
export type PricePoint = {
  at: number
  label: string
  partial: boolean
  /** `null` los días sin litros: no hay precio medio que calcular. */
  listPrice: number | null
  contractPrice: number | null
}

export function pricePoints(snapshot: ActivitySnapshot, filters: GlobalFilters): PricePoint[] {
  return periodSeries(snapshot, filters).map((point) => {
    const hasVolume = point.liters > 0
    return {
      at: point.at,
      label: point.label,
      partial: point.partial,
      // El importe de lista es lo cobrado más lo ahorrado, por definición.
      listPrice: hasVolume ? (point.amountMxn + point.savingMxn) / point.liters : null,
      contractPrice: hasVolume ? point.amountMxn / point.liters : null,
    }
  })
}

/**
 * Unidades que piden una mirada hoy.
 *
 * Los tres casos límite que el generador mete a propósito, reunidos donde se
 * ven: la unidad muda, la que arrastra un abono y la que gasta de más. El
 * umbral de rendimiento sale de la MEDIANA de la propia flota filtrada, no de
 * una constante: una flota de reparto urbano y una de larga distancia no
 * comparten un «bajo» que valga para las dos.
 */
export type Incidents = {
  unreported: UnitDay[]
  refunded: UnitDay[]
  underperforming: UnitDay[]
  /** Umbral usado, para poder explicarlo en pantalla. */
  efficiencyFloor: number | null
}

export function incidents(units: UnitDay[]): Incidents {
  const efficiencies = units
    .map((unit) => unit.efficiency)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b)

  const median =
    efficiencies.length === 0
      ? null
      : efficiencies[Math.floor(efficiencies.length / 2)] ?? null

  const floor = median === null ? null : median * 0.7

  return {
    unreported: units.filter((unit) => unit.status === 'sin_reportar'),
    refunded: units.filter((unit) => unit.liters < 0),
    underperforming:
      floor === null
        ? []
        : units
            .filter((unit) => unit.efficiency !== null && unit.efficiency < floor && unit.liters > 0)
            .sort((a, b) => (a.efficiency ?? 0) - (b.efficiency ?? 0)),
    efficiencyFloor: floor,
  }
}
