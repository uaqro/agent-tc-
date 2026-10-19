/**
 * EP-02 · US-008 — Vocabulario del dashboard principal.
 * ════════════════════════════════════════════════════
 * Tipos del dominio que consumen el generador mock (`data/fleet-activity`),
 * las agregaciones puras (`metrics`) y los paneles. No hay tipos de interfaz
 * aquí: esto es flota y combustible, no botones.
 */

/**
 * Producto de Edenred por el que se despacha el combustible — sesión con
 * Joaquín Miguens (20-ago): el «superfiltro» transversal a dashboard, flota y
 * consumos.
 * ════════════════════════════════════════════════════════════════════════
 * No es un vocabulario nuevo: son las DOS FUENTES DE COMBUSTIBLE que la
 * plataforma ya declara en `data/ingestion-sources`, vistas desde el lado
 * comercial en vez del lado de la tubería.
 *
 *   · `autoconsumo` — estaciones propias del cliente. Lote horario del ERP.
 *   · `ticketcar_plus` — tarjeta TicketCar+ en red externa. Flujo continuo
 *     desde el switch transaccional.
 *
 * ── Por qué cuelga de la UNIDAD y no del despacho ─────────────────────────
 * Es la decisión que hace que esto pueda ser un filtro global, y conviene
 * dejarla escrita porque la alternativa parece más natural y no lo es.
 *
 * El eje «hora del día» de US-016 se quedó FUERA del filtro global por un
 * motivo exacto: una unidad-día con dos repostajes tiene dos horas, así que no
 * hay columna que añadirle a `DayUnitRow` sin repartir a ojo un importe entre
 * dos franjas. Colgar el producto del despacho tendría ese mismo problema, con
 * el agravante de que el catálogo de flota —que no tiene despachos, tiene
 * padrón— no podría filtrar por él en absoluto, y el «superfiltro» tiene que
 * llegar a las tres pantallas.
 *
 * Colgado de la unidad, el producto es un ALTA COMERCIAL: a esta unidad se le
 * asignó una tarjeta TicketCar+, o reposta en la estación de la empresa. El
 * despacho hereda el de su unidad, la unidad-día también, y las tres pantallas
 * cortan por lo mismo sin repartir nada.
 *
 * ⚠️ Lo que esto asume, y que hay que confirmar con Data: que una unidad opera
 * con UN producto. Si en la realidad una misma unidad carga unos días en la
 * estación propia y otros con la tarjeta, el producto es del despacho y esta
 * dimensión no puede vivir en `DayUnitRow` sin bajar el grano del histórico.
 */
export type FuelProduct = 'ticketcar_plus' | 'autoconsumo'

export const FUEL_PRODUCTS: FuelProduct[] = ['ticketcar_plus', 'autoconsumo']

export const FUEL_PRODUCT_LABELS: Record<FuelProduct, string> = {
  ticketcar_plus: 'TicketCar+',
  autoconsumo: 'Autoconsumo',
}

/** Identificador de la fuente de ingesta que alimenta cada producto. */
export const FUEL_PRODUCT_SOURCES: Record<FuelProduct, string> = {
  ticketcar_plus: 'ticketcar-plus',
  autoconsumo: 'autoconsumo',
}

export type FuelType = 'magna' | 'premium' | 'diesel'

export const FUEL_TYPES: FuelType[] = ['diesel', 'magna', 'premium']

export const FUEL_LABELS: Record<FuelType, string> = {
  magna: 'Magna',
  premium: 'Premium',
  diesel: 'Diésel',
}

/**
 * Situación de la unidad en el día en curso.
 *
 * «Unidad activa» del criterio 2 significa que ha reportado telemetría hoy, no
 * que haya repostado: un camión puede rodar toda la jornada sin cargar.
 */
export type UnitStatus =
  /** Opera hoy y reporta. Cuenta como unidad activa. */
  | 'activa'
  /** Debería estar operando y no ha enviado un solo ping. */
  | 'sin_reportar'
  /** Fuera de servicio por mantenimiento: no se espera que reporte. */
  | 'en_taller'

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  activa: 'Activa',
  sin_reportar: 'Sin reportar',
  en_taller: 'En taller',
}

