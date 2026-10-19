// US-024 · US-013
/**
 * Cierre de los gaps de US-024: periodo libre, doce meses con un hueco de
 * fuente, alcance por nodo del organigrama y PDF de descarga directa.
 */
import { describe, expect, it } from 'vitest'
import { jsPDF } from 'jspdf'
import { ACCOUNTS } from '../../data/accounts'
import { fleetUnitsOf } from '../../datasource/active'
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
import { baseOrgTreeOf, withUnassigned } from '../../org/structure'
import { childrenOf, rootNodeId, unitPathOf, type OrgTree } from '../../org/types'
import { buildConsolidatedReport, resolvePeriod, scopeOptions, type ConsolidatedReport, type ReportRequest } from '../build'
import { MIN_GAP_DAYS } from '../coverage'
import { renderReportHtml } from '../document'
import { fileBaseName, reportToCsv } from '../export'
import { PDF_SECTIONS, pdfText, renderPdf, reportToPdf } from '../pdf'
import { SOURCE_GAPS, sourcesOf } from '../sources'

const GAN = 'acc_grupo_alimentario'
const BAJIO = 'acc_transportes_bajio'
const NOW = new Date(2026, 9, 15, 12, 0).getTime()
const admin = principalFor('admin_edenred')
const account = (id: string) => ACCOUNTS.find((a) => a.id === id)!
// Como el de la sesión (useOrgStructure): con «Sin asignar» si queda alguna unidad suelta.
const tree = (id: string): OrgTree => withUnassigned(baseOrgTreeOf(account(id)), fleetUnitsOf(account(id)).map((u) => u.id))

function build(period: ReportRequest['period'], scope: Partial<ReportRequest['scope']> = {}, orgTree?: OrgTree) {
  return buildConsolidatedReport(
    { type: 'operativo', period, scope: { accountId: GAN, kind: 'cuenta', value: null, ...scope } },
    admin,
    NOW,
    { orgTree },
  )
}

function ok(result: ConsolidatedReport | { error: string }): ConsolidatedReport {
  if ('error' in result) throw new Error(result.error)
  return result
}

const fnv = (text: string) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0).toString(16)
}

describe('US-024 b · doce meses de Autoconsumo y TicketCar+', () => {
  it('julio–septiembre de 2026 no cambia: mismos registros, byte a byte', () => {
    // Huella tomada ANTES de añadir el histórico (rama main, 15-oct-2026).
    const before: Record<string, [number, number, string, string]> = {
      acc_transportes_bajio: [4085, 6248, '3b2672f1', 'af50a543'],
      acc_logistica_peninsular: [2301, 3400, 'a6eb76b9', '4010b13a'],
      acc_grupo_alimentario: [6235, 9270, 'ee2b30b2', 'a5a0ebd4'],
      acc_distribuidora_centro: [1142, 1803, 'c5e0d804', 'bdfc7d6a'],
    }
    for (const [id, [acN, tcN, acHash, tcHash]] of Object.entries(before)) {
      const s = sourcesOf(account(id))
      const ac = s.autoconsumo.filter((r) => /\/(07|08|09)\/2026$/.test(r.fecha))
      const tc = s.ticketcar.filter((t) => /^2026-(07|08|09)-/.test(t.timestamp))
      expect([ac.length, tc.length, fnv(JSON.stringify(ac)), fnv(JSON.stringify(tc))]).toEqual([acN, tcN, acHash, tcHash])
    }
  })

  it('cada uno de los doce meses trae datos de las dos fuentes, salvo el hueco de TicketCar+ en febrero', () => {
    const s = sourcesOf(account(GAN))
    for (let i = 0; i < 12; i++) {
      const date = new Date(2025, 9 + i, 1)
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const yyyy = date.getFullYear()
      const ac = s.autoconsumo.filter((r) => r.fecha.endsWith(`/${mm}/${yyyy}`)).length
      const tc = s.ticketcar.filter((t) => t.timestamp.startsWith(`${yyyy}-${mm}-`)).length
      expect(ac, `Autoconsumo ${mm}/${yyyy}`).toBeGreaterThan(0)
      if (yyyy === 2026 && mm === '02') expect(tc).toBe(0)
      else expect(tc, `TicketCar+ ${mm}/${yyyy}`).toBeGreaterThan(0)
    }
    expect(SOURCE_GAPS).toEqual([{ source: 'ticketcar_plus', from: '2026-02-01', to: '2026-02-28' }])
  })

  it('estacionalidad: diciembre carga más que enero, los dos de 31 días', () => {
    const dec = ok(build('dic-2025')).kpis.bySource.autoconsumo.dispatches
    const jan = ok(build('ene-2026')).kpis.bySource.autoconsumo.dispatches
    expect(dec).toBeGreaterThan(jan * 1.15)
  })

  it('los folios del histórico no chocan con los del tramo original', () => {
    const s = sourcesOf(account(GAN))
    expect(new Set(s.autoconsumo.map((r) => r.folio)).size).toBe(s.autoconsumo.length)
    expect(new Set(s.ticketcar.map((t) => t.txnId)).size).toBe(s.ticketcar.length)
  })
})

