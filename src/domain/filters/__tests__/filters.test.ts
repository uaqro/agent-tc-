/**
 * Tests de los filtros globales de contexto — US-010.
 * ══════════════════════════════════════════════════
 * Cuatro cosas distintas, y conviene no mezclarlas:
 *
 *   · que los DATOS mock tengan las tres dimensiones nuevas con propiedades
 *     comprobables —identificadores únicos en toda la plataforma, rotación de
 *     conductores, un grupo diminuto, unidades-día sin conductor—, porque sin
 *     ellas los filtros no prueban nada;
 *   · que el CORTE sea exacto y componga en las seis dimensiones, sobre las
 *     tres colecciones que se filtran: filas del histórico, unidades del día y
 *     despachos;
 *   · que la PERSISTENCIA y las VISTAS aguanten un navegador hostil —almacén
 *     bloqueado, contenido dañado, cuota agotada— sin perder la pantalla;
 *   · que las REGLAS DE RBAC de la historia se lean de la matriz de ADR-001, no
 *     de la interfaz.
 *
 * El reloj es fijo. Un test que dependa de la hora a la que se ejecute no es un
 * test, es una moneda al aire.
 */
import { describe, expect, it } from 'vitest'
import { ACCOUNTS } from '../../data/accounts'
import {
  UNIT_GROUPS,
  buildAccountActivity,
  fleetDriversOf,
  fleetUnitsOf,
} from '../../data/fleet-activity'
import { buildFleetAlerts } from '../../data/fleet-alerts'
import { alertsMatching, periodSeries, summarizeDay, unitsOf } from '../../dashboard/metrics'
import type { ActivitySnapshot } from '../../dashboard/types'
import { activeChips, describeFilters } from '../describe'
import { buildFilterOptions, cascade, reconcile, visibleDrivers, visibleUnits } from '../options'
import {
  MAX_SAVED_VIEWS,
  MAX_VIEW_NAME,
  ownerKeyFor,
  readFilters,
  readViews,
  validateViewName,
  viewIdFor,
  writeFilters,
  writeViews,
  type SavedView,
} from '../store'
import {
  ANY,
  DEFAULT_FILTERS,
  MAX_PERIOD_DAYS,
  MIN_PERIOD_DAYS,
  NO_DRIVER,
  activeCount,
  matches,
  narrows,
  parseFilters,
  sameFilters,
  type GlobalFilters,
} from '../types'

/** Jueves 20 de agosto de 2026, 11:30 hora local. El mismo que US-008. */
const NOW = new Date(2026, 7, 20, 11, 30, 0, 0).getTime()

const BAJIO = ACCOUNTS.find((account) => account.id === 'acc_transportes_bajio')!
const GRANDE = ACCOUNTS.find((account) => account.id === 'acc_grupo_alimentario')!

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

function filtersWith(partial: Partial<GlobalFilters>): GlobalFilters {
  return { ...DEFAULT_FILTERS, ...partial }
}

// ── Datos mock de las dimensiones nuevas ─────────────────────────────────