/**
 * Grupo de unidades — dimensión de US-010.
 *
 * No es lo mismo que el centro de coste. El centro de coste es CONTABLE (a
 * quién se le imputa el gasto) y el grupo es OPERATIVO (dónde y con quién
 * rueda la unidad). Una misma zona mezcla reparto urbano y larga distancia, y
 * un mismo centro de coste se reparte entre varias zonas: por eso las dos
 * dimensiones se cruzan y filtrar por las dos a la vez dice algo que ninguna
 * de las dos dice por separado.
 */
export type UnitGroup = string

/**
 * Ruta operativa recorrida en el día — EP-03 · US-016, criterio 2.
 *
 * NO es el grupo. El grupo es del PADRÓN: dice en qué corredor está adscrita la
 * unidad y no cambia de un día para otro. La ruta es de la JORNADA: la misma
 * unidad del Corredor Norte hace hoy Monterrey–Saltillo y mañana un reparto
 * metropolitano. Es la misma distinción que ya justificaba separar conductor
 * titular de conductor del día, y por el mismo motivo: sin rotación, «gasto por
 * ruta» sería «gasto por grupo» con otro nombre y no diría nada nuevo.
 */
export type RouteId = string

/**
 * Comportamiento de conducción del día — EP-03 · US-016, criterio 2.
 *
 * Los valores NO son inventados: son exactamente el enum `evento` que el
 * contrato de la fuente de telemetría ya declara —`ralenti | frenado_brusco |
 * exceso_velocidad`— en `data/ingestion-sources`. Materializar el eje es
 * consumir un campo que la plataforma dice que ingiere, no añadir uno nuevo.
 *
 * Cada valor mueve el consumo, que es lo que lo convierte en un DRIVER DE
 * GASTO y no en una etiqueta de seguridad: el ralentí quema combustible sin
 * recorrido y el exceso de velocidad empeora el rendimiento. Un eje que no
 * moviera la factura no tendría nada que hacer en este ranking.
 */
export type DrivingBehavior = 'normal' | 'ralenti' | 'frenado_brusco' | 'exceso_velocidad'

export const DRIVING_BEHAVIORS: DrivingBehavior[] = [
  'normal',
  'ralenti',
  'frenado_brusco',
  'exceso_velocidad',
]

export const BEHAVIOR_LABELS: Record<DrivingBehavior, string> = {
  normal: 'Sin incidencias',
  ralenti: 'Ralentí prolongado',
  frenado_brusco: 'Frenado brusco',
  exceso_velocidad: 'Exceso de velocidad',
}

/** Unidad del padrón de flota. */
/**
 * Clase de vehículo — EP-02 · US-097.
 *
 * Lo que la unidad ES, no lo que hace: un tractocamión sigue siendo pesado
 * aunque hoy esté en taller y aunque su centro de coste sea de reparto.
 */
export type UnitClass = 'pesado' | 'mediano' | 'ligero' | 'van'

export const UNIT_CLASS_LABELS: Record<UnitClass, string> = {
  pesado: 'Pesado',
  mediano: 'Mediano',
  ligero: 'Ligero',
  van: 'Van',
}

/**
 * Situación en el PADRÓN — EP-02 · US-097.
 * ════════════════════════════════════════
 * NO confundir con `UnitStatus`, que es el estado OPERATIVO DEL DÍA. Son dos
 * preguntas distintas y a menudo se mezclan en una sola columna «estado»:
 *
 *   · `RegistryStatus` contesta «¿sigue esta unidad contratada?». Cambia dos
 *     veces en la vida del vehículo —alta y baja— y es un hecho contractual;
 *   · `UnitStatus` contesta «¿qué hizo hoy?». Cambia todos los días y se
 *     deriva de la jornada, no del padrón.
 *
 * Una unidad de baja no tiene estado operativo: no se espera que reporte. Una
 * unidad de alta y en taller sí está contratada. Colapsarlas en una columna
 * obliga a inventar un orden de precedencia entre dos cosas que no compiten.
 */
export type RegistryStatus = 'alta' | 'baja'

export const REGISTRY_STATUS_LABELS: Record<RegistryStatus, string> = {
  alta: 'De alta',
  baja: 'De baja',
}

