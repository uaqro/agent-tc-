// US-112 · US-020 · US-111
/**
 * Enmascarado de tarjeta. Regla dura del Sprint 8.
 * ══════════════════════════════════════════════
 * Ni PAN ni nada que se le parezca. El dataset solo guarda un identificador
 * sintético (`TC-000123`) y cuatro dígitos FICTICIOS; ningún componente
 * recibe otra cosa que `•••• 1234`. Si algún día llegara un PAN entero por
 * error, esta función se queda igualmente con los cuatro últimos dígitos.
 */
export const MASK_PREFIX = '••••'

export function maskCard(digits: string): string {
  const onlyDigits = digits.replace(/\D/g, '')
  const last4 = onlyDigits.slice(-4).padStart(4, '0')
  return `${MASK_PREFIX} ${last4}`
}
