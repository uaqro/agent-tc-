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
import { createXlsxWorkbook } from '../../utils/xlsx'
export { crc32, zipStore } from '../../utils/xlsx'

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

// ── XLSX ─────────────────────────────────────────────────────────────────

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
  return createXlsxWorkbook(XLSX_SHEETS.map((name, index) => ({ name, rows: sheets[index]! })))
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