export type FleetUnit = {
  id: string
  plate: string
  accountId: string
  costCenter: string
  /** Grupo operativo al que pertenece la unidad. */
  group: UnitGroup
  fuel: FuelType
  /** Producto de Edenred con el que reposta — ver `FuelProduct`. */
  product: FuelProduct
  /**
   * Conductor titular. Es quien la lleva la mayoría de los días, pero NO
   * siempre: la rotación diaria es lo que hace que analizar por conductor
   * tenga sentido, y vive en el día, no en el padrón.
   *
   * `''` cuando la unidad no tiene titular declarado en el padrón — sesión con
   * Joaquín Miguens (20-ago). Es el mismo tipo de hueco que `vin` y que
   * `odometerKm`: la ficha se abrió con la placa, que es lo que necesita la
   * tarjeta de combustible, y el resto se completó a medias. No es que nadie
   * la conduzca; es que nadie lo capturó.
   */
  assignedDriverId: string

  // ── Ficha del padrón — EP-02 · US-097 ─────────────────────────────────
  //
  // Todo lo de aquí abajo es lo que el catálogo de vehículos enseña, y todo
  // es del PADRÓN: no cambia de un día para otro. Lo que sí cambia a diario
  // —estado operativo, litros, kilómetros, conductor de la jornada— sigue
  // viviendo en `UnitDay`, y el catálogo lo consulta ahí en vez de guardarse
  // una segunda copia que acabaría discrepando con el dashboard.

  /**
   * Número de bastidor. `''` cuando el fabricante no lo entregó todavía.
   *
   * El hueco es real y es el caso que hay que ver: una unidad se da de alta
   * con la placa —que es lo que necesita la tarjeta de combustible— y el VIN
   * llega después, con la factura. Reconciliarlo es lo que gobierna
   * `inventario.vin` en ADR-001, que es OTRA capacidad y otra pantalla.
   */
  vin: string
  brand: string
  model: string
  /** Año-modelo, no año de alta: son distintos y el segundo está en `registeredAt`. */
  year: number
  vehicleClass: UnitClass
  /** Capacidad del tanque en litros. Acota cuánto puede cargar de una vez. */
  tankLiters: number
  /**
   * Odómetro del padrón. `null` cuando la unidad nunca ha reportado telemetría
   * y nadie ha capturado la lectura a mano.
   *
   * No se deriva de `UnitDay`: el histórico simulado cubre unos meses y el
   * odómetro lleva la vida entera del vehículo.
   */
  odometerKm: number | null
  /** Alta en el padrón. */
  registeredAt: number
  /** Baja. `null` mientras siga contratada. */
  deregisteredAt: number | null
}

/** Situación en el padrón. Se deriva; no se guarda por duplicado. */
export function registryStatusOf(unit: FleetUnit): RegistryStatus {
  return unit.deregisteredAt === null ? 'alta' : 'baja'
}

/**
 * Conductor del padrón de la cuenta — dimensión de US-010.
 *
 * El identificador es único en toda la plataforma, no solo dentro de su
 * cuenta: un Admin Edenred filtra sobre varias cuentas a la vez y dos
 * conductores homónimos de tenants distintos se le mezclarían en la misma
 * cifra.
 */
export type FleetDriver = {
  id: string
  name: string
  accountId: string
  /** Grupo al que está adscrito. Conduce sobre todo unidades de ese grupo. */
  group: UnitGroup
  /** Vigencia de la licencia. Caducada es uno de los casos límite del mock. */
  licenseExpiresAt: number
}

/**
 * Un despacho de combustible, ya con los atributos por los que se filtra.
 * El importe es negativo cuando la línea es un abono.
 */
export type FuelEvent = {
  unitId: string
  plate: string
  costCenter: string
  group: UnitGroup
  fuel: FuelType
  /** Producto de Edenred del despacho. Lo hereda de su unidad. */
  product: FuelProduct
  /** Ruta organizativa de la unidad, de la empresa a su nodo — US-013. */
  orgPath: readonly string[]
  /** Quien conducía ese día. `null` si la unidad estaba en taller. */
  driverId: string | null
  /** Ruta operativa recorrida ese día — US-016. */
  routeId: RouteId
  /** Comportamiento de conducción de la jornada — US-016. */
  behavior: DrivingBehavior
  at: number
  liters: number
  /** Importe cobrado al precio de contrato de Edenred. */
  amountMxn: number
  /** Lo que habría costado al precio de lista de la estación ese día. */
  listAmountMxn: number
  /** Devolución de una carga mal imputada. */
  refund: boolean
  /**
   * Estación donde se despachó — Ticket Car+ (`stations/directory`). `null`
   * en las cuentas sin directorio de estaciones. El importe es el precio de
   * contrato de ESTA estación ese día.
   */
  stationId: string | null
}

