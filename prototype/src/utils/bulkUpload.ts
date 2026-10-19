import type { BulkRow, Vehicle } from '../types/dispersion';

const TEMPLATE_HEADER = 'placa,monto';

export function buildTemplateCsv(vehicles: Vehicle[]): string {
  const sample = vehicles.slice(0, 3).map((vehicle) => `${vehicle.plate},500`);
  return [TEMPLATE_HEADER, ...sample].join('\n');
}

export function downloadTemplate(vehicles: Vehicle[]): void {
  const blob = new Blob([`\uFEFF${buildTemplateCsv(vehicles)}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla-dispersion-masiva.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/** Parses `placa,monto` rows and validates each one against the fleet. */
export function parseBulkCsv(text: string, vehicles: Vehicle[]): BulkRow[] {
  const byPlate = new Map(vehicles.map((vehicle) => [vehicle.plate.toUpperCase(), vehicle]));

  return text
    .split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, raw: line.trim() }))
    .filter(({ raw }) => raw.length > 0 && !raw.toLowerCase().startsWith('placa'))
    .map(({ line, raw }) => {
      const [rawPlate = '', rawAmount = ''] = raw.split(/[,;\t]/);
      const plate = rawPlate.trim().replace(/^"|"$/g, '').toUpperCase();
      const amountMXN = Number(rawAmount.trim().replace(/[^0-9.-]/g, ''));
      const vehicle = byPlate.get(plate);

      if (!vehicle) {
        return { line, plate: plate || '—', driver: '', amountMXN: 0, status: 'not-found' as const, message: 'Placa no encontrada' };
      }
      if (!Number.isFinite(amountMXN) || amountMXN <= 0) {
        return { line, plate, driver: vehicle.driver, amountMXN: 0, status: 'invalid' as const, message: 'Monto inválido' };
      }

      return { line, plate, driver: vehicle.driver, amountMXN, status: 'ok' as const };
    });
}
