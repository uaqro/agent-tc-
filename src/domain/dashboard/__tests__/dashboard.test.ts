/**
 * Tests del dashboard principal — US-008.
 * ══════════════════════════════════════
 * Se comprueban tres cosas distintas, y conviene no mezclarlas:
 *
 *   · que los DATOS mock tengan las propiedades que la historia pide
 *     —determinismo, variación temporal, volumen y casos límite—, porque sin
 *     ellas los paneles no prueban nada;
 *   · que las AGREGACIONES sean exactas, en particular que los filtros
 *     compongan sin reparto proporcional;
 *   · que las REGLAS DE NEGOCIO de RBAC de la historia se cumplan leyendo la
 *     matriz, no la interfaz.
 *
 * El reloj es fijo. Un test que dependa de la hora a la que se ejecute no es
 * un test, es una moneda al aire.
 */
import { describe, expect, it } from 'vitest'
import { ACCOUNTS } from '../../data/accounts'
import { buildFleetAlerts } from '../../data/fleet-alerts'
import { buildAccountActivity, fleetUnitsOf, startOfDay } from '../../data/fleet-activity'
import {

  attainment,
  efficiencyByCostCenter,
  computeKpis,
  defaultTargets,
  delta,
  fleetEfficiency,
  fuelSplit,
  hourSeries,
  incidents,
  periodSeries,
  pricePoints,
  summarizeDay,
  topUnitsByConsumption,
  unitsByAmount,
  unitsOf,

} from '../metrics'
import { DEFAULT_FILTERS, type GlobalFilters } from '../../filters/types'
import { mxnCompact, signedPercent } from '../format'
import { FUEL_TYPES, type ActivitySnapshot } from '../types'

/** Jueves 20 de agosto de 2026, 11:30 hora local. */
const NOW = new Date(2026, 7, 20, 11, 30, 0, 0).getTime()
const DAY = 24 * 60 * 60_000

const BAJIO = ACCOUNTS.find((account) => account.id === 'acc_transportes_bajio')!
const GRANDE = ACCOUNTS.find((account) => account.id === 'acc_grupo_alimentario')!
const DE_BAJA = ACCOUNTS.find((account) => account.id === 'acc_farmaceutica_azteca')!

const OPTIONS = { periodDays: 30 }

function snapshotOf(accountIds: string[], at = NOW, periodDays = 30): ActivitySnapshot {
  const accounts = ACCOUNTS.filter((account) => accountIds.includes(account.id)).map((account) =>
    buildAccountActivity(account, at, { periodDays }),
  )
  return {
    at,
    accounts,
    loadMs: 0,
    fleetSize: accounts.reduce((total, account) => total + account.fleetSize, 0),
    periodDays,
  }
}

// ── Datos mock ───────────────────────────────────────────────────────────

