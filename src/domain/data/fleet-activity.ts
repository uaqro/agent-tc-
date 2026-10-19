/**
 * Actividad de flota — datos mock del dashboard (US-008, ampliado en US-010).
 * ══════════════════════════════════════════════════════════════════════════
 * No hay backend: todo sale de aquí. El generador imita lo que la capa de
 * normalización entregaría ya canónico —despachos de combustible y telemetría
 * por unidad— para que el dashboard agregue datos con la forma real.
 *
 * Tres decisiones sostienen el resto del módulo:
 *
 *   1. DETERMINISMO. La semilla depende de la cuenta y del DÍA, nunca del
 *      instante de la consulta. El plan de la jornada se genera entero y luego
 *      se recorta a la hora actual, así que refrescar solo puede hacer crecer
 *      los totales del día: es lo que vuelve creíble el refresco automático
 *      del criterio 3, y lo que evita que cada recarga invente otros datos.
 *
 *   2. EL HISTÓRICO TAMBIÉN SE SIMULA UNIDAD A UNIDAD. Sería más barato
 *      inventar un total por día, pero entonces los filtros no podrían
 *      aplicarse a la serie sin repartir a ojo. Cada día cerrado deja una fila
 *      por unidad (`DayUnitRow`) y cualquier filtro se resuelve sumando las
 *      filas que casan. US-008 las agregaba antes en cubos de combustible ×
 *      centro de coste; US-010 añadió unidad y conductor, que son dimensiones
 *      de la propia unidad, y el cubo dejó de poder colapsarlas.
 *
 *   3. CASOS INCÓMODOS DE VERDAD. Un dashboard de números redondos no prueba
 *      nada. Van dentro, a propósito y anotados:
 *        · unidades que no reportan y unidades en taller;
 *        · un abono que deja el consumo de una unidad en negativo;
 *        · un día en que el mercado bajó del precio de contrato y el «ahorro»
 *          sale en rojo;
 *        · la cuenta dada de baja, que no tiene actividad ninguna;
 *        · un grupo diminuto —«Reserva y sustitución»— con el que casi
 *          cualquier segundo filtro deja la pantalla vacía (US-010);
 *        · unidades-día SIN conductor, las que están en taller, que solo
 *          aparecen al filtrar por «Sin conductor asignado» (US-010);
 *        · conductores con la licencia vencida, que siguen en el padrón
 *          porque el histórico es suyo (US-010).
 *
 *      Y desde la unificación de datos de Ticket Car+, con tests que los fijan
 *      (`data/__tests__/dataProperties.test.ts`):
 *        · ESTACIONALIDAD mensual (`MONTH_FACTOR`): más actividad en
 *          noviembre–diciembre, menos en enero–febrero y en Semana Santa;
 *        · un HUECO DE DATOS (`FEED_GAPS`): el flujo de TicketCar+ de febrero
 *          de 2026 no llegó, como en el reporte de eOne. Es un hueco, no un
 *          consumo cero, y el día lo declara en `DayPoint.missingFeeds`;
 *        · ANOMALÍAS de consumo para Insights: cargas por encima del tanque,
 *          cargas fuera de horario y unidades con rendimiento atípico.
 */
import { createRandom, pick, randomInt, type Random } from '../engine/prng'
import type {
  AccountActivity,
  DayPoint,
  DayUnitRow,
  DrivingBehavior,
  FleetDriver,
  FleetUnit,
  FuelEvent,
  FuelProduct,
  FuelType,
  RouteId,
  UnitClass,
  UnitDay,
  UnitGroup,
  UnitStatus,
} from '../dashboard/types'
import type { Account } from './accounts'
import { ACCOUNTS } from './accounts'
import { CONTRACT_DISCOUNT, LIST_PRICE } from './prices'
import { contractPriceAt, dayIndexOf, hashFraction, stationForDispatch } from '../stations/directory'

const HOUR = 60 * 60_000
const DAY = 24 * HOUR

const SEED = 20260901

/** Perfiles de operación. Marcan kilometraje, carga y frecuencia de repostaje. */
const COST_CENTERS = [
  { id: 'CC-01 · Reparto urbano', km: [60, 180] as const, liters: [45, 110] as const, refuelOdds: 0.42 },
  { id: 'CC-02 · Larga distancia', km: [280, 620] as const, liters: [180, 320] as const, refuelOdds: 0.58 },
  { id: 'CC-03 · Refrigerado', km: [120, 340] as const, liters: [120, 240] as const, refuelOdds: 0.5 },
  { id: 'CC-04 · Apoyo y talleres', km: [20, 90] as const, liters: [30, 70] as const, refuelOdds: 0.22 },
]

export const COST_CENTER_IDS: string[] = COST_CENTERS.map((c) => c.id)

/**
 * Grupos operativos de unidades — dimensión nueva de US-010.
 *
 * Corredores y zonas, no clases de vehículo: así el grupo cruza con el centro
 * de coste en vez de duplicarlo, y con el combustible en vez de determinarlo.
 * Un corredor lleva tractocamiones diésel y furgonetas de magna a la vez.
 */
export const UNIT_GROUPS: UnitGroup[] = [
  'GRP-01 · Zona Metropolitana',
  'GRP-02 · Corredor Norte',
  'GRP-03 · Corredor del Golfo',
  'GRP-04 · Occidente',
  'GRP-05 · Sureste',
  'GRP-06 · Reserva y sustitución',
]

/**
 * Rutas operativas — EP-03 · US-016, criterio 2.
 * ═════════════════════════════════════════════
 * La ruta es de la JORNADA, no del padrón: la misma unidad hace hoy un tramo
 * de larga distancia y mañana reparto metropolitano. Sin esa rotación, «gasto
 * por ruta» sería «gasto por grupo» con otro nombre.
 *
 * Cada ruta tiene AFINIDAD con un perfil de centro de coste —un tractocamión
 * de larga distancia no hace la ruta del centro histórico— y un factor de
 * consumo propio: la sierra gasta más que la autopista de llano a igualdad de
 * kilómetros. Ese factor es lo que hace que el eje ordene por algo real y no
 * por el azar del reparto.
 */
const ROUTES = [
  { id: 'RT-01 · Circuito Metropolitano', profile: 'CC-01 · Reparto urbano', factor: 1.0 },
  { id: 'RT-02 · Centro histórico', profile: 'CC-01 · Reparto urbano', factor: 1.12 },
  { id: 'RT-03 · Corredor Bajío–Norte', profile: 'CC-02 · Larga distancia', factor: 0.94 },
  { id: 'RT-04 · Sierra Madre Oriental', profile: 'CC-02 · Larga distancia', factor: 1.18 },
  { id: 'RT-05 · Golfo–Sureste', profile: 'CC-02 · Larga distancia', factor: 1.02 },
  { id: 'RT-06 · Cadena de frío Centro', profile: 'CC-03 · Refrigerado', factor: 1.08 },
  { id: 'RT-07 · Cadena de frío Occidente', profile: 'CC-03 · Refrigerado', factor: 1.0 },
  { id: 'RT-08 · Traslado a taller', profile: 'CC-04 · Apoyo y talleres', factor: 0.9 },
] as const