describe('padrón de unidades, grupos y conductores', () => {
  it('los identificadores de unidad no se repiten entre cuentas', () => {
    const vistos = new Set<string>()
    for (const account of ACCOUNTS) {
      for (const unit of fleetUnitsOf(account)) {
        expect(vistos.has(unit.id)).toBe(false)
        vistos.add(unit.id)
      }
    }
    // Si esto se rompe, un Admin Edenred que filtre por «ECO-1001» estaría
    // sumando unidades de varios tenants en la misma cifra.
    expect(vistos.size).toBe(ACCOUNTS.reduce((total, account) => total + account.fleetSize, 0))
  })

  it('los identificadores de conductor tampoco se repiten entre cuentas', () => {
    const vistos = new Set<string>()
    let total = 0
    for (const account of ACCOUNTS) {
      for (const driver of fleetDriversOf(account)) {
        expect(vistos.has(driver.id)).toBe(false)
        vistos.add(driver.id)
        total += 1
      }
    }
    expect(vistos.size).toBe(total)
  })

  it('hay más conductores que unidades: los turnos se cubren', () => {
    expect(fleetDriversOf(GRANDE).length).toBeGreaterThan(fleetUnitsOf(GRANDE).length)
  })

  it('la cuenta grande tiene volumen suficiente para listas y tablas', () => {
    expect(fleetUnitsOf(GRANDE).length).toBeGreaterThanOrEqual(500)
    expect(fleetDriversOf(GRANDE).length).toBeGreaterThanOrEqual(500)
  })

  it('el padrón es determinista: dos lecturas dan lo mismo', () => {
    expect(fleetUnitsOf(BAJIO)).toEqual(fleetUnitsOf(BAJIO))
    expect(fleetDriversOf(BAJIO)).toEqual(fleetDriversOf(BAJIO))
  })

  it('los seis grupos están poblados y «Reserva y sustitución» es el menor', () => {
    const porGrupo = new Map<string, number>()
    for (const unit of fleetUnitsOf(GRANDE)) {
      porGrupo.set(unit.group, (porGrupo.get(unit.group) ?? 0) + 1)
    }

    for (const group of UNIT_GROUPS) {
      expect(porGrupo.get(group) ?? 0).toBeGreaterThan(0)
    }

    const reserva = porGrupo.get('GRP-06 · Reserva y sustitución')!
    const resto = UNIT_GROUPS.filter((group) => group !== 'GRP-06 · Reserva y sustitución')
    for (const group of resto) {
      expect(reserva).toBeLessThan(porGrupo.get(group)!)
    }
  })

  it('la cuenta dada de baja conserva su padrón aunque no opere', () => {
    const deBaja = ACCOUNTS.find((account) => !account.active)!
    expect(fleetUnitsOf(deBaja).length).toBe(deBaja.fleetSize)
    expect(fleetDriversOf(deBaja).length).toBeGreaterThan(0)
    // Padrón sí, actividad no: es el estado vacío del dashboard.
    expect(buildAccountActivity(deBaja, NOW, { periodDays: 30 }).units).toHaveLength(0)
  })

  it('hay conductores con la licencia vencida y siguen en el padrón', () => {
    const vencidas = fleetDriversOf(GRANDE).filter((driver) => driver.licenseExpiresAt < NOW)
    expect(vencidas.length).toBeGreaterThan(0)
    expect(vencidas.length).toBeLessThan(fleetDriversOf(GRANDE).length / 4)
  })
})

describe('variación temporal: la rotación de conductores', () => {
  const snapshot = snapshotOf([BAJIO.id])
  const account = snapshot.accounts[0]!

  it('hay unidades que a lo largo del periodo las lleva más de un conductor', () => {
    const porUnidad = new Map<string, Set<string>>()
    for (const point of account.period) {
      for (const row of point.rows) {
        if (row.driverId === null) continue
        const conductores = porUnidad.get(row.unitId) ?? new Set<string>()
        conductores.add(row.driverId)
        porUnidad.set(row.unitId, conductores)
      }
    }

    const rotadas = [...porUnidad.values()].filter((conductores) => conductores.size > 1)
    // Sin rotación, «consumo por conductor» y «consumo por unidad» serían la
    // misma serie con otro nombre y el filtro de conductor no probaría nada.
    expect(rotadas.length).toBeGreaterThan(0)
  })

  /**
   * Cambio de invariante — sesión con Joaquín Miguens (20-ago).
   * ═════════════════════════════════════════════════════════
   * Hasta hoy «sin conductor de jornada» y «en taller» eran lo mismo, y el
   * test lo fijaba en las dos direcciones. Ya no: el padrón admite unidades
   * SIN TITULAR DECLARADO, y una de ellas que hoy no lleve relevo tampoco
   * tiene conductor, aunque esté rodando.
   *
   * La dirección que se conserva es la que sigue siendo verdad —en taller no
   * conduce nadie—. La que se pierde no se sustituye por otra igual de
   * estrecha, porque la nueva realidad es que hay DOS motivos para no tener
   * conductor y el filtro global los junta a los dos. Eso lo comprueba el test
   * de abajo.
   */
  it('las unidades en taller no las conduce nadie ese día', () => {
    const enTaller = account.units.filter((unit) => unit.status === 'en_taller')
    expect(enTaller.length).toBeGreaterThan(0)
    expect(enTaller.every((unit) => unit.driverId === null)).toBe(true)

    // Y la recíproca YA NO se cumple: hay unidades operando sin conductor
    // porque su ficha del padrón nunca declaró titular.
    const operando = account.units.filter((unit) => unit.status !== 'en_taller')
    const sinTitular = operando.filter((unit) => unit.driverId === null)
    expect(sinTitular.length).toBeGreaterThan(0)
  })
})