/** Actividad de UNA unidad en el día en curso, recortada a la hora actual. */
export type UnitDay = {
  unitId: string
  plate: string
  accountId: string
  costCenter: string
  group: UnitGroup
  fuel: FuelType
  /** Producto de Edenred de la unidad — ver `FuelProduct`. */
  product: FuelProduct
  /**
   * Ruta organizativa de la unidad — US-013.
   *
   * De la empresa a su nodo, ambos incluidos. Vacía cuando el organigrama de
   * la cuenta no está cargado. Se guarda la RUTA y no el nodo porque una
   * unidad puede colgar de cualquier nivel, no solo de una hoja: preguntar
   * «¿está este nodo en tu camino?» funciona con las dos formas; comparar con
   * la hoja, solo con una.
   */
  orgPath: readonly string[]
  /**
   * Conductor de la jornada. `null` cuando la unidad está en taller: ese día
   * nadie la lleva, y es el caso que el filtro «Sin conductor» saca a la luz.
   */
  driverId: string | null
  /** Ruta operativa de la jornada — US-016. */
  routeId: RouteId
  /** Comportamiento de conducción de la jornada — US-016. */
  behavior: DrivingBehavior
  status: UnitStatus
  /** Litros despachados hoy. Negativo si los abonos superan a las cargas. */
  liters: number
  amountMxn: number
  /** Diferencia frente al precio de lista. Negativa si el mercado bajó. */
  savingMxn: number
  km: number
  /** Rendimiento del día. `null` cuando no hay litros con los que calcularlo. */
  efficiency: number | null
  refuels: number
  /** Último ping de telemetría. `null` si la unidad no ha reportado. */
  lastReportAt: number | null
}

/**
 * Lo que UNA unidad hizo en UN día cerrado del histórico.
 *
 * Hasta US-009 esto era un cubo por combustible × centro de coste: doce filas
 * por día en vez de quinientas. US-010 obligó a bajar el grano, y conviene
 * saber por qué antes de intentar volver a subirlo.
 *
 * Agregar por adelantado solo funciona mientras todas las dimensiones por las
 * que se filtra sean de BAJA cardinalidad. Unidad y conductor no lo son: son
 * la propia unidad. Un cubo que las incluyera en su clave ya sería esta fila,
 * y uno que no las incluyera no podría responder «litros por día de la unidad
 * ECO-3042» sin repartir a ojo. Repartir a ojo era exactamente lo que el
 * diseño de US-008 se negaba a hacer.
 *
 * Así que el grano baja y la propiedad se conserva: cada unidad-día cae en una
 * única fila, y cualquier combinación de filtros se resuelve sumando las filas
 * que casan. Exacto, sin estimaciones, para las ocho dimensiones.
 */
export type DayUnitRow = {
  unitId: string
  fuel: FuelType
  /** Producto de Edenred de la unidad — ver `FuelProduct`. */
  product: FuelProduct
  costCenter: string
  group: UnitGroup
  /** Ruta organizativa de la unidad, de la empresa a su nodo — US-013. */
  orgPath: readonly string[]
  /** Quien la condujo ese día. `null` si estuvo en taller. */
  driverId: string | null
  /** Ruta operativa recorrida ese día — US-016. */
  routeId: RouteId
  /** Comportamiento de conducción de la jornada — US-016. */
  behavior: DrivingBehavior
  liters: number
  amountMxn: number
  savingMxn: number
  /** La unidad reportó telemetría ese día. */
  active: boolean
  /**
   * Kilómetros recorridos ese día — añadido en Ticket Car+.
   *
   * El Resumen de Ticket Car+ enseña «Total kilómetros recorridos» del
   * periodo, y eOne solo los tenía para el día en curso (`UnitDay.km`). Sale
   * del mismo plan de jornada que `UnitDay.km`, sin tiradas nuevas: no mueve
   * ninguna otra cifra del generador.
   */
  km: number
}