export const ROUTE_IDS: string[] = ROUTES.map((route) => route.id)

/** Rutas propias de un perfil, más una de fuera: la flota no es un carril. */
function routesFor(costCenter: string): typeof ROUTES[number][] {
  const own = ROUTES.filter((route) => route.profile === costCenter)
  return own.length > 0 ? own : [...ROUTES]
}

/**
 * Comportamiento de conducción — EP-03 · US-016, criterio 2.
 *
 * Los valores son el enum `evento` del contrato de telemetría, ya declarado en
 * `data/ingestion-sources`: `ralenti | frenado_brusco | exceso_velocidad`.
 *
 * `odds` reparte las jornadas y `fuel` es lo que cada comportamiento le hace a
 * la factura. Sin ese segundo número el eje sería decorativo: saldría en el
 * ranking ordenado por cuántas unidades cayeron en cada clase, no por cuánto
 * cuesta cada clase, y no habría nada que accionar.
 */
const BEHAVIOR_PROFILE: { id: DrivingBehavior; odds: number; fuel: number; km: number }[] = [
  { id: 'normal', odds: 0.72, fuel: 1.0, km: 1.0 },
  // Quema combustible parado: mismo gasto, menos recorrido.
  { id: 'ralenti', odds: 0.11, fuel: 1.07, km: 0.93 },
  { id: 'frenado_brusco', odds: 0.09, fuel: 1.05, km: 1.0 },
  { id: 'exceso_velocidad', odds: 0.08, fuel: 1.15, km: 1.04 },
]

function pickBehavior(roll: number): (typeof BEHAVIOR_PROFILE)[number] {
  let acc = 0
  for (const profile of BEHAVIOR_PROFILE) {
    acc += profile.odds
    if (roll < acc) return profile
  }
  return BEHAVIOR_PROFILE[0]!
}

/**
 * Reparto de la flota entre grupos, en partes de veinticinco.
 *
 * «Reserva y sustitución» se lleva una sola parte a propósito: en una cuenta
 * mediana son tres o cuatro unidades. Es el grupo con el que cualquier segundo
 * filtro deja la pantalla vacía, y el estado vacío hay que poder provocarlo
 * sin inventar una cuenta falsa.
 */
const GROUP_WEIGHTS: readonly UnitGroup[] = UNIT_GROUPS.flatMap((group, index) =>
  Array.from({ length: [6, 6, 5, 4, 3, 1][index] ?? 1 }, () => group),
)

/**
 * Ranura de la cuenta en el catálogo, para numerar unidades y conductores.
 *
 * Sin esto todas las cuentas empezaban en `ECO-1001` y el mismo identificador
 * designaba una unidad distinta en cada tenant. Mientras los filtros eran
 * combustible y centro de coste no se notaba; en cuanto US-010 dejó filtrar
 * POR UNIDAD, un Admin Edenred con varias cuentas en su alcance sumaba las
 * cuatro `ECO-1001` de la plataforma en una sola cifra.
 */
function accountSlot(account: Account): number {
  const index = ACCOUNTS.findIndex((candidate) => candidate.id === account.id)
  return index < 0 ? 0 : index + 1
}

// ── Padrón de conductores ────────────────────────────────────────────────

const FIRST_NAMES = [
  'Ramiro', 'Esteban', 'Lucía', 'Ignacio', 'Marisol', 'Aurelio', 'Teresa', 'Gerardo',
  'Rosalía', 'Bernardo', 'Ximena', 'Nicolás', 'Amparo', 'Rodrigo', 'Ofelia', 'Salvador',
  'Beatriz', 'Aristeo', 'Guadalupe', 'Efraín', 'Norma', 'Cuauhtémoc', 'Leticia', 'Fabián',
]

const SURNAMES = [
  'Escalante', 'Barragán', 'Villaseñor', 'Quintanilla', 'Zúñiga', 'Alcántara', 'Rentería',
  'Madrigal', 'Cifuentes', 'Bermúdez', 'Olvera', 'Sarmiento', 'Peñaloza', 'Ceballos',
  'Íñiguez', 'Marroquín', 'Tirado', 'Cazares', 'Nájera', 'Estrada',
]

/**
 * Fecha desde la que se miden las vigencias de licencia del padrón.
 *
 * Fija, como todo lo demás: si dependiera del día de la consulta, quién tiene
 * la licencia vencida cambiaría solo con dejar la pestaña abierta.
 */
const LICENSE_REFERENCE = new Date(2026, 8, 1).getTime()

const driverCache = new Map<string, FleetDriver[]>()

/**
 * Padrón de conductores de la cuenta.
 *
 * Hay MÁS conductores que unidades: en larga distancia una unidad la llevan
 * dos personas en turnos distintos, y las bajas y vacaciones se cubren con
 * relevos. Un padrón de conductores más corto que el de unidades obligaría a
 * que alguien condujera dos camiones el mismo día.
 */
export function fleetDriversOf(account: Account): FleetDriver[] {
  const cached = driverCache.get(account.id)
  if (cached) return cached

  const rnd = createRandom(SEED + hashText(account.id) + 104729)
  const base = accountSlot(account) * 1000
  // La cuenta dada de baja conserva su padrón: el histórico es de sus
  // conductores, y un filtro sobre él tiene que seguir encontrándolos.
  const total = Math.max(6, Math.round(account.fleetSize * 1.1))
  const drivers: FleetDriver[] = []

  for (let i = 0; i < total; i++) {
    const name = `${pick(rnd, FIRST_NAMES)} ${pick(rnd, SURNAMES)} ${pick(rnd, SURNAMES)}`
    drivers.push({
      id: `OP-${base + i + 1}`,
      name,
      accountId: account.id,
      group: pick(rnd, GROUP_WEIGHTS),
      // Uno de cada veinte arrastra la licencia vencida. No se le retira del
      // padrón: su histórico es suyo y el filtro tiene que poder encontrarlo.
      licenseExpiresAt:
        LICENSE_REFERENCE + (rnd() < 0.05 ? -randomInt(rnd, 30, 400) : randomInt(rnd, 30, 900)) * DAY,
    })
  }

  driverCache.set(account.id, drivers)
  return drivers
}

// Precio de lista y descuento de contrato: en `./prices`, compartidos con el
// directorio de estaciones (Ticket Car+).

/**
 * Hace once días el mercado se desplomó por debajo del precio de contrato.
 * Ese día el ahorro es NEGATIVO: el contrato costó más que la calle. Es el
 * caso que obliga a que la tarjeta de ahorro sepa pintar un número en rojo.
 */
const MARKET_DROP_DAYS_AGO = 11
const MARKET_DROP_FACTOR = 0.93

/** Precio de mercado de un día, relativo al de lista. */
function marketFactor(daysAgo: number): number {
  if (daysAgo === MARKET_DROP_DAYS_AGO) return MARKET_DROP_FACTOR
  // Oscilación suave y determinista: el mercado no salta al azar cada día.
  return 1 + Math.sin(daysAgo / 3.7) * 0.018
}