// ── Corte exacto y composición · criterio 2 ──────────────────────────────

describe('el corte compone en las seis dimensiones', () => {
  const snapshot = snapshotOf([BAJIO.id])
  const punto = snapshot.accounts[0]!.period[0]!

  it('sumar por grupo devuelve el total del día', () => {
    const total = summarizeDay(punto, DEFAULT_FILTERS)
    const porPartes = UNIT_GROUPS.reduce(
      (acumulado, group) => acumulado + summarizeDay(punto, filtersWith({ group })).liters,
      0,
    )
    expect(porPartes).toBeCloseTo(total.liters, 6)
  })

  it('el cruce de grupo y combustible también suma el total', () => {
    const total = summarizeDay(punto, DEFAULT_FILTERS)
    const combustibles = [...new Set(punto.rows.map((row) => row.fuel))]

    let cruzado = 0
    for (const group of UNIT_GROUPS) {
      for (const fuel of combustibles) {
        cruzado += summarizeDay(punto, filtersWith({ group, fuel })).liters
      }
    }
    expect(cruzado).toBeCloseTo(total.liters, 6)
  })

  it('sumar unidad a unidad devuelve el total, sin reparto proporcional', () => {
    const total = summarizeDay(punto, DEFAULT_FILTERS)
    const unidades = [...new Set(punto.rows.map((row) => row.unitId))]

    const porUnidad = unidades.reduce(
      (acumulado, unitId) => acumulado + summarizeDay(punto, filtersWith({ unitId })).liters,
      0,
    )
    expect(porUnidad).toBeCloseTo(total.liters, 6)
    expect(unidades).toHaveLength(BAJIO.fleetSize)
  })

  it('filtrar por una unidad deja exactamente esa unidad en toda la serie', () => {
    const unitId = fleetUnitsOf(BAJIO)[7]!.id
    const filtros = filtersWith({ unitId })

    expect(unitsOf(snapshot, filtros).every((unit) => unit.unitId === unitId)).toBe(true)

    for (const point of snapshot.accounts[0]!.period) {
      expect(summarizeDay(point, filtros).fleetUnits).toBe(1)
    }
  })

  it('filtrar por conductor deja solo lo que condujo esa persona', () => {
    const driverId = snapshot.accounts[0]!.units.find((unit) => unit.driverId !== null)!.driverId!
    const unidades = unitsOf(snapshot, filtersWith({ driverId }))

    expect(unidades.length).toBeGreaterThan(0)
    expect(unidades.every((unit) => unit.driverId === driverId)).toBe(true)
  })

  it('«sin conductor» es un conjunto propio, no un «cualquiera»', () => {
    const sinConductor = unitsOf(snapshot, filtersWith({ driverId: NO_DRIVER }))

    expect(sinConductor.length).toBeGreaterThan(0)
    expect(sinConductor.every((unit) => unit.driverId === null)).toBe(true)

    /**
     * Y ahora recoge DOS casos, no uno — sesión con Joaquín Miguens (20-ago).
     *
     * El de siempre: la unidad está en taller y ese día no la lleva nadie.
     * El nuevo: la unidad rueda, pero su ficha del padrón no declara titular y
     * hoy no le tocó relevo. Los dos son «hoy no consta quién la condujo», que
     * es lo que el filtro promete; separarlos pediría dos valores distintos en
     * el selector y esa no es una decisión que le toque tomar a un test.
     *
     * Lo que sí se comprueba es que los dos aparecen: un filtro que en la
     * práctica solo devolviera unidades de taller estaría escondiendo el caso
     * de calidad de dato, que es el accionable de los dos.
     */
    const enTaller = sinConductor.filter((unit) => unit.status === 'en_taller')
    const rodando = sinConductor.filter((unit) => unit.status !== 'en_taller')
    expect(enTaller.length).toBeGreaterThan(0)
    expect(rodando.length).toBeGreaterThan(0)
  })

  it('una combinación imposible devuelve vacío sin romper nada', () => {
    // Caso negativo: una unidad de un grupo cruzada con otro grupo distinto.
    const unidad = fleetUnitsOf(BAJIO).find(
      (unit) => unit.group !== 'GRP-06 · Reserva y sustitución',
    )!
    const otroGrupo = UNIT_GROUPS.find((group) => group !== unidad.group)!
    const imposible = filtersWith({ unitId: unidad.id, group: otroGrupo })

    expect(unitsOf(snapshot, imposible)).toHaveLength(0)
    const serie = periodSeries(snapshot, imposible)
    expect(serie.length).toBeGreaterThan(0)
    expect(serie.every((punto) => punto.liters === 0 && punto.fleetUnits === 0)).toBe(true)
  })

  it('los despachos del día se cortan con el mismo criterio que el histórico', () => {
    const eventos = snapshot.accounts[0]!.todayEvents
    const group = UNIT_GROUPS[1]!
    const filtrados = eventos.filter((event) => matches(event, filtersWith({ group })))

    expect(filtrados.length).toBeGreaterThan(0)
    expect(filtrados.every((event) => event.group === group)).toBe(true)
  })

  it('el periodo no recorta: no cuenta como filtro activo', () => {
    expect(narrows(filtersWith({ periodDays: 7 }))).toBe(false)
    expect(activeCount(filtersWith({ periodDays: 7 }))).toBe(0)
    expect(narrows(filtersWith({ group: UNIT_GROUPS[0]! }))).toBe(true)
    expect(activeCount(filtersWith({ group: UNIT_GROUPS[0]!, fuel: 'diesel' }))).toBe(2)
  })
})

