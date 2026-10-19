// US-018 · US-020 · US-086 · US-087 · US-111 · US-112 · US-113
/**
 * Dataset SINTÉTICO del optimizador de cargas.
 * ═══════════════════════════════════════════
 * Regla dura del Sprint 8: ni PAN ni datos de ningún cliente real. La
 * referencia de ESTRUCTURA es el prototipo HTML del optimizador; de él no se
 * copia ni una fila. Todo sale de un PRNG con semilla fija (`engine/prng`),
 * igual que el histórico del dashboard: misma demo en cada recarga.
 *
 * ── Dónde vive ────────────────────────────────────────────────────────────
 * Grupo Alimentario Norte (`acc_grupo_alimentario`), cuenta ficticia de los
 * mocks actuales, en cinco plazas de México. Las divisiones son las del
 * organigrama de esa cuenta (US-013) y los centros de coste son los del
 * padrón (`COST_CENTER_IDS`), para que los filtros hablen el mismo idioma.
 * «División Servicios» no tiene cargas, como no tiene unidades en el
 * organigrama: un vacío legítimo.
 *
 * Recorte: septiembre de 2026, con tres días SIN cargas (13, 16 —día de la
 * Independencia— y 27) para que la serie diaria demuestre que no los esconde.
 *
 * ── El motor, simulado ────────────────────────────────────────────────────
 * Para cada carga, el «motor» busca en su zona estaciones a ≤ 5 km con el
 * litro más barato ESE día y para ESE combustible. Si no hay ninguna, la carga
 * es óptima. Si la mejor diferencia es menor de 2 centavos por litro, no
 * propone nada y la carga queda como no óptima sin ahorro: el desvío no se
 * paga solo. Simplificación declarada: el desvío es la distancia por
 * carretera estimada entre las dos estaciones (línea recta × 1,25).
 *
 * ── Puntos negativos estratégicos (la demo tiene que ser honesta) ─────────
 *   · Con 6 km/L ida y vuelta el ahorro NETO total sale negativo frente a un
 *     bruto positivo, en la proporción del hallazgo real (≈ −36 %). Lo fija
 *     un test.
 *   · Un grupo visible de cargas que piden más de 3 km para ahorrar menos de
 *     un peso.
 *   · Estaciones 100 % óptimas (las «ancla» baratas de cada plaza), mixtas y
 *     con mucha oportunidad (las caras).
 *   · Redirecciones que pierden el control volumétrico.
 */
import { createRandom, pick, randomInt, type Random } from '../engine/prng'
import { COST_CENTER_IDS } from '../data/fleet-activity'
import type { FuelType, UnitClass } from '../dashboard/types'
import type { Load, Station, Zone, ZoneId } from './types'

const SEED = 20261014

export const OPTIMIZER_ACCOUNT_ID = 'acc_grupo_alimentario'

export const DATASET_YEAR = 2026
/** Mes del recorte, 1-based. */
export const DATASET_MONTH = 9
export const DATASET_DAYS = 30
/** Días del recorte sin ninguna carga. */
export const EMPTY_DAYS: readonly number[] = [13, 16, 27]

/** Radio de búsqueda del motor, en metros de carretera. */
export const SEARCH_RADIUS_M = 5000
/** Por debajo de esta diferencia por litro el motor no propone destino. */
const MIN_PRICE_GAP = 0.01
/** Factor de carretera sobre la línea recta. */
const ROAD_FACTOR = 1.25

export const ZONES: Zone[] = [
  { id: 'monterrey', name: 'Monterrey', division: 'División Noreste', lat: 25.6866, lng: -100.3161 },
  { id: 'saltillo', name: 'Saltillo', division: 'División Noreste', lat: 25.4232, lng: -101.0053 },
  { id: 'hermosillo', name: 'Hermosillo', division: 'División Noroeste', lat: 29.0729, lng: -110.9559 },
  { id: 'culiacan', name: 'Culiacán', division: 'División Noroeste', lat: 24.8091, lng: -107.394 },
  { id: 'guadalajara', name: 'Guadalajara', division: 'División Occidente', lat: 20.6597, lng: -103.3496 },
]

/** Divisiones del organigrama de la cuenta, en su orden. La última sin cargas. */
export const DIVISIONS: string[] = [
  'División Noreste',
  'División Noroeste',
  'División Occidente',
  'División Servicios',
]

