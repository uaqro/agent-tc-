// US-018 · US-020 · US-086 · US-087 · US-111 · US-112 · US-113
/**
 * Reglas comunes del optimizador, filtros facetados y cargas del padrón
 * (Ticket Car+: ya no hay dataset propio, ver `fixture.ts`).
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ASSUMPTIONS,
  detourCost,
  grossSaving,
  isRedirectable,
  netSaving,
  notRedirectableReason,
  sanitizeAssumptions,
  tripsOf,
} from '../rules'
import { maskCard } from '../masking'
import { SEARCH_RADIUS_M, STATION_ACCOUNT_ID, roadDistanceM } from '../../stations/directory'
import { DAYS, loads as padronLoads, stationsById as padronStations } from './fixture'
import {
  DEFAULT_OPTIMIZER_FILTERS,
  applyOptimizerFilters,
  clearOptimizerDimensions,
  facetCounts,
  optimizerChips,
  parseOptimizerFilters,
  periodDays,
  type OptimizerFilters,
} from '../filters'
import {
  computeOptimizerKpis,
  cvSummary,
  cvTransition,
  dailySeries,
  distanceBands,
  farForTinyLoads,
  median,
  stationCategory,
  stationStats,
} from '../metrics'
import type { Load } from '../types'

function load(overrides: Partial<Load> = {}): Load {
  return {
    id: 'CRG-T',
    day: 1,
    at: 0,
    cardId: 'TAR-ECO-3001',
    cardLast4: '4321',
    vehicleType: 'mediano',
    fuel: 'diesel',
    product: 'ticketcar_plus',
    zone: 'monterrey',
    division: 'División Noreste',
    costCenter: 'CC-01 · Reparto urbano',
    unitId: 'ECO-3001',
    driverId: 'OP-3001',
    orgPath: [],
    liters: 100,
    amountMxn: 2400,
    refund: false,
    stationId: 'A',
    pricePaid: 24,
    recommendedStationId: 'B',
    priceRecommended: 23.5,
    detourM: 3000,
    offRoute: true,
    savingCents: 5000,
    optimal: false,
    ...overrides,
  }
}

describe('regla de redirigible: !opt && ahorroCentavos > 1', () => {
  it('una carga no óptima con más de un centavo de ahorro es redirigible', () => {
    expect(isRedirectable({ optimal: false, savingCents: 2 })).toBe(true)
  })

  it('un centavo exacto NO supera el umbral', () => {
    expect(isRedirectable({ optimal: false, savingCents: 1 })).toBe(false)
    expect(isRedirectable({ optimal: false, savingCents: 0 })).toBe(false)
  })

  it('si el motor la marca óptima, no es redirigible aunque traiga ahorro', () => {
    expect(isRedirectable({ optimal: true, savingCents: 9999 })).toBe(false)
  })

  it('explica el motivo cuando no es redirigible', () => {
    expect(notRedirectableReason({ optimal: true, savingCents: 0 })).toBe('mas_barata')
    expect(notRedirectableReason({ optimal: false, savingCents: 1 })).toBe('desvio_no_paga')
    expect(notRedirectableReason({ optimal: false, savingCents: 500 })).toBeNull()
  })
})

describe('coste del desvío y ahorro neto', () => {
  it('por defecto: 6 km/L, ida y vuelta', () => {
    expect(DEFAULT_ASSUMPTIONS).toEqual({ kmPerLiter: 6, roundTrip: true })
    expect(tripsOf(DEFAULT_ASSUMPTIONS)).toBe(2)
    expect(tripsOf({ kmPerLiter: 6, roundTrip: false })).toBe(1)
  })

  it('coste = km × trayectos ÷ km/L × $/L pagado', () => {
    // 3 km × 2 ÷ 6 km/L × 24 $/L = 24 $
    expect(detourCost(3000, 24, DEFAULT_ASSUMPTIONS)).toBeCloseTo(24, 10)
    // Solo ida: la mitad.
    expect(detourCost(3000, 24, { kmPerLiter: 6, roundTrip: false })).toBeCloseTo(12, 10)
    // Mejor rendimiento, menos coste: 3 × 2 ÷ 12 × 24 = 12.
    expect(detourCost(3000, 24, { kmPerLiter: 12, roundTrip: true })).toBeCloseTo(12, 10)
  })

  it('neto = bruto − coste del desvío, y puede ser una pérdida', () => {
    const l = load({ savingCents: 5000, detourM: 3000, pricePaid: 24 })
    expect(grossSaving(l)).toBe(50)
    expect(netSaving(l, DEFAULT_ASSUMPTIONS)).toBeCloseTo(50 - 24, 10)

    const lejos = load({ savingCents: 80, detourM: 4000, pricePaid: 24 })
    expect(netSaving(lejos, DEFAULT_ASSUMPTIONS)).toBeLessThan(0)
  })

  it('una carga no redirigible no tiene ni bruto ni desvío que pagar', () => {
    const optima = load({ optimal: true })
    expect(grossSaving(optima)).toBe(0)
    expect(netSaving(optima, DEFAULT_ASSUMPTIONS)).toBe(0)
  })

  it('los supuestos que llegan de un campo se acotan', () => {
    expect(sanitizeAssumptions({ kmPerLiter: 0 }).kmPerLiter).toBe(1)
    expect(sanitizeAssumptions({ kmPerLiter: Number.NaN }).kmPerLiter).toBe(6)
    expect(sanitizeAssumptions({ kmPerLiter: 8, roundTrip: false })).toEqual({ kmPerLiter: 8, roundTrip: false })
  })
})

describe('ahorro por litro: ponderado frente a simple', () => {
  const loads = [
    load({ id: '1', liters: 100, savingCents: 1000 }), // 0.10 $/L
    load({ id: '2', liters: 20, savingCents: 1000 }), // 0.50 $/L
  ]
  const kpis = computeOptimizerKpis(loads, DEFAULT_ASSUMPTIONS, 'bruto', 30)

  it('el ponderado es ahorro total ÷ litros y cuadra con el total', () => {
    expect(kpis.savingPerLiterWeighted).toBeCloseTo(20 / 120, 10)
    expect(kpis.savingPerLiterWeighted! * kpis.redirectableLiters).toBeCloseTo(kpis.saving, 10)
  })

  it('el simple es el promedio carga a carga y NO cuadra con el total', () => {
    expect(kpis.savingPerLiterSimple).toBeCloseTo((0.1 + 0.5) / 2, 10)
    expect(kpis.savingPerLiterSimple).not.toBeCloseTo(kpis.savingPerLiterWeighted!, 3)
  })

  it('la proyección mensual es ahorro × 30 ÷ días del recorte', () => {
    const quince = computeOptimizerKpis(loads, DEFAULT_ASSUMPTIONS, 'bruto', 15)
    expect(quince.monthlyProjection).toBeCloseTo(20 * 2, 10)
  })

  it('la variación de precio compara recomendado con pagado', () => {
    // 23.5 frente a 24 → −2.08 %
    expect(kpis.priceVariation).toBeCloseTo((23.5 - 24) / 24, 10)
  })
})

describe('conteos facetados — US-111', () => {
  const loads = [
    load({ id: '1', fuel: 'diesel', zone: 'monterrey' }),
    load({ id: '2', fuel: 'diesel', zone: 'saltillo' }),
    load({ id: '3', fuel: 'magna', zone: 'monterrey' }),
    load({ id: '4', fuel: 'premium', zone: 'saltillo', day: 20 }),
  ]

  it('cada lista cuenta con los demás filtros aplicados e ignorando el suyo', () => {
    const filters: OptimizerFilters = { ...DEFAULT_OPTIMIZER_FILTERS, fuel: ['diesel'], zone: ['monterrey'] }
    // Combustible ignora su propio filtro: solo cuenta la zona Monterrey.
    const fuel = facetCounts(loads, filters, 'fuel', ['diesel', 'magna', 'premium'])
    expect(fuel).toEqual([
      { value: 'diesel', count: 1 },
      { value: 'magna', count: 1 },
      { value: 'premium', count: 0 },
    ])
    // Zona ignora la suya: solo cuenta diésel.
    const zone = facetCounts(loads, filters, 'zone', ['monterrey', 'saltillo', 'culiacan'])
    expect(zone).toEqual([
      { value: 'monterrey', count: 1 },
      { value: 'saltillo', count: 1 },
      { value: 'culiacan', count: 0 },
    ])
  })

  it('los valores sin datos van al final', () => {
    const filters = { ...DEFAULT_OPTIMIZER_FILTERS, zone: ['saltillo'] }
    const fuel = facetCounts(loads, filters, 'fuel', ['magna', 'diesel', 'premium'])
    expect(fuel.map((f) => f.value)).toEqual(['diesel', 'premium', 'magna'])
    expect(fuel[2]!.count).toBe(0)
  })

  it('el periodo se aplica siempre, también en los conteos', () => {
    const filters = { ...DEFAULT_OPTIMIZER_FILTERS, fromDay: 20, toDay: 20 }
    const fuel = facetCounts(loads, filters, 'fuel', ['diesel', 'magna', 'premium'])
    expect(fuel[0]).toEqual({ value: 'premium', count: 1 })
  })

  it('chips por valor y «Limpiar todo» conserva el periodo', () => {
    const filters = { ...DEFAULT_OPTIMIZER_FILTERS, fromDay: 3, toDay: 9, fuel: ['diesel', 'magna'] }
    expect(optimizerChips(filters, (_, v) => v)).toHaveLength(2)
    const clean = clearOptimizerDimensions(filters)
    expect(clean.fuel).toEqual([])
    expect([clean.fromDay, clean.toDay]).toEqual([3, 9])
    expect(periodDays(clean)).toBe(7)
  })

  it('lo leído del almacén se valida', () => {
    expect(parseOptimizerFilters({ fromDay: 9, toDay: 3, fuel: ['diesel'] })).toMatchObject({
      fromDay: 3,
      toDay: 9,
      fuel: ['diesel'],
    })
    expect(parseOptimizerFilters({ fromDay: 1, toDay: 2, fuel: 'diesel' })).toBeNull()
    expect(parseOptimizerFilters('basura')).toBeNull()
  })
})

describe('enmascarado de tarjeta', () => {
  it('solo deja los cuatro últimos dígitos', () => {
    expect(maskCard('1234')).toBe('•••• 1234')
    // Aunque llegara un número largo por error, solo salen cuatro.
    expect(maskCard('4000 0000 0000 9876')).toBe('•••• 9876')
  })

  it('las cargas no llevan más que cuatro dígitos de la tarjeta', () => {
    for (const l of padronLoads.slice(0, 500)) {
      expect(l.cardLast4).toMatch(/^\d{4}$/)
      expect(l.cardId).toMatch(/^TAR-ECO-\d{4}$/)
    }
    // Patrón del escaneo del build: 15–16 dígitos seguidos. Las marcas de tiempo en ms tienen 13.
    expect(JSON.stringify(padronLoads)).not.toMatch(/\d{15,}/)
  })

  it('cuatro dígitos distintos por tarjeta: el enmascarado no confunde dos tarjetas', () => {
    const byCard = new Map<string, string>()
    for (const l of padronLoads) byCard.set(l.cardId, l.cardLast4)
    expect(new Set(byCard.values()).size).toBe(byCard.size)
  })

  it('la tarjeta es la de la unidad que cargó', () => {
    for (const l of padronLoads.slice(0, 200)) expect(l.cardId).toBe(`TAR-${l.unitId}`)
  })
})

describe('cargas del padrón: los casos que la demo tiene que poder enseñar', () => {
  const loads = padronLoads
  const stationsById = padronStations
  const kpis = computeOptimizerKpis(loads, DEFAULT_ASSUMPTIONS, 'neto', DAYS)

  it('vive en la cuenta ficticia Grupo Alimentario Norte', () => {
    expect(STATION_ACCOUNT_ID).toBe('acc_grupo_alimentario')
  })

  it('el neto descuenta el desvío: queda por debajo del bruto', () => {
    expect(kpis.grossSaving).toBeGreaterThan(0)
    expect(kpis.netSaving).toBeLessThan(kpis.grossSaving)
    expect(kpis.detourCost).toBeCloseTo(kpis.grossSaving - kpis.netSaving, 6)
  })

  it('hay cargas con más de 3 km de desvío para ahorrar menos de $1', () => {
    expect(farForTinyLoads(loads).length).toBeGreaterThan(0)
  })

  it('hay estaciones 100 % óptimas, mixtas y con mucha oportunidad', () => {
    const categories = stationStats(loads, stationsById, DEFAULT_ASSUMPTIONS).map(stationCategory)
    expect(categories.filter((c) => c === 'optima').length).toBeGreaterThanOrEqual(5)
    expect(categories.filter((c) => c === 'mixta').length).toBeGreaterThanOrEqual(5)
    expect(categories.filter((c) => c === 'oportunidad').length).toBeGreaterThanOrEqual(5)
  })

  it('la serie diaria tiene un punto por día del recorte, haya cargas o no', () => {
    const from = Math.min(...loads.map((l) => l.day))
    const series = dailySeries(loads, from, from + DAYS - 1, DEFAULT_ASSUMPTIONS, 'bruto')
    expect(series).toHaveLength(DAYS)
    expect(series.reduce((sum, point) => sum + point.cargas, 0)).toBe(loads.length)
  })

  it('hay redirecciones que pierden el control volumétrico', () => {
    const cv = cvSummary(loads, stationsById, DEFAULT_ASSUMPTIONS, 'bruto')
    expect(cv.matrix.pierde.loads).toBeGreaterThan(0)
    expect(cv.losing.length).toBe(cv.matrix.pierde.loads)
  })

  it('el motor no propone destinos fuera de 5 km, ni a la misma estación, ni plantas propias', () => {
    for (const l of loads) {
      if (l.recommendedStationId === null) continue
      // El radio es entre estaciones; el desvío (`detourM`) es lo que la unidad se aparta de su ruta.
      const from = stationsById.get(l.stationId)!
      const to = stationsById.get(l.recommendedStationId)!
      expect(roadDistanceM(from, to)).toBeLessThanOrEqual(SEARCH_RADIUS_M)
      if (!l.offRoute) expect(l.detourM).toBe(0)
      expect(l.recommendedStationId).not.toBe(l.stationId)
      expect(l.priceRecommended!).toBeLessThan(l.pricePaid)
      expect(stationsById.get(l.recommendedStationId)!.own).not.toBe(true)
    }
  })

  it('Autoconsumo carga en planta propia y no se redirige; los abonos tampoco', () => {
    const own = loads.filter((l) => l.product === 'autoconsumo' || l.refund)
    expect(own.length).toBeGreaterThan(0)
    expect(own.every((l) => !isRedirectable(l))).toBe(true)
    expect(loads.filter((l) => l.product === 'autoconsumo').every((l) => stationsById.get(l.stationId)!.own)).toBe(true)
  })

  it('las divisiones son las de la ruta de cada unidad, y «Servicios» no tiene cargas', () => {
    for (const l of loads.slice(0, 500)) expect(l.division).toBe(l.orgPath[1] ?? 'org:acc_grupo_alimentario:sin-asignar')
    expect(loads.some((l) => l.division.endsWith('division-servicios'))).toBe(false)
  })

  it('el gasto es la suma de los importes del padrón, y los abonos no cuentan como cargas', () => {
    expect(kpis.spend).toBeCloseTo(loads.reduce((sum, l) => sum + l.amountMxn, 0), 6)
    expect(kpis.loads).toBe(loads.filter((l) => !l.refund).length)
  })

  it('el recorte filtrado sigue cuadrando: la suma de las bandas es el ahorro del modo', () => {
    const recorte = applyOptimizerFilters(loads, { ...DEFAULT_OPTIMIZER_FILTERS, zone: ['monterrey'] })
    const k = computeOptimizerKpis(recorte, DEFAULT_ASSUMPTIONS, 'neto', DAYS)
    const bands = distanceBands(recorte, DEFAULT_ASSUMPTIONS, 'neto')
    expect(bands.reduce((sum, b) => sum + b.saving, 0)).toBeCloseTo(k.saving, 6)
    expect(bands.reduce((sum, b) => sum + b.loads, 0)).toBe(k.redirectableLoads)
  })
})

describe('utilidades', () => {
  it('mediana par e impar', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(median([])).toBeNull()
  })

  it('matriz de CV: mantiene, pierde, gana y sigue igual', () => {
    expect(cvTransition(true, true)).toBe('mantiene')
    expect(cvTransition(true, false)).toBe('pierde')
    expect(cvTransition(false, true)).toBe('gana')
    expect(cvTransition(false, false)).toBe('sigue_igual')
  })
})
