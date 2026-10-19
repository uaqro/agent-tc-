import { businessNow } from '../domain/demo/clock';

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const moneyPrecise = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const decimal = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const dateLong = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' });

const dateTime = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatMoney(value: number, precise = false): string {
  return precise ? moneyPrecise.format(value) : money.format(value);
}

export function formatLiters(value: number): string {
  return `${decimal.format(value)} L`;
}

export function formatCount(value: number): string {
  return decimal.format(value);
}

/** Parses a plain `YYYY-MM-DD` string as local noon to avoid time zone drift. */
export function parseDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

export function formatDateLong(iso: string): string {
  return dateLong.format(parseDate(iso));
}

export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

export function formatSignedPercent(value: number): string {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`;
}

export function daysUntil(iso: string, from = new Date(businessNow())): number {
  const target = parseDate(iso).getTime();
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12).getTime();
  return Math.round((target - start) / 86_400_000);
}
