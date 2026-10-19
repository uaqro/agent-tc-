/**
 * Alertas operativas de flota — datos mock.
 * ════════════════════════════════════════
 * Lo que el Gestor de alertas gestiona a diario: consumos atípicos,
 * mantenimientos vencidos, conducción de riesgo y unidades sin reportar.
 *
 * Cada alerta pertenece a una cuenta cliente, así que el aislamiento por
 * alcance del rol se puede comprobar sobre datos reales.
 */
import { createRandom, pick, randomInt, type Random } from '../engine/prng'
import { ACCOUNTS } from './accounts'
import type { FuelType } from '../dashboard/types'
import { fleetDriversOf, fleetUnitsOf, startOfDay } from '../datasource/active'
import type { Account } from './accounts'

const HOUR = 60 * 60_000
const DAY = 24 * HOUR
const SEED = 20260825

/** Ventana de alertas generadas. */
const WINDOW_DAYS = 21

export type FleetAlertKind =
  | 'consumo_atipico'
  | 'mantenimiento_vencido'
  | 'conduccion_riesgo'
  | 'unidad_sin_reportar'
  | 'exceso_gasto'

export type FleetAlertSeverity = 'critica' | 'alta' | 'media'

export type FleetAlertState = 'abierta' | 'reconocida' | 'resuelta'

export type FleetAlert = {
  id: string
  accountId: string
  kind: FleetAlertKind
  severity: FleetAlertSeverity
  unitId: string
  driverId: string | null
  title: string
  detail: string
  /** Valor medido y su referencia, para que la alerta sea accionable. */
  measured: string
  expected: string
  raisedAt: number
  state: FleetAlertState
  handledBy: string | null
  handledAt: number | null
  /** Centro de coste de la unidad al levantarse la alerta — US-050. */
  costCenter: string
  /** Grupo operativo de la unidad al levantarse la alerta — US-050. */
  group: string
  /** Combustible de la unidad — US-050. */
  fuel: FuelType
}

export const ALERT_KIND_LABELS: Record<FleetAlertKind, string> = {
  consumo_atipico: 'Consumo atípico',
  mantenimiento_vencido: 'Mantenimiento vencido',
  conduccion_riesgo: 'Conducción de riesgo',
  unidad_sin_reportar: 'Unidad sin reportar',
  exceso_gasto: 'Exceso de gasto',
}

export const ALERT_SEVERITY_LABELS: Record<FleetAlertSeverity, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
}

export const ALERT_STATE_LABELS: Record<FleetAlertState, string> = {
  abierta: 'Abierta',
  reconocida: 'Reconocida',
  resuelta: 'Resuelta',
}

/**
 * La unidad y el conductor de una alerta salen del PADRÓN de su cuenta.
 *
 * Hasta US-009 la unidad se sorteaba por número y el conductor salía de una
 * lista de siete códigos compartida por todas las cuentas: `OP-2291` levantaba
 * alertas en cuatro tenants a la vez. Mientras nadie pudiera filtrar por
 * conductor, era invisible. En cuanto US-010 dejó filtrar por él, la lista de
 * alertas del filtro «Marisol Olvera» habría mezclado cuentas ajenas —que es
 * exactamente lo que el aislamiento de tenant del ADR-001 prohíbe—.
 */

type Template = {
  kind: FleetAlertKind
  severity: FleetAlertSeverity
  title: string
  detail: string
  measured: (rnd: Random) => string
  expected: string
}

