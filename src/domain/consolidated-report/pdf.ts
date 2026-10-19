// US-024
/**
 * EP-04 · US-024 — PDF de descarga directa, sin diálogo de impresión.
 * ═══════════════════════════════════════════════════════════════════
 * Mismo contenido que el documento de pantalla (`document.ts`): portada con
 * los avisos de cobertura, índice con número de página, KPIs ejecutivos y
 * desglose por unidad y por conductor, con la cabecera de la tabla repetida
 * en cada página.
 *
 * Dependencia: `jspdf` (la única que se añadió para esto). Se carga con
 * `import()` en el momento de pulsar «PDF»: no pesa en la carga inicial del
 * portal. `renderPdf` recibe el constructor para que las pruebas lo usen sin
 * pasar por la carga diferida.
 *
 * Las fuentes estándar de PDF solo cubren Latin-1: las letras del español
 * entran todas; rayas, comillas tipográficas y espacios finos se cambian por
 * su equivalente simple (`pdfText`).
 */
import type { jsPDF as JsPdf } from 'jspdf'
import { REPORT_TYPES, SOURCE_LABEL, TEMPLATE_NOTICE, publishedRows, type BreakdownRow, type ConsolidatedReport } from './build'

type JsPdfConstructor = typeof JsPdf

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const moneyPrecise = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })
const pct = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 })
const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' })

const REPLACEMENTS: Record<string, string> = {
  '—': '-',
  '–': '-',
  '›': '>',
  '‹': '<',
  '…': '...',
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  ' ': ' ',
  ' ': ' ',
  ' ': ' ',
}

/** Texto apto para las fuentes estándar: Latin-1 y nada más. */
export function pdfText(text: string): string {
  return [...text].map((ch) => REPLACEMENTS[ch] ?? (ch.charCodeAt(0) > 0xff ? '?' : ch)).join('')
}

// A4 en puntos.
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2
const BOTTOM = PAGE_H - MARGIN - 18

const INK: [number, number, number] = [29, 36, 51]
const MUTED: [number, number, number] = [91, 100, 119]
const LINE: [number, number, number] = [228, 231, 238]
const HEAD: [number, number, number] = [244, 246, 250]
const ACCENT: [number, number, number] = [226, 0, 26]

export const PDF_SECTIONS = ['KPIs ejecutivos', 'Desglose por unidad', 'Desglose por conductor'] as const

