/**
 * Tests de permisos del portal — ADR-TCP-001.
 * ══════════════════════════════════════════
 * Mismo criterio que ADR-001: la matriz de la decisión es el fixture. Está
 * transcrita a mano desde `docs/decisions/ADR-TCP-001_roles_portal_TC.md`,
 * sección 4, y NO se lee de `PORTAL_MATRIX`: si los tests leyeran la matriz de
 * producción comprobarían que el código coincide consigo mismo.
 */
import { describe, expect, it } from 'vitest'
import { PERMISSION_MATRIX, type PermissionLevel } from '../adr-001'
import {
  ADR_PORTAL_CAPABILITIES,
  EXTENSIONS,
  PORTAL_MATRIX,
  PORTAL_ROLES,
  PORTAL_ROLE_ORDER,
  TC_CAPABILITIES,
  canSession,
  derivedFromAdr,
  grantForSession,
  levelRank,
  type AdrPortalCapabilityId,
  type PortalCapabilityId,
  type TcCapabilityId,
} from '../portal-roles'

const C: PermissionLevel = 'completo'
const L: PermissionLevel = 'lectura'
const G: PermissionLevel = 'gestion'
const P: PermissionLevel = 'limitado'
const N: PermissionLevel = 'ninguno'

/** Sección 4.1. Columnas: admin | flota | finanzas | consulta || Admin de Cuenta | Visualizador | Gestor de Alertas */
const ADR_ROWS: Record<AdrPortalCapabilityId, [PermissionLevel, PermissionLevel, PermissionLevel, PermissionLevel, PermissionLevel, PermissionLevel, PermissionLevel]> = {
  'auth.sso_login': [C, C, C, C, C, C, C],
  'dashboard.kpis': [C, L, L, L, C, L, L],
  'dashboard.widgets': [C, N, N, N, C, N, N],
  'dashboard.filtros': [C, C, C, C, C, C, P],
  'consumos.drivers': [L, L, L, L, L, L, N],
  'consumos.ineficiencias': [L, L, L, L, L, L, N],
  'consumos.export': [C, N, C, N, C, N, N],
  'inventario.ver': [L, L, L, L, L, L, N],
  'inventario.editar': [C, C, N, N, C, N, N],
  'inventario.vin': [C, C, N, N, C, N, N],
  'alertas.panel': [L, C, L, L, L, L, C],
  'alertas.configurar': [C, C, N, N, C, N, C],
  'alertas.destinatarios': [C, C, N, N, C, N, C],
  'admin.usuarios': [G, N, N, N, G, N, N],
  'admin.roles': [G, N, N, N, G, N, N],
  'admin.log': [L, N, N, N, L, N, N],
  'admin.estructura': [G, N, N, N, G, N, N],
}

/** Sección 4.2. Columnas: admin | flota | finanzas | consulta */
const TC_ROWS: Record<TcCapabilityId, [PermissionLevel, PermissionLevel, PermissionLevel, PermissionLevel]> = {
  'tc.saldos': [C, N, C, N],
  'tc.limites': [C, C, N, N],
  'tc.medios_pago': [C, N, C, N],
  'tc.peaje_saldos': [C, N, C, N],
  'tc.peaje_reglas': [C, C, N, N],
  'tc.peaje_medios': [C, N, C, N],
  'tc.mantenimiento': [C, C, N, N],
  'tc.facturas': [C, N, C, N],
  'tc.parametros': [G, N, N, N],
  'tc.asistente': [L, L, L, L],
  'tc.recomendaciones': [C, C, N, N],
}

const EXTENDED = new Set(EXTENSIONS.map((extension) => `${extension.capability}|${extension.role}`))

describe('la matriz del portal coincide con ADR-TCP-001', () => {
  it('tiene exactamente las filas del documento', () => {
    expect(Object.keys(PORTAL_MATRIX).sort()).toEqual([...Object.keys(ADR_ROWS), ...Object.keys(TC_ROWS)].sort())
  })

  it.each(Object.entries(ADR_ROWS))('%s, celda a celda', (capability, row) => {
    PORTAL_ROLE_ORDER.forEach((role, column) => {
      expect(PORTAL_MATRIX[capability as PortalCapabilityId][role].level, role).toBe(row[column])
    })
  })

  it.each(Object.entries(TC_ROWS))('%s, celda a celda', (capability, row) => {
    PORTAL_ROLE_ORDER.forEach((role, column) => {
      expect(PORTAL_MATRIX[capability as PortalCapabilityId][role].level, role).toBe(row[column])
    })
  })
})