describe('las alertas entran en el contexto — criterio 2', () => {
  const snapshot = snapshotOf([BAJIO.id])
  const alertas = buildFleetAlerts(NOW).filter((alert) => alert.accountId === BAJIO.id)

  it('sin filtros no se toca ni una alerta', () => {
    expect(alertsMatching(alertas, snapshot, DEFAULT_FILTERS)).toEqual(alertas)
  })

  it('filtrar por unidad deja solo las alertas de esa unidad', () => {
    const unitId = alertas[0]!.unitId
    const recortadas = alertsMatching(alertas, snapshot, filtersWith({ unitId }))

    expect(recortadas.length).toBeGreaterThan(0)
    expect(recortadas.every((alert) => alert.unitId === unitId)).toBe(true)
  })

  it('filtrar por grupo usa el padrón de la unidad, no la alerta', () => {
    const padron = new Map(snapshot.accounts[0]!.units.map((unit) => [unit.unitId, unit]))
    const group = padron.get(alertas[0]!.unitId)!.group
    const recortadas = alertsMatching(alertas, snapshot, filtersWith({ group }))

    expect(recortadas.length).toBeGreaterThan(0)
    expect(recortadas.every((alert) => padron.get(alert.unitId)?.group === group)).toBe(true)
  })

  it('las alertas de las unidades mudas no tienen conductor imputado', () => {
    const mudas = alertas.filter((alert) => alert.kind === 'unidad_sin_reportar')
    expect(mudas.length).toBeGreaterThan(0)
    expect(mudas.every((alert) => alert.driverId === null)).toBe(true)
  })

  it('cada alerta apunta a una unidad que existe en su propia cuenta', () => {
    const propias = new Set(fleetUnitsOf(BAJIO).map((unit) => unit.id))
    const conductores = new Set(fleetDriversOf(BAJIO).map((driver) => driver.id))

    for (const alert of alertas) {
      expect(propias.has(alert.unitId)).toBe(true)
      if (alert.driverId !== null) expect(conductores.has(alert.driverId)).toBe(true)
    }
  })
})

// ── Catálogo, cascada y reconciliación ───────────────────────────────────

describe('catálogo de opciones del alcance', () => {
  const options = buildFilterOptions([BAJIO], NOW)

  it('sale del padrón, no de la foto cargada', () => {
    expect(options.units).toHaveLength(BAJIO.fleetSize)
    expect(options.drivers).toHaveLength(fleetDriversOf(BAJIO).length)
    expect(options.groups).toHaveLength(UNIT_GROUPS.length)
  })

  it('los conductores van ordenados por nombre y avisan de la licencia vencida', () => {
    const nombres = options.drivers.map((driver) => driver.label)
    expect([...nombres].sort((a, b) => a.localeCompare(b, 'es-MX'))).toEqual(nombres)

    const vencida = options.drivers.filter((driver) => driver.licenseExpired)
    expect(vencida.length).toBeGreaterThan(0)
    expect(vencida[0]!.hint).toContain('licencia vencida')
  })

  it('con varias cuentas la etiqueta dice de cuál es cada unidad', () => {
    const multi = buildFilterOptions([BAJIO, GRANDE], NOW)
    expect(multi.accountCount).toBe(2)
    expect(multi.units[0]!.hint).toContain(BAJIO.name)
  })

  it('las opciones se encadenan con los demás filtros puestos', () => {
    const group = UNIT_GROUPS[1]!
    const acotadas = visibleUnits(options, filtersWith({ group }))

    expect(acotadas.length).toBeGreaterThan(0)
    expect(acotadas.length).toBeLessThan(options.units.length)
    expect(acotadas.every((unit) => unit.group === group)).toBe(true)
    expect(visibleDrivers(options, filtersWith({ group })).every((d) => d.group === group)).toBe(true)
  })
})

