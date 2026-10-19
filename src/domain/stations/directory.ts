/**
 * Directorio de estaciones y precios — Ticket Car+ (unificación de datos).
 * ═══════════════════════════════════════════════════════════════════════
 * En eOne las estaciones vivían DENTRO del dataset del optimizador, que
 * generaba además sus propias cargas: un mes sintético de 420 tarjetas sin
 * relación con el padrón. Aquí el directorio sale de ese dataset y pasa a ser
 * de la plataforma: el generador del padrón (`data/fleet-activity`) asigna a
 * cada despacho una estación de la plaza de su unidad y le cobra el precio de
 * esa estación. El optimizador y el reporte consolidado leen esos mismos
 * despachos, así que las tres pantallas suman lo mismo.
 *
 * ── Qué cuentas tienen directorio ─────────────────────────────────────────
 * Solo Grupo Alimentario Norte, la cuenta del portal: sus departamentos son
 * plazas (Monterrey, Saltillo, Hermosillo, Culiacán, Guadalajara). Las demás
 * cuentas siguen como en eOne: precio de contrato único y sin estación.
 *
 * ── Precios ───────────────────────────────────────────────────────────────
 * Precio de contrato por estación, combustible y día: el precio de lista de
 * referencia más el diferencial de la plaza y de la estación, menos el
 * descuento de Edenred. El ruido diario sale de un hash de (estación,
 * combustible, día): no hay arrays por día, así que vale para cualquier fecha.
 *
 * ── Autoconsumo ───────────────────────────────────────────────────────────
 * Las unidades de Autoconsumo cargan en la planta propia del cliente en su
 * plaza. No es red externa: el motor no les propone otra estación.
 */
import { createRandom, type Random } from '../engine/prng'
import type { Account } from '../data/accounts'
import { CONTRACT_DISCOUNT, LIST_PRICE } from '../data/prices'
import type { FuelProduct, FuelType } from '../dashboard/types'
import { baseOrgTreeOf } from '../org/structure'
import { pathOf } from '../org/types'
import type { Station, Zone, ZoneId } from '../optimizer/types'

const SEED = 20261014

/** La cuenta que tiene directorio de estaciones. */
export const STATION_ACCOUNT_ID = 'acc_grupo_alimentario'

/** Radio en el que el motor busca una estación más barata. */
export const SEARCH_RADIUS_M = 5000
const MIN_PRICE_GAP = 0.01
const ROAD_FACTOR = 1.25

export const ZONES: Zone[] = [
  { id: 'monterrey', name: 'Monterrey', division: 'División Noreste', lat: 25.6866, lng: -100.3161 },
  { id: 'saltillo', name: 'Saltillo', division: 'División Noreste', lat: 25.4232, lng: -101.0053 },
  { id: 'hermosillo', name: 'Hermosillo', division: 'División Noroeste', lat: 29.0729, lng: -110.9559 },
  { id: 'culiacan', name: 'Culiacán', division: 'División Noroeste', lat: 24.8091, lng: -107.394 },
  { id: 'guadalajara', name: 'Guadalajara', division: 'División Occidente', lat: 20.6597, lng: -103.3496 },
]

/** Departamento del organigrama que es cada plaza. */
export const ZONE_DEPARTMENT: Record<ZoneId, string> = {
  monterrey: 'departamento-monterrey',
  saltillo: 'departamento-saltillo',
  hermosillo: 'departamento-hermosillo',
  culiacan: 'departamento-culiacan',
  guadalajara: 'departamento-guadalajara',
}

/** Plaza por defecto de una división, para las unidades que cuelgan de la división sin departamento. */
const DIVISION_ZONE: Record<string, ZoneId> = {
  'division-noreste': 'monterrey',
  'division-noroeste': 'culiacan',
  'division-occidente': 'guadalajara',
  'division-servicios': 'monterrey',
}