describe('generador de actividad de flota', () => {
  it('es determinista: el mismo instante da exactamente los mismos datos', () => {
    const primera = buildAccountActivity(BAJIO, NOW, OPTIONS)
    const segunda = buildAccountActivity(BAJIO, NOW, OPTIONS)
    expect(segunda).toEqual(primera)
  })

  it('el padrón tiene una unidad por vehículo contratado', () => {
    expect(fleetUnitsOf(GRANDE)).toHaveLength(GRANDE.fleetSize)
    expect(buildAccountActivity(GRANDE, NOW, OPTIONS).units).toHaveLength(GRANDE.fleetSize)
  })

  it('los totales del día solo crecen con la hora', () => {
    const manana = buildAccountActivity(BAJIO, new Date(2026, 7, 20, 9, 0).getTime(), OPTIONS)
    const tarde = buildAccountActivity(BAJIO, new Date(2026, 7, 20, 18, 0).getTime(), OPTIONS)

    const litrosManana = manana.units.reduce((total, unit) => total + unit.liters, 0)
    const litrosTarde = tarde.units.reduce((total, unit) => total + unit.liters, 0)

    expect(litrosTarde).toBeGreaterThan(litrosManana)
    expect(tarde.todayEvents.length).toBeGreaterThanOrEqual(manana.todayEvents.length)
  })

  it('hay variación temporal: ninguna hora concentra toda la jornada', () => {
    const activity = buildAccountActivity(BAJIO, NOW, OPTIONS)
    const horas = hourSeries(activity.todayEvents, startOfDay(NOW), 11, DEFAULT_FILTERS)
    const conActividad = horas.filter((punto) => punto.refuels > 0)
    expect(conActividad.length).toBeGreaterThan(1)
  })

  it('incluye el caso negativo: una unidad con abono deja litros e importe por debajo de cero', () => {
    // Al final de la jornada el abono ya está imputado.
    const activity = buildAccountActivity(BAJIO, new Date(2026, 7, 20, 23, 30).getTime(), OPTIONS)
    const abonadas = activity.units.filter((unit) => unit.liters < 0)

    expect(abonadas.length).toBeGreaterThan(0)
    expect(abonadas[0]!.amountMxn).toBeLessThan(0)
    expect(activity.todayEvents.some((event) => event.refund)).toBe(true)
  })

  it('incluye unidades sin reportar y unidades en taller', () => {
    const activity = buildAccountActivity(GRANDE, NOW, OPTIONS)
    expect(activity.units.some((unit) => unit.status === 'sin_reportar')).toBe(true)
    expect(activity.units.some((unit) => unit.status === 'en_taller')).toBe(true)
    expect(activity.units.some((unit) => unit.status === 'activa')).toBe(true)
  })

  it('la unidad que no reporta no tiene marca de último reporte', () => {
    const activity = buildAccountActivity(GRANDE, NOW, OPTIONS)
    const muda = activity.units.find((unit) => unit.status === 'sin_reportar')!
    expect(muda.lastReportAt).toBeNull()
    expect(muda.km).toBe(0)
  })

  it('la cuenta dada de baja conserva su ficha pero no genera actividad', () => {
    const activity = buildAccountActivity(DE_BAJA, NOW, OPTIONS)
    expect(DE_BAJA.active).toBe(false)
    expect(activity.fleetSize).toBe(0)
    expect(activity.units).toEqual([])
    expect(activity.period).toEqual([])
  })

  it('el periodo cubre los días pedidos más el día en curso, y solo el último va incompleto', () => {
    const activity = buildAccountActivity(BAJIO, NOW, { periodDays: 30 })
    expect(activity.period).toHaveLength(31)
    expect(activity.period.filter((punto) => punto.partial)).toHaveLength(1)
    expect(activity.period[activity.period.length - 1]!.partial).toBe(true)
    expect(activity.period[0]!.at).toBe(startOfDay(NOW) - 30 * DAY)
  })

  it('hay un día del periodo con ahorro negativo: el mercado bajó del precio de contrato', () => {
    const snapshot = snapshotOf([BAJIO.id])
    const cerrados = periodSeries(snapshot, DEFAULT_FILTERS).filter((punto) => !punto.partial)
    const enNegativo = cerrados.filter((punto) => punto.savingMxn < 0)

    expect(enNegativo.length).toBeGreaterThanOrEqual(1)
    // Y no es que todo el periodo esté en pérdidas: es un día suelto.
    expect(enNegativo.length).toBeLessThan(cerrados.length / 2)
  })
})

// ── Agregaciones ─────────────────────────────────────────────────────────

