import type { Receipt } from '../types/dispersion';
import { PRICE_PER_LITER, toLiters } from '../data/dispersion';
import { formatDateTime } from './format';

function escapeCsv(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildReceiptCsv(receipt: Receipt): string {
  const header = [
    ['Comprobante de dispersión'],
    ['Folio', receipt.folio],
    ['Fecha y hora', formatDateTime(new Date(receipt.issuedAt))],
    ['Usuario', receipt.user],
    ['Origen', receipt.sourceLabel],
    ['Alcance', receipt.scopeLabel],
    ['Unidades', receipt.units],
    ['Monto total MXN', receipt.totalMXN.toFixed(2)],
    ['Equivalente en litros', toLiters(receipt.totalMXN).toFixed(1)],
    ['Precio de referencia MXN/L', PRICE_PER_LITER.toFixed(2)],
    [],
    ['Placa', 'Conductor', 'Monto MXN', 'Litros'],
  ];

  const lines = receipt.lines.map((line) => [
    line.plate,
    line.driver,
    line.amountMXN.toFixed(2),
    toLiters(line.amountMXN).toFixed(1),
  ]);

  return [...header, ...lines].map((row) => row.map(escapeCsv).join(',')).join('\n');
}

export function downloadReceipt(receipt: Receipt): void {
  const blob = new Blob([`\uFEFF${buildReceiptCsv(receipt)}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${receipt.folio}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
