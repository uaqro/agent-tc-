// US-024
/**
 * Reporte consolidado bajo demanda: formatos, alcance, documento y exportes.
 */
import { describe, expect, it } from 'vitest'
import viewSource from '../../../components/reports/ConsolidatedReportPanel.tsx?raw'
import { ACCOUNTS } from '../../data/accounts'
import { COST_CENTER_IDS } from '../../datasource/active'
import type { ReportPrincipal } from '../build'

/**
 * Principal del portal — ADR-TCP-001. En eOne los tests usaban roles de ADR-001 y un Admin Edenred cruzaba
 * cuentas; en Ticket Car+ la analítica siempre se queda en la cuenta activa, así que el rol ya no cambia la
 * cuenta: la decide `activeAccountId` y, sin ella, la cuenta cliente del portal.
 */
const principalFor = (_role: string, account: { activeAccountId?: string; homeAccountId?: string } = {}): ReportPrincipal => ({
  name: 'Usuario de prueba',
  accountId: account.activeAccountId ?? 'acc_grupo_alimentario',
  scopeNodeId: null,
})
import {
  REPORT_TYPES,
  TEMPLATE_NOTICE,
  buildConsolidatedReport,
  publishedRows,
  reportableAccounts,
  type ConsolidatedReport,
} from '../build'
import { escapeHtml, renderReportHtml } from '../document'
import { XLSX_SHEETS, crc32, csvCell, reportToCsv, reportToXlsx } from '../export'
import { expandCostCenter, fromAutoconsumo, fromTicketCar, parseCommaDecimal } from '../normalize'
import { sourcesOf } from '../sources'

const GAN = 'acc_grupo_alimentario'
const BAJIO = 'acc_transportes_bajio'
const NOW = new Date(2026, 9, 14, 12, 0).getTime()

function report(type: 'ejecutivo' | 'operativo' | 'conductores' = 'ejecutivo'): ConsolidatedReport {
  const result = buildConsolidatedReport(
    { type, period: 'sep-2026', scope: { accountId: GAN, kind: 'cuenta', value: null } },
    principalFor('admin_edenred'),
    NOW,
  )
  if ('error' in result) throw new Error(result.error)
  return result
}

describe('las diferencias de formato se resuelven en la capa de datos', () => {
  it('Autoconsumo: fecha DD/MM/AAAA, decimales con coma, código corto de centro de costo', () => {
    const d = fromAutoconsumo(
      {
        folio: 'AC-1',
        fecha: '15/09/2026',
        hora: '07:42',
        economico: 'ABC-123',
        numEmpleado: '',
        producto: 'DIESEL',
        litros: '123,40',
        importe: '3.120,50',
        centroCosto: 'CC-01',
        planta: 'AUTO-MTY',
      },
      COST_CENTER_IDS,
    )
    expect(d.source).toBe('autoconsumo')
    expect(d.liters).toBeCloseTo(123.4, 10)
    expect(d.amountMxn).toBeCloseTo(3120.5, 10)
    expect(d.fuel).toBe('diesel')
    expect(d.driverId).toBeNull()
    expect(d.costCenter).toBe(COST_CENTER_IDS[0])
    expect(new Date(d.at).getDate()).toBe(15)
  })

  it('TicketCar+: ISO con zona, mililitros y centavos, combustible de una letra', () => {
    const d = fromTicketCar({
      txnId: 'TCP-1',
      timestamp: '2026-09-15T07:42:00-06:00',
      vehicle: { plate: 'ABC-123' },
      driverId: 'DRV-1',
      fuelCode: 'M',
      volumeMl: 45_250,
      amountCents: 108_150,
      costCenter: COST_CENTER_IDS[1]!,
    })
    expect(d.liters).toBeCloseTo(45.25, 10)
    expect(d.amountMxn).toBeCloseTo(1081.5, 10)
    expect(d.fuel).toBe('magna')
    // Hora local de la estación: cae el mismo día de calendario que Autoconsumo.
    expect(new Date(d.at).getDate()).toBe(15)
    expect(new Date(d.at).getHours()).toBe(7)
  })

  it('utilidades de formato', () => {
    expect(parseCommaDecimal('1.234,5')).toBeCloseTo(1234.5, 10)
    expect(parseCommaDecimal('12.5')).toBeCloseTo(12.5, 10)
    expect(parseCommaDecimal('basura')).toBe(0)
    expect(expandCostCenter('CC-03', COST_CENTER_IDS)).toBe(COST_CENTER_IDS[2])
  })

  it('las dos fuentes traen datos y el consolidado suma las dos', () => {
    const account = ACCOUNTS.find((a) => a.id === GAN)!
    const sources = sourcesOf(account)
    expect(sources.autoconsumo.length).toBeGreaterThan(0)
    expect(sources.ticketcar.length).toBeGreaterThan(0)
    const r = report()
    expect(r.kpis.bySource.autoconsumo.dispatches).toBeGreaterThan(0)
    expect(r.kpis.bySource.ticketcar_plus.dispatches).toBeGreaterThan(0)
    expect(r.kpis.bySource.autoconsumo.liters + r.kpis.bySource.ticketcar_plus.liters).toBeCloseTo(r.kpis.liters, 6)
  })
})