const ZONE_CODES: Record<ZoneId, string> = {
  monterrey: 'MTY',
  saltillo: 'SLT',
  hermosillo: 'HMO',
  culiacan: 'CUL',
  guadalajara: 'GDL',
}

const STATIONS_PER_ZONE: Record<ZoneId, number> = {
  monterrey: 34,
  saltillo: 18,
  hermosillo: 18,
  culiacan: 20,
  guadalajara: 30,
}

/** Reparto de las unidades sin plaza (altas sin clasificar en el organigrama). */
const ZONE_WEIGHTS: [ZoneId, number][] = [
  ['monterrey', 0.34],
  ['guadalajara', 0.26],
  ['culiacan', 0.16],
  ['saltillo', 0.12],
  ['hermosillo', 0.12],
]

const PLACES: Record<ZoneId, string[]> = {
  monterrey: ['Cumbres', 'Mitras', 'Contry', 'Linda Vista', 'Valle Oriente', 'Anáhuac', 'Las Puentes', 'Del Valle', 'Obispado', 'Apodaca Centro', 'San Bernabé', 'Tecnológico', 'Lincoln', 'Escobedo'],
  saltillo: ['Saltillo Centro', 'Ramos Arizpe', 'República', 'Nazario Ortiz', 'Los Pinos', 'Derramadero', 'La Aurora', 'Lourdes'],
  hermosillo: ['Hermosillo Centro', 'Pitic', 'Bugambilias', 'Villa de Seris', 'Modelo', 'El Sahuaro', 'Olivares', 'Valle Grande'],
  culiacan: ['Culiacán Centro', 'Tres Ríos', 'Humaya', 'Las Quintas', 'Guadalupe', 'Aeropuerto', 'Costa Rica', 'El Diez'],
  guadalajara: ['Zapopan', 'Tlaquepaque', 'Providencia', 'Chapalita', 'Oblatos', 'Las Águilas', 'Tonalá', 'Santa Tere', 'Minerva', 'El Salto', 'Huentitán', 'Miravalle'],
}

const STATION_KINDS = ['Servicio', 'Gasolinera', 'Estación', 'Combustibles'] as const

/** Diferencial de precio de cada plaza sobre la lista, en $/L. */
const ZONE_PRICE_DELTA: Record<ZoneId, number> = {
  monterrey: 0,
  saltillo: 0.12,
  hermosillo: 0.35,
  culiacan: 0.22,
  guadalajara: 0.08,
}

const FUELS: FuelType[] = ['magna', 'premium', 'diesel']

type StationModel = Station & {
  /** Desviación de precio de la estación sobre su plaza. */
  offset: number
  fuelJitter: Record<FuelType, number>
  /** Amplitud del ruido diario: las «ancla» apenas se mueven. */
  noise: number
}

function between(rnd: Random, min: number, max: number): number {
  return min + rnd() * (max - min)
}

/** Hash FNV-1a de una cadena, en [0, 1). */
export function hashFraction(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return (hash >>> 0) / 4294967296
}

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Distancia por carretera aproximada: la recta por un factor de rodeo. */
export function roadDistanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return Math.round((haversineM(a, b) * ROAD_FACTOR) / 10) * 10
}

