/**
 * Reloj de negocio del prototipo — la única fuente de «hoy».
 * ═══════════════════════════════════════════════════════════
 * Todo lo que el prototipo calcula «desde hoy» —periodos por defecto, «últimos
 * N días», comparación con el periodo anterior, frescura de los datos, ventana
 * del optimizador, atajos de fechas, antigüedades— pregunta aquí. Los datos son
 * sintéticos y están anclados al tercer trimestre de 2026: con la fecha real,
 * una demo hecha en octubre abre el optimizador vacío y el reporte con avisos.
 *
 * ── Fecha de demo ─────────────────────────────────────────────────────────
 * ACTIVADA por defecto. En eOne se fija el 1-oct-2026; en Ticket Car+ el
 * 16-oct-2026, porque los mocks propios de Ticket Car+ (últimos usos de
 * tarjetas, saldos, solicitudes) están fechados a mediados de octubre y con el
 * 1 de octubre quedarían en el futuro. Septiembre sigue entrando entero como
 * mes cerrado. Se puede desactivar (vuelve la fecha real). Solo se fija
 * el DÍA: la hora es la del reloj de pared, para que el dashboard siga
 * avanzando durante la jornada como antes.
 *
 * ── Lo que NO pasa por aquí ───────────────────────────────────────────────
 * Los relojes de SEGURIDAD siguen con la hora real, a propósito: caducidad de
 * la sesión (8 h), vida absoluta del token, caducidad del MFA y del token SAS,
 * y las marcas de tiempo del log de accesos y del log de auditoría. Una fecha
 * de demo que alargara una sesión o fechara un log sería un agujero, no una
 * comodidad.
 *
 * ── Persistencia ──────────────────────────────────────────────────────────
 * Por navegador, con el mismo almacén por propietario que el selector de
 * release (`demo/store.ts`). Se lee la primera vez que alguien pregunta la
 * hora, dentro de un try/catch: si el navegador no deja leer, queda el valor
 * por defecto y el panel lo cuenta.
 */
import { DEMO_DATE_OWNER, demoDateStore } from './store'

export type DemoDateSetting = {
  /** `false` = fecha real. */
  enabled: boolean
  /** Día de demo, `YYYY-MM-DD`. */
  date: string
}

export const DEFAULT_DEMO_DATE = '2026-10-16'
export const DEFAULT_DEMO_SETTING: DemoDateSetting = { enabled: true, date: DEFAULT_DEMO_DATE }

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

export function isValidDemoDate(date: string): boolean {
  if (!ISO_DAY.test(date)) return false
  const [y, m, d] = date.split('-').map(Number)
  const parsed = new Date(y!, m! - 1, d!)
  return parsed.getFullYear() === y && parsed.getMonth() === m! - 1 && parsed.getDate() === d
}

let setting: DemoDateSetting | null = null
let storeError: string | null = null
const listeners = new Set<() => void>()

function load(): DemoDateSetting {
  if (setting !== null) return setting
  try {
    const result = demoDateStore.read(DEMO_DATE_OWNER)
    setting = result.value ?? DEFAULT_DEMO_SETTING
    storeError = result.error
  } catch {
    setting = DEFAULT_DEMO_SETTING
    storeError = 'El navegador no deja recordar la fecha de demo: se usa el 16 oct 2026.'
  }
  return setting
}

/** Ajuste vigente. Mismo objeto mientras no cambie: vale como instantánea. */
export function demoDateSetting(): DemoDateSetting {
  return load()
}

/** Último problema del almacén, para que el panel lo cuente. */
export function demoDateStoreError(): string | null {
  load()
  return storeError
}

/** Cambia la fecha de demo, la guarda en el navegador y avisa a quien escucha. */
export function setDemoDateSetting(next: DemoDateSetting): void {
  if (!isValidDemoDate(next.date)) return
  setting = { enabled: next.enabled, date: next.date }
  try {
    storeError = demoDateStore.write(DEMO_DATE_OWNER, setting).error
  } catch {
    storeError = 'No se pudo guardar la fecha de demo: se perderá al recargar.'
  }
  for (const listener of listeners) listener()
}

export function subscribeDemoDate(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Clave estable del reloj: cambia cuando cambia la fecha de demo. Los hooks la
 * usan como dependencia para recalcular lo que calcularon «desde hoy».
 */
export function demoDateKey(): string {
  const current = load()
  return current.enabled ? `demo:${current.date}` : 'real'
}

/** Instante de negocio, en ms. El día de demo con la hora del reloj de pared. */
export function businessNow(): number {
  const real = Date.now()
  const current = load()
  if (!current.enabled) return real
  const [y, m, d] = current.date.split('-').map(Number)
  const wall = new Date(real)
  return new Date(y!, m! - 1, d!, wall.getHours(), wall.getMinutes(), wall.getSeconds(), wall.getMilliseconds()).getTime()
}

/** «Hoy» de negocio. */
export function today(): Date {
  return new Date(businessNow())
}

// Tabla propia y no `Intl`: según la versión de ICU del navegador, septiembre
// sale «sep» o «sept», y el indicador tiene que decir lo mismo en todos.
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** «1 oct 2026». */
export function formatDemoDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${d} ${MONTHS[m! - 1]} ${y}`
}

/** Solo para pruebas: olvida lo leído y vuelve a leer el almacén. */
export function reloadDemoDateForTests(): void {
  setting = null
  storeError = null
}
