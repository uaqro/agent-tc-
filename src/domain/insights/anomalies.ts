/**
 * Anomalías de consumo — Ticket Car+ (base para Insights, Fase 2).
 * ═══════════════════════════════════════════════════════════════
 * Detecta en los despachos del padrón lo que Insights tendrá que enseñar. El
 * generador mete estos casos a propósito (`fleet-activity`, con sus
 * proporciones), pero el detector NO lee esas constantes: mira los datos, como
 * hará con los reales.
 *
 *   · SOBRE TANQUE — una carga mayor que la capacidad del tanque de la unidad.
 *   · FUERA DE HORARIO — una carga de madrugada (de 01:00 a 04:59), cuando
 *     ningún turno de la flota está en marcha.
 *   · RENDIMIENTO ATÍPICO — una unidad cuyo km/L del periodo cae por debajo
 *     de la mitad de la mediana de sus pares (misma clase de vehículo y mismo
 *     centro de coste). Se compara con pares y no con el dato del fabricante:
 *     el perfil de uso pesa más que la ficha técnica.
 *
 * Los abonos no son cargas y no cuentan. Hoy nadie lo pinta: Insights sigue
 * siendo estático hasta la Fase 2.
 */
import type { DayPoint, FleetUnit, FuelEvent } from '../dashboard/types'

export type AnomalyKind = 'sobre_tanque' | 'fuera_de_horario' | 'rendimiento_atipico'

export const ANOMALY_LABELS: Record<AnomalyKind, string> = {
  sobre_tanque: 'Carga por encima de la capacidad del tanque',
  fuera_de_horario: 'Carga fuera de horario',
  rendimiento_atipico: 'Rendimiento atípico frente a sus pares',
}

export type ConsumptionAnomaly = {
  kind: AnomalyKind
  unitId: string
  /** Momento de la carga; `null` en las anomalías de periodo (rendimiento). */
  at: number | null
  detail: string
}

/** Franja de madrugada, en horas locales: [desde, hasta). */
export const NIGHT_HOURS = { from: 1, to: 5 } as const
/** Una unidad es atípica por debajo de este múltiplo de la mediana de sus pares. */
export const ATYPICAL_RATIO = 0.5
/** Litros mínimos del periodo para juzgar el rendimiento de una unidad: con menos, el dato es ruido. */
const MIN_LITERS_FOR_EFFICIENCY = 150
/** Pares mínimos para que la mediana signifique algo. */
const MIN_PEERS = 4

const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 })

export function isOverTank(event: Pick<FuelEvent, 'liters' | 'refund'>, unit: Pick<FleetUnit, 'tankLiters'>): boolean {
  return !event.refund && event.liters > unit.tankLiters
}

export function isNightLoad(event: Pick<FuelEvent, 'at' | 'refund'>): boolean {
  const hour = new Date(event.at).getHours()
  return !event.refund && hour >= NIGHT_HOURS.from && hour < NIGHT_HOURS.to
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/** Las anomalías de los días CERRADOS del periodo, de las unidades que se pasen. */
export function consumptionAnomalies(units: readonly FleetUnit[], points: readonly DayPoint[]): ConsumptionAnomaly[] {
  const byId = new Map(units.map((unit) => [unit.id, unit]))
  const anomalies: ConsumptionAnomaly[] = []
  const totals = new Map<string, { km: number; liters: number }>()

  for (const point of points) {
    if (point.partial) continue
    for (const row of point.rows) {
      if (!byId.has(row.unitId)) continue
      const total = totals.get(row.unitId) ?? { km: 0, liters: 0 }
      total.km += row.km
      total.liters += row.liters
      totals.set(row.unitId, total)
    }
    for (const event of point.events) {
      const unit = byId.get(event.unitId)
      if (unit === undefined) continue
      if (isOverTank(event, unit)) {
        anomalies.push({
          kind: 'sobre_tanque',
          unitId: unit.id,
          at: event.at,
          detail: `${number.format(event.liters)} L con un tanque de ${unit.tankLiters} L`,
        })
      }
      if (isNightLoad(event)) {
        const time = new Date(event.at).toTimeString().slice(0, 5)
        anomalies.push({ kind: 'fuera_de_horario', unitId: unit.id, at: event.at, detail: `Carga a las ${time}` })
      }
    }
  }

  // Rendimiento: km/L de cada unidad frente a la mediana de su clase y centro de coste.
  const efficiency = new Map<string, number>()
  for (const [unitId, total] of totals) {
    if (total.liters >= MIN_LITERS_FOR_EFFICIENCY && total.km > 0) efficiency.set(unitId, total.km / total.liters)
  }
  const peersOf = (unit: FleetUnit) => `${unit.vehicleClass}|${unit.costCenter}`
  const groups = new Map<string, number[]>()
  for (const [unitId, kmPerLiter] of efficiency) {
    const key = peersOf(byId.get(unitId)!)
    groups.set(key, [...(groups.get(key) ?? []), kmPerLiter])
  }
  for (const [unitId, kmPerLiter] of efficiency) {
    const unit = byId.get(unitId)!
    const peers = groups.get(peersOf(unit))!
    if (peers.length < MIN_PEERS) continue
    const reference = median(peers)
    if (kmPerLiter < reference * ATYPICAL_RATIO) {
      anomalies.push({
        kind: 'rendimiento_atipico',
        unitId,
        at: null,
        detail: `${number.format(kmPerLiter)} km/L frente a ${number.format(reference)} km/L de sus pares`,
      })
    }
  }

  return anomalies
}
