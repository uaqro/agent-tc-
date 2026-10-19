/**
 * Muestra fija para los tests del optimizador — Ticket Car+.
 * Las cargas son los despachos del padrón de Grupo Alimentario Norte de los 30
 * días cerrados anteriores a la fecha de demo, con la ruta del organigrama de
 * fábrica y la recomendación del motor.
 */
import { ACCOUNTS } from '../../data/accounts'
import { eventsBetween, fleetUnitsOf } from '../../data/fleet-activity'
import { baseOrgTreeOf, withUnassigned } from '../../org/structure'
import { unitPathIndex } from '../../org/types'
import { stations } from '../../stations/directory'
import { loadsFromEvents } from '../loads'
import type { Station } from '../types'

const DAY = 86_400_000

export const GAN = ACCOUNTS.find((account) => account.id === 'acc_grupo_alimentario')!
export const NOW = new Date(2026, 9, 16, 12, 0).getTime()
export const DAYS = 30
export const tree = withUnassigned(baseOrgTreeOf(GAN), fleetUnitsOf(GAN).map((unit) => unit.id))
const paths = unitPathIndex(tree)
export const loads = loadsFromEvents(
  GAN,
  eventsBetween(GAN, NOW - DAYS * DAY, NOW - DAY, NOW, (unitId) => paths.get(unitId) ?? []),
)
export const stationsById = new Map<string, Station>(stations().map((station) => [station.id, station]))
