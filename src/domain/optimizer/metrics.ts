// US-018 · US-086 · US-087 · US-020 · US-113
/**
 * Cálculos del optimizador sobre el recorte de US-111.
 * ═══════════════════════════════════════════════════
 * Funciones puras: entran cargas ya filtradas y supuestos, salen cifras. Sin
 * React y sin reglas propias: «redirigible», bruto y neto los decide
 * `rules.ts`, y aquí solo se suman.
 */
import {
  detourCost,
  grossSaving,
  isRedirectable,
  netSaving,
  savingIn,
} from './rules'
import type { Assumptions, Load, SavingMode, Station } from './types'

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

/** Gasto de la carga: su importe, el mismo que suma el Resumen (Ticket Car+). */
export function spendOf(load: Load): number {
  return load.amountMxn
}

// ── US-018 · KPIs ─────────────────────────────────────────────────────────

export type OptimizerKpis = {
  mode: SavingMode
  /** Ahorro del periodo en el modo pedido. Negativo = pérdida. */
  saving: number
  /** Siempre los dos, para poder enseñar el otro como referencia. */
  grossSaving: number
  netSaving: number
  /** Coste total de los desvíos con los supuestos vigentes. */
  detourCost: number
  redirectableLoads: number
  /** Proyección a 30 días: ahorro × 30 ÷ días del recorte. `null` sin días. */
  monthlyProjection: number | null
  periodDays: number
  spend: number
  loads: number
  liters: number
  redirectableLiters: number
  /** Litros redirigibles sobre litros totales, en [0, 1]. */
  redirectableLitersShare: number
  /** Estaciones donde se carga hoy. */
  currentStations: number
  /** Destinos distintos que propone el motor. */
  proposedDestinations: number
  /** Cargas que el motor marca como óptimas. */
  optimalLoads: number
  /**
   * Ahorro por litro PONDERADO: ahorro total ÷ litros redirigibles. Es el que
   * cuadra con el total: × litros redirigibles = ahorro del periodo.
   */
  savingPerLiterWeighted: number | null
  /**
   * Ahorro por litro SIMPLE: promedio, carga a carga, de ahorro ÷ litros. No
   * cuadra con el total —pesa igual una carga de 20 L que una de 300 L— y por
   * eso lleva su propia etiqueta.
   */
  savingPerLiterSimple: number | null
  /** $/L medio pagado en las cargas redirigibles, ponderado por litros. */
  avgPricePaid: number | null
  /** $/L medio en las estaciones recomendadas, ponderado por litros. */
  avgPriceRecommended: number | null
  /** (recomendado − pagado) ÷ pagado. Negativo = más barato. */
  priceVariation: number | null
}

export function computeOptimizerKpis(
  loads: Load[],
  assumptions: Assumptions,
  mode: SavingMode,
  days: number,
): OptimizerKpis {
  let gross = 0
  let net = 0
  let cost = 0
  let spend = 0
  let liters = 0
  let redirectableLiters = 0
  let redirectableLoads = 0
  let optimalLoads = 0
  let paidWeighted = 0
  let recommendedWeighted = 0
  let simpleSum = 0
  const current = new Set<string>()
  const proposed = new Set<string>()

  for (const load of loads) {
    spend += spendOf(load)
    liters += load.liters
    current.add(load.stationId)
    if (load.optimal) optimalLoads += 1
    if (!isRedirectable(load)) continue
    redirectableLoads += 1
    redirectableLiters += load.liters
    const g = grossSaving(load)
    const n = netSaving(load, assumptions)
    gross += g
    net += n
    cost += detourCost(load.detourM, load.pricePaid, assumptions)
    simpleSum += (mode === 'bruto' ? g : n) / load.liters
    paidWeighted += load.pricePaid * load.liters
    recommendedWeighted += (load.priceRecommended ?? load.pricePaid) * load.liters
    if (load.recommendedStationId !== null) proposed.add(load.recommendedStationId)
  }

  const saving = mode === 'bruto' ? gross : net
  const avgPricePaid = redirectableLiters > 0 ? paidWeighted / redirectableLiters : null
  const avgPriceRecommended = redirectableLiters > 0 ? recommendedWeighted / redirectableLiters : null

  return {
    mode,
    saving,
    grossSaving: gross,
    netSaving: net,
    detourCost: cost,
    redirectableLoads,
    monthlyProjection: days > 0 ? (saving * 30) / days : null,
    periodDays: days,
    spend,
    // Los abonos restan del gasto pero no son cargas.
    loads: loads.filter((load) => !load.refund).length,
    liters,
    redirectableLiters,
    redirectableLitersShare: liters > 0 ? redirectableLiters / liters : 0,
    currentStations: current.size,
    proposedDestinations: proposed.size,
    optimalLoads,
    savingPerLiterWeighted: redirectableLiters > 0 ? saving / redirectableLiters : null,
    savingPerLiterSimple: redirectableLoads > 0 ? simpleSum / redirectableLoads : null,
    avgPricePaid,
    avgPriceRecommended,
    priceVariation:
      avgPricePaid !== null && avgPriceRecommended !== null && avgPricePaid > 0
        ? (avgPriceRecommended - avgPricePaid) / avgPricePaid
        : null,
  }
}