describe('la elección antigua cede ante la nueva', () => {
  const options = buildFilterOptions([BAJIO], NOW)

  it('cambiar de grupo suelta la unidad que ya no cabe', () => {
    const unidad = options.units[3]!
    const otroGrupo = UNIT_GROUPS.find((group) => group !== unidad.group)!

    const resultado = cascade(filtersWith({ unitId: unidad.value, group: otroGrupo }), options)
    expect(resultado.group).toBe(otroGrupo)
    expect(resultado.unitId).toBe(ANY)
  })

  it('«sin conductor» no cede: no pertenece a ningún grupo', () => {
    const resultado = cascade(
      filtersWith({ driverId: NO_DRIVER, group: UNIT_GROUPS[0]! }),
      options,
    )
    expect(resultado.driverId).toBe(NO_DRIVER)
  })

  it('lo que sí cabe se queda como estaba', () => {
    const unidad = options.units[5]!
    const filtros = filtersWith({ unitId: unidad.value, group: unidad.group })
    expect(cascade(filtros, options)).toEqual(filtros)
  })
})

describe('reconciliación al cambiar de alcance', () => {
  const bajio = buildFilterOptions([BAJIO], NOW)
  const grande = buildFilterOptions([GRANDE], NOW)

  it('suelta la unidad de otra cuenta y dice cuál ha soltado', () => {
    const ajena = bajio.units[0]!.value
    const { filters, dropped } = reconcile(filtersWith({ unitId: ajena }), grande)

    expect(filters.unitId).toBe(ANY)
    expect(dropped).toEqual([ajena])
  })

  it('lo que existe en el alcance nuevo sobrevive', () => {
    const propia = filtersWith({ unitId: grande.units[0]!.value, fuel: 'diesel' })
    const { filters, dropped } = reconcile(propia, grande)

    expect(filters).toEqual(propia)
    expect(dropped).toHaveLength(0)
  })

  it('«sin conductor» sobrevive a cualquier cambio de alcance', () => {
    const { filters, dropped } = reconcile(filtersWith({ driverId: NO_DRIVER }), grande)
    expect(filters.driverId).toBe(NO_DRIVER)
    expect(dropped).toHaveLength(0)
  })
})

// ── Cómo se cuenta en pantalla · criterio 5 ──────────────────────────────

describe('indicador de filtros activos', () => {
  const options = buildFilterOptions([BAJIO], NOW)

  it('sin filtros no hay nada que indicar', () => {
    expect(activeChips(DEFAULT_FILTERS, options)).toHaveLength(0)
    expect(describeFilters(DEFAULT_FILTERS, options)).toBe('toda la flota · periodo de 30 días')
  })

  it('el conductor se indica por su nombre, no por su código', () => {
    const driver = options.drivers[0]!
    const [chip] = activeChips(filtersWith({ driverId: driver.value }), options)

    expect(chip!.name).toBe('Conductor')
    expect(chip!.label).toBe(driver.label)
    expect(chip!.label).not.toBe(driver.value)
  })

  it('«sin conductor» se indica con palabras', () => {
    const [chip] = activeChips(filtersWith({ driverId: NO_DRIVER }), options)
    expect(chip!.label).toBe('Sin conductor asignado')
  })

  it('el combustible se indica con su etiqueta de negocio', () => {
    const [chip] = activeChips(filtersWith({ fuel: 'diesel' }), options)
    expect(chip!.label).toBe('Diésel')
  })

  it('el resumen enumera todas las dimensiones activas y el periodo', () => {
    const group = UNIT_GROUPS[1]!
    const resumen = describeFilters(filtersWith({ group, fuel: 'premium', periodDays: 7 }), options)

    expect(resumen).toContain(group)
    expect(resumen).toContain('Premium')
    expect(resumen).toContain('periodo de 7 días')
  })
})

