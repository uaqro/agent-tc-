// US-018 · US-020 · US-087 · US-111 · US-112 · US-113
/**
 * EP-03 · Optimizador de cargas — vocabulario.
 * ════════════════════════════════════════════
 * Una CARGA es un repostaje con tarjeta en una estación de la red externa. El
 * motor de optimización (Data, contrato sin cerrar) le añade dos cosas: si ya
 * era la mejor opción de su zona (`optimal`) y, si no, a qué estación habría
 * convenido ir y cuánto se habría ahorrado (`savingCents`, BRUTO).
 *
 * El prototipo no tiene motor. En Ticket Car+ las cargas son los despachos
 * SINTÉTICOS del padrón (`loads.ts`) y la recomendación sale del directorio de
 * estaciones (`stations/directory`). Nada de aquí sale de un cliente real.
 *
 * ── «Ahorro» ya significa otra cosa en el resto del código ────────────────
 * `savingMxn` del dashboard es precio de lista − precio de contrato. El ahorro
 * de este módulo es por REDIRECCIÓN: cargar en otra estación más barata. Son
 * magnitudes distintas y en pantalla se rotulan distinto («Ahorro por
 * redirección»). No se suman nunca.
 */
import type { FuelProduct, FuelType, UnitClass } from '../dashboard/types'

/** Zona operativa: una plaza con sus estaciones alrededor. */
export type ZoneId = 'monterrey' | 'saltillo' | 'hermosillo' | 'culiacan' | 'guadalajara'

export type Zone = {
  id: ZoneId
  name: string
  /** División del organigrama de la cuenta (nivel 1, US-013). */
  division: string
  lat: number
  lng: number
}

export type Station = {
  /** Código interno de la estación, sintético. */
  id: string
  name: string
  zone: ZoneId
  lat: number
  lng: number
  /**
   * La estación figura en el directorio de control volumétrico — US-113.
   * `false` NO significa «sin control»: significa que no está en el
   * directorio. El directorio no tiene todavía fuente ni responsable.
   */
  cv: boolean
  /** Planta propia del cliente (Autoconsumo). El motor no la propone nunca como destino. */
  own?: boolean
}

/**
 * Una carga, tal como la entregaría el motor. La tarjeta NO viaja completa:
 * solo un identificador y cuatro dígitos ficticios. Ver `masking`.
 *
 * Ticket Car+: ya no sale de un dataset propio. Es un despacho del padrón
 * (`data/fleet-activity`) con la recomendación del motor encima, y por eso
 * lleva su unidad, su conductor del día y su ruta del organigrama.
 */
export type Load = {
  id: string
  /** Día absoluto de la carga (`stations/directory.dayIndexOf`). */
  day: number
  /** Marca temporal local de la carga. */
  at: number
  cardId: string
  /** Cuatro dígitos FICTICIOS. Solo `maskCard` los convierte en texto. */
  cardLast4: string
  vehicleType: UnitClass
  fuel: FuelType
  product: FuelProduct
  zone: ZoneId
  division: string
  costCenter: string
  /** Unidad del padrón que cargó. */
  unitId: string
  /** Conductor de la jornada. `null` si nadie la llevaba ese día. */
  driverId: string | null
  /** Ruta del organigrama de la unidad: empresa → división → departamento → área. */
  orgPath: readonly string[]
  /** Negativa en los abonos. */
  liters: number
  /** Importe cobrado. Es el mismo número que suma el Resumen. */
  amountMxn: number
  /** Abono de una carga mal imputada: resta, no se redirige. */
  refund: boolean
  /** Estación habitual: donde se cargó. */
  stationId: string
  /** $/L pagado. */
  pricePaid: number
  /** Estación que propone el motor. `null` si no propone ninguna. */
  recommendedStationId: string | null
  /** $/L en la estación recomendada. */
  priceRecommended: number | null
  /** Desvío hasta la recomendada, en metros (solo ida). */
  detourM: number
  /** Ahorro BRUTO en centavos: (pagado − recomendado) × litros. */
  savingCents: number
  /** El motor la marca como la mejor opción de su zona. */
  optimal: boolean
  /** Quien revisa el optimizador descartó su recomendación (`discardRecommendations`). */
  discarded?: boolean
}

/** Supuestos del ahorro neto. Editables y visibles en pantalla — US-018. */
export type Assumptions = {
  /** Rendimiento del vehículo, km por litro. */
  kmPerLiter: number
  /** `true` = ida y vuelta (2 trayectos); `false` = solo ida. */
  roundTrip: boolean
}

/** Bruto o neto del desvío. Los dos modos son visibles y conmutables. */
export type SavingMode = 'bruto' | 'neto'

export const SAVING_MODE_LABELS: Record<SavingMode, string> = {
  bruto: 'Bruto',
  neto: 'Neto del desvío',
}