// ── US-018 · Bandas de distancia ──────────────────────────────────────────

export type DistanceBand = {
  /** «0–1 km». */
  label: string
  fromKm: number
  toKm: number
  loads: number
  saving: number
  /** Mediana del ahorro por carga en la banda. `null` sin cargas. */
  medianPerLoad: number | null
}

export const BAND_EDGES_KM = [0, 1, 2, 3, 4, 5] as const

export function distanceBands(loads: Load[], assumptions: Assumptions, mode: SavingMode): DistanceBand[] {
  const bands = BAND_EDGES_KM.slice(0, -1).map((fromKm, index) => ({
    fromKm,
    toKm: BAND_EDGES_KM[index + 1]!,
    values: [] as number[],
  }))
  for (const load of loads) {
    if (!isRedirectable(load)) continue
    const km = load.detourM / 1000
    // El tramo es [desde, hasta), salvo el último, que cierra en 5 km incluido.
    const index = Math.min(bands.length - 1, Math.floor(km))
    bands[index]!.values.push(savingIn(load, mode, assumptions))
  }
  return bands.map((band) => ({
    label: `${band.fromKm}–${band.toKm} km`,
    fromKm: band.fromKm,
    toKm: band.toKm,
    loads: band.values.length,
    saving: band.values.reduce((sum, v) => sum + v, 0),
    medianPerLoad: median(band.values),
  }))
}

/** Umbrales del aviso de US-018. */
export const FAR_DETOUR_M = 3000
export const TINY_SAVING_CENTS = 100

/** Cargas que piden más de 3 km de desvío para ahorrar (en bruto) menos de $1. */
export function farForTinyLoads(loads: Load[]): Load[] {
  return loads.filter(
    (load) => isRedirectable(load) && load.detourM > FAR_DETOUR_M && load.savingCents < TINY_SAVING_CENTS,
  )
}

// ── US-086 · Serie diaria ─────────────────────────────────────────────────

export type DailyMetric = 'ahorro' | 'gasto' | 'cargas' | 'redirigibles' | 'litros'

export const DAILY_METRIC_LABELS: Record<DailyMetric, string> = {
  ahorro: 'Ahorro',
  gasto: 'Gasto',
  cargas: 'Cargas',
  redirigibles: 'Cargas redirigibles',
  litros: 'Litros',
}

export type DailyPoint = { day: number } & Record<DailyMetric, number>

/**
 * Un punto por día del recorte, INCLUIDOS los que no tuvieron cargas: van a
 * cero y no desaparecen del eje. Sin esto, el 16 de septiembre no existiría y
 * la serie enseñaría un día menos de los que dice el periodo.
 */
export function dailySeries(
  loads: Load[],
  fromDay: number,
  toDay: number,
  assumptions: Assumptions,
  mode: SavingMode,
): DailyPoint[] {
  const points = new Map<number, DailyPoint>()
  for (let day = fromDay; day <= toDay; day++) {
    points.set(day, { day, ahorro: 0, gasto: 0, cargas: 0, redirigibles: 0, litros: 0 })
  }
  for (const load of loads) {
    const point = points.get(load.day)
    if (!point) continue
    point.cargas += 1
    point.litros += load.liters
    point.gasto += spendOf(load)
    if (isRedirectable(load)) {
      point.redirigibles += 1
      point.ahorro += savingIn(load, mode, assumptions)
    }
  }
  return [...points.values()]
}

// ── US-087 · Ranking de estaciones / US-020 · mapa ────────────────────────

export type StationStats = {
  station: Station
  loads: number
  redirectable: number
  /** Cargas redirigibles ÷ cargas, en [0, 1]. */
  redirectableShare: number
  liters: number
  /** Ahorro redirigible bruto. */
  grossSaving: number
  /** Neto del desvío con los supuestos vigentes. */
  netSaving: number
  /** Desvío medio de las redirigibles, en metros. `null` sin redirigibles. */
  avgDetourM: number | null
  /** Destinos propuestos desde esta estación, del que más cargas recibe al que menos. */
  destinations: { stationId: string; loads: number }[]
  /** Alguna carga redirigible termina en una estación con CV. */
  redirectsToCv: boolean
}