const TEMPLATES: Template[] = [
  {
    kind: 'consumo_atipico',
    severity: 'alta',
    title: 'Rendimiento por debajo del umbral de la unidad',
    detail: 'El rendimiento cayó más de un 25 % respecto a la media de los últimos 90 días de esta unidad.',
    measured: (rnd) => `${(2.1 + rnd() * 0.9).toFixed(2)} km/L`,
    expected: '≥ 3.40 km/L',
  },
  {
    kind: 'consumo_atipico',
    severity: 'critica',
    title: 'Carga superior a la capacidad del tanque',
    detail: 'El volumen despachado supera la capacidad declarada del tanque: posible carga a un tercero.',
    measured: (rnd) => `${randomInt(rnd, 310, 480)} L`,
    expected: '≤ 280 L',
  },
  {
    kind: 'mantenimiento_vencido',
    severity: 'alta',
    title: 'Servicio preventivo vencido',
    detail: 'La unidad superó el kilometraje de servicio sin orden de mantenimiento registrada.',
    measured: (rnd) => `${randomInt(rnd, 12, 34)} mil km desde el último servicio`,
    expected: '≤ 10 mil km',
  },
  {
    kind: 'conduccion_riesgo',
    severity: 'critica',
    title: 'Exceso de velocidad reiterado',
    detail: 'Telemetría reporta eventos de exceso de velocidad por encima del umbral de seguridad.',
    measured: (rnd) => `${randomInt(rnd, 6, 19)} eventos en 7 días`,
    expected: '≤ 3 eventos',
  },
  {
    kind: 'conduccion_riesgo',
    severity: 'media',
    title: 'Ralentí prolongado',
    detail: 'Tiempo en ralentí muy por encima de la media de la flota: combustible quemado sin recorrido.',
    measured: (rnd) => `${randomInt(rnd, 95, 220)} min/día`,
    expected: '≤ 60 min/día',
  },
  {
    kind: 'unidad_sin_reportar',
    severity: 'media',
    title: 'Unidad sin telemetría',
    detail: 'La unidad lleva días sin enviar pings: posible fallo del dispositivo TSP.',
    measured: (rnd) => `${randomInt(rnd, 3, 14)} días sin reportar`,
    expected: '< 1 día',
  },
  {
    kind: 'exceso_gasto',
    severity: 'alta',
    title: 'Gasto mensual por encima del presupuesto',
    detail: 'El gasto acumulado del mes supera el presupuesto asignado al centro de costo.',
    measured: (rnd) => `${randomInt(rnd, 108, 145)} % del presupuesto`,
    expected: '≤ 100 %',
  },
]

/**
 * Alertas de UN día concreto, sembradas por fecha — EP-08 · US-050.
 * ════════════════════════════════════════════════════════════════
 * Antes esto era una tirada única sobre una ventana de 21 días: valía para
 * llenar el panel de alertas, pero no se podía pedir «los doce meses
 * anteriores» sin que cambiaran también las alertas de esta semana, porque
 * ampliar la ventana movía toda la secuencia del generador.
 *
 * Ahora la semilla depende de la cuenta y del DÍA, igual que en
 * `fleet-activity` —decisión 1 de aquel módulo—, así que cualquier ventana es
 * una REBANADA de la misma historia. Es lo que permite que el panel siga
 * enseñando sus 21 días y que la comparativa de US-050 lea veinticuatro meses
 * sin que las dos cifras se contradigan.
 */