/** Estacionalidad semanal: el fin de semana la flota casi para. */
function weekdayFactor(at: number): number {
  const day = new Date(at).getDay()
  if (day === 0) return 0.28
  if (day === 6) return 0.46
  if (day === 5) return 1.08
  return 1
}

/**
 * Estacionalidad mensual — Ticket Car+ (la de eOne vivía en el reporte).
 * ═══════════════════════════════════════════════════════════════════
 * Multiplica la actividad del día, como `weekdayFactor`: kilómetros y
 * probabilidad de repostar. Noviembre–diciembre suben por el cierre de año y
 * el reparto navideño; enero–febrero y abril (Semana Santa) bajan. Septiembre
 * y octubre quedan en 1: la ventana de 30 días de la demo no cambia de escala.
 * Clave = `Date#getMonth()`.
 */
export const MONTH_FACTOR: readonly number[] = [0.84, 0.9, 0.98, 0.92, 1.02, 1.0, 0.95, 0.97, 1.0, 1.0, 1.06, 1.14]

function monthFactor(at: number): number {
  return MONTH_FACTOR[new Date(at).getMonth()] ?? 1
}

/**
 * Huecos de datos — el febrero de eOne, ahora dentro del generador único.
 * ══════════════════════════════════════════════════════════════════════
 * El switch de TicketCar+ no entregó el flujo de febrero de 2026: las cargas
 * existieron, pero no llegaron. Las unidades de TicketCar+ (algo más de la
 * mitad de la flota) se quedan esos días sin despachos y las de Autoconsumo
 * siguen. El reporte lo detecta en los datos y avisa; las gráficas lo pintan
 * como hueco gracias a `DayPoint.missingFeeds`. Nadie interpola.
 */
export const FEED_GAPS: readonly { product: FuelProduct; from: string; to: string }[] = [
  { product: 'ticketcar_plus', from: '2026-02-01', to: '2026-02-28' },
]

/** Productos cuyo flujo falta el día que empieza en `dayStart`. */
export function missingFeedsOn(dayStart: number): FuelProduct[] {
  const date = new Date(dayStart)
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return FEED_GAPS.filter((gap) => iso >= gap.from && iso <= gap.to).map((gap) => gap.product)
}

// ── Anomalías de consumo (para Insights, Fase 2) ─────────────────────────

/**
 * Llenado máximo normal: una carga no pasa del 95 % del tanque. Antes los litros
 * salían solo del centro de coste y la mitad de las cargas desbordaba el tanque
 * de su unidad (una van de 55 L cargando 200 L), lo que ahogaba la anomalía real.
 */
const TANK_FILL_MAX = 0.95
/** Cargas que superan la capacidad del tanque: 0,5 % de los despachos. */
export const OVER_TANK_RATE = 0.005
/** Cargas fuera de horario (de 01:00 a 04:59, con la unidad fuera de turno): 1 % de los despachos. */
export const OFF_HOURS_RATE = 0.01
/** Franja fuera de horario, en horas. Los turnos empiezan entre las 05:00 y las 08:59. */
export const OFF_HOURS = { from: 1, to: 5 } as const
/** Ordinal reservado al abono de la conciliación: no recibe anomalías. */
const REFUND_ORDINAL = 2

/**
 * Unidades con rendimiento atípico: una de cada cincuenta (2 %). Ruedan un 45 %
 * menos que sus pares y cargan un 40 % más a menudo, como una fuga o un uso
 * fuera de ruta.
 * Por índice, como el VIN pendiente: no mueve el sorteo de las demás.
 */
export function hasAtypicalEfficiency(index: number): boolean {
  return index % 50 === 17
}
const ATYPICAL_KM_FACTOR = 0.55
const ATYPICAL_REFUEL_FACTOR = 1.4

/** Precio de lista y de contrato de cada combustible, ese día. */
function priceOfDay(daysAgo: number): Record<FuelType, { list: number; contract: number }> {
  const factor = marketFactor(daysAgo)
  const build = (base: number) => ({
    list: round(base * factor, 3),
    // El precio de contrato NO sigue al mercado: por eso puede quedar por
    // encima cuando la calle baja, y entonces el ahorro sale negativo.
    contract: round(base * (1 - CONTRACT_DISCOUNT), 3),
  })
  return {
    magna: build(LIST_PRICE.magna),
    premium: build(LIST_PRICE.premium),
    diesel: build(LIST_PRICE.diesel),
  }
}

// ── Padrón de unidades ───────────────────────────────────────────────────

const PLATE_LETTERS = ['ABC', 'BCD', 'CDE', 'DEF', 'EFG', 'FGH', 'GHI', 'HIJ', 'JKL', 'LMN']

// ── Ficha del padrón — EP-02 · US-097 ────────────────────────────────────

/**
 * Modelos de la flota, por combustible.
 * ════════════════════════════════════
 * Se indexa por COMBUSTIBLE porque el combustible ya está decidido cuando se
 * llega aquí, y porque es lo que de verdad restringe el modelo: no hay
 * tractocamiones de magna ni furgonetas de reparto a diésel en esta flota.
 *
 * El tanque es un rango y sale de la clase, no del capricho: un T680 lleva
 * cuatrocientos y pico litros y una NP300 ochenta. Que el número sea plausible
 * importa porque el catálogo lo enseña al lado del rendimiento, y un tanque de
 * 400 L en una van delata el dato inventado a la primera mirada.
 */
const UNIT_MODELS: Record<FuelType, readonly {
  brand: string
  model: string
  vehicleClass: UnitClass
  tank: readonly [number, number]
  years: readonly [number, number]
}[]> = {
  diesel: [
    { brand: 'Kenworth', model: 'T680', vehicleClass: 'pesado', tank: [450, 570], years: [2018, 2024] },
    { brand: 'Freightliner', model: 'Cascadia 126', vehicleClass: 'pesado', tank: [420, 550], years: [2017, 2024] },
    { brand: 'Volvo', model: 'FH16 500', vehicleClass: 'pesado', tank: [460, 560], years: [2019, 2025] },
    { brand: 'International', model: 'LT625', vehicleClass: 'pesado', tank: [430, 530], years: [2018, 2023] },
    { brand: 'Isuzu', model: 'NPR Carga', vehicleClass: 'mediano', tank: [90, 140], years: [2019, 2025] },
    { brand: 'Hino', model: '300 Serie 616', vehicleClass: 'mediano', tank: [95, 130], years: [2018, 2024] },
    { brand: 'Ford', model: 'F-350 Cargo', vehicleClass: 'mediano', tank: [100, 140], years: [2019, 2024] },
    { brand: 'Toyota', model: 'Hilux 4x4 Diesel', vehicleClass: 'ligero', tank: [75, 90], years: [2020, 2025] },
    { brand: 'Mercedes-Benz', model: 'Sprinter 516 CDI', vehicleClass: 'van', tank: [70, 95], years: [2019, 2025] },
  ],
  magna: [
    { brand: 'Nissan', model: 'NP300 Doble Cab', vehicleClass: 'ligero', tank: [70, 85], years: [2019, 2025] },
    { brand: 'Chevrolet', model: 'Tornado Van', vehicleClass: 'van', tank: [55, 70], years: [2018, 2024] },
    { brand: 'Ford', model: 'Transit Custom', vehicleClass: 'van', tank: [70, 90], years: [2020, 2025] },
    { brand: 'Volkswagen', model: 'Caddy Cargo', vehicleClass: 'van', tank: [50, 65], years: [2019, 2024] },
  ],
  premium: [
    { brand: 'Toyota', model: 'Land Cruiser 79', vehicleClass: 'ligero', tank: [85, 105], years: [2018, 2023] },
    { brand: 'Ford', model: 'F-250 Super Duty', vehicleClass: 'ligero', tank: [110, 130], years: [2019, 2024] },
  ],
}