export function stationStats(
  loads: Load[],
  stationsById: Map<string, Station>,
  assumptions: Assumptions,
): StationStats[] {
  type Acc = {
    loads: number
    redirectable: number
    liters: number
    gross: number
    net: number
    detour: number
    destinations: Map<string, number>
    toCv: boolean
  }
  const byStation = new Map<string, Acc>()
  for (const load of loads) {
    const acc =
      byStation.get(load.stationId) ??
      { loads: 0, redirectable: 0, liters: 0, gross: 0, net: 0, detour: 0, destinations: new Map(), toCv: false }
    acc.loads += 1
    acc.liters += load.liters
    if (isRedirectable(load) && load.recommendedStationId !== null) {
      acc.redirectable += 1
      acc.gross += grossSaving(load)
      acc.net += netSaving(load, assumptions)
      acc.detour += load.detourM
      acc.destinations.set(load.recommendedStationId, (acc.destinations.get(load.recommendedStationId) ?? 0) + 1)
      if (stationsById.get(load.recommendedStationId)?.cv) acc.toCv = true
    }
    byStation.set(load.stationId, acc)
  }

  const result: StationStats[] = []
  for (const [stationId, acc] of byStation) {
    const station = stationsById.get(stationId)
    if (!station) continue
    result.push({
      station,
      loads: acc.loads,
      redirectable: acc.redirectable,
      redirectableShare: acc.loads > 0 ? acc.redirectable / acc.loads : 0,
      liters: acc.liters,
      grossSaving: acc.gross,
      netSaving: acc.net,
      avgDetourM: acc.redirectable > 0 ? acc.detour / acc.redirectable : null,
      destinations: [...acc.destinations.entries()]
        .map(([id, n]) => ({ stationId: id, loads: n }))
        .sort((a, b) => b.loads - a.loads),
      redirectsToCv: acc.toCv,
    })
  }
  // Orden por defecto del ranking: ahorro redirigible, de mayor a menor.
  return result.sort((a, b) => b.grossSaving - a.grossSaving)
}

/** Categoría de oportunidad de una estación — filtros del mapa de US-020. */
export type StationCategory = 'oportunidad' | 'mixta' | 'optima'

/** A partir de la mitad de cargas redirigibles, la estación es «con oportunidad». */
export const OPPORTUNITY_SHARE = 0.5

export function stationCategory(stats: Pick<StationStats, 'redirectableShare'>): StationCategory {
  if (stats.redirectableShare === 0) return 'optima'
  return stats.redirectableShare >= OPPORTUNITY_SHARE ? 'oportunidad' : 'mixta'
}

/** Percentil `p` (0–1) por interpolación lineal. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const rank = (sorted.length - 1) * p
  const low = Math.floor(rank)
  const high = Math.ceil(rank)
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (rank - low)
}

// ── US-113 · Control volumétrico ──────────────────────────────────────────

export type CvTransition = 'mantiene' | 'pierde' | 'gana' | 'sigue_igual'

export const CV_TRANSITION_LABELS: Record<CvTransition, string> = {
  mantiene: 'Mantiene CV',
  pierde: 'Pierde CV',
  gana: 'Gana CV',
  sigue_igual: 'Sigue sin marca',
}

export function cvTransition(originCv: boolean, destinationCv: boolean): CvTransition {
  if (originCv) return destinationCv ? 'mantiene' : 'pierde'
  return destinationCv ? 'gana' : 'sigue_igual'
}

export type CvSummary = {
  /** Ahorro que termina en una estación que mide (destino con CV). */
  savingToCv: number
  /** Ahorro que exige resignar la garantía (origen con CV, destino sin marca). */
  savingLosingCv: number
  /** Ahorro fuera del directorio (ni origen ni destino con marca). */
  savingOutsideDirectory: number
  matrix: Record<CvTransition, { loads: number; share: number; saving: number }>
  coverage: {
    currentStations: number
    currentWithCv: number
    recommendedStations: number
    recommendedWithCv: number
  }
  /** Cargas que pierden el control al redirigir, de mayor a menor ahorro. */
  losing: Load[]
}

