/**
 * PRNG determinista (mulberry32).
 *
 * El histórico mock se genera con una semilla fija para que el dashboard
 * muestre exactamente los mismos datos en cada recarga: si no, cada refresco
 * cambiaría los casos límite y no habría nada estable que revisar.
 */
export type Random = () => number

export function createRandom(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Entero en [min, max] ambos inclusive. */
export function randomInt(rnd: Random, min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1))
}

/** Elige un elemento del array. Devuelve `undefined` solo si el array está vacío. */
export function pick<T>(rnd: Random, items: readonly T[]): T {
  return items[Math.floor(rnd() * items.length)] as T
}