/** Letras válidas de un VIN: sin I, O ni Q, que se confunden con 1 y 0. */
const VIN_ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'

/**
 * Fecha contra la que se fechan las altas y bajas del padrón.
 * ═════════════════════════════════════════════════════════
 * Un ancla FIJA, no `now`. El alta de un vehículo es un hecho histórico: no se
 * mueve porque alguien abra la pantalla otro día. Anclarla a `now` haría que
 * el padrón envejeciera hacia atrás en cada recarga y que dos pantallas
 * abiertas con minutos de diferencia enseñaran fichas distintas.
 *
 * Va lo bastante atrás del reloj del prototipo (agosto de 2026) para que
 * ninguna alta caiga en el futuro.
 */
const REGISTRY_ANCHOR = new Date(2026, 5, 1).getTime()

const YEAR_MS = 365 * DAY

const unitCache = new Map<string, FleetUnit[]>()

/**
 * Completa la ficha de padrón de una unidad ya construida.
 *
 * ── Por qué un generador APARTE y con su propia semilla ───────────────────
 * El `Random` de `fleetUnitsOf` es una secuencia: cada extracción mueve la
 * siguiente. Añadir tiradas dentro de ese bucle habría desplazado el grupo, el
 * centro de coste y el combustible de todas las unidades posteriores, y con
 * ellos los agregados del dashboard, los rankings de US-016 y las
 * comparativas de EP-08 — números que ya están fijados por tests.
 *
 * Sembrando por ID de unidad, la ficha es determinista, estable y NO toca una
 * sola cifra de lo que ya estaba. Es además independiente del orden: la unidad
 * `ECO-1042` tiene la misma ficha se genere la primera o la última.
 */
function registryCardOf(
  unit: Pick<FleetUnit, 'id' | 'fuel'>,
  index: number,
): Pick<
  FleetUnit,
  'vin' | 'brand' | 'model' | 'year' | 'vehicleClass' | 'tankLiters' | 'odometerKm' | 'registeredAt' | 'deregisteredAt'
> {
  const rnd = createRandom(SEED + hashText(`${unit.id}:ficha`))
  const spec = pick(rnd, UNIT_MODELS[unit.fuel])
  const year = randomInt(rnd, spec.years[0], spec.years[1])

  /**
   * Alta en el padrón: nunca antes del año-modelo.
   *
   * Un vehículo 2023 dado de alta en 2019 es el error que delata un mock
   * generado a tirones independientes. Se cuenta desde el 1 de enero de su
   * año-modelo y se le suman entre tres meses y dos años y medio.
   */
  const modelYearStart = new Date(year, 0, 1).getTime()
  const registeredAt = Math.min(
    modelYearStart + randomInt(rnd, 90, 900) * DAY,
    REGISTRY_ANCHOR - 30 * DAY,
  )

  /**
   * Bajas: una de cada veinticinco, y solo si lleva más de dos años de alta.
   *
   * Se quedan en el catálogo a propósito. Su histórico de consumo es suyo y
   * sigue sumando en los cierres del periodo en que operó; esconderlas dejaría
   * al administrador buscando una unidad cuyo gasto sí ve en los informes.
   */
  const antiquity = REGISTRY_ANCHOR - registeredAt
  const deregisteredAt =
    index % 25 === 7 && antiquity > 2 * YEAR_MS
      ? registeredAt + Math.round(antiquity * 0.7)
      : null

  /**
   * Odómetro. Nulo en una de cada cuarenta: la unidad nunca reportó
   * telemetría y nadie capturó la lectura a mano.
   *
   * El hueco importa porque un cero mentiría —diría «no ha rodado»— y aquí lo
   * que pasa es que no se sabe. Es la misma distinción que el prototipo hace
   * con el rendimiento del día cuando no hay litros con los que calcularlo.
   */
  const yearsRunning = Math.max(0.5, (REGISTRY_ANCHOR - registeredAt) / YEAR_MS)
  const kmPerYear = spec.vehicleClass === 'pesado' ? randomInt(rnd, 78_000, 132_000) : randomInt(rnd, 22_000, 54_000)
  const odometerKm = index % 40 === 13 ? null : Math.round(yearsRunning * kmPerYear)

  return {
    // Una de cada treinta llega sin VIN: la factura del fabricante no está.
    vin: index % 30 === 11 ? '' : vinFor(rnd, year),
    brand: spec.brand,
    model: spec.model,
    year,
    vehicleClass: spec.vehicleClass,
    tankLiters: randomInt(rnd, spec.tank[0], spec.tank[1]),
    odometerKm,
    registeredAt,
    deregisteredAt,
  }
}

/** Diecisiete caracteres, como un VIN real. No se valida el dígito de control. */
function vinFor(rnd: Random, year: number): string {
  let vin = ''
  for (let i = 0; i < 17; i++) {
    // La posición 10 codifica el año-modelo en un VIN de verdad. Aquí se
    // respeta para que el número no contradiga a la columna de al lado.
    if (i === 9) {
      vin += VIN_ALPHABET[year % VIN_ALPHABET.length]
      continue
    }
    vin += VIN_ALPHABET[randomInt(rnd, 0, VIN_ALPHABET.length - 1)]
  }
  return vin
}

/**
 * Padrón de la cuenta: una unidad por vehículo contratado.
 *
 * Se cachea porque no cambia nunca y porque una cuenta de 512 unidades se
 * recorre una vez por día simulado: regenerarla sería trabajo tirado.
 */
/**
 * Unidades del padrón SIN titular declarado — sesión con Joaquín Miguens
 * (20-ago), «añadir estado sin conductor asignado/declarado».
 *
 * Una de cada dieciocho, por índice y no por sorteo, igual que el VIN
 * pendiente y el odómetro sin lectura de `registryCardOf`. Los tres son el
 * mismo tipo de hueco —una ficha que se abrió con la placa y se completó a
 * medias— y los tres tienen que poder verse en pantalla: un estado que el
 * generador nunca produce es un filtro que siempre devuelve cero.
 *
 * El desfase con el `% 30` del VIN y el `% 40` del odómetro es a propósito:
 * con periodos primos entre sí, las unidades incompletas se solapan a veces y
 * otras no, que es como se ven en un padrón de verdad.
 */
