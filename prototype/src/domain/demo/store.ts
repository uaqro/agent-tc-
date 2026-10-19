/**
 * Fecha de demo — almacén del navegador.
 * ══════════════════════════════════════
 * El mismo almacén por propietario que la release (`release/store.ts`) y con el
 * mismo propietario único: la fecha es de la DEMOSTRACIÓN, no de la persona, y
 * tiene que sobrevivir a los cambios de identidad de quien conduce la demo.
 */
import { createKeyedStore } from '../storage/keyed-store'
/** Propietario único: la fecha es de la demostración, no de la persona. */
const RELEASE_OWNER = 'demo'
import type { DemoDateSetting } from './clock'

export const DEMO_DATE_OWNER = RELEASE_OWNER

function parseSetting(raw: unknown): DemoDateSetting | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { enabled, date } = raw as Record<string, unknown>
  if (typeof enabled !== 'boolean' || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  return { enabled, date }
}

export const demoDateStore = createKeyedStore<DemoDateSetting>({
  key: 'tc.demo-date.v1',
  area: 'local',
  parse: parseSetting,
  messages: {
    unavailable: 'El navegador no deja recordar la fecha de demo: se usa el 16 oct 2026.',
    corrupt: 'La fecha de demo guardada estaba dañada: se usa el 16 oct 2026.',
    malformed: 'La fecha de demo guardada no es reconocible: se usa el 16 oct 2026.',
    full: 'No se pudo guardar la fecha de demo: se perderá al recargar.',
  },
})