function buildStations(): StationModel[] {
  const rnd = createRandom(SEED)
  const stations: StationModel[] = []
  for (const zone of ZONES) {
    const count = STATIONS_PER_ZONE[zone.id]
    const places = PLACES[zone.id]
    for (let index = 0; index < count; index++) {
      // Las dos primeras de cada plaza son «ancla»: las más baratas de su
      // entorno. Las cinco últimas son caras: las de mucha oportunidad.
      const anchor = index < 2
      const expensive = index >= count - 5
      const offset = anchor ? between(rnd, -0.2, -0.16) : expensive ? between(rnd, 0.15, 0.34) : between(rnd, -0.1, 0.11)
      const spread = anchor ? 0.012 : 0.065
      const lat = zone.lat + between(rnd, -spread, spread)
      const lng = zone.lng + between(rnd, -spread, spread) * 1.1
      const fuelJitter = {} as Record<FuelType, number>
      for (const fuel of FUELS) fuelJitter[fuel] = between(rnd, -0.04, 0.04)
      stations.push({
        id: `EST-${ZONE_CODES[zone.id]}-${String(index + 1).padStart(3, '0')}`,
        name: `${STATION_KINDS[Math.floor(index / places.length) % STATION_KINDS.length]} ${places[index % places.length]}`,
        zone: zone.id,
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        cv: rnd() < (anchor ? 0.5 : expensive ? 0.6 : 0.42),
        offset,
        fuelJitter,
        noise: anchor ? 0.005 : 0.035,
      })
    }
    // Planta propia del cliente en la plaza: donde cargan las unidades de Autoconsumo.
    stations.push({
      id: `AUTO-${ZONE_CODES[zone.id]}`,
      name: `Autoconsumo · Planta ${zone.name}`,
      zone: zone.id,
      lat: zone.lat,
      lng: zone.lng,
      cv: true,
      own: true,
      offset: -0.12,
      fuelJitter: { magna: 0, premium: 0, diesel: 0 },
      noise: 0,
    })
  }
  return stations
}

let models: StationModel[] | null = null
let byId: Map<string, StationModel> | null = null
let neighbors: Map<string, { id: string; distance: number }[]> | null = null

function directory() {
  if (models === null) {
    models = buildStations()
    byId = new Map(models.map((station) => [station.id, station]))
    // Vecinas de red a ≤ 5 km por carretera, en la misma plaza. Las plantas propias no se proponen nunca.
    neighbors = new Map(
      models.map((station) => [
        station.id,
        models!
          .filter((other) => other.zone === station.zone && other.id !== station.id && other.own !== true)
          .map((other) => ({ id: other.id, distance: roadDistanceM(station, other) }))
          .filter((other) => other.distance <= SEARCH_RADIUS_M),
      ]),
    )
  }
  return { models: models!, byId: byId!, neighbors: neighbors! }
}

/** Todas las estaciones, red y plantas propias. */
export function stations(): Station[] {
  return directory().models.map(({ id, name, zone, lat, lng, cv, own }) => ({ id, name, zone, lat, lng, cv, own }))
}

export function stationNameOf(id: string): string {
  return directory().byId.get(id)?.name ?? id
}

/** Día absoluto (días desde 1970 en hora local): la clave de los precios diarios. */
export function dayIndexOf(at: number): number {
  const date = new Date(at)
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
}

/** Medianoche local de un día absoluto. */
export function dayStartOf(dayIndex: number): number {
  const utc = new Date(dayIndex * 86_400_000)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()).getTime()
}

/** Precio de contrato de una estación ese día, en $/L con dos decimales. */
export function contractPriceAt(stationId: string, fuel: FuelType, dayIndex: number): number {
  const station = directory().byId.get(stationId)
  if (station === undefined) return Math.round(LIST_PRICE[fuel] * (1 - CONTRACT_DISCOUNT) * 100) / 100
  const daily = (hashFraction(`${stationId}:${fuel}:${dayIndex}`) - 0.5) * 2 * station.noise
  const list = LIST_PRICE[fuel] + ZONE_PRICE_DELTA[station.zone] + station.offset + station.fuelJitter[fuel] + daily
  return Math.round(list * (1 - CONTRACT_DISCOUNT) * 100) / 100
}

export type Recommendation = {
  stationId: string
  price: number
  /** Desvío por carretera hasta la recomendada, solo ida, en metros. */
  distanceM: number
}

/**
 * La estación más barata a ≤ 5 km de la habitual ese día, o `null` si la
 * habitual ya es la más barata de su entorno. Desempata por distancia.
 */
