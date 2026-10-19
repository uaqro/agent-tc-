// US-018 · US-020 · US-087 · US-112 · US-113
/**
 * Reglas comunes del optimizador de cargas. Definidas UNA vez.
 * ══════════════════════════════════════════════════════════
 * Todas las vistas —KPIs, bandas, serie diaria, ranking, mapa, detalle, CV—
 * preguntan aquí. Ninguna reimplementa «redirigible», ni el coste del desvío,
 * ni el neto: si una lo hiciera por su cuenta, el KPI y la tabla acabarían
 * contando cosas distintas con el mismo nombre.
 *
 *   · REDIRIGIBLE = el motor no la marca como óptima Y su ahorro supera un
 *     centavo: `!opt && ahorroCentavos > 1`.
 *   · COSTE DEL DESVÍO = km_desvío × trayectos ÷ km/L × $/L pagado.
 *     Trayectos: 1 solo ida, 2 ida y vuelta. Por defecto 6 km/L, ida y vuelta.
 *   · AHORRO NETO = bruto − coste del desvío. Puede salir NEGATIVO: es una
 *     pérdida y se rotula como tal.
 *
 * El neto es un MODELO SOBRE SUPUESTOS, no un dato. Los supuestos están en
 * pantalla y se pueden cambiar; el bruto es lo único que sale del motor.
 */
import type { Assumptions, Load } from './types'

export const DEFAULT_ASSUMPTIONS: Assumptions = { kmPerLiter: 6, roundTrip: true }

/** Límites del campo de rendimiento. Fuera de aquí el dato no es de un vehículo. */
export const MIN_KM_PER_LITER = 1
export const MAX_KM_PER_LITER = 30

/** Umbral de redirigible: el ahorro tiene que SUPERAR un centavo. */
export const MIN_SAVING_CENTS = 1

export function tripsOf(assumptions: Assumptions): 1 | 2 {
  return assumptions.roundTrip ? 2 : 1
}

/** `!opt && ahorroCentavos > 1`. La única definición de redirigible. */
export function isRedirectable(load: Pick<Load, 'optimal' | 'savingCents'>): boolean {
  return !load.optimal && load.savingCents > MIN_SAVING_CENTS
}

/** Ahorro bruto en pesos. Cero si la carga no es redirigible. */
export function grossSaving(load: Pick<Load, 'optimal' | 'savingCents'>): number {
  return isRedirectable(load) ? load.savingCents / 100 : 0
}

/**
 * Coste del desvío en pesos:
 * km_desvío × trayectos ÷ rendimiento_kmL × precio_pagado_por_litro.
 */
export function detourCost(detourM: number, pricePaidPerLiter: number, assumptions: Assumptions): number {
  const km = detourM / 1000
  const kmPerLiter = Math.max(assumptions.kmPerLiter, MIN_KM_PER_LITER)
  return ((km * tripsOf(assumptions)) / kmPerLiter) * pricePaidPerLiter
}

/**
 * Ahorro neto en pesos = bruto − coste del desvío. Cero si no es redirigible:
 * una carga sin recomendación no tiene desvío que pagar.
 */
export function netSaving(
  load: Pick<Load, 'optimal' | 'savingCents' | 'detourM' | 'pricePaid'>,
  assumptions: Assumptions,
): number {
  if (!isRedirectable(load)) return 0
  return load.savingCents / 100 - detourCost(load.detourM, load.pricePaid, assumptions)
}

/** Ahorro de una carga en el modo pedido. */
export function savingIn(
  load: Pick<Load, 'optimal' | 'savingCents' | 'detourM' | 'pricePaid'>,
  mode: 'bruto' | 'neto',
  assumptions: Assumptions,
): number {
  return mode === 'bruto' ? grossSaving(load) : netSaving(load, assumptions)
}

export type NotRedirectableReason = 'mas_barata' | 'desvio_no_paga'

export const REASON_LABELS: Record<NotRedirectableReason, string> = {
  mas_barata: 'Ya es la estación más barata de su zona',
  desvio_no_paga: 'El desvío no se paga solo',
}

/**
 * Por qué una carga NO es redirigible — US-020. `null` si lo es.
 *
 * Si el motor la marca óptima, no hay estación más barata cerca. Si no, el
 * ahorro no llega al centavo: ir a otra estación no compensa ni el viaje.
 */
export function notRedirectableReason(
  load: Pick<Load, 'optimal' | 'savingCents'>,
): NotRedirectableReason | null {
  if (isRedirectable(load)) return null
  return load.optimal ? 'mas_barata' : 'desvio_no_paga'
}

/**
 * Redirigible pero con ahorro NETO negativo: el desvío cuesta más de lo que se
 * ahorra en el litro — Ticket Car+. El motor recomienda la estación más barata
 * a ≤ 5 km sin mirar la ruta; cuando esa estación queda fuera de ella
 * (`Load.offRoute`), una parte de las recomendaciones pierde dinero en cuanto
 * se cuenta el viaje. Se marcan y se pueden descartar.
 */
export function losesMoney(
  load: Pick<Load, 'optimal' | 'savingCents' | 'detourM' | 'pricePaid'>,
  assumptions: Assumptions,
): boolean {
  return isRedirectable(load) && netSaving(load, assumptions) < 0
}

/**
 * Descarta las recomendaciones de las cargas indicadas. La carga se queda —es
 * gasto, y el gasto tiene que cuadrar con el Resumen— pero sin recomendación:
 * deja de ser redirigible, no suma ahorro y su motivo pasa a ser «el desvío no
 * se paga solo». Las demás cargas se devuelven tal cual.
 */
export function discardRecommendations(loads: readonly Load[], ids: ReadonlySet<string>): Load[] {
  if (ids.size === 0) return [...loads]
  return loads.map((load) =>
    ids.has(load.id) && isRedirectable(load)
      ? { ...load, recommendedStationId: null, priceRecommended: null, detourM: 0, savingCents: 0, discarded: true }
      : load,
  )
}

/** Normaliza los supuestos que llegan de un campo de texto. */
export function sanitizeAssumptions(raw: Partial<Assumptions>): Assumptions {
  const km = Number(raw.kmPerLiter)
  return {
    kmPerLiter: Number.isFinite(km)
      ? Math.min(MAX_KM_PER_LITER, Math.max(MIN_KM_PER_LITER, km))
      : DEFAULT_ASSUMPTIONS.kmPerLiter,
    roundTrip: raw.roundTrip ?? DEFAULT_ASSUMPTIONS.roundTrip,
  }
}