describe('US-024 b · el reporte señala el hueco de una fuente', () => {
  it('febrero de 2026: aviso de TicketCar+ con las fechas, detectado en los datos', () => {
    const r = ok(build('feb-2026'))
    expect(r.kpis.bySource.ticketcar_plus.dispatches).toBe(0)
    expect(r.coverage).toHaveLength(1)
    expect(r.coverage[0]).toMatchObject({ kind: 'hueco_de_fuente', source: 'ticketcar_plus', from: '2026-02-01', to: '2026-02-28' })
    expect(r.coverage[0]!.message).toBe('TicketCar+ no entregó datos del 1 al 28 de febrero de 2026: esas cargas no están en el reporte.')
  })

  it('el aviso viaja en el documento, en el CSV y en el PDF', () => {
    const r = ok(build('t1-2026'))
    expect(renderReportHtml(r)).toContain('Datos incompletos en el periodo')
    expect(reportToCsv(r)).toContain('Datos incompletos')
    expect(renderPdf(r, jsPDF, { compress: false }).output()).toContain('Datos incompletos en el periodo')
  })

  it('un periodo completo no lleva avisos', () => {
    expect(ok(build('sep-2026')).coverage).toEqual([])
    expect(ok(build('t4-2025')).coverage).toEqual([])
  })

  it(`un rango que solo roza el hueco lo recorta a sus días (umbral: ${MIN_GAP_DAYS} días seguidos)`, () => {
    const r = ok(build({ from: '2026-02-25', to: '2026-03-10' }))
    expect(r.coverage.map((w) => [w.from, w.to])).toEqual([['2026-02-25', '2026-02-28']])
  })
})

describe('US-024 a · periodo libre con atajos', () => {
  it('un rango cualquiera: etiqueta legible y solo despachos dentro', () => {
    const r = ok(build({ from: '2026-03-05', to: '2026-04-12' }))
    expect(r.periodLabel).toBe('Del 5 de marzo al 12 de abril de 2026')
    const year = ok(build('12-meses'))
    expect(r.kpis.dispatches).toBeGreaterThan(0)
    expect(r.kpis.dispatches).toBeLessThan(year.kpis.dispatches)
    expect(fileBaseName(r)).toMatch(/-2026-03-05-a-2026-04-12$/)
  })

  it('el rango que coincide con un atajo se llama como el atajo', () => {
    expect(ok(build({ from: '2026-07-01', to: '2026-09-30' })).periodLabel).toBe('Tercer trimestre 2026')
    expect(ok(build({ from: '2025-10-01', to: '2026-09-30' })).periodLabel).toBe('Últimos 12 meses')
  })

  it('los doce meses suman lo mismo que sus cuatro trimestres', () => {
    const year = ok(build('12-meses')).kpis.dispatches
    const quarters = ['t4-2025', 't1-2026', 't2-2026', 't3-2026'].map((q) => ok(build(q)).kpis.dispatches)
    expect(quarters.reduce((a, b) => a + b, 0)).toBe(year)
  })

  it('rangos inválidos o sin datos no se generan', () => {
    expect('error' in resolvePeriod({ from: '2026-05-10', to: '2026-05-01' })).toBe(true)
    expect('error' in resolvePeriod({ from: '2024-01-01', to: '2024-12-31' })).toBe(true)
    expect('error' in resolvePeriod('no-existe')).toBe(true)
  })

  it('un rango que se sale de los datos avisa de la parte sin cubrir', () => {
    const r = ok(build({ from: '2026-09-20', to: '2026-10-05' }))
    expect(r.coverage).toEqual([
      expect.objectContaining({ kind: 'fuera_de_cobertura', from: '2026-10-01', to: '2026-10-05' }),
    ])
  })
})