export function cheaperNeighbor(stationId: string, fuel: FuelType, dayIndex: number): Recommendation | null {
  const own = contractPriceAt(stationId, fuel, dayIndex)
  let best: Recommendation | null = null
  for (const candidate of directory().neighbors.get(stationId) ?? []) {
    const price = contractPriceAt(candidate.id, fuel, dayIndex)
    if (price >= own - MIN_PRICE_GAP + 1e-9) continue
    if (best === null || price < best.price || (price === best.price && candidate.distance < best.distanceM)) {
      best = { stationId: candidate.id, price, distanceM: candidate.distance }
    }
  }
  return best
}

// ── Plaza de cada unidad ─────────────────────────────────────────────────

const homeZones = new Map<string, Map<string, ZoneId>>()

/**
 * Plaza de una unidad: la de su departamento en el organigrama de fábrica de
 * la cuenta. Se usa el de FÁBRICA y no el editado a propósito: dónde carga un
 * camión no cambia porque alguien renombre un nodo, y el generador tiene que
 * dar las mismas cargas se le pase el organigrama que se le pase.
 *
 * Sin departamento —cuelga de la división o es un alta sin clasificar— se
 * toma la plaza de la división, o una por sorteo estable si tampoco la hay.
 */
export function homeZoneOf(account: Account, unitId: string): ZoneId | null {
  if (account.id !== STATION_ACCOUNT_ID) return null
  let zones = homeZones.get(account.id)
  if (zones === undefined) {
    zones = new Map()
    homeZones.set(account.id, zones)
  }
  const cached = zones.get(unitId)
  if (cached !== undefined) return cached

  const tree = baseOrgTreeOf(account)
  const nodeId = tree.assignment[unitId]
  const slugs = (nodeId === undefined ? [] : pathOf(tree, nodeId)).map((id) => id.slice(`org:${account.id}:`.length))
  const fromDepartment = ZONES.find((zone) => slugs.includes(ZONE_DEPARTMENT[zone.id]))?.id
  const fromDivision = slugs.map((slug) => DIVISION_ZONE[slug]).find((zone) => zone !== undefined)
  let zone = fromDepartment ?? fromDivision
  if (zone === undefined) {
    const roll = hashFraction(`${unitId}:plaza`)
    let acc = 0
    zone = ZONE_WEIGHTS.find(([, weight]) => (acc += weight) > roll)?.[0] ?? 'monterrey'
  }
  zones.set(unitId, zone)
  return zone
}

/** Estaciones de red habituales de una unidad: de una a tres de su plaza, fijas. */
function favoritesOf(unitId: string, zone: ZoneId): string[] {
  const local = directory().models.filter((station) => station.zone === zone && station.own !== true)
  const count = 1 + Math.floor(hashFraction(`${unitId}:favoritas`) * 3)
  return Array.from({ length: count }, (_, index) => local[Math.floor(hashFraction(`${unitId}:favorita:${index}`) * local.length)]!.id)
}

/**
 * Estación de un despacho. `null` en cuentas sin directorio.
 *
 * Determinista por (unidad, día, ordinal): no consume el generador del padrón,
 * así que no mueve ninguna otra cifra. La planta propia para Autoconsumo; para
 * TicketCar+, una habitual el 85 % de las veces y otra de la plaza el resto.
 */
export function stationForDispatch(
  account: Account,
  unitId: string,
  product: FuelProduct,
  dayIndex: number,
  ordinal: number,
): string | null {
  const zone = homeZoneOf(account, unitId)
  if (zone === null) return null
  if (product === 'autoconsumo') return `AUTO-${ZONE_CODES[zone]}`
  const roll = hashFraction(`${unitId}:${dayIndex}:${ordinal}:estacion`)
  if (roll < 0.85) {
    const favorites = favoritesOf(unitId, zone)
    return favorites[Math.floor(hashFraction(`${unitId}:${dayIndex}:${ordinal}:cual`) * favorites.length)]!
  }
  const local = directory().models.filter((station) => station.zone === zone && station.own !== true)
  return local[Math.floor(hashFraction(`${unitId}:${dayIndex}:${ordinal}:otra`) * local.length)]!.id
}
