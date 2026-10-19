/**
 * Precios de referencia de la plataforma — compartidos por el generador del
 * padrón y por el directorio de estaciones (unificación de datos de Ticket
 * Car+). Antes vivían dentro de `fleet-activity`.
 */
import type { FuelType } from '../dashboard/types'

/** Precio de lista por litro, en pesos. Referencia de mercado. */
export const LIST_PRICE: Record<FuelType, number> = { magna: 24.1, premium: 26.4, diesel: 25.8 }

/** Descuento negociado por Edenred sobre el precio de lista. */
export const CONTRACT_DISCOUNT = 0.042