function alertsOfDay(account: Account, dayStart: number, now: number): FleetAlert[] {
  const dayIndex = Math.round(dayStart / DAY)
  const rnd = createRandom(SEED + hashText(account.id) + dayIndex * 6151)
  const units = fleetUnitsOf(account)
  const drivers = fleetDriversOf(account)

  /**
   * Alertas esperadas por día, proporcional a la flota.
   *
   * Sale de la misma proporción de antes —una alerta por cada cuarenta
   * unidades en tres semanas— repartida por día. El sorteo es de Bernoulli
   * sobre la parte fraccionaria para que una cuenta pequeña tenga días sin
   * ninguna alerta en vez de un decimal imposible.
   */
  const expected = account.fleetSize / 40 / WINDOW_DAYS
  const count = Math.floor(expected) + (rnd() < expected % 1 ? 1 : 0)

  const alerts: FleetAlert[] = []

  for (let i = 0; i < count; i++) {
    const template = pick(rnd, TEMPLATES)
    const raisedAt = dayStart + randomInt(rnd, 0, 23) * HOUR + randomInt(rnd, 0, 59) * 60_000

    // No se levantan alertas en el futuro: el día en curso va recortado a la
    // hora actual, igual que la actividad.
    if (raisedAt > now) continue

    /**
     * Las más antiguas tienden a estar ya atendidas. El umbral es la EDAD
     * respecto al instante de consulta, no respecto al día: una alerta de
     * hace once meses está resuelta se mire cuando se mire.
     */
    const ageDays = (now - raisedAt) / DAY
    const roll = rnd()
    const state: FleetAlertState =
      ageDays > 12 ? (roll < 0.75 ? 'resuelta' : 'reconocida') : roll < 0.25 ? 'reconocida' : 'abierta'

    const handled = state !== 'abierta'
    const unit = pick(rnd, units)

    /**
     * Casi siempre el titular de la unidad, a veces un relevo cualquiera.
     * Sortear el conductor sin mirar la unidad haría que filtrar por unidad
     * Y conductor a la vez no devolviera nunca nada, y ese vacío no sería
     * un dato: sería un mock mal montado.
     */
    const driverId =
      template.kind === 'unidad_sin_reportar'
        ? null
        : rnd() < 0.75
          ? unit.assignedDriverId
          : pick(rnd, drivers).id

    /**
     * TIEMPO DE RESOLUCIÓN — criterio 2 de US-050.
     *
     * No es un número plano: depende de la severidad, que es lo que hace que
     * el KPI signifique algo. Una crítica se atiende en horas y una media
     * puede tardar días, así que un mes con más críticas mejora el TTR medio
     * sin que nadie haya trabajado mejor. Ese matiz es justo lo que un
     * responsable de flota tiene que poder ver.
     */
    const ttrHours =
      template.severity === 'critica'
        ? randomInt(rnd, 1, 12)
        : template.severity === 'alta'
          ? randomInt(rnd, 4, 48)
          : randomInt(rnd, 12, 120)

    alerts.push({
      id: `alert_${account.id}_${dayIndex}_${i}`,
      accountId: account.id,
      kind: template.kind,
      severity: template.severity,
      unitId: unit.id,
      driverId,
      /**
       * Atributos por los que se filtra, SELLADOS en la alerta — US-050.
       *
       * Se copian del padrón en el momento de levantarla, igual que
       * `FuelEvent` sella su ruta organizativa. Sin ellos, filtrar una alerta
       * de hace once meses obligaría a reconstruir el padrón de aquel día, y
       * la comparativa acabaría descartando en silencio todo lo que no
       * estuviera en la foto cargada.
       *
       * `routeId` y `behavior` NO se sellan: son de la jornada de la unidad,
       * no de la alerta, y copiarlos aquí inventaría una correlación que el
       * dominio no tiene. La consecuencia está declarada en `alertMatches`.
       */
      costCenter: unit.costCenter,
      group: unit.group,
      fuel: unit.fuel,
      title: template.title,
      detail: template.detail,
      measured: template.measured(rnd),
      expected: template.expected,
      raisedAt,
      state,
      handledBy: handled ? 'Equipo de operaciones' : null,
      handledAt: handled ? raisedAt + ttrHours * HOUR : null,
    })
  }

  return alerts
}

/**
 * Alertas operativas de todas las cuentas activas.
 *
 * `windowDays` es la profundidad de la rebanada, contada hacia atrás desde
 * `now`. Por defecto los 21 días del panel; la comparativa de US-050 pide
 * veinticuatro meses de la MISMA historia.
 */
export function buildFleetAlerts(now: number, windowDays = WINDOW_DAYS): FleetAlert[] {
  const alerts: FleetAlert[] = []
  const todayStart = startOfDay(now)

  for (const account of ACCOUNTS.filter((account) => account.active)) {
    for (let daysAgo = windowDays; daysAgo >= 0; daysAgo--) {
      alerts.push(...alertsOfDay(account, todayStart - daysAgo * DAY, now))
    }
  }

  return alerts.sort((a, b) => b.raisedAt - a.raisedAt)
}

/** Hash estable de una cadena, para derivar semillas por cuenta. */
function hashText(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0
  }
  return hash % 1_000_003
}

export const ALERT_SEVERITY_STATUS: Record<FleetAlertSeverity, 'error' | 'warning' | 'info'> = {
  critica: 'error',
  alta: 'warning',
  media: 'info',
}

export const ALERT_STATE_STATUS: Record<FleetAlertState, 'error' | 'warning' | 'success'> = {
  abierta: 'error',
  reconocida: 'warning',
  resuelta: 'success',
}