function hasNoRegisteredDriver(index: number): boolean {
  return index % 18 === 5
}

/**
 * Producto de Edenred de cada unidad — sesión con Joaquín Miguens (20-ago).
 * ════════════════════════════════════════════════════════════════════════
 * Dos de cada cinco unidades operan con la estación propia del cliente
 * (Autoconsumo) y el resto con la tarjeta en red externa (TicketCar+). El
 * reparto no es un dato de negocio ratificado: es lo que hace que el filtro
 * signifique algo en las dos posiciones —una proporción de 95/5 dejaría un
 * lado del superfiltro con una pantalla casi vacía y no se podría ver si el
 * corte funciona—.
 *
 * Por ÍNDICE y no por sorteo, como el VIN pendiente y el titular ausente: el
 * orden del generador está fijado por los agregados que dependen de él, y una
 * tirada nueva aquí movería centro de coste y combustible de toda la flota.
 * `% 5` es primo con el `% 18` del titular y con el `% 30` del VIN, así que
 * las tres características se cruzan en vez de solaparse siempre.
 */
function productOf(index: number): FuelProduct {
  return index % 5 < 2 ? 'autoconsumo' : 'ticketcar_plus'
}

export function fleetUnitsOf(account: Account): FleetUnit[] {
  const cached = unitCache.get(account.id)
  if (cached) return cached

  const rnd = createRandom(SEED + hashText(account.id))
  const drivers = fleetDriversOf(account)
  const byGroup = driversByGroup(drivers)
  const base = accountSlot(account) * 1000
  const units: FleetUnit[] = []

  for (let i = 0; i < account.fleetSize; i++) {
    const letters = PLATE_LETTERS[i % PLATE_LETTERS.length]!
    const group = pick(rnd, GROUP_WEIGHTS)
    /**
     * El titular sale del mismo grupo que la unidad. Cuando ese grupo no tiene
     * conductores —una cuenta pequeña con un grupo diminuto— se coge cualquiera
     * antes que inventarle uno de otro corredor.
     */
    const pool = byGroup.get(group) ?? drivers
    const id = `ECO-${base + i + 1}`

    /**
     * ⚠️ El ORDEN de estas tres tiradas está fijado por los agregados que ya
     * dependen de él, y por eso salen del literal a variables: la del titular
     * TIENE que ejecutarse aunque la unidad se vaya a quedar sin él.
     *
     * Escrito como un ternario dentro del objeto, `hasNoRegisteredDriver`
     * cortocircuitaría el `pick` y desplazaría el sorteo de todas las unidades
     * siguientes —cambiando centro de coste y combustible de media flota— solo
     * para introducir un hueco en el padrón. El hueco se aplica al RESULTADO,
     * no al sorteo.
     *
     * La ficha de padrón de US-097 NO se extrae de aquí: ver `registryCardOf`.
     */
    const costCenter = pick(rnd, COST_CENTERS).id
    // La flota es mayoritariamente diésel, como cualquier flota de carga.
    const fuel = pick<FuelType>(rnd, ['diesel', 'diesel', 'diesel', 'magna', 'premium'])
    const drawnDriverId = pool.length > 0 ? pick(rnd, pool).id : ''

    const core = {
      id,
      plate: `${letters}-${String(10 + (i % 89)).padStart(2, '0')}-${String((i % 97) + 1).padStart(2, '0')}`,
      accountId: account.id,
      costCenter,
      group,
      fuel,
      product: productOf(i),
      assignedDriverId: hasNoRegisteredDriver(i) ? '' : drawnDriverId,
    }
    units.push({ ...core, ...registryCardOf(core, i) })
  }

  unitCache.set(account.id, units)
  return units
}

/** Índice conductores por grupo. Se construye una vez, no una vez por unidad. */
function driversByGroup(drivers: FleetDriver[]): Map<UnitGroup, FleetDriver[]> {
  const byGroup = new Map<UnitGroup, FleetDriver[]>()
  for (const driver of drivers) {
    const list = byGroup.get(driver.group)
    if (list) list.push(driver)
    else byGroup.set(driver.group, [driver])
  }
  return byGroup
}

// ── Plan de la jornada ───────────────────────────────────────────────────

/** Lo que una unidad tiene previsto hacer en un día concreto. */
type UnitPlan = {
  unit: FleetUnit
  status: UnitStatus
  /**
   * Quién la conduce ESE día. Casi siempre el titular, a veces un relevo del
   * mismo grupo, y nadie cuando la unidad está en taller.
   */
  driverId: string | null
  /** Ruta organizativa de la unidad — US-013. Vacía sin organigrama. */
  orgPath: readonly string[]
  /** Ruta operativa que recorre ESE día — US-016. */
  routeId: RouteId
  /** Cómo se condujo ESE día — US-016. */
  behavior: DrivingBehavior
  /** Ventana de operación de la unidad ese día. */
  shiftStart: number
  shiftEnd: number
  /** Kilómetros que recorrerá en toda la jornada. */
  kmTotal: number
  events: FuelEvent[]
}

/**
 * Plan completo de un día, generado de una vez y sin mirar la hora.
 * Recortarlo por `now` es lo que da el crecimiento monótono del día en curso.
 */