export function cvSummary(
  loads: Load[],
  stationsById: Map<string, Station>,
  assumptions: Assumptions,
  mode: SavingMode,
): CvSummary {
  const matrix: CvSummary['matrix'] = {
    mantiene: { loads: 0, share: 0, saving: 0 },
    pierde: { loads: 0, share: 0, saving: 0 },
    gana: { loads: 0, share: 0, saving: 0 },
    sigue_igual: { loads: 0, share: 0, saving: 0 },
  }
  const current = new Set<string>()
  const recommended = new Set<string>()
  const losing: Load[] = []
  let total = 0

  for (const load of loads) {
    current.add(load.stationId)
    if (!isRedirectable(load) || load.recommendedStationId === null) continue
    recommended.add(load.recommendedStationId)
    const origin = stationsById.get(load.stationId)?.cv ?? false
    const destination = stationsById.get(load.recommendedStationId)?.cv ?? false
    const transition = cvTransition(origin, destination)
    const saving = savingIn(load, mode, assumptions)
    matrix[transition].loads += 1
    matrix[transition].saving += saving
    total += 1
    if (transition === 'pierde') losing.push(load)
  }
  for (const cell of Object.values(matrix)) cell.share = total > 0 ? cell.loads / total : 0

  const withCv = (ids: Set<string>) => [...ids].filter((id) => stationsById.get(id)?.cv).length

  return {
    savingToCv: matrix.mantiene.saving + matrix.gana.saving,
    savingLosingCv: matrix.pierde.saving,
    savingOutsideDirectory: matrix.sigue_igual.saving,
    matrix,
    coverage: {
      currentStations: current.size,
      currentWithCv: withCv(current),
      recommendedStations: recommended.size,
      recommendedWithCv: withCv(recommended),
    },
    losing: losing.sort((a, b) => b.savingCents - a.savingCents),
  }
}

// ── US-020 · Filtros propios del mapa y panel lateral ─────────────────────

/**
 * Filtros del MAPA. Recortan los puntos que se dibujan y nada más: los
 * indicadores siguen leyendo el recorte de US-111.
 */
export type MapFilter = 'todas' | 'oportunidad' | 'mixtas' | 'optimas' | 'redirigen_cv' | 'con_cv'

export const MAP_FILTERS: MapFilter[] = ['todas', 'oportunidad', 'mixtas', 'optimas', 'redirigen_cv', 'con_cv']

export const MAP_FILTER_LABELS: Record<MapFilter, string> = {
  todas: 'Todas',
  oportunidad: 'Con oportunidad',
  mixtas: 'Mixtas',
  optimas: 'Solo óptimas',
  redirigen_cv: 'Redirigen a control volumétrico',
  con_cv: 'Con control volumétrico',
}

export function matchesMapFilter(stats: StationStats, filter: MapFilter): boolean {
  switch (filter) {
    case 'todas':
      return true
    case 'oportunidad':
      return stationCategory(stats) === 'oportunidad'
    case 'mixtas':
      return stationCategory(stats) === 'mixta'
    case 'optimas':
      return stationCategory(stats) === 'optima'
    case 'redirigen_cv':
      return stats.redirectsToCv
    case 'con_cv':
      return stats.station.cv
  }
}

export function mapFilterCounts(stations: StationStats[]): Record<MapFilter, number> {
  const counts = {} as Record<MapFilter, number>
  for (const filter of MAP_FILTERS) counts[filter] = stations.filter((s) => matchesMapFilter(s, filter)).length
  return counts
}

export type PanelFilter = 'todas' | 'redirigibles' | 'sin_ahorro'
export type PanelSort = 'ahorro' | 'fecha'

/** Tope de filas del panel lateral. Por encima, se dice cuántas quedan fuera. */
export const PANEL_MAX_ROWS = 250

export function stationPanelLoads(
  loads: Load[],
  stationId: string,
  filter: PanelFilter,
  sort: PanelSort,
): { rows: Load[]; total: number } {
  const own = loads.filter((load) => {
    if (load.stationId !== stationId) return false
    if (filter === 'redirigibles') return isRedirectable(load)
    if (filter === 'sin_ahorro') return !isRedirectable(load)
    return true
  })
  own.sort((a, b) => (sort === 'ahorro' ? b.savingCents - a.savingCents || b.at - a.at : b.at - a.at))
  return { rows: own.slice(0, PANEL_MAX_ROWS), total: own.length }
}

/** Enlace «Cómo llegar» de la estación habitual a la recomendada. Solo coordenadas. */
export function directionsUrl(origin: Pick<Station, 'lat' | 'lng'>, destination: Pick<Station, 'lat' | 'lng'>): string {
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'driving',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/**
 * Radio del punto en el mapa: según litros, normalizado al percentil 95 para
 * que dos o tres estaciones enormes no dejen a las demás en un píxel. Nunca por
 * debajo de un mínimo que se pueda pulsar.
 */
export const MIN_MARKER_RADIUS = 7
export const MAX_MARKER_RADIUS = 22

export function markerRadius(liters: number, p95: number | null): number {
  if (p95 === null || p95 <= 0) return MIN_MARKER_RADIUS
  const ratio = Math.min(1, Math.max(0, liters / p95))
  return MIN_MARKER_RADIUS + (MAX_MARKER_RADIUS - MIN_MARKER_RADIUS) * Math.sqrt(ratio)
}