export function renderPdf(report: ConsolidatedReport, JsPDF: JsPdfConstructor, options: { compress?: boolean } = {}): JsPdf {
  const doc = new JsPDF({ unit: 'pt', format: 'a4', compress: options.compress ?? true })
  const spec = REPORT_TYPES.find((t) => t.id === report.request.type)!
  const { units, drivers } = publishedRows(report)
  const k = report.kpis
  const title = `Reporte consolidado · ${spec.label}`

  doc.setProperties({ title: pdfText(`${title} - ${report.account.name}`), creator: 'Edenred One Mobility (prototipo)' })

  const text = (value: string, x: number, y: number, opts?: Parameters<JsPdf['text']>[3]) => doc.text(pdfText(value), x, y, opts)
  const font = (size: number, style: 'normal' | 'bold' = 'normal', color = INK) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }
  const fit = (value: string, width: number) => {
    let clean = pdfText(value)
    if (doc.getTextWidth(clean) <= width) return clean
    while (clean.length > 1 && doc.getTextWidth(`${clean}...`) > width) clean = clean.slice(0, -1)
    return `${clean}...`
  }
  const heading = (value: string, y: number) => {
    font(16, 'bold')
    text(value, MARGIN, y)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(1.5)
    doc.line(MARGIN, y + 8, PAGE_W - MARGIN, y + 8)
    return y + 30
  }

  // ── Portada ────────────────────────────────────────────────────────────
  doc.setFillColor(...ACCENT)
  doc.rect(MARGIN, 200, 5, 300, 'F')
  const left = MARGIN + 22
  font(24, 'bold')
  let y = 230
  for (const line of doc.splitTextToSize(pdfText(title), CONTENT_W - 22) as string[]) {
    doc.text(line, left, y)
    y += 28
  }
  font(13)
  text(report.account.name, left, y)
  y += 32
  const facts: [string, string][] = [
    ['Alcance', report.scopeLabel],
    ['Periodo', report.periodLabel],
    ['Fuentes', `${SOURCE_LABEL.autoconsumo} + ${SOURCE_LABEL.ticketcar_plus}`],
    ['Generado', `${dateTime.format(report.generatedAt)} por ${report.generatedBy}`],
  ]
  for (const [label, value] of facts) {
    font(10, 'normal', MUTED)
    text(label, left, y)
    font(10)
    const lines = doc.splitTextToSize(pdfText(value), CONTENT_W - 112) as string[]
    doc.text(lines, left + 90, y)
    y += 16 * lines.length + 2
  }

  if (report.coverage.length > 0) {
    y += 10
    font(10)
    const lines = report.coverage.flatMap((w) => doc.splitTextToSize(pdfText(`- ${w.message}`), CONTENT_W - 50) as string[])
    const boxH = 26 + lines.length * 13
    doc.setFillColor(253, 236, 236)
    doc.rect(left, y, CONTENT_W - 22, boxH, 'F')
    doc.setFillColor(198, 40, 40)
    doc.rect(left, y, 3, boxH, 'F')
    font(10, 'bold', [138, 28, 28])
    text('Datos incompletos en el periodo', left + 12, y + 16)
    font(10, 'normal', [138, 28, 28])
    doc.text(lines, left + 12, y + 30)
    y += boxH
  }

  y += 22
  font(9, 'normal', [122, 86, 0])
  doc.setFillColor(255, 244, 214)
  const notice = doc.splitTextToSize(pdfText(TEMPLATE_NOTICE), CONTENT_W - 40) as string[]
  doc.rect(left, y - 12, CONTENT_W - 22, notice.length * 12 + 10, 'F')
  doc.text(notice, left + 8, y + 1)
  y += notice.length * 12 + 18
  font(9, 'normal', MUTED)
  text('Edenred One Mobility · prototipo con datos mock.', left, y)

  // ── Índice: se reserva la página y se rellena al final ────────────────
  doc.addPage()
  const indexPage = doc.getNumberOfPages()
  const sectionPages: number[] = []

  // ── 1. KPIs ────────────────────────────────────────────────────────────
  doc.addPage()
  sectionPages.push(doc.getNumberOfPages())
  y = heading(`1. ${PDF_SECTIONS[0]}`, MARGIN + 20)
  const kpis: [string, string, string?][] = [
    ['Gasto total', money.format(k.amountMxn)],
    ['Litros', number.format(k.liters)],
    ['Cargas', number.format(k.dispatches)],
    ['Precio medio por litro', k.mxnPerLiter === null ? '-' : moneyPrecise.format(k.mxnPerLiter)],
    ['Unidades con carga', number.format(k.units)],
    ['Conductores', number.format(k.drivers)],
    [
      SOURCE_LABEL.autoconsumo,
      `${number.format(k.bySource.autoconsumo.liters)} L`,
      `${money.format(k.bySource.autoconsumo.amountMxn)} · ${number.format(k.bySource.autoconsumo.dispatches)} cargas`,
    ],
    [
      SOURCE_LABEL.ticketcar_plus,
      `${number.format(k.bySource.ticketcar_plus.liters)} L`,
      `${money.format(k.bySource.ticketcar_plus.amountMxn)} · ${number.format(k.bySource.ticketcar_plus.dispatches)} cargas`,
    ],
  ]
  const boxW = (CONTENT_W - 12) / 2
  const boxH = 62
  kpis.forEach(([label, value, detail], i) => {
    const x = MARGIN + (i % 2) * (boxW + 12)
    const top = y + Math.floor(i / 2) * (boxH + 12)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(1)
    doc.roundedRect(x, top, boxW, boxH, 6, 6, 'S')
    font(9, 'normal', MUTED)
    text(label, x + 12, top + 18)
    font(16, 'bold')
    text(value, x + 12, top + 40)
    if (detail) {
      font(9, 'normal', MUTED)
      text(detail, x + 12, top + 54)
    }
  })

  // ── 2 y 3. Desgloses ───────────────────────────────────────────────────
  const columns = [
    { header: '', width: CONTENT_W - 5 * 72, align: 'left' as const },
    { header: 'Cargas', width: 72, align: 'right' as const },
    { header: 'Litros', width: 72, align: 'right' as const },
    { header: 'Gasto', width: 72, align: 'right' as const },
    { header: '$/L', width: 72, align: 'right' as const },
    { header: '% Autoconsumo', width: 72, align: 'right' as const },
  ]
  const ROW_H = 17
  const tableHeader = (first: string, top: number) => {
    doc.setFillColor(...HEAD)
    doc.rect(MARGIN, top, CONTENT_W, ROW_H, 'F')
    font(8.5, 'bold')
    let x = MARGIN
    columns.forEach((col, i) => {
      const label = i === 0 ? first : col.header
      if (col.align === 'right') text(label, x + col.width - 6, top + 12, { align: 'right' })
      else text(label, x + 6, top + 12)
      x += col.width
    })
    return top + ROW_H
  }
  const table = (number_: number, section: string, first: string, rows: BreakdownRow[], total: number) => {
    doc.addPage()
    sectionPages.push(doc.getNumberOfPages())
    let top = heading(`${number_}. ${section}`, MARGIN + 20)
    top = tableHeader(first, top)
    if (rows.length === 0) {
      font(9)
      text('Sin despachos en el alcance.', MARGIN + 6, top + 12)
      top += ROW_H
    }
    for (const row of rows) {
      if (top + ROW_H > BOTTOM) {
        doc.addPage()
        top = tableHeader(first, MARGIN)
      }
      const cells = [
        row.label,
        number.format(row.dispatches),
        number.format(row.liters),
        money.format(row.amountMxn),
        row.mxnPerLiter === null ? '-' : moneyPrecise.format(row.mxnPerLiter),
        pct.format(row.autoconsumoShare),
      ]
      font(8.5)
      let x = MARGIN
      columns.forEach((col, i) => {
        const value = fit(cells[i]!, col.width - 12)
        if (col.align === 'right') doc.text(value, x + col.width - 6, top + 12, { align: 'right' })
        else doc.text(value, x + 6, top + 12)
        x += col.width
      })
      doc.setDrawColor(...LINE)
      doc.setLineWidth(0.5)
      doc.line(MARGIN, top + ROW_H, PAGE_W - MARGIN, top + ROW_H)
      top += ROW_H
    }
    if (rows.length < total) {
      if (top + 24 > BOTTOM) {
        doc.addPage()
        top = MARGIN
      }
      font(8.5, 'normal', MUTED)
      text(`Se muestran ${rows.length} de ${total}, de mayor a menor gasto.`, MARGIN, top + 18)
    }
  }
  table(2, PDF_SECTIONS[1], 'Unidad', units, report.byUnit.length)
  table(3, PDF_SECTIONS[2], 'Conductor', drivers, report.byDriver.length)

  // ── Índice, ya con las páginas ─────────────────────────────────────────
  doc.setPage(indexPage)
  y = heading('Índice', MARGIN + 20)
  PDF_SECTIONS.forEach((section, i) => {
    font(11)
    const label = `${i + 1}. ${section}`
    text(label, MARGIN, y)
    text(String(sectionPages[i]), PAGE_W - MARGIN, y, { align: 'right' })
    doc.setDrawColor(...LINE)
    doc.setLineDashPattern([1, 2], 0)
    doc.line(MARGIN + doc.getTextWidth(pdfText(label)) + 6, y - 3, PAGE_W - MARGIN - 20, y - 3)
    doc.setLineDashPattern([], 0)
    doc.link(MARGIN, y - 11, CONTENT_W, 15, { pageNumber: sectionPages[i] })
    y += 22
  })

  // ── Pie con número de página ───────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    font(8, 'normal', MUTED)
    text(`${report.account.name} · ${report.periodLabel}`, MARGIN, PAGE_H - MARGIN + 8)
    text(`Página ${page} de ${pages}`, PAGE_W - MARGIN, PAGE_H - MARGIN + 8, { align: 'right' })
  }

  return doc
}

/** El PDF del reporte, listo para descargar. Carga `jspdf` en este momento. */
export async function reportToPdf(report: ConsolidatedReport): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  return renderPdf(report, jsPDF).output('blob')
}