describe('las filas de ADR-001 respetan el ADR', () => {
  it.each(Object.entries(ADR_ROWS))('las columnas de ADR-001 del documento son las de la matriz de eOne · %s', (capability, row) => {
    const adr = PERMISSION_MATRIX[capability as AdrPortalCapabilityId]
    expect([adr.admin_cuenta.level, adr.visualizador.level, adr.gestor_alertas.level]).toEqual(row.slice(4))
  })

  it('admin es Admin de Cuenta y consulta es Visualizador, tal cual', () => {
    for (const capability of ADR_PORTAL_CAPABILITIES) {
      expect(PORTAL_MATRIX[capability].admin.level, capability).toBe(PERMISSION_MATRIX[capability].admin_cuenta.level)
      expect(PORTAL_MATRIX[capability].consulta.level, capability).toBe(PERMISSION_MATRIX[capability].visualizador.level)
    }
  })

  it('consulta no exporta: es la regla «sin exportación» del Visualizador', () => {
    expect(canSession('consulta', 'consumos.export', 'escribir')).toBe(false)
    expect(canSession('consulta', 'consumos.export', 'ver')).toBe(false)
  })

  it('ningún rol del portal baja de lo que hereda de sus roles base: ningún permiso de ADR-001 queda huérfano', () => {
    for (const capability of ADR_PORTAL_CAPABILITIES) {
      for (const role of PORTAL_ROLE_ORDER) {
        const cell = PORTAL_MATRIX[capability][role].level
        expect(levelRank(cell), `${capability} · ${role}`).toBeGreaterThanOrEqual(levelRank(derivedFromAdr(role, capability)))
      }
    }
  })

  it('lo que sube por encima del ADR está declarado como extensión, y nada más', () => {
    for (const capability of ADR_PORTAL_CAPABILITIES) {
      for (const role of PORTAL_ROLE_ORDER) {
        const raised = levelRank(PORTAL_MATRIX[capability][role].level) > levelRank(derivedFromAdr(role, capability))
        expect(raised, `${capability} · ${role}`).toBe(EXTENDED.has(`${capability}|${role}`))
      }
    }
  })

  it('flota contiene al Gestor de Alertas entero: ver, configurar umbrales y destinatarios', () => {
    expect(PORTAL_ROLES.flota.adrBase).toContain('gestor_alertas')
    for (const capability of ['alertas.panel', 'alertas.configurar', 'alertas.destinatarios'] as const) {
      expect(canSession('flota', capability, 'escribir'), capability).toBe(true)
    }
  })

  it('finanzas no configura alertas', () => {
    expect(canSession('finanzas', 'alertas.configurar', 'escribir')).toBe(false)
    expect(canSession('finanzas', 'alertas.destinatarios', 'escribir')).toBe(false)
  })
})

describe('roles internos: solo modo Dev, solo la cuenta activa', () => {
  it('no están entre los roles del portal', () => {
    expect(PORTAL_ROLE_ORDER).not.toContain('admin_edenred')
    expect(PORTAL_ROLE_ORDER).not.toContain('account_manager')
  })

  it('en las filas del ADR conservan su columna, recortada a la cuenta', () => {
    for (const capability of ADR_PORTAL_CAPABILITIES) {
      expect(grantForSession('account_manager', capability).level).toBe(PERMISSION_MATRIX[capability].account_manager.level)
      expect(grantForSession('account_manager', capability).scope).toBe('cuenta')
      expect(grantForSession('admin_edenred', capability).scope).toBe('cuenta')
    }
  })

  it('el Account Manager solo lee los módulos de Ticket Car+', () => {
    for (const capability of TC_CAPABILITIES) {
      expect(canSession('account_manager', capability, 'escribir'), capability).toBe(false)
    }
    expect(canSession('account_manager', 'tc.saldos', 'ver')).toBe(true)
  })
})