function dayPlan(
  account: Account,
  dayStart: number,
  todayStart: number,
  orgPathOf: (unitId: string) => readonly string[],
): UnitPlan[] {
  const units = fleetUnitsOf(account)
  const relief = driversByGroup(fleetDriversOf(account))
  const dayIndex = Math.round(dayStart / DAY)
  const rnd = createRandom(SEED + hashText(account.id) + dayIndex * 7919)
  const daysAgo = Math.max(0, Math.round((todayStart - dayStart) / DAY))
  const price = priceOfDay(daysAgo)
  const intensity = weekdayFactor(dayStart) * monthFactor(dayStart)
  const missingFeeds = missingFeedsOn(dayStart)

  const plans: UnitPlan[] = []

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]!
    const profile = COST_CENTERS.find((c) => c.id === unit.costCenter) ?? COST_CENTERS[0]!
    const orgPath = orgPathOf(unit.id)

    // Taller y unidades mudas: proporción realista, no anecdótica.
    const roll = rnd()
    const status: UnitStatus = roll < 0.04 ? 'en_taller' : roll < 0.1 ? 'sin_reportar' : 'activa'

    /**
     * Rotación de conductores.
     *
     * Uno de cada cinco días la unidad la lleva un relevo de su mismo grupo.
     * Es lo que hace que «consumo por conductor» sea una pregunta distinta de
     * «consumo por unidad»: sin rotación, las dos series serían la misma con
     * otro nombre y el filtro de conductor no probaría nada.
     *
     * En taller no conduce nadie. Ese `null` es el que saca a la luz el filtro
     * «Sin conductor asignado».
     *
     * El segundo `null` es nuevo y viene del hueco del padrón: una unidad sin
     * titular declarado que hoy no lleva relevo tampoco tiene conductor de
     * jornada. Devolver aquí su `assignedDriverId` —la cadena vacía— habría
     * metido un identificador de conductor VACÍO en los despachos, y de ahí a
     * los nueve ejes de US-016 y al selector de conductor de US-010: una
     * persona fantasma con su propia fila de consumo. `null` ya significa
     * exactamente esto y ya lo entiende todo lo de aguas abajo.
     */
    const pool = relief.get(unit.group)
    const driverId: string | null =
      status === 'en_taller'
        ? null
        : rnd() < 0.22 && pool !== undefined && pool.length > 0
          ? pick(rnd, pool).id
          : unit.assignedDriverId === ''
            ? null
            : unit.assignedDriverId

    /**
     * Ruta y comportamiento del día — US-016.
     *
     * Los dos se sortean por JORNADA, como el conductor, no por unidad: es lo
     * que hace que los dos ejes digan algo que el grupo y el centro de coste
     * no dicen. La ruta sale del catálogo afín a su perfil; el comportamiento,
     * del reparto del contrato de telemetría.
     */
    const routeId = pick(rnd, routesFor(unit.costCenter)).id
    const behaviorProfile = pickBehavior(rnd())
    const routeFactor = ROUTES.find((route) => route.id === routeId)?.factor ?? 1

    const shiftStart = dayStart + randomInt(rnd, 5, 8) * HOUR + randomInt(rnd, 0, 59) * 60_000
    const shiftEnd = shiftStart + randomInt(rnd, 8, 12) * HOUR
    const kmFactor = intensity * behaviorProfile.km * (hasAtypicalEfficiency(i) ? ATYPICAL_KM_FACTOR : 1)
    const kmTotal = status === 'activa' ? Math.round(randomInt(rnd, profile.km[0], profile.km[1]) * kmFactor) : 0

    const events: FuelEvent[] = []
    // Lo que la ruta y la conducción le hacen a la factura del día. Es lo que
    // convierte los dos ejes nuevos en drivers de gasto y no en etiquetas.
    const consumption = routeFactor * behaviorProfile.fuel
    const context = { routeId, behavior: behaviorProfile.id, consumption }

    // Un camión no reposta todos los días: la probabilidad es por perfil.
    const refuelOdds = profile.refuelOdds * intensity * (hasAtypicalEfficiency(i) ? ATYPICAL_REFUEL_FACTOR : 1)
    if (status === 'activa' && rnd() < refuelOdds) {
      events.push(
        fuelEvent(rnd, account, unit, driverId, orgPath, context, price, profile.liters, shiftStart, shiftEnd, 0),
      )
      // Doble carga en jornadas largas.
      if (profile.refuelOdds > 0.5 && rnd() < 0.12) {
        events.push(
          fuelEvent(rnd, account, unit, driverId, orgPath, context, price, profile.liters, shiftStart, shiftEnd, 1),
        )
      }
    }

    /**
     * Unidad dada de baja — Ticket Car+.
     *
     * En eOne seguía cargando después de su baja: el padrón la tenía de baja y
     * el histórico le seguía sumando litros. Aquí, desde el día de la baja no
     * reporta ni carga. Las tiradas de arriba se hacen igual y se descartan,
     * para no mover el sorteo de las demás unidades.
     */
    const retired = unit.deregisteredAt !== null && unit.deregisteredAt <= dayStart
    // Flujo no entregado (`FEED_GAPS`): la unidad operó, pero sus despachos no llegaron.
    const undelivered = missingFeeds.includes(unit.product)

    plans.push({
      unit,
      status: retired ? 'sin_reportar' : status,
      driverId: retired ? null : driverId,
      orgPath,
      routeId,
      behavior: behaviorProfile.id,
      shiftStart,
      shiftEnd,
      kmTotal: retired ? 0 : kmTotal,
      events: retired || undelivered ? [] : events,
    })
  }

  /**
   * Caso negativo deliberado: la conciliación abona una carga de días atrás
   * que estaba imputada a la unidad equivocada.
   *
   * El abono se carga contra una unidad que HOY no ha repostado, que es lo que
   * deja su jornada con litros e importe por debajo de cero. Si se abonara
   * sobre su propia carga del día el neto sería cero, y un cero no obliga a
   * nadie a saber pintar un negativo.
   */
  const abonada = plans.find(
    (plan) => plan.status === 'activa' && plan.events.length === 0 && !missingFeeds.includes(plan.unit.product),
  )
  if (abonada) {
    const profile = COST_CENTERS.find((c) => c.id === abonada.unit.costCenter) ?? COST_CENTERS[0]!
    const cargo = fuelEvent(
      rnd,
      account,
      abonada.unit,
      abonada.driverId,
      abonada.orgPath,
      { routeId: abonada.routeId, behavior: abonada.behavior, consumption: 1 },
      price,
      profile.liters,
      abonada.shiftStart,
      abonada.shiftEnd,
      REFUND_ORDINAL,
    )
    abonada.events.push({
      ...cargo,
      liters: -cargo.liters,
      amountMxn: -cargo.amountMxn,
      listAmountMxn: -cargo.listAmountMxn,
      refund: true,
    })
  }

  return plans
}

/** Ruta, conducción y lo que las dos le hacen al consumo — US-016. */
type DayContext = { routeId: RouteId; behavior: DrivingBehavior; consumption: number }

function fuelEvent(
  rnd: Random,
  account: Account,
  unit: FleetUnit,
  driverId: string | null,
  orgPath: readonly string[],
  context: DayContext,
  price: Record<FuelType, { list: number; contract: number }>,
  litersRange: readonly [number, number],
  shiftStart: number,
  shiftEnd: number,
  /** Orden del despacho en la jornada de la unidad: fija su estación. */
  ordinal: number,
): FuelEvent {
  const drawn = (randomInt(rnd, litersRange[0], litersRange[1]) + rnd()) * context.consumption
  const day = dayIndexOf(shiftStart)
  const key = `${unit.id}:${day}:${ordinal}`
  const anomalies = ordinal !== REFUND_ORDINAL
  // Lo que cabe en el tanque: si el perfil pide más, se llena entre el 60 y el 95 %.
  const cap = unit.tankLiters * TANK_FILL_MAX
  let liters = round(drawn <= cap ? drawn : cap * (0.6 + 0.35 * hashFraction(`${key}:llenado`)), 2)
  // Anomalía: carga por encima del tanque, entre un 15 y un 55 % más de su capacidad.
  if (anomalies && hashFraction(`${key}:sobre-tanque`) < OVER_TANK_RATE) {
    liters = round(unit.tankLiters * (1.15 + 0.4 * hashFraction(`${key}:exceso`)), 2)
  }
  let at = shiftStart + Math.round(rnd() * (shiftEnd - shiftStart))
  // Anomalía: carga de madrugada, con la unidad fuera de turno.
  if (anomalies && hashFraction(`${key}:horario`) < OFF_HOURS_RATE) {
    const offset = Math.floor(hashFraction(`${key}:hora`) * (OFF_HOURS.to - OFF_HOURS.from) * HOUR)
    at = startOfDay(shiftStart) + OFF_HOURS.from * HOUR + offset
  }
  const tariff = price[unit.fuel]
  // Estación y precio de esa estación — Ticket Car+. Sin directorio, el
  // precio de contrato único de eOne.
  const stationId = stationForDispatch(account, unit.id, unit.product, day, ordinal)
  const contract = stationId === null ? tariff.contract : contractPriceAt(stationId, unit.fuel, day)
  return {
    unitId: unit.id,
    plate: unit.plate,
    costCenter: unit.costCenter,
    group: unit.group,
    orgPath,
    fuel: unit.fuel,
    // El despacho hereda el producto de su unidad. Ver `FuelProduct`.
    product: unit.product,
    driverId,
    routeId: context.routeId,
    behavior: context.behavior,
    at,
    liters,
    amountMxn: round(liters * contract, 2),
    listAmountMxn: round(liters * tariff.list, 2),
    refund: false,
    stationId,
  }
}