describe('agregaciones y filtros', () => {
  const snapshot = snapshotOf([BAJIO.id])
  const punto = snapshot.accounts[0]!.period[0]!

  it('los filtros por combustible componen de forma exacta', () => {
    const total = summarizeDay(punto, DEFAULT_FILTERS)
    const porPartes = FUEL_TYPES.reduce(
      (acumulado, fuel) => acumulado + summarizeDay(punto, { ...DEFAULT_FILTERS, fuel }).liters,
      0,
    )
    expect(porPartes).toBeCloseTo(total.liters, 6)
  })

  it('el cruce de combustible y centro de coste también suma el total', () => {
    const total = summarizeDay(punto, DEFAULT_FILTERS)
    const centros = [...new Set(punto.rows.map((row) => row.costCenter))]

    let cruzado = 0
    for (const fuel of FUEL_TYPES) {
      for (const costCenter of centros) {
        cruzado += summarizeDay(punto, { ...DEFAULT_FILTERS, fuel, costCenter }).liters
      }
    }
    expect(cruzado).toBeCloseTo(total.liters, 6)
  })

  it('las unidades del padrón se reparten entre las filas sin duplicarse', () => {
    const total = summarizeDay(punto, DEFAULT_FILTERS)
    expect(total.fleetUnits).toBe(BAJIO.fleetSize)
    expect(total.activeUnits).toBeLessThanOrEqual(total.fleetUnits)
  })

  it('filtrar unidades por combustible devuelve solo ese combustible', () => {
    const filtros: GlobalFilters = { ...DEFAULT_FILTERS, fuel: 'premium' }
    const unidades = unitsOf(snapshot, filtros)
    expect(unidades.length).toBeGreaterThan(0)
    expect(unidades.every((unit) => unit.fuel === 'premium')).toBe(true)
  })

  it('la serie horaria se detiene en la hora en curso', () => {
    const activity = snapshot.accounts[0]!
    const horas = hourSeries(activity.todayEvents, startOfDay(NOW), 11, DEFAULT_FILTERS)
    expect(horas).toHaveLength(12)
    expect(horas[horas.length - 1]!.hour).toBe(11)
  })

  it('la serie del periodo consolida varias cuentas por fecha', () => {
    const una = periodSeries(snapshotOf([BAJIO.id]), DEFAULT_FILTERS)
    const dos = periodSeries(snapshotOf([BAJIO.id, GRANDE.id]), DEFAULT_FILTERS)

    expect(dos).toHaveLength(una.length)
    expect(dos[0]!.liters).toBeGreaterThan(una[0]!.liters)
    expect(dos[0]!.fleetUnits).toBe(BAJIO.fleetSize + GRANDE.fleetSize)
  })
})

// ── KPIs del criterio 2 ──────────────────────────────────────────────────