const ZONE_CODES: Record<ZoneId, string> = {
  monterrey: 'MTY',
  saltillo: 'SLT',
  hermosillo: 'HMO',
  culiacan: 'CUL',
  guadalajara: 'GDL',
}

/** Estaciones por plaza. Monterrey y Guadalajara son las plazas grandes. */
const STATIONS_PER_ZONE: Record<ZoneId, number> = {
  monterrey: 34,
  saltillo: 18,
  hermosillo: 18,
  culiacan: 20,
  guadalajara: 30,
}

/** Peso de cada plaza en las tarjetas de la flota. */
const ZONE_WEIGHTS: [ZoneId, number][] = [
  ['monterrey', 0.34],
  ['guadalajara', 0.26],
  ['culiacan', 0.16],
  ['saltillo', 0.12],
  ['hermosillo', 0.12],
]

/** Colonias para nombrar estaciones. Nombres de lugar, no de marca. */
const PLACES: Record<ZoneId, string[]> = {
  monterrey: ['Cumbres', 'Mitras', 'Contry', 'Linda Vista', 'Valle Oriente', 'Anáhuac', 'Las Puentes', 'Del Valle', 'Obispado', 'Apodaca Centro', 'San Bernabé', 'Tecnológico', 'Lincoln', 'Escobedo'],
  saltillo: ['Saltillo Centro', 'Ramos Arizpe', 'República', 'Nazario Ortiz', 'Los Pinos', 'Derramadero', 'La Aurora', 'Lourdes'],
  hermosillo: ['Hermosillo Centro', 'Pitic', 'Bugambilias', 'Villa de Seris', 'Modelo', 'El Sahuaro', 'Olivares', 'Valle Grande'],
  culiacan: ['Culiacán Centro', 'Tres Ríos', 'Humaya', 'Las Quintas', 'Guadalupe', 'Aeropuerto', 'Costa Rica', 'El Diez'],
  guadalajara: ['Zapopan', 'Tlaquepaque', 'Providencia', 'Chapalita', 'Oblatos', 'Las Águilas', 'Tonalá', 'Santa Tere', 'Minerva', 'El Salto', 'Huentitán', 'Miravalle'],
}

const STATION_KINDS = ['Servicio', 'Gasolinera', 'Estación', 'Combustibles'] as const

/** Precio base de la plaza en septiembre de 2026, $/L. Sintético. */
const BASE_PRICE: Record<FuelType, number> = { magna: 23.85, premium: 25.95, diesel: 25.35 }
const ZONE_PRICE_DELTA: Record<ZoneId, number> = {
  monterrey: 0,
  saltillo: 0.12,
  hermosillo: 0.35,
  culiacan: 0.22,
  guadalajara: 0.08,
}

const FUELS: FuelType[] = ['magna', 'premium', 'diesel']

type VehicleProfile = {
  type: UnitClass
  weight: number
  fuels: [FuelType, number][]
  liters: [number, number]
  costCenters: string[]
}

const VEHICLE_PROFILES: VehicleProfile[] = [
  { type: 'pesado', weight: 0.18, fuels: [['diesel', 1]], liters: [120, 300], costCenters: [COST_CENTER_IDS[1]!, COST_CENTER_IDS[2]!] },
  { type: 'mediano', weight: 0.3, fuels: [['diesel', 1]], liters: [55, 150], costCenters: [COST_CENTER_IDS[2]!, COST_CENTER_IDS[0]!] },
  { type: 'ligero', weight: 0.27, fuels: [['magna', 0.8], ['premium', 0.2]], liters: [18, 50], costCenters: [COST_CENTER_IDS[0]!, COST_CENTER_IDS[3]!] },
  { type: 'van', weight: 0.25, fuels: [['magna', 0.85], ['premium', 0.15]], liters: [25, 65], costCenters: [COST_CENTER_IDS[0]!] },
]

const CARD_COUNT = 420
const LOADS_PER_DAY: [number, number] = [190, 250]

export type OptimizerDataset = {
  zones: Zone[]
  stations: Station[]
  loads: Load[]
  /** Precio por estación, combustible y día — lo que «vio» el motor. */
  priceOf: (stationId: string, fuel: FuelType, day: number) => number
}