describe('US-024 e · alcance por nodo del organigrama (US-013) con RBAC', () => {
  it('la lista de nodos sale del árbol de la cuenta, en orden, con su ruta', () => {
    const options = scopeOptions(account(GAN), 'nodo', undefined, tree(GAN))
    expect(options[0]).toMatchObject({ value: rootNodeId(GAN), hint: 'Toda la empresa' })
    const monterrey = options.find((o) => o.label === 'Departamento Monterrey')
    expect(monterrey?.hint).toBe('Departamento · División Noreste')
    // El árbol de OTRA cuenta no da opciones.
    expect(scopeOptions(account(GAN), 'nodo', undefined, tree(BAJIO))).toEqual([])
  })

  it('un nodo entra con todo lo que cuelga de él, y nada más', () => {
    const t = tree(GAN)
    const division = childrenOf(t, rootNodeId(GAN)).find((n) => n.name === 'División Noreste')!
    const r = ok(build('sep-2026', { kind: 'nodo', value: division.id }, t))
    expect(r.scopeLabel).toBe('Nodo del organigrama: División Noreste')
    const inNode = new Set(fleetUnitsOf(account(GAN)).filter((u) => unitPathOf(t, u.id).includes(division.id)).map((u) => u.plate))
    expect(r.byUnit.length).toBeGreaterThan(0)
    for (const row of r.byUnit) expect(inNode.has(row.id)).toBe(true)
    // Los departamentos de la división suman la división.
    const parts = childrenOf(t, division.id).map((dep) => ok(build('sep-2026', { kind: 'nodo', value: dep.id }, t)).kpis.dispatches)
    expect(parts.reduce((a, b) => a + b, 0)).toBe(r.kpis.dispatches)
  })

  it('la raíz es la cuenta completa', () => {
    const t = tree(GAN)
    expect(ok(build('sep-2026', { kind: 'nodo', value: rootNodeId(GAN) }, t)).kpis.dispatches).toBe(
      ok(build('sep-2026')).kpis.dispatches,
    )
  })

  it('sin el organigrama de la sesión, con el de otra cuenta o con un nodo que no existe: error', () => {
    const t = tree(GAN)
    const node = childrenOf(t, rootNodeId(GAN))[0]!.id
    expect('error' in build('sep-2026', { kind: 'nodo', value: node })).toBe(true)
    expect('error' in build('sep-2026', { kind: 'nodo', value: node }, tree(BAJIO))).toBe(true)
    expect('error' in build('sep-2026', { kind: 'nodo', value: 'org:acc_grupo_alimentario:no-existe' }, t)).toBe(true)
  })

  it('un Admin de Cuenta no llega a los nodos de otra cuenta', () => {
    const own = principalFor('admin_cuenta', { homeAccountId: BAJIO, activeAccountId: BAJIO })
    const t = tree(GAN)
    const r = buildConsolidatedReport(
      { type: 'ejecutivo', period: 'sep-2026', scope: { accountId: GAN, kind: 'nodo', value: childrenOf(t, rootNodeId(GAN))[0]!.id } },
      own,
      NOW,
      { orgTree: t },
    )
    expect('error' in r).toBe(true)
  })
})

describe('US-024 d · PDF de descarga directa', () => {
  it('portada, índice con páginas, KPIs y desgloses, con la cabecera repetida', () => {
    const r = ok(build('t3-2026'))
    const doc = renderPdf(r, jsPDF, { compress: false })
    const raw = doc.output()
    expect(raw.startsWith('%PDF-')).toBe(true)
    for (const section of PDF_SECTIONS) expect(raw).toContain(section)
    expect(raw).toContain('ndice')
    expect(raw).toContain(pdfText(r.account.name))
    // «Operativo por unidad» publica todas las unidades: la tabla ocupa varias páginas.
    expect(doc.getNumberOfPages()).toBeGreaterThan(5)
    expect(raw.split('(Unidad)').length - 1).toBeGreaterThan(1)
  })

  it('reportToPdf carga jspdf al pedirlo y devuelve un PDF', async () => {
    const blob = await reportToPdf(ok(build('sep-2026')))
    expect(blob.type).toBe('application/pdf')
    const head = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 5))
    expect(head).toBe('%PDF-')
  })

  it('solo texto Latin-1: rayas y comillas tipográficas se simplifican', () => {
    expect(pdfText('A › B — «c» ñ')).toBe('A > B - «c» ñ')
    expect(pdfText('emoji 🚚')).toBe('emoji ?')
  })
})