// ── Recorte del día en curso ─────────────────────────────────────────────

function snapshotUnits(plans: UnitPlan[], now: number): UnitDay[] {
  return plans.map((plan) => {
    const events = plan.events.filter((event) => event.at <= now)
    const liters = sum(events.map((e) => e.liters))
    const amountMxn = sum(events.map((e) => e.amountMxn))
    const listMxn = sum(events.map((e) => e.listAmountMxn))

    // Los kilómetros se acumulan con la jornada, no aparecen de golpe al final.
    const elapsed = clamp01((now - plan.shiftStart) / (plan.shiftEnd - plan.shiftStart))
    const km = plan.status === 'activa' ? Math.round(plan.kmTotal * elapsed) : 0

    // Antes de que arranque su turno la unidad aún no ha reportado, pero
    // tampoco está muda: su estado en el padrón del día sigue siendo «activa».
    const reported = plan.status === 'activa' && now >= plan.shiftStart
    const lastReportAt = reported ? Math.min(now, plan.shiftEnd) : null

    return {
      unitId: plan.unit.id,
      plate: plan.unit.plate,
      accountId: plan.unit.accountId,
      costCenter: plan.unit.costCenter,
      group: plan.unit.group,
      orgPath: plan.orgPath,
      fuel: plan.unit.fuel,
      product: plan.unit.product,
      driverId: plan.driverId,
      routeId: plan.routeId,
      behavior: plan.behavior,
      status: plan.status,
      liters: round(liters, 2),
      amountMxn: round(amountMxn, 2),
      savingMxn: round(listMxn - amountMxn, 2),
      km,
      efficiency: liters > 0 ? round(km / liters, 2) : null,
      refuels: events.filter((e) => !e.refund).length,
      lastReportAt,
    }
  })
}

function eventsUpTo(plans: UnitPlan[], until: number): FuelEvent[] {
  const events: FuelEvent[] = []
  for (const plan of plans) {
    for (const event of plan.events) {
      if (event.at <= until) events.push(event)
    }
  }
  return events.sort((a, b) => a.at - b.at)
}

// ── Agregación del día ───────────────────────────────────────────────────

const dayLabel = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' })

/**
 * Reduce el plan de la jornada a una fila por unidad, recortada a `until`.
 *
 * Una fila por unidad y no un cubo por combustible × centro de coste: ver
 * `DayUnitRow` para el porqué. Las dimensiones se copian tal cual, sin
 * agregarlas, que es lo que permite que el mismo bucle de suma resuelva las
 * ocho dimensiones del filtro sin casos especiales.
 */
function unitRows(plans: UnitPlan[], until: number): DayUnitRow[] {
  const rows: DayUnitRow[] = []

  for (const plan of plans) {
    let liters = 0
    let amountMxn = 0
    let savingMxn = 0

    for (const event of plan.events) {
      if (event.at > until) continue
      liters += event.liters
      amountMxn += event.amountMxn
      savingMxn += event.listAmountMxn - event.amountMxn
    }

    rows.push({
      unitId: plan.unit.id,
      fuel: plan.unit.fuel,
      product: plan.unit.product,
      costCenter: plan.unit.costCenter,
      group: plan.unit.group,
      orgPath: plan.orgPath,
      driverId: plan.driverId,
      routeId: plan.routeId,
      behavior: plan.behavior,
      liters: round(liters, 2),
      amountMxn: round(amountMxn, 2),
      savingMxn: round(savingMxn, 2),
      active: plan.status === 'activa' && until >= plan.shiftStart,
      // Mismo cálculo que `snapshotUnits`: los kilómetros crecen con la
      // jornada. En un día cerrado `until` cae después del turno y salen todos.
      km:
        plan.status === 'activa'
          ? Math.round(plan.kmTotal * clamp01((until - plan.shiftStart) / (plan.shiftEnd - plan.shiftStart)))
          : 0,
    })
  }

  return rows
}

function dayPoint(
  account: Account,
  dayStart: number,
  todayStart: number,
  until: number,
  orgPathOf: (unitId: string) => readonly string[],
): DayPoint {
  const plans = dayPlan(account, dayStart, todayStart, orgPathOf)
  return {
    at: dayStart,
    label: dayLabel.format(new Date(dayStart)),
    partial: dayStart === todayStart,
    rows: unitRows(plans, until),
    missingFeeds: missingFeedsOn(dayStart),
    // Los despachos con su hora — US-016. Se recortan por `until` igual que las
    // filas, para que el día en curso no adelante repostajes que aún no han
    // ocurrido.
    events: eventsUpTo(plans, until),
  }
}

// ── Punto de entrada ─────────────────────────────────────────────────────

export type ActivityOptions = {
  /** Días cerrados que se incluyen antes del día en curso. */
  periodDays: number
  /**
   * Ruta organizativa de cada unidad — US-013.
   *
   * Llega por INYECCIÓN y no importando el módulo de jerarquías: este
   * generador imita lo que entregaría la capa de normalización, y esa capa no
   * sabe de organigramas. Además el organigrama se puede editar en el panel de
   * administración, así que la ruta es un dato de la consulta, no del padrón:
   * atarla aquí obligaría a invalidar la caché de unidades con cada cambio de
   * nombre de un departamento.
   *
   * Sin ella, las rutas van vacías y todo lo demás sigue funcionando igual.
   */
  orgPathOf?: (unitId: string) => readonly string[]
  /**
   * Traer también el periodo inmediatamente anterior — EP-03 · US-016.
   *
   * Es opcional porque cuesta lo mismo que el periodo pedido y no todo el
   * mundo lo necesita: el dashboard compara contra AYER A LA MISMA HORA, que
   * ya viene resuelto, y solo el ranking de consumos compara periodo contra
   * periodo. Sin esta bandera, `previousPeriod` sale vacío.
   */
  withComparison?: boolean
}

