/**
 * Almacén del navegador, por propietario y a prueba de navegador.
 * ══════════════════════════════════════════════════════════════
 * Tres cosas guarda ya el prototipo en el navegador —la disposición de widgets
 * de US-009, los filtros activos y las vistas guardadas de US-010— y las tres
 * tienen exactamente los mismos cuatro problemas:
 *
 *   · `window.localStorage` LANZA al tocarlo en navegación privada o con las
 *     cookies de terceros bloqueadas; no devuelve `null`, lanza;
 *   · el contenido puede estar corrupto o venir de un formato anterior;
 *   · escribir puede fallar con la cuota agotada;
 *   · y nada de eso puede tumbar la pantalla, pero tampoco puede pasar en
 *     silencio: el error se DEVUELVE para que la vista lo cuente.
 *
 * Escribirlo tres veces era escribirlo tres veces mal. Está una vez, aquí.
 *
 * Lo que se guarda no es «el valor del usuario que hay ahora», sino un mapa
 * de valores por PROPIETARIO. Esa distinción venía de US-009 —el Account
 * Manager lee la disposición del Admin de Cuenta, que no es suya— y US-010 la
 * reutiliza para no mezclar los filtros de dos cuentas en el mismo navegador.
 */

export type StorageArea = 'local' | 'session'

/** Los cuatro mensajes que puede necesitar dar un almacén. */
export type StoreMessages = {
  /** El navegador no deja guardar nada. */
  unavailable: string
  /** Lo guardado no se pudo interpretar. */
  corrupt: string
  /** Lo guardado para ESTE propietario no tenía la forma esperada. */
  malformed: string
  /** No se pudo escribir: cuota agotada o almacén de solo lectura. */
  full: string
}

export type ReadResult<T> = {
  /** `null` cuando no hay nada guardado para este propietario. */
  value: T | null
  error: string | null
}

export type WriteResult = {
  ok: boolean
  error: string | null
}

export type KeyedStore<T> = {
  read: (ownerKey: string) => ReadResult<T>
  write: (ownerKey: string, value: T) => WriteResult
  clear: (ownerKey: string) => WriteResult
  /** Vacía el almacén entero. Solo lo usan los tests. */
  reset: () => void
}

export type StoreConfig<T> = {
  /**
   * Clave versionada. Si el formato cambia, sube la versión: lo viejo se
   * ignora solo en vez de leerse mal.
   */
  key: string
  area: StorageArea
  /** Valida lo leído. Devuelve `null` si no es reconocible. */
  parse: (raw: unknown) => T | null
  messages: StoreMessages
}

type StoredMap = Record<string, unknown>

/**
 * Devuelve el almacén, o `null` si el navegador no lo permite.
 * Acceder a la propiedad puede LANZAR, no solo devolver `null`.
 */
function areaOf(area: StorageArea): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    const store = area === 'local' ? window.localStorage : window.sessionStorage
    return store ?? null
  } catch {
    return null
  }
}

export function createKeyedStore<T>(config: StoreConfig<T>): KeyedStore<T> {
  function readAll(): { data: StoredMap; error: string | null } {
    const store = areaOf(config.area)
    if (store === null) return { data: {}, error: config.messages.unavailable }

    const raw = store.getItem(config.key)
    if (raw === null) return { data: {}, error: null }

    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { data: {}, error: config.messages.corrupt }
      }
      return { data: parsed as StoredMap, error: null }
    } catch {
      // Contenido dañado: se ignora y se sigue con los valores por defecto.
      // Borrarlo aquí escondería el problema en el siguiente arranque.
      return { data: {}, error: config.messages.corrupt }
    }
  }

  function persist(next: StoredMap): WriteResult {
    const store = areaOf(config.area)
    if (store === null) return { ok: false, error: config.messages.unavailable }

    try {
      store.setItem(config.key, JSON.stringify(next))
      return { ok: true, error: null }
    } catch {
      return { ok: false, error: config.messages.full }
    }
  }

  return {
    read(ownerKey) {
      if (ownerKey === '') return { value: null, error: null }

      const { data, error } = readAll()
      if (error !== null) return { value: null, error }

      const stored = data[ownerKey]
      if (stored === undefined) return { value: null, error: null }

      const parsed = config.parse(stored)
      if (parsed === null) return { value: null, error: config.messages.malformed }
      return { value: parsed, error: null }
    },

    write(ownerKey, value) {
      if (ownerKey === '') return { ok: false, error: null }
      const { data } = readAll()
      return persist({ ...data, [ownerKey]: value })
    },

    clear(ownerKey) {
      if (ownerKey === '') return { ok: false, error: null }
      const { data } = readAll()
      const next: StoredMap = { ...data }
      delete next[ownerKey]
      return persist(next)
    },

    reset() {
      const store = areaOf(config.area)
      try {
        store?.removeItem(config.key)
      } catch {
        // Nada que hacer: el almacén ya no responde.
      }
    },
  }
}
