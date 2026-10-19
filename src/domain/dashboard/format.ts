/**
 * Formato de las magnitudes del dashboard.
 * ═══════════════════════════════════════
 * Un único sitio donde se decide cómo se escribe un peso, un litro y una
 * variación. Todo en `es-MX`, que es la plaza del piloto.
 *
 * Se apoya en `Intl`, disponible en las versiones actual y anterior de Chrome,
 * Firefox y Safari (criterio de aceptación 5). Los formateadores se crean una
 * sola vez: instanciar `Intl.NumberFormat` dentro de la celda de una tabla de
 * 500 filas es de las pocas formas de hacer lenta una tabla de 500 filas.
 */

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

const currencyPrecise = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const decimal = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })
const decimalOne = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 })
const decimalTwo = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fullDateTime = new Intl.DateTimeFormat('es-MX', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const shortDate = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })

/**
 * Signo negativo de la plaza, tal como lo escribe `Intl`.
 *
 * Los importes compactos («−$1.28 M») no pasan por el formateador de moneda,
 * así que si el signo se escribiera a mano acabaría habiendo dos glifos
 * distintos para lo mismo en la misma pantalla. Se toma prestado el suyo.
 */
const MINUS = currency.formatToParts(-1).find((part) => part.type === 'minusSign')?.value ?? '-'

export function mxn(value: number): string {
  return currency.format(value)
}

export function mxnPrecise(value: number): string {
  return currencyPrecise.format(value)
}

/** Compacta importes grandes: 1 284 500 → $1.28 M */
export function mxnCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? MINUS : ''
  if (abs >= 1_000_000) return `${sign}$${decimalTwo.format(abs / 1_000_000)} M`
  if (abs >= 10_000) return `${sign}$${decimalOne.format(abs / 1_000)} k`
  return currency.format(value)
}

export function liters(value: number): string {
  return `${decimal.format(Math.round(value))} L`
}

/** Compacta volúmenes: 27 480 → 27.5 k L */
export function litersCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 10_000) return `${decimalOne.format(value / 1_000)} k L`
  return liters(value)
}

export function km(value: number): string {
  return `${decimal.format(Math.round(value))} km`
}

export function efficiency(value: number | null): string {
  return value === null ? '—' : `${decimalTwo.format(value)} km/L`
}

export function percent(ratio: number, decimals = 0): string {
  const formatter = decimals === 0 ? decimal : decimalOne
  return `${formatter.format(ratio * 100)} %`
}

/** Variación con signo explícito: «+4.2 %». */
export function signedPercent(ratio: number | null): string {
  if (ratio === null) return 'sin base'
  const sign = ratio > 0 ? '+' : ratio < 0 ? MINUS : ''
  return `${sign}${decimalOne.format(Math.abs(ratio) * 100)} %`
}

export function count(value: number): string {
  return decimal.format(value)
}

/**
 * Tasa con un decimal: «7.4».
 *
 * Para magnitudes que ya llevan su denominador en el nombre —«anomalías por
 * 100 unidades-día»— y que redondeadas a entero perderían justo la diferencia
 * que se está comparando (EP-08 · US-051).
 */
export function rate(value: number): string {
  return decimalOne.format(value)
}

/** «miércoles, 20 de agosto, 09:41:07» — el sello del criterio 4. */
export function timestamp(at: number): string {
  return fullDateTime.format(new Date(at))
}

export function day(at: number): string {
  return shortDate.format(new Date(at))
}

/** «09:00» — etiqueta del eje horario. */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

/** Duración corta en la unidad que toque: «45 s», «12 min», «3 h». */
export function duration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${decimalOne.format(minutes / 60)} h`
}

/**
 * Tamaño de un archivo: «482 KB», «14.2 MB».
 *
 * En múltiplos de 1024, que es lo que cuenta el buzón de correo al comparar
 * un adjunto con su tope — EP-04 · US-090. Con múltiplos de 1000 el número de
 * pantalla y el del rebote no coincidirían justo en el caso en el que hay que
 * explicarle a alguien por qué su reporte no llegó.
 */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${decimal.format(bytes)} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${decimal.format(Math.round(kb))} KB`
  return `${decimalOne.format(kb / 1024)} MB`
}

/** Milisegundos de carga, con la precisión que tiene sentido leer. */
export function millis(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${decimalTwo.format(ms / 1000)} s`
}
