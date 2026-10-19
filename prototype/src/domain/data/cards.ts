/**
 * Tarjeta de cada unidad — Ticket Car+ (unificación de datos).
 * ══════════════════════════════════════════════════════════
 * Una unidad, una tarjeta (o tag de estación propia en Autoconsumo). El
 * identificador sale del de la unidad, que es único en toda la plataforma, y
 * los cuatro dígitos visibles son ficticios pero estables: el optimizador y la
 * pantalla de Medios de pago enseñan los mismos. Antes el optimizador tenía 420
 * tarjetas propias sin relación con el padrón.
 */
import { hashFraction } from '../stations/directory'

export const CARD_PREFIX = 'TAR-'

export function cardIdOf(unitId: string): string {
  return `${CARD_PREFIX}${unitId}`
}

export function unitIdOfCard(cardId: string): string | null {
  return cardId.startsWith(CARD_PREFIX) ? cardId.slice(CARD_PREFIX.length) : null
}

/**
 * Cuatro dígitos FICTICIOS de la tarjeta de una unidad.
 *
 * Distintos para cada unidad: el número económico (`ECO-3004`) es único en la
 * plataforma y menor de 10 000, y multiplicarlo por un primo con 10 000 es una
 * biyección, así que el enmascarado nunca confunde dos tarjetas. Lo que no es
 * una unidad (las tarjetas de repuesto) sale de un hash.
 */
export function cardLast4Of(unitId: string): string {
  const number = /^ECO-(\d{1,4})$/.exec(unitId)
  if (number !== null) return String((Number(number[1]) * 7919 + 4271) % 10_000).padStart(4, '0')
  return String(Math.floor(hashFraction(`${unitId}:tarjeta`) * 10_000)).padStart(4, '0')
}
