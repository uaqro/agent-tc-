// US-020 · US-087
/**
 * Mapa de estaciones: filtros propios, panel lateral y tamaño de los puntos.
 */
import { describe, expect, it } from 'vitest'
import { DAYS as DATASET_DAYS, loads, stationsById as byId } from './fixture'
import {
  MIN_MARKER_RADIUS,
  MAX_MARKER_RADIUS,
  PANEL_MAX_ROWS,
  computeOptimizerKpis,
  directionsUrl,
  mapFilterCounts,
  markerRadius,
  matchesMapFilter,
  stationPanelLoads,
  stationStats,
} from '../metrics'
import { DEFAULT_ASSUMPTIONS, isRedirectable } from '../rules'

const stats = stationStats(loads, byId, DEFAULT_ASSUMPTIONS)

describe('filtros del mapa', () => {
  it('cada botón lleva su conteo y «todas» es el total', () => {
    const counts = mapFilterCounts(stats)
    expect(counts.todas).toBe(stats.length)
    expect(counts.oportunidad + counts.mixtas + counts.optimas).toBe(stats.length)
    expect(counts.con_cv).toBe(stats.filter((s) => s.station.cv).length)
    expect(counts.redirigen_cv).toBeGreaterThan(0)
  })

  it('el filtro del mapa no cambia los indicadores', () => {
    const before = computeOptimizerKpis(loads, DEFAULT_ASSUMPTIONS, 'bruto', DATASET_DAYS)
    const visible = stats.filter((s) => matchesMapFilter(s, 'optimas'))
    expect(visible.length).toBeLessThan(stats.length)
    // Los KPIs se calculan sobre las cargas del recorte, no sobre los puntos visibles.
    const after = computeOptimizerKpis(loads, DEFAULT_ASSUMPTIONS, 'bruto', DATASET_DAYS)
    expect(after).toEqual(before)
  })
})

describe('ranking por defecto — US-087', () => {
  it('ordena por ahorro redirigible de mayor a menor', () => {
    for (let i = 1; i < stats.length; i++) expect(stats[i - 1]!.grossSaving).toBeGreaterThanOrEqual(stats[i]!.grossSaving)
  })
})

describe('panel lateral', () => {
  const busiest = [...stats].sort((a, b) => b.loads - a.loads)[0]!

  it('filtra redirigibles y sin ahorro, y las dos partes suman todas', () => {
    const id = busiest.station.id
    const all = stationPanelLoads(loads, id, 'todas', 'fecha').total
    const red = stationPanelLoads(loads, id, 'redirigibles', 'fecha')
    const none = stationPanelLoads(loads, id, 'sin_ahorro', 'fecha')
    expect(red.total + none.total).toBe(all)
    expect(red.rows.every(isRedirectable)).toBe(true)
    expect(none.rows.some(isRedirectable)).toBe(false)
  })

  it('ordena por ahorro o por fecha y no pasa de 250 filas', () => {
    const many = [...loads.slice(0, 400)].map((l) => ({ ...l, stationId: 'X' }))
    const byAhorro = stationPanelLoads(many, 'X', 'todas', 'ahorro')
    expect(byAhorro.rows).toHaveLength(PANEL_MAX_ROWS)
    expect(byAhorro.total).toBe(400)
    expect(byAhorro.rows[0]!.savingCents).toBeGreaterThanOrEqual(byAhorro.rows[1]!.savingCents)
    const byFecha = stationPanelLoads(many, 'X', 'todas', 'fecha')
    expect(byFecha.rows[0]!.at).toBeGreaterThanOrEqual(byFecha.rows[1]!.at)
  })

  it('«Cómo llegar» solo lleva coordenadas de origen y destino', () => {
    const url = directionsUrl({ lat: 25.1, lng: -100.2 }, { lat: 25.3, lng: -100.4 })
    expect(url).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=25.1%2C-100.2&destination=25.3%2C-100.4&travelmode=driving',
    )
  })
})

describe('tamaño de los puntos', () => {
  it('normaliza al percentil 95, con un mínimo que se puede pulsar', () => {
    expect(markerRadius(0, 1000)).toBe(MIN_MARKER_RADIUS)
    expect(markerRadius(1000, 1000)).toBe(MAX_MARKER_RADIUS)
    // Por encima del p95 no crece más: dos estaciones enormes no aplastan al resto.
    expect(markerRadius(50_000, 1000)).toBe(MAX_MARKER_RADIUS)
    expect(markerRadius(500, null)).toBe(MIN_MARKER_RADIUS)
  })
})