// ── Persistencia · criterios 3 y 4 ───────────────────────────────────────

type FakeOptions = { failWrites?: boolean }

function fakeStorage(options: FakeOptions = {}): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => {
      if (options.failWrites) throw new Error('QuotaExceededError')
      data.set(key, value)
    },
  }
}

/** Monta un `window` de mentira con los dos almacenes que usa el módulo. */
function withStorage(
  stores: { local?: Storage; session?: Storage } | null,
  run: () => void,
): void {
  const host = globalThis as { window?: unknown }
  const previous = host.window
  host.window =
    stores === null ? {} : { localStorage: stores.local, sessionStorage: stores.session }
  try {
    run()
  } finally {
    host.window = previous
  }
}

const ADMIN_BAJIO = 'usuario:u_admin|cuenta:acc_transportes_bajio'
const ADMIN_GRANDE = 'usuario:u_admin|cuenta:acc_grupo_alimentario'

describe('los filtros persisten en la sesión activa — criterio 4', () => {
  it('lo guardado se recupera tal cual', () => {
    withStorage({ session: fakeStorage() }, () => {
      const filtros = filtersWith({ group: UNIT_GROUPS[2]!, fuel: 'diesel', periodDays: 7 })
      expect(writeFilters(ADMIN_BAJIO, filtros).ok).toBe(true)
      expect(readFilters(ADMIN_BAJIO)).toEqual({ value: filtros, error: null })
    })
  })

  it('cada propietario tiene los suyos: cambiar de cuenta no arrastra el filtro', () => {
    withStorage({ session: fakeStorage() }, () => {
      writeFilters(ADMIN_BAJIO, filtersWith({ fuel: 'diesel' }))
      writeFilters(ADMIN_GRANDE, filtersWith({ fuel: 'premium' }))

      expect(readFilters(ADMIN_BAJIO).value!.fuel).toBe('diesel')
      expect(readFilters(ADMIN_GRANDE).value!.fuel).toBe('premium')
    })
  })

  it('sin propietario no se guarda nada: no hay sesión que recordar', () => {
    withStorage({ session: fakeStorage() }, () => {
      expect(ownerKeyFor(null)).toBe('')
      expect(writeFilters('', DEFAULT_FILTERS).ok).toBe(false)
      expect(readFilters('')).toEqual({ value: null, error: null })
    })
  })

  it('un navegador que no deja guardar lo cuenta, y no rompe', () => {
    withStorage(null, () => {
      expect(readFilters(ADMIN_BAJIO).error).toContain('no conserva los filtros')
      expect(writeFilters(ADMIN_BAJIO, DEFAULT_FILTERS)).toEqual({
        ok: false,
        error: expect.stringContaining('no conserva los filtros'),
      })
    })
  })

  it('con la cuota agotada se pierde la permanencia, no la sesión de trabajo', () => {
    withStorage({ session: fakeStorage({ failWrites: true }) }, () => {
      const resultado = writeFilters(ADMIN_BAJIO, DEFAULT_FILTERS)
      expect(resultado.ok).toBe(false)
      expect(resultado.error).toContain('lleno o bloqueado')
    })
  })

  it('un contenido dañado se ignora y se avisa', () => {
    const store = fakeStorage()
    store.setItem('tc.global-filters.v1', '{ esto no es json')
    withStorage({ session: store }, () => {
      const resultado = readFilters(ADMIN_BAJIO)
      expect(resultado.value).toBeNull()
      expect(resultado.error).toContain('dañados')
    })
  })

  /**
   * El periodo dejó de ser una lista cerrada — EP-03 · US-016, criterio 4.
   *
   * Hasta aquí valían 7, 15 y 30 y cualquier otro número tiraba el filtro
   * entero. Con «periodo personalizado» eso ya no vale: lo que se valida es el
   * RANGO, y un valor fuera se acota en lugar de descartarse. Quien guardó una
   * vista de 120 días con una versión que los permitía prefiere quedarse con
   * 90 a perder también los siete filtros que llevaba puestos.
   */
  it('el periodo se acota al rango en vez de descartar el filtro entero', () => {
    expect(parseFilters({ ...DEFAULT_FILTERS, periodDays: 999 })?.periodDays).toBe(MAX_PERIOD_DAYS)
    expect(parseFilters({ ...DEFAULT_FILTERS, periodDays: 0 })?.periodDays).toBe(MIN_PERIOD_DAYS)
    // Una ventana libre del rango pasa tal cual: es lo que pide el criterio 4.
    expect(parseFilters({ ...DEFAULT_FILTERS, periodDays: 45 })?.periodDays).toBe(45)

    // Lo que sigue sin ser un filtro, sigue sin serlo.
    expect(parseFilters('nada de esto')).toBeNull()
    expect(parseFilters(null)).toBeNull()
    expect(parseFilters({ fuel: 'diesel' })).toBeNull()

    // Una dimensión ilegible cae a «todos» en vez de tirar el filtro entero.
    expect(parseFilters({ periodDays: 7, fuel: 42 })).toEqual(filtersWith({ periodDays: 7 }))
  })
})