// ── Utilidades ───────────────────────────────────────────────────────────

function weighted<T>(rnd: Random, entries: [T, number][]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let r = rnd() * total
  for (const [value, w] of entries) {
    r -= w
    if (r <= 0) return value
  }
  return entries[entries.length - 1]![0]
}

function between(rnd: Random, min: number, max: number): number {
  return min + rnd() * (max - min)
}

/** Distancia en metros entre dos coordenadas (haversine). */
export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Distancia por carretera estimada, redondeada a decenas de metros. */
export function roadDistanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return Math.round((haversineM(a, b) * ROAD_FACTOR) / 10) * 10
}

// ── Generación ───────────────────────────────────────────────────────────

type StationModel = Station & {
  /** Desviación de precio de la estación sobre la plaza. */
  offset: number
  fuelJitter: Record<FuelType, number>
  /** Ruido diario por combustible: [combustible][día-1]. */
  daily: Record<FuelType, number[]>
}

function buildStations(rnd: Random): StationModel[] {
  const stations: StationModel[] = []
  for (const zone of ZONES) {
    const count = STATIONS_PER_ZONE[zone.id]
    const places = PLACES[zone.id]
    for (let index = 0; index < count; index++) {
      /*
       * Las dos primeras de cada plaza son las «ancla»: las más baratas de su
       * entorno todo el mes. Sus cargas salen 100 % óptimas.
       * Las cinco últimas son caras: las de mucha oportunidad.
       */
      const anchor = index < 2
      const expensive = index >= count - 5
      const offset = anchor ? between(rnd, -0.2, -0.16) : expensive ? between(rnd, 0.15, 0.34) : between(rnd, -0.1, 0.11)
      // Las ancla, en el centro de la plaza: casi todo el mundo las tiene cerca.
      const spread = anchor ? 0.012 : 0.065
      const lat = zone.lat + between(rnd, -spread, spread)
      const lng = zone.lng + between(rnd, -spread, spread) * 1.1
      const place = places[index % places.length]!
      const kind = STATION_KINDS[Math.floor(index / places.length) % STATION_KINDS.length]!
      const daily = {} as Record<FuelType, number[]>
      const fuelJitter = {} as Record<FuelType, number>
      for (const fuel of FUELS) {
        fuelJitter[fuel] = between(rnd, -0.04, 0.04)
        daily[fuel] = Array.from({ length: DATASET_DAYS }, () => (anchor ? between(rnd, -0.005, 0.005) : between(rnd, -0.035, 0.035)))
      }
      stations.push({
        id: `EST-${ZONE_CODES[zone.id]}-${String(index + 1).padStart(3, '0')}`,
        name: `${kind} ${place}`,
        zone: zone.id,
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        // El directorio de CV cubre más de la mitad de las ancla y menos de las caras.
        cv: rnd() < (anchor ? 0.5 : expensive ? 0.6 : 0.42),
        offset,
        fuelJitter,
        daily,
      })
    }
  }
  return stations
}

type Card = {
  id: string
  last4: string
  zone: ZoneId
  profile: VehicleProfile
  fuel: FuelType
  costCenter: string
  /** Estaciones habituales de la tarjeta, con su peso. */
  favorites: [string, number][]
}

function uniqueLast4(rnd: Random, count: number): string[] {
  const pool = Array.from({ length: 9000 }, (_, i) => String(1000 + i))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return pool.slice(0, count)
}

function buildCards(rnd: Random, stations: StationModel[]): Card[] {
  const last4 = uniqueLast4(rnd, CARD_COUNT)
  const byZone = new Map<ZoneId, StationModel[]>()
  for (const station of stations) {
    const list = byZone.get(station.zone) ?? []
    list.push(station)
    byZone.set(station.zone, list)
  }
  return Array.from({ length: CARD_COUNT }, (_, index) => {
    const zone = weighted(rnd, ZONE_WEIGHTS)
    const profile = weighted(rnd, VEHICLE_PROFILES.map((p) => [p, p.weight] as [VehicleProfile, number]))
    const local = byZone.get(zone)!
    const favoriteCount = randomInt(rnd, 1, 3)
    const favorites: [string, number][] = []
    for (let f = 0; f < favoriteCount; f++) favorites.push([pick(rnd, local).id, f === 0 ? 0.6 : 0.2])
    return {
      id: `TC-${String(index + 1).padStart(6, '0')}`,
      last4: last4[index]!,
      zone,
      profile,
      fuel: weighted(rnd, profile.fuels),
      costCenter: pick(rnd, profile.costCenters),
      favorites,
    }
  })
}