/** Día del periodo. El último punto es el día en curso y va incompleto. */
/** Un flujo de despachos que no llegó — Ticket Car+ (`FEED_GAPS` en `fleet-activity`). */
export type FeedGap = {
  product: FuelProduct
  from: string
  to: string
  /** Estaciones (plantas) cuyos despachos faltan. `null` = todo el producto. */
  stations: readonly string[] | null
  /** Para los textos: qué parte de la fuente falta. */
  label: string
}

export type DayPoint = {
  at: number
  /** Etiqueta corta para el eje: «12 ago». */
  label: string
  /** El día aún no ha cerrado. */
  partial: boolean
  /** Una fila por unidad del padrón de ese día. */
  rows: DayUnitRow[]
  /**
   * Flujos de despachos que NO llegaron ese día — Ticket Car+ (`FEED_GAPS`).
   * Sus cargas faltan, pero eso es un hueco de datos, no un consumo cero: las
   * gráficas lo pintan como hueco y no interpolan.
   */
  missingFeeds: FeedGap[]
  /**
   * Los despachos de ese día, con su hora — EP-03 · US-016, criterio 2.
   *
   * El histórico se quedaba en el grano unidad-día porque las ocho dimensiones
   * de US-010 son atributos de la unidad y no del despacho. «Hora del día» no
   * lo es: una unidad-día con dos repostajes tiene DOS horas, así que no hay
   * columna que añadirle a `DayUnitRow` sin repartir a ojo un importe entre
   * dos franjas. El eje horario se agrega sobre esta lista.
   *
   * Es la razón por la que ese eje NO es una dimensión del filtro global: lo
   * que `matches` recorta son unidades-día, y un filtro por hora recortaría el
   * ranking horario pero no los KPIs, que es exactamente la discrepancia entre
   * widgets que el criterio 2 de US-010 prohíbe.
   */
  events: FuelEvent[]
}

/** Foto completa de una cuenta cliente en un instante dado. */
export type AccountActivity = {
  accountId: string
  accountName: string
  fleetSize: number
  /** Padrón del día en curso, recortado a `at`. */
  units: UnitDay[]
  /** Despachos de hoy hasta `at`. */
  todayEvents: FuelEvent[]
  /** Despachos del día anterior completo, para comparar a la misma hora. */
  yesterdayEvents: FuelEvent[]
  /**
   * Unidades que a esta misma hora de ayer ya habían reportado.
   *
   * Se guarda calculado porque la comparación honesta de «unidades activas»
   * es contra el mismo punto de la jornada anterior, no contra el día cerrado:
   * a media mañana, cualquier día completo gana por goleada.
   */
  activeUnitsYesterday: number
  /** Días cerrados del periodo más el día en curso, marcado como parcial. */
  period: DayPoint[]
  /**
   * El periodo INMEDIATAMENTE ANTERIOR, del mismo número de días cerrados
   * — EP-03 · US-016, criterio 3.
   *
   * Con `periodDays = 30`, `period` cubre del día −30 al −1 y esto cubre del
   * −60 al −31. Ni se solapan ni dejan hueco, y como el generador es
   * determinista por fecha, la ventana anterior sale idéntica se pida a la
   * hora que se pida.
   *
   * Va en la MISMA foto y no en una segunda consulta porque una comparación
   * entre dos fotos tomadas en instantes distintos —y con organigramas
   * posiblemente distintos, que se pueden editar— compararía dos cosas que no
   * son comparables. Un instante, un organigrama, dos ventanas.
   *
   * Vacío cuando la consulta no pidió comparación.
   */
  previousPeriod: DayPoint[]
}

/** Lo que el hook entrega a la vista tras una carga. */
export type ActivitySnapshot = {
  /** Instante de los datos. Puede ir por delante del reloj real en demo. */
  at: number
  accounts: AccountActivity[]
  /** Milisegundos que tardó construir la foto. Criterio de aceptación 1. */
  loadMs: number
  /** Unidades cubiertas por la carga, sumando todas las cuentas. */
  fleetSize: number
  /** Días cerrados incluidos en la serie. */
  periodDays: number
}