/** Ruta vacía compartida: una unidad sin organigrama no reserva memoria. */
const NO_ORG_PATH: readonly string[] = Object.freeze([])

/**
 * Las filas unidad-día de UN día suelto — EP-08 · US-050.
 * ══════════════════════════════════════════════════════
 * `buildAccountActivity` devuelve la ventana entera, y para el dashboard eso
 * está bien: treinta días de una cuenta caben de sobra en memoria.
 *
 * La comparativa de US-050 necesita VEINTICUATRO MESES de la cartera completa
 * —unas 850 000 filas— y solo para sumarlas por mes. Materializarlas todas
 * para tirarlas acto seguido reservaría cientos de megas sin ganar nada, así
 * que esta puerta permite recorrer día a día y quedarse únicamente con los
 * agregados. La memoria que se retiene es la de UN día.
 *
 * Es la misma generación, no una segunda: quien pida el mismo día por los dos
 * caminos obtiene exactamente las mismas filas.
 */
export function unitDayRows(
  account: Account,
  dayStart: number,
  now: number,
  orgPathOf: (unitId: string) => readonly string[] = () => NO_ORG_PATH,
): DayUnitRow[] {
  if (!account.active) return []

  const todayStart = startOfDay(now)
  // El día en curso va recortado a la hora actual; los cerrados, enteros.
  const until = dayStart === todayStart ? now : dayStart + DAY - 1
  return unitRows(dayPlan(account, dayStart, todayStart, orgPathOf), until)
}

/**
 * La jornada EN CURSO, unidad a unidad, recortada a `now` — EP-02 · US-097.
 * ════════════════════════════════════════════════════════════════════════
 * Hermana de `unitDayRows` y por el mismo motivo: es la MISMA generación que
 * consume el dashboard, no una segunda. Quien pida el día por los dos caminos
 * obtiene las mismas unidades con el mismo estado.
 *
 * La diferencia con `unitDayRows` es qué trae cada una. Aquella devuelve la
 * fila AGREGADA del día —litros, importe, ahorro— que es lo que necesitan las
 * series y los filtros. Esta devuelve la foto de la unidad: en qué estado
 * está, cuánto ha rodado y cuándo reportó por última vez, que es lo que el
 * catálogo de vehículos enseña en la columna «estado».
 *
 * El catálogo la llama en vez de `buildAccountActivity` porque solo necesita
 * hoy: aquella construye además el periodo entero y el anterior, que aquí
 * sería recorrer noventa días para enseñar uno.
 */
export function todayUnits(account: Account, now: number): UnitDay[] {
  if (!account.active) return []
  const todayStart = startOfDay(now)
  return snapshotUnits(dayPlan(account, todayStart, todayStart, () => NO_ORG_PATH), now)
}

/**
 * Todos los despachos de los días CERRADOS entre dos fechas — Ticket Car+.
 * ═════════════════════════════════════════════════════════════════════
 * La puerta del reporte consolidado: sus dos fuentes (ERP de Autoconsumo y
 * switch de TicketCar+) se construyen con estos despachos, que son los mismos
 * que suman el dashboard y el optimizador. Antes el reporte sorteaba los suyos.
 *
 * Se recorre día a día y se queda solo con los despachos: la memoria que se
 * retiene es la de la lista, no la de los planes.
 */
export function eventsBetween(
  account: Account,
  fromAt: number,
  toAt: number,
  now: number,
  orgPathOf: (unitId: string) => readonly string[] = () => NO_ORG_PATH,
): FuelEvent[] {
  if (!account.active) return []
  const todayStart = startOfDay(now)
  const events: FuelEvent[] = []
  for (let dayStart = startOfDay(fromAt); dayStart <= startOfDay(toAt) && dayStart < todayStart; dayStart = startOfDay(dayStart + DAY + HOUR)) {
    events.push(...eventsUpTo(dayPlan(account, dayStart, todayStart, orgPathOf), dayStart + DAY - 1))
  }
  return events
}

/** Foto de una cuenta en el instante `now`. */
export function buildAccountActivity(
  account: Account,
  now: number,
  options: ActivityOptions,
): AccountActivity {
  const todayStart = startOfDay(now)

  // La cuenta dada de baja conserva su histórico contractual pero no genera
  // actividad: es el estado vacío del dashboard, y sale de los datos, no de
  // un `if` en la vista.
  if (!account.active) {
    return {
      accountId: account.id,
      accountName: account.name,
      fleetSize: 0,
      units: [],
      todayEvents: [],
      yesterdayEvents: [],
      activeUnitsYesterday: 0,
      period: [],
      previousPeriod: [],
    }
  }

  const orgPathOf = options.orgPathOf ?? (() => NO_ORG_PATH)
  const today = dayPlan(account, todayStart, todayStart, orgPathOf)
  const yesterday = dayPlan(account, todayStart - DAY, todayStart, orgPathOf)

  const period: DayPoint[] = []
  for (let daysAgo = options.periodDays; daysAgo >= 1; daysAgo--) {
    const dayStart = todayStart - daysAgo * DAY
    period.push(dayPoint(account, dayStart, todayStart, dayStart + DAY - 1, orgPathOf))
  }
  period.push({
    at: todayStart,
    label: dayLabel.format(new Date(todayStart)),
    partial: true,
    rows: unitRows(today, now),
    missingFeeds: missingFeedsOn(todayStart),
    events: eventsUpTo(today, now),
  })

  /**
   * Periodo inmediatamente anterior, del mismo tamaño — US-016, criterio 3.
   *
   * Empieza donde acaba el otro: con 30 días, del −60 al −31. No se solapan ni
   * dejan hueco, y todos sus días están CERRADOS —el más reciente es el −31—,
   * así que se comparan totales sin prorratear nada.
   */
  const previousPeriod: DayPoint[] = []
  if (options.withComparison === true) {
    for (let daysAgo = options.periodDays * 2; daysAgo > options.periodDays; daysAgo--) {
      const dayStart = todayStart - daysAgo * DAY
      previousPeriod.push(dayPoint(account, dayStart, todayStart, dayStart + DAY - 1, orgPathOf))
    }
  }

  // El mismo punto de la jornada de ayer, para la comparación de arriba.
  const sameTimeYesterday = todayStart - DAY + (now - todayStart)

  return {
    accountId: account.id,
    accountName: account.name,
    fleetSize: account.fleetSize,
    units: snapshotUnits(today, now),
    todayEvents: eventsUpTo(today, now),
    yesterdayEvents: eventsUpTo(yesterday, todayStart - 1),
    activeUnitsYesterday: yesterday.filter(
      (plan) => plan.status === 'activa' && sameTimeYesterday >= plan.shiftStart,
    ).length,
    period,
    previousPeriod,
  }
}

// ── Utilidades ───────────────────────────────────────────────────────────

export function startOfDay(at: number): number {
  const date = new Date(at)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function sum(values: number[]): number {
  let total = 0
  for (const value of values) total += value
  return total
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

/** Hash estable de una cadena, para derivar semillas por cuenta. */
function hashText(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash % 1_000_003
}
