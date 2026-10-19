/**
 * Cargas del optimizador a partir de los despachos del padrón — Ticket Car+.
 * ═════════════════════════════════════════════════════════════════════════
 * Sustituye al dataset propio del optimizador de eOne. Cada despacho con
 * estación se convierte en una carga y el motor le pone encima su
 * recomendación: la estación más barata a ≤ 5 km ese día, si la hay.
 *
 * Lo que la carga trae del padrón y antes era inventado:
 *   · la unidad y su tarjeta (`data/cards`), y el conductor de la jornada;
 *   · la ruta del organigrama, así que el alcance por área funciona;
 *   · el importe, el mismo que suma el Resumen y el reporte consolidado.
 *
 * Los abonos entran como cargas negativas: restan del gasto, igual que en el
 * Resumen, y no se redirigen.
 */
import type { Account } from '../data/accounts'
import { cardIdOf, cardLast4Of } from '../data/cards'
import { fleetUnitsOf } from '../data/fleet-activity'
import type { FleetUnit, FuelEvent } from '../dashboard/types'
import { unassignedNodeId } from '../org/types'
import { cheaperNeighbor, contractPriceAt, dayIndexOf, dayStartOf, stations } from '../stations/directory'
import type { Load, ZoneId } from './types'

const zoneOfStation = (() => {
  let index: Map<string, ZoneId> | null = null
  return (stationId: string): ZoneId | undefined => {
    if (index === null) index = new Map(stations().map((station) => [station.id, station.zone]))
    return index.get(stationId)
  }
})()

/** Cargas de los despachos de una cuenta. Los despachos sin estación (cuentas sin directorio) no entran. */
export function loadsFromEvents(account: Account, events: readonly FuelEvent[]): Load[] {
  const units = new Map<string, FleetUnit>(fleetUnitsOf(account).map((unit) => [unit.id, unit]))
  const loads: Load[] = []

  for (const event of events) {
    if (event.stationId === null) continue
    const unit = units.get(event.unitId)
    const zone = zoneOfStation(event.stationId)
    if (unit === undefined || zone === undefined) continue

    const day = dayIndexOf(event.at)
    // Precio pagado: el de la estación ese día. El importe ya viene redondeado del generador.
    const pricePaid = contractPriceAt(event.stationId, event.fuel, day)
    const best = event.refund || unit.product === 'autoconsumo' ? null : cheaperNeighbor(event.stationId, event.fuel, day)

    loads.push({
      id: `CRG-${event.unitId}-${event.at}${event.refund ? '-abono' : ''}`,
      day,
      at: event.at,
      cardId: cardIdOf(event.unitId),
      cardLast4: cardLast4Of(event.unitId),
      vehicleType: unit.vehicleClass,
      fuel: event.fuel,
      product: event.product,
      zone,
      // División = nivel 1 de la ruta; las altas sin clasificar caen en «Sin asignar».
      division: event.orgPath[1] ?? unassignedNodeId(account.id),
      costCenter: event.costCenter,
      unitId: event.unitId,
      driverId: event.driverId,
      orgPath: event.orgPath,
      liters: event.liters,
      amountMxn: event.amountMxn,
      refund: event.refund,
      stationId: event.stationId,
      pricePaid,
      recommendedStationId: best?.stationId ?? null,
      priceRecommended: best?.price ?? null,
      detourM: best?.distanceM ?? 0,
      savingCents: best === null ? 0 : Math.round((pricePaid - best.price) * event.liters * 100),
      // Óptima: no hay otra más barata cerca. Las plantas propias y los abonos no se redirigen.
      optimal: best === null,
    })
  }

  return loads.sort((a, b) => a.at - b.at)
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** «13 sep». */
export function dayLabel(day: number): string {
  const date = new Date(dayStartOf(day))
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
}