function generate(): OptimizerDataset {
  const rnd = createRandom(SEED)
  const models = buildStations(rnd)
  const byId = new Map(models.map((s) => [s.id, s]))
  const zoneOf = new Map(ZONES.map((z) => [z.id, z]))

  const priceOf = (stationId: string, fuel: FuelType, day: number): number => {
    const s = byId.get(stationId)!
    const raw = BASE_PRICE[fuel] + ZONE_PRICE_DELTA[s.zone] + s.offset + s.fuelJitter[fuel] + s.daily[fuel][day - 1]!
    return Math.round(raw * 100) / 100
  }

  /** Vecinas a ≤ 5 km por carretera, precalculadas. */
  const neighbors = new Map<string, { id: string; distance: number }[]>()
  for (const s of models) {
    neighbors.set(
      s.id,
      models
        .filter((o) => o.zone === s.zone && o.id !== s.id)
        .map((o) => ({ id: o.id, distance: roadDistanceM(s, o) }))
        .filter((o) => o.distance <= SEARCH_RADIUS_M),
    )
  }

  const cards = buildCards(rnd, models)
  const loads: Load[] = []
  let sequence = 0

  for (let day = 1; day <= DATASET_DAYS; day++) {
    if (EMPTY_DAYS.includes(day)) continue
    const count = randomInt(rnd, LOADS_PER_DAY[0], LOADS_PER_DAY[1])
    for (let n = 0; n < count; n++) {
      const card = pick(rnd, cards)
      const zone = zoneOf.get(card.zone)!
      // 85 % en una habitual de la tarjeta; el resto, cualquiera de la plaza.
      const stationId =
        rnd() < 0.85
          ? weighted(rnd, card.favorites)
          : pick(rnd, models.filter((s) => s.zone === card.zone)).id
      const liters = Math.round(between(rnd, card.profile.liters[0], card.profile.liters[1]) * 10) / 10
      const pricePaid = priceOf(stationId, card.fuel, day)

      let best: { id: string; distance: number; price: number } | null = null
      for (const candidate of neighbors.get(stationId)!) {
        const price = priceOf(candidate.id, card.fuel, day)
        if (price >= pricePaid) continue
        if (best === null || price < best.price || (price === best.price && candidate.distance < best.distance)) {
          best = { ...candidate, price }
        }
      }

      const gap = best === null ? 0 : pricePaid - best.price
      const optimal = best === null
      const proposes = best !== null && gap >= MIN_PRICE_GAP
      const hour = randomInt(rnd, 5, 21)
      const minute = randomInt(rnd, 0, 59)
      sequence += 1

      loads.push({
        id: `CRG-${String(sequence).padStart(6, '0')}`,
        day,
        at: new Date(DATASET_YEAR, DATASET_MONTH - 1, day, hour, minute).getTime(),
        cardId: card.id,
        cardLast4: card.last4,
        vehicleType: card.profile.type,
        fuel: card.fuel,
        product: 'ticketcar_plus',
        zone: card.zone,
        division: zone.division,
        costCenter: card.costCenter,
        liters,
        stationId,
        pricePaid,
        recommendedStationId: proposes ? best!.id : null,
        priceRecommended: proposes ? best!.price : null,
        detourM: proposes ? best!.distance : 0,
        savingCents: proposes ? Math.round(gap * liters * 100) : 0,
        optimal,
      })
    }
  }

  const stations: Station[] = models.map(({ id, name, zone, lat, lng, cv }) => ({ id, name, zone, lat, lng, cv }))
  return { zones: ZONES, stations, loads, priceOf }
}

let cached: OptimizerDataset | null = null

/** El dataset, generado una vez por sesión. Determinista. */
export function getOptimizerDataset(): OptimizerDataset {
  if (cached === null) cached = generate()
  return cached
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** «13 sep». */
export function dayLabel(day: number): string {
  return `${day} ${MONTHS_SHORT[DATASET_MONTH - 1]}`
}
