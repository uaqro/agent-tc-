// US-024
/**
 * EP-04 · US-024 — Exportación a CSV y XLSX, sin dependencias.
 * ═══════════════════════════════════════════════════════════
 *   · CSV  — texto UTF-8 con BOM (para que Excel no rompa los acentos), tres
 *            bloques: resumen, por unidad, por conductor.
 *   · XLSX — libro OOXML mínimo con tres hojas, empaquetado aquí mismo en un
 *            ZIP sin compresión. Se evitó el paquete `xlsx` de npm: la versión
 *            publicada allí está abandonada y arrastra CVE.
 *   · PDF  — descarga directa, en `pdf.ts` (carga diferida de `jspdf`).
 */
import { SOURCE_LABEL, presetOf, publishedRows, type BreakdownRow, type ConsolidatedReport } from './build'

// ── CSV ──────────────────────────────────────────────────────────────────

export function csvCell(value: string | number): string {
  const text = typeof value === 'number' ? String(Math.round(value * 100) / 100) : value
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const csvLine = (cells: (string | number)[]) => cells.map(csvCell).join(',')

function breakdownLines(title: string, first: string, rows: BreakdownRow[]): string[] {
  return [
    title,
    csvLine([first, 'Cargas', 'Litros', 'Gasto MXN', '$/L', '% Autoconsumo']),
    ...rows.map((r) =>
      csvLine([r.label, r.dispatches, r.liters, r.amountMxn, r.mxnPerLiter ?? '', Math.round(r.autoconsumoShare * 1000) / 10]),
    ),
  ]
}

function summaryPairs(report: ConsolidatedReport): [string, string | number][] {
  const k = report.kpis
  return [
    ['Cuenta', report.account.name],
    ['Alcance', report.scopeLabel],
    ['Periodo', report.periodLabel],
    ['Gasto MXN', k.amountMxn],
    ['Litros', k.liters],
    ['Cargas', k.dispatches],
    ['$/L medio', k.mxnPerLiter ?? ''],
    ['Unidades con carga', k.units],
    ['Conductores', k.drivers],
    [`Litros ${SOURCE_LABEL.autoconsumo}`, k.bySource.autoconsumo.liters],
    [`Litros ${SOURCE_LABEL.ticketcar_plus}`, k.bySource.ticketcar_plus.liters],
    // Los datos que faltan viajan también en la hoja: el aviso no se queda en pantalla.
    ...report.coverage.map((w): [string, string] => ['Datos incompletos', w.message]),
  ]
}

export function reportToCsv(report: ConsolidatedReport): string {
  const { units, drivers } = publishedRows(report)
  const lines = [
    'Resumen',
    ...summaryPairs(report).map(([key, value]) => csvLine([key, value])),
    '',
    ...breakdownLines('Por unidad', 'Unidad', units),
    '',
    ...breakdownLines('Por conductor', 'Conductor', drivers),
  ]
  return '﻿' + lines.join('\r\n') + '\r\n'
}

// ── ZIP sin compresión (para el XLSX) ────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export function zipStore(files: { name: string; content: string }[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const name = encoder.encode(file.name)
    const data = encoder.encode(file.content)
    const crc = crc32(data)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // nombres en UTF-8
    local.setUint16(8, 0, true) // sin compresión
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, name.length, true)
    chunks.push(new Uint8Array(local.buffer), name, data)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true)
    entry.setUint16(10, 0, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, data.length, true)
    entry.setUint32(24, data.length, true)
    entry.setUint16(28, name.length, true)
    entry.setUint32(42, offset, true)
    central.push(new Uint8Array(entry.buffer), name)

    offset += 30 + name.length + data.length
  }

  const centralSize = central.reduce((sum, c) => sum + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  const all = [...chunks, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(new ArrayBuffer(all.reduce((sum, c) => sum + c.length, 0)))
  let at = 0
  for (const c of all) {
    out.set(c, at)
    at += c.length
  }
  return out
}

// ── XLSX ─────────────────────────────────────────────────────────────────

const xmlEscape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function columnName(index: number): string {
  let name = ''
  let n = index + 1
  while (n > 0) {
    const r = (n - 1) % 26
    name = String.fromCharCode(65 + r) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function sheetXml(rows: (string | number)[][]): string {
  const body = rows
    .map((cells, r) => {
      const xml = cells
        .map((value, c) => {
          const ref = `${columnName(c)}${r + 1}`
          return typeof value === 'number'
            ? `<c r="${ref}"><v>${Math.round(value * 100) / 100}</v></c>`
            : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
        })
        .join('')
      return `<row r="${r + 1}">${xml}</row>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`
}

function breakdownSheet(first: string, rows: BreakdownRow[]): (string | number)[][] {
  return [
    [first, 'Cargas', 'Litros', 'Gasto MXN', '$/L', '% Autoconsumo'],
    ...rows.map((r) => [r.label, r.dispatches, r.liters, r.amountMxn, r.mxnPerLiter ?? '', r.autoconsumoShare * 100]),
  ]
}

export const XLSX_SHEETS = ['Resumen', 'Por unidad', 'Por conductor'] as const

export function reportToXlsx(report: ConsolidatedReport): Uint8Array<ArrayBuffer> {
  const { units, drivers } = publishedRows(report)
  const sheets = [
    summaryPairs(report).map(([k, v]) => [k, v]),
    breakdownSheet('Unidad', units),
    breakdownSheet('Conductor', drivers),
  ]
  const files = [
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${XLSX_SHEETS.map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      ).join('')}</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${XLSX_SHEETS.map(
        (name, i) => `<sheet name="${xmlEscape(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
      ).join('')}</sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${XLSX_SHEETS.map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      ).join('')}</Relationships>`,
    },
    ...sheets.map((rows, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, content: sheetXml(rows) })),
  ]
  return zipStore(files)
}

// ── Descarga e impresión (navegador) ─────────────────────────────────────

export function fileBaseName(report: ConsolidatedReport): string {
  const slug = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  // Un rango que coincide con un atajo se llama como el atajo: «feb-2026».
  const period =
    typeof report.request.period === 'string'
      ? report.request.period
      : presetOf(report.periodRange)?.id ?? `${report.periodRange.from}-a-${report.periodRange.to}`
  return `reporte-${slug(report.account.name)}-${report.request.type}-${period}`
}

export function downloadBlob(content: BlobPart, type: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