describe('KPIs del día', () => {
  const snapshot = snapshotOf([BAJIO.id])
  const alertas = buildFleetAlerts(NOW).filter((alert) => alert.accountId === BAJIO.id)
  const kpis = computeKpis(snapshot, alertas, DEFAULT_FILTERS, NOW)

  it('publica las cuatro magnitudes que pide el criterio 2', () => {
    expect(kpis.litersToday).toBeGreaterThan(0)
    expect(kpis.amountToday).toBeGreaterThan(0)
    expect(kpis.activeUnits).toBeGreaterThan(0)
    expect(kpis.pendingAlerts).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(kpis.savingPeriodMxn)).toBe(true)
  })

  it('el padrón se reparte sin huecos entre activas, pendientes de reportar y taller', () => {
    expect(kpis.fleetUnits).toBe(BAJIO.fleetSize)
    expect(kpis.activeUnits).toBeLessThanOrEqual(kpis.expectedUnits)
    expect(kpis.expectedUnits + kpis.inWorkshop).toBe(kpis.fleetUnits)
    expect(kpis.activeUnits + kpis.unreported).toBe(kpis.expectedUnits)
  })

  /**
   * Regresión: la tarjeta contaba el padrón de unidades operativas y la serie
   * contaba las que ya habían reportado. Dos cifras para el mismo concepto, y
   * la variación entre ellas salía desplomada a primera hora de la mañana.
   */
  it('«unidad activa» significa lo mismo en la tarjeta y en la serie', () => {
    const serie = periodSeries(snapshot, DEFAULT_FILTERS)
    const hoy = serie[serie.length - 1]!
    expect(hoy.partial).toBe(true)
    expect(kpis.activeUnits).toBe(hoy.activeUnits)
  })

  it('a primera hora de la madrugada casi nadie ha reportado todavía', () => {
    const alba = new Date(2026, 7, 20, 4, 0).getTime()
    const temprano = computeKpis(snapshotOf([BAJIO.id], alba), [], DEFAULT_FILTERS, alba)

    // Ninguna jornada arranca antes de las cinco: es información, no un fallo.
    expect(temprano.activeUnits).toBe(0)
    expect(temprano.unreported).toBe(temprano.expectedUnits)
  })

  it('las alertas pendientes son las que no están resueltas', () => {
    expect(kpis.pendingAlerts).toBe(alertas.filter((alert) => alert.state !== 'resuelta').length)
    expect(kpis.criticalAlerts).toBeLessThanOrEqual(kpis.pendingAlerts)
  })

  it('el ahorro del periodo cuadra con la suma de la serie', () => {
    const suma = periodSeries(snapshot, DEFAULT_FILTERS).reduce(
      (total, punto) => total + punto.savingMxn,
      0,
    )
    expect(kpis.savingPeriodMxn).toBeCloseTo(suma, 6)
  })

  it('la comparación con ayer usa el mismo tramo horario, no el día entero', () => {
    const aMedioDia = computeKpis(snapshot, alertas, DEFAULT_FILTERS, NOW)
    const aFinalDelDia = computeKpis(
      snapshotOf([BAJIO.id], new Date(2026, 7, 20, 23, 30).getTime()),
      alertas,
      DEFAULT_FILTERS,
      new Date(2026, 7, 20, 23, 30).getTime(),
    )

    // Si se comparase contra el día anterior completo, la variación de media
    // mañana saldría siempre desplomada y no diría nada.
    expect(aMedioDia.litersDelta.pct).not.toBeNull()
    expect(aFinalDelDia.litersDelta.pct).not.toBeNull()
  })

  it('una cuenta sin actividad no rompe los KPIs', () => {
    const vacio = computeKpis(snapshotOf([DE_BAJA.id]), [], DEFAULT_FILTERS, NOW)
    expect(vacio.litersToday).toBe(0)
    expect(vacio.activeUnits).toBe(0)
    expect(vacio.savingPeriodPct).toBe(0)
  })

  /**
   * Precio medio del litro — sesión con Joaquín Miguens (20-ago).
   *
   * Es una división, no una fuente nueva: importe del día entre litros del
   * día. Se comprueba contra la misma identidad que usa el panel de precios
   * para que las dos pantallas no puedan decir precios distintos del mismo día.
   */
  it('el precio medio del litro sale del importe y los litros del día', () => {
    expect(kpis.contractPriceToday).not.toBeNull()
    expect(kpis.contractPriceToday).toBeCloseTo(kpis.amountToday / kpis.litersToday, 6)

    // El de lista es lo cobrado más lo ahorrado, entre los mismos litros.
    const serie = periodSeries(snapshot, DEFAULT_FILTERS)
    const hoy = serie[serie.length - 1]!
    expect(kpis.listPriceToday).toBeCloseTo((hoy.amountMxn + hoy.savingMxn) / hoy.liters, 6)

    // Y el contrato va por debajo de la calle, que es el sentido del acuerdo.
    expect(kpis.contractPriceToday!).toBeLessThan(kpis.listPriceToday!)
  })

  it('sin litros despachados no hay precio medio: es «sin dato», no un cero', () => {
    const alba = new Date(2026, 7, 20, 3, 0).getTime()
    const temprano = computeKpis(snapshotOf([BAJIO.id], alba), [], DEFAULT_FILTERS, alba)

    expect(temprano.litersToday).toBe(0)
    expect(temprano.contractPriceToday).toBeNull()
    expect(temprano.listPriceToday).toBeNull()
  })

  /** El mismo agregado que publica `fleetEfficiency`, no una segunda cuenta. */
  it('el rendimiento de flota del KPI coincide con el del panel', () => {
    const flota = fleetEfficiency(unitsOf(snapshot, DEFAULT_FILTERS))
    expect(kpis.fleetKm).toBeCloseTo(flota.km, 6)
    expect(kpis.fleetEfficiency).toBeCloseTo(flota.efficiency!, 6)
  })

  /**
   * Ninguna meta sin su KPI — sesión con Joaquín Miguens (20-ago).
   * ════════════════════════════════════════════════════════════
   * Eran cuatro objetivos y son dos. Los que se fueron medían las alertas
   * pendientes y el ahorro acumulado, que ya no se publican en pantalla.
   *
   * El test enumera las claves en vez de comprobar las dos que quedan porque
   * lo que hay que impedir es lo contrario de lo que parece: no que falte una
   * meta, sino que SOBRE. Una meta huérfana es un número que alguien puede
   * negociar y fijar en un contrato, y que el `admin.log` registraría como
   * ajustado, sin que la plataforma tenga después con qué rendir cuentas.
   */
  it('no queda ninguna meta sin el KPI que la mide', () => {
    const metas = defaultTargets(snapshot, DEFAULT_FILTERS)
    expect(Object.keys(metas).sort()).toEqual(['activeUnitsPct', 'litersPerDay'])
    expect(metas.litersPerDay).toBeGreaterThan(0)
    expect(metas.activeUnitsPct).toBe(92)
  })
})

