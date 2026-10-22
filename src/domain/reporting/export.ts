import { rowsToXlsx, type XlsxCell } from '../../utils/xlsx';

function protectFormula(value: string): string {
  return /^[=+@\-]/.test(value) ? `'${value}` : value;
}

function delimitedCell(value: XlsxCell, csv: boolean): string {
  const text = typeof value === 'string' ? protectFormula(value) : String(value);
  const escaped = text.replace(/"/g, '""');
  return csv || /["\r\n\t]/.test(text) ? `"${escaped}"` : escaped;
}

export function rowsToCsv(rows: XlsxCell[][]): string {
  return `\uFEFF${rows.map((row) => row.map((cell) => delimitedCell(cell, true)).join(',')).join('\r\n')}\r\n`;
}

export function rowsToTxt(rows: XlsxCell[][]): string {
  return `\uFEFF${rows.map((row) => row.map((cell) => delimitedCell(cell, false)).join('\t')).join('\r\n')}\r\n`;
}

export type ReportFileFormat = 'xlsx' | 'csv' | 'txt';

export function downloadReport(rows: XlsxCell[][], format: ReportFileFormat, fileName: string): void {
  const content = format === 'xlsx' ? rowsToXlsx(rows) : format === 'csv' ? rowsToCsv(rows) : rowsToTxt(rows);
  const mime = format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}