describe('alcance: RBAC y aislamiento de tenant', () => {
  it('en el portal no se elige cuenta: solo la activa, también para los internos (ADR-TCP-001)', () => {
    expect(reportableAccounts(principalFor('admin_edenred')).map((a) => a.id)).toEqual([GAN])
    // Una cuenta dada de baja no genera reporte aunque sea la de la sesión.
    expect(reportableAccounts(principalFor('admin_cuenta', { activeAccountId: 'acc_farmaceutica_azteca' }))).toEqual([])
  })

  it('un Admin de Cuenta solo tiene su cuenta, y pedir otra devuelve error', () => {
    const admin = principalFor('admin_cuenta', { homeAccountId: GAN, activeAccountId: GAN })
    expect(reportableAccounts(admin).map((a) => a.id)).toEqual([GAN])
    const ajena = buildConsolidatedReport(
      { type: 'ejecutivo', period: 'sep-2026', scope: { accountId: BAJIO, kind: 'cuenta', value: null } },
      admin,
      NOW,
    )
    expect('error' in ajena).toBe(true)
  })

  it('acotar por centro de costo deja solo ese centro de costo', () => {
    const cc = COST_CENTER_IDS[0]!
    const r = buildConsolidatedReport(
      { type: 'operativo', period: 'sep-2026', scope: { accountId: GAN, kind: 'centro_costo', value: cc } },
      principalFor('admin_edenred'),
      NOW,
    )
    if ('error' in r) throw new Error(r.error)
    const all = report()
    expect(r.kpis.dispatches).toBeGreaterThan(0)
    expect(r.kpis.dispatches).toBeLessThan(all.kpis.dispatches)
    expect(r.byUnit.every((row) => row.label.includes(cc))).toBe(true)
  })

  it('un alcance sin valor no se genera', () => {
    const r = buildConsolidatedReport(
      { type: 'ejecutivo', period: 'sep-2026', scope: { accountId: GAN, kind: 'unidad', value: null } },
      principalFor('admin_edenred'),
      NOW,
    )
    expect('error' in r).toBe(true)
  })
})

describe('documento y exportes', () => {
  it('hay tres tipos genéricos, rotulados como provisionales', () => {
    expect(REPORT_TYPES).toHaveLength(3)
    expect(renderReportHtml(report())).toContain(TEMPLATE_NOTICE)
  })

  it('el documento lleva portada, índice, KPIs y desglose por unidad y por conductor, sin scripts', () => {
    const html = renderReportHtml(report())
    for (const part of ['class="cover"', 'id="indice"', 'id="kpis"', 'id="unidades"', 'id="conductores"']) {
      expect(html).toContain(part)
    }
    expect(html).not.toMatch(/<script/i)
  })

  it('el tipo decide cuántas filas se publican', () => {
    expect(publishedRows(report('ejecutivo')).units.length).toBeLessThanOrEqual(15)
    expect(publishedRows(report('operativo')).units.length).toBe(report('operativo').byUnit.length)
  })

  it('el texto de los datos se escapa', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('CSV con BOM, tres bloques y celdas entrecomilladas cuando hace falta', () => {
    const csv = reportToCsv(report())
    expect(csv.startsWith('﻿Resumen')).toBe(true)
    expect(csv).toContain('Por unidad')
    expect(csv).toContain('Por conductor')
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('di "hola"')).toBe('"di ""hola"""')
  })

  it('XLSX: un ZIP válido con las tres hojas', () => {
    const bytes = reportToXlsx(report())
    expect(bytes[0]).toBe(0x50) // P
    expect(bytes[1]).toBe(0x4b) // K
    const text = new TextDecoder().decode(bytes)
    expect(text).toContain('[Content_Types].xml')
    expect(text).toContain('xl/workbook.xml')
    for (let i = 1; i <= XLSX_SHEETS.length; i++) expect(text).toContain(`xl/worksheets/sheet${i}.xml`)
    // CRC32 de referencia: «123456789» → CBF43926.
    expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926')
  })

  it('el SLA no está codificado como constante de negocio: queda un TODO SLA visible', () => {
    expect(viewSource).toContain('TODO SLA')
    expect(viewSource).not.toMatch(/SLA_(MS|SECONDS|LIMIT)/)
  })
})