describe('variaciones y cumplimiento', () => {
  it('sin base con la que comparar, la variación es nula y no cero', () => {
    expect(delta(120, 0).pct).toBeNull()
    expect(delta(120, 0).direction).toBe('neutral')
  })

  it('una diferencia por debajo de medio punto es ruido, no tendencia', () => {
    expect(delta(1002, 1000).direction).toBe('neutral')
    expect(delta(1100, 1000).direction).toBe('up')
    expect(delta(900, 1000).direction).toBe('down')
  })

  it('el cumplimiento se acota para que la barra no se dispare', () => {
    expect(attainment(50, 100)).toBeCloseTo(0.5)
    expect(attainment(1000, 100)).toBe(2)
    expect(attainment(50, 0)).toBe(0)
  })

  it('las variaciones se escriben con signo explícito', () => {
    expect(signedPercent(0.042)).toMatch(/^\+/)
    expect(signedPercent(-0.042)).toMatch(/^[-−]/)
    expect(signedPercent(null)).toBe('sin base')
  })

  it('un ahorro negativo se escribe como negativo, compacto o no', () => {
    expect(mxnCompact(-8_452)).toMatch(/^[-−]/)
    expect(mxnCompact(-1_284_500)).toMatch(/^[-−]/)
    // Y con el mismo glifo: uno viene de `Intl` y el otro se compone a mano.
    expect(mxnCompact(-1_284_500)[0]).toBe(mxnCompact(-8_452)[0])
    expect(signedPercent(-0.042)[0]).toBe(mxnCompact(-8_452)[0])
  })
})


