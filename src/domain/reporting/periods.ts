import { today } from '../demo/clock';

export type PeriodPreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'last60' | 'last90' | 'month' | 'custom';

export interface ReportPeriod {
  preset: PeriodPreset;
  from: string;
  to: string;
}

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'yesterday', label: 'Ayer' },
  { id: 'last7', label: 'Últimos 7 días' },
  { id: 'last30', label: 'Últimos 30 días' },
  { id: 'last60', label: 'Últimos 60 días' },
  { id: 'last90', label: 'Últimos 90 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'custom', label: 'Personalizado' },
];

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function periodForPreset(preset: Exclude<PeriodPreset, 'custom'>, referenceDate = today()): ReportPeriod {
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const start = new Date(end);

  if (preset === 'yesterday') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (preset === 'month') {
    start.setDate(1);
  } else if (preset.startsWith('last')) {
    const days = Number(preset.slice(4));
    start.setDate(start.getDate() - days + 1);
  }

  return { preset, from: toISODate(start), to: toISODate(end) };
}

export function defaultReportPeriod(): ReportPeriod {
  return periodForPreset('last30');
}