describe('vistas guardadas — criterio 3', () => {
  const vista = (name: string, filters: GlobalFilters): SavedView => ({
    id: viewIdFor(name, NOW),
    name,
    filters,
    createdAt: NOW,
  })

  it('se guardan y se recuperan por propietario', () => {
    withStorage({ local: fakeStorage() }, () => {
      const propias = [vista('Diésel del Norte', filtersWith({ fuel: 'diesel' }))]
      expect(writeViews(ADMIN_BAJIO, propias).ok).toBe(true)
      expect(readViews(ADMIN_BAJIO).value).toEqual(propias)
      expect(readViews(ADMIN_GRANDE).value).toBeNull()
    })
  })

  it('el identificador sale del nombre, sin acentos ni espacios', () => {
    expect(viewIdFor('Diésel de Occidente', NOW)).toMatch(/^vista_[a-z0-9]+_diesel-de-occidente$/)
    // Un nombre que no deja ni una letra utilizable sigue dando un id válido.
    expect(viewIdFor('«»·', NOW)).toContain('sin-nombre')
  })

  it('no deja guardar dos vistas con el mismo nombre', () => {
    const existentes = [vista('Corredor Norte', DEFAULT_FILTERS)]
    const resultado = validateViewName('  corredor   norte ', existentes)

    expect(resultado.ok).toBe(false)
    expect(resultado.ok === false && resultado.message).toContain('Ya tienes una vista')
  })

  it('normaliza el nombre antes de aceptarlo', () => {
    const resultado = validateViewName('  Diésel   del   Norte  ', [])
    expect(resultado.ok && resultado.name).toBe('Diésel del Norte')
  })

  it('rechaza el nombre vacío y el demasiado largo', () => {
    expect(validateViewName('   ', []).ok).toBe(false)
    expect(validateViewName('x'.repeat(MAX_VIEW_NAME + 1), []).ok).toBe(false)
    expect(validateViewName('x'.repeat(MAX_VIEW_NAME), []).ok).toBe(true)
  })

  it('avisa al llegar al máximo en vez de tirar la más antigua', () => {
    const llenas = Array.from({ length: MAX_SAVED_VIEWS }, (_, index) =>
      vista(`Vista ${index}`, DEFAULT_FILTERS),
    )
    const resultado = validateViewName('Una más', llenas)

    expect(resultado.ok).toBe(false)
    expect(resultado.ok === false && resultado.message).toContain('máximo')
  })

  it('una vista dañada se descarta sin llevarse por delante las demás', () => {
    const store = fakeStorage()
    store.setItem(
      'tc.saved-views.v1',
      JSON.stringify({
        [ADMIN_BAJIO]: [
          { id: 'ok', name: 'Buena', filters: DEFAULT_FILTERS, createdAt: NOW },
          { id: 'rota', name: 'Rota', filters: { periodDays: 'ayer' }, createdAt: NOW },
          'ni siquiera es un objeto',
        ],
      }),
    )

    withStorage({ local: store }, () => {
      const recuperadas = readViews(ADMIN_BAJIO).value!
      expect(recuperadas).toHaveLength(1)
      expect(recuperadas[0]!.name).toBe('Buena')
    })
  })

  it('dos filtros son la misma vista solo si coinciden en todo', () => {
    const base = filtersWith({ group: UNIT_GROUPS[0]!, fuel: 'diesel' })
    expect(sameFilters(base, { ...base })).toBe(true)
    expect(sameFilters(base, { ...base, periodDays: 7 })).toBe(false)
    expect(sameFilters(base, { ...base, fuel: 'magna' })).toBe(false)
  })
})

// ── RBAC · reglas de negocio de la historia ──────────────────────────────