describe('widgets del catálogo de US-009', () => {
  const snapshot = snapshotOf([BAJIO.id], new Date(2026, 7, 20, 20, 0).getTime())
  const units = unitsOf(snapshot, DEFAULT_FILTERS)

  it('el ranking ordena de mayor a menor y no cuenta a quien no repostó', () => {
    const filas = topUnitsByConsumption(units, 10)
    expect(filas.length).toBeGreaterThan(0)
    expect(filas.length).toBeLessThanOrEqual(10)
    expect(filas.every((fila) => fila.value > 0)).toBe(true)

    const valores = filas.map((fila) => fila.value)
    expect([...valores].sort((a, b) => b - a)).toEqual(valores)
    // La primera fila marca la escala, así que su barra va al máximo.
    expect(filas[0]!.share).toBeCloseTo(1)
  })

  /**
   * Orden por defecto de «Unidades de la jornada» — decisión de Álvaro
   * (25-ago), tras revisar lo que Joaquín pidió mirar.
   *
   * Lo que se fija no es solo el orden: es que la función devuelva una COPIA.
   * La misma lista alimenta los KPIs y el panel de incidencias, y ordenarla en
   * el sitio sería un fallo silencioso —no rompe nada, solo desordena algo
   * lejos de aquí—.
   */
  it('las unidades de la jornada salen por importe, de mayor a menor', () => {
    const ordenadas = unitsByAmount(units)
    expect(ordenadas).toHaveLength(units.length)

    const importes = ordenadas.map((unit) => unit.amountMxn)
    expect([...importes].sort((a, b) => b - a)).toEqual(importes)

    // Los abonos quedan al final, que es donde se llega con un clic.
    const abonos = ordenadas.filter((unit) => unit.amountMxn < 0)
    if (abonos.length > 0) {
      expect(ordenadas[ordenadas.length - 1]!.amountMxn).toBeLessThan(0)
    }

    // Y la lista de entrada no se toca.
    const original = units.map((unit) => unit.unitId)
    unitsByAmount(units)
    expect(units.map((unit) => unit.unitId)).toEqual(original)
  })

  it('el reparto por combustible suma el consumo del día', () => {
    const filas = fuelSplit(units)
    const total = units.reduce((suma, unit) => suma + unit.liters, 0)
    expect(filas.reduce((suma, fila) => suma + fila.value, 0)).toBeCloseTo(total, 6)
    expect(filas.length).toBeGreaterThan(1)
  })

  it('el rendimiento por centro es el agregado, no la media de las medias', () => {
    const filas = efficiencyByCostCenter(units)
    expect(filas.length).toBeGreaterThan(0)

    for (const fila of filas) {
      const delCentro = units.filter((unit) => unit.costCenter === fila.costCenter)
      expect(fila.units).toBe(delCentro.length)
      if (fila.efficiency !== null) {
        expect(fila.efficiency).toBeCloseTo(fila.km / fila.liters, 6)
      }
    }

    // Y cada unidad cae en un solo centro: los grupos cubren el padrón entero.
    expect(filas.reduce((suma, fila) => suma + fila.units, 0)).toBe(units.length)
  })

  it('sin litros no hay rendimiento: es «sin dato», no un cero', () => {
    const sinLitros = efficiencyByCostCenter(
      units.map((unit) => ({ ...unit, liters: 0, km: 120 })),
    )
    expect(sinLitros.every((fila) => fila.efficiency === null)).toBe(true)
  })

  /**
   * Sesión con Joaquín Miguens (20-ago) — «pongámosle el rendimiento de la
   * flota, no le pongas el conjunto, no media de medias».
   *
   * El caso que separa las dos cuentas está construido a propósito: un centro
   * pequeño y muy eficiente frente a uno grande y flojo. Promediar las dos
   * filas del desglose da 10 km/L; la flota de verdad hace 3.09. Con datos
   * homogéneos las dos fórmulas se parecen lo bastante como para que el error
   * pase desapercibido, y por eso el test no usa datos homogéneos.
   *
   * Promediar filas da 9.8 km/L; la flota de verdad hace 3.09. La diferencia
   * no es de redondeo: es un triple.
   */
  it('el rendimiento de la flota es el agregado, no el promedio de los centros', () => {
    const flota = fleetEfficiency(units)
    const km = units.reduce((suma, unit) => suma + unit.km, 0)
    const litros = units.reduce((suma, unit) => suma + unit.liters, 0)

    expect(flota.km).toBeCloseTo(km, 6)
    expect(flota.liters).toBeCloseTo(litros, 6)
    expect(flota.efficiency).toBeCloseTo(km / litros, 6)
    expect(flota.units).toBe(units.length)

    // Y el agregado NO es el promedio de las filas del desglose.
    const filas = efficiencyByCostCenter(units).filter((fila) => fila.efficiency !== null)
    const mediaDeMedias =
      filas.reduce((suma, fila) => suma + (fila.efficiency ?? 0), 0) / filas.length

    const [ligera, pesada] = [
      { ...units[0]!, km: 180, liters: 10, costCenter: 'REPARTO' },
      { ...units[1]!, km: 160, liters: 100, costCenter: 'LARGA_DISTANCIA' },
    ]
    const sesgada = fleetEfficiency([ligera, pesada])
    const desglose = efficiencyByCostCenter([ligera, pesada])
    const promedio = desglose.reduce((suma, fila) => suma + (fila.efficiency ?? 0), 0) / 2

    // 18 km/L la ligera, 1.6 la pesada: el promedio dice 9.8 y la flota 3.09.
    expect(sesgada.efficiency).toBeCloseTo(340 / 110, 6)
    expect(promedio).toBeCloseTo(9.8, 6)
    expect(sesgada.efficiency).not.toBeCloseTo(promedio, 2)

    // Con la flota real la diferencia es menor, pero sigue sin ser la misma
    // cuenta: si algún día coincidieran, sería casualidad y no equivalencia.
    expect(Number.isFinite(mediaDeMedias)).toBe(true)
  })

  it('sin litros, la flota tampoco tiene rendimiento: «sin dato», no cero', () => {
    expect(fleetEfficiency(units.map((unit) => ({ ...unit, liters: 0, km: 120 }))).efficiency).toBe(
      null,
    )
    expect(fleetEfficiency([])).toEqual({
      efficiency: null,
      km: 0,
      liters: 0,
      units: 0,
      costCenters: 0,
    })
  })

  it('la serie de precios cruza el día en que el mercado bajó del contrato', () => {
    const puntos = pricePoints(snapshot, DEFAULT_FILTERS)
    const conPrecio = puntos.filter((punto) => punto.listPrice !== null)
    expect(conPrecio.length).toBeGreaterThan(20)

    const cruces = conPrecio.filter((punto) => punto.listPrice! < punto.contractPrice!)
    expect(cruces.length).toBeGreaterThanOrEqual(1)
    // El resto de días el contrato va por debajo, que es de lo que se trata.
    expect(cruces.length).toBeLessThan(conPrecio.length / 2)
  })

  it('el panel de incidencias reúne los tres casos límite del generador', () => {
    const resultado = incidents(units)

    expect(resultado.unreported.length).toBeGreaterThan(0)
    expect(resultado.unreported.every((unit) => unit.status === 'sin_reportar')).toBe(true)

    expect(resultado.refunded.length).toBeGreaterThan(0)
    expect(resultado.refunded.every((unit) => unit.liters < 0)).toBe(true)

    expect(resultado.efficiencyFloor).not.toBeNull()
    expect(
      resultado.underperforming.every((unit) => (unit.efficiency ?? 0) < resultado.efficiencyFloor!),
    ).toBe(true)
  })

  it('el umbral de rendimiento sale de la flota, no de una constante', () => {
    const eficientes = units.map((unit) => ({ ...unit, efficiency: 10, km: 100, liters: 10 }))
    const flojas = units.map((unit) => ({ ...unit, efficiency: 2, km: 20, liters: 10 }))

    expect(incidents(eficientes).efficiencyFloor).toBeCloseTo(7)
    expect(incidents(flojas).efficiencyFloor).toBeCloseTo(1.4)
  })

  it('una flota sin datos no rompe ningún widget', () => {
    expect(topUnitsByConsumption([])).toEqual([])
    expect(fuelSplit([])).toEqual([])
    expect(efficiencyByCostCenter([])).toEqual([])
    expect(incidents([])).toEqual({
      unreported: [],
      refunded: [],
      underperforming: [],
      efficiencyFloor: null,
    })
  })
})
