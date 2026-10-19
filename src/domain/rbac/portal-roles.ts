/**
 * ADR-TCP-001 · Roles del portal Ticket Car+ sobre ADR-001.
 * ═════════════════════════════════════════════════════════
 * Estado: PROPUESTO. Documento: `docs/decisions/ADR-TCP-001_roles_portal_TC.md`.
 * Revisión del 19-oct-2026: VIN y edición de unidades solo admin; Peaje
 * repartido entre finanzas (saldos) y flota (reglas y TAGs), con lectura para
 * el resto; TED solo explica; alertas tal cual ADR-001.
 *
 * El portal de cliente de Ticket Car+ expone cuatro roles —admin, flota,
 * finanzas, consulta— y los construye SOBRE los roles cliente de ADR-001:
 *
 *   · admin    = Admin de Cuenta, tal cual;
 *   · consulta = Visualizador, tal cual (solo lectura, sin exportar);
 *   · flota    = Visualizador + Gestor de Alertas + operación de flota de TC+;
 *   · finanzas = Visualizador + exportar reportes + Saldos, Medios de pago y
 *                Facturas.
 *
 * Así ningún permiso de ADR-001 queda huérfano: los tres roles cliente del
 * ADR están contenidos en algún rol del portal. Lo que flota y finanzas añaden
 * por encima del ADR es EXTENSIÓN de Ticket Car+ y está enumerado en
 * `EXTENSIONS`, con su motivo: si una celda sube sin estar ahí, los tests
 * fallan.
 *
 * Los roles internos de Edenred (Admin Edenred, Account Manager) no se
 * asignan en el portal: solo se pueden simular desde el modo Dev, y siempre
 * limitados a la cuenta activa — la analítica no compara entre cuentas.
 */
import {
  PERMISSION_MATRIX,
  type CapabilityId as AdrCapabilityId,
  type Grant,
  type GrantScope,
  type PermissionLevel,
  type RoleId as AdrRoleId,
} from './adr-001'

export type PortalRoleId = 'admin' | 'flota' | 'finanzas' | 'consulta'

/** Roles internos de Edenred. Solo accesibles desde el modo Dev. */
export type InternalRoleId = 'admin_edenred' | 'account_manager'

export type SessionRoleId = PortalRoleId | InternalRoleId

export const PORTAL_ROLE_ORDER: PortalRoleId[] = ['admin', 'flota', 'finanzas', 'consulta']

export type PortalRoleDefinition = {
  id: PortalRoleId
  name: string
  summary: string
  /** Roles cliente de ADR-001 cuyos permisos contiene, sin recortar ninguno. */
  adrBase: AdrRoleId[]
  /** Lo que añade por encima de ADR-001. `null` si es el rol del ADR tal cual. */
  extension: string | null
}

export const PORTAL_ROLES: Record<PortalRoleId, PortalRoleDefinition> = {
  admin: {
    id: 'admin',
    name: 'Administrador',
    summary: 'Todo el portal: usuarios, roles, estructura, parámetros y la operación de combustible, peaje y flota.',
    adrBase: ['admin_cuenta'],
    extension: 'Los módulos transaccionales de Ticket Car+, que ADR-001 no cubre, con nivel completo.',
  },
  flota: {
    id: 'flota',
    name: 'Operador de flota',
    summary: 'Ve consumos, inventario y VIN, gestiona alertas y opera mantenimiento, límites, reglas de peaje y TAGs.',
    adrBase: ['visualizador', 'gestor_alertas'],
    extension:
      'Operación de flota de Ticket Car+: Mantenimiento, Límites, reglas de peaje, alta, baja y reasignación de TAGs, y el VIN en lectura. La edición de unidades queda para admin.',
  },
  finanzas: {
    id: 'finanzas',
    name: 'Finanzas',
    summary: 'Ve consumos e inventario, exporta reportes y opera saldos y recargas, medios de pago y facturas. Sin configurar alertas.',
    adrBase: ['visualizador'],
    extension: 'Exportar reportes, Saldos, Medios de pago, saldos y recargas de peaje y Facturas; reglas y TAGs de peaje en lectura.',
  },
  consulta: {
    id: 'consulta',
    name: 'Consulta',
    summary: 'Solo lectura del resumen, consumos, optimizador, inventario y peaje. Sin exportación ni administración.',
    adrBase: ['visualizador'],
    extension: null,
  },
}

export const INTERNAL_ROLES: Record<InternalRoleId, { id: InternalRoleId; name: string; summary: string }> = {
  admin_edenred: {
    id: 'admin_edenred',
    name: 'Admin Edenred',
    summary: 'Interno. Nivel de ADR-001 sobre la cuenta activa; completo en los módulos de Ticket Car+.',
  },
  account_manager: {
    id: 'account_manager',
    name: 'Account Manager',
    summary: 'Interno. Lectura de la cuenta activa, como en ADR-001; lectura en los módulos de Ticket Car+.',
  },
}

export function sessionRoleName(role: SessionRoleId): string {
  return role in PORTAL_ROLES ? PORTAL_ROLES[role as PortalRoleId].name : INTERNAL_ROLES[role as InternalRoleId].name
}

export function isInternalRole(role: SessionRoleId): role is InternalRoleId {
  return role === 'admin_edenred' || role === 'account_manager'
}

// ── Capacidades del portal ───────────────────────────────────────────────

/** Filas de ADR-001 que el portal materializa. El anexo, EP-08 y la reportería embebida no están en TC+. */
export const ADR_PORTAL_CAPABILITIES = [
  'auth.sso_login',
  'dashboard.kpis',
  'dashboard.widgets',
  'dashboard.filtros',
  'consumos.drivers',
  'consumos.ineficiencias',
  'consumos.export',
  'inventario.ver',
  'inventario.editar',
  'inventario.vin',
  'alertas.panel',
  'alertas.configurar',
  'alertas.destinatarios',
  'admin.usuarios',
  'admin.roles',
  'admin.log',
  'admin.estructura',
] as const satisfies readonly AdrCapabilityId[]

export type AdrPortalCapabilityId = (typeof ADR_PORTAL_CAPABILITIES)[number]

/** Módulos de Ticket Car+ que ADR-001 no cubre. */
export const TC_CAPABILITIES = [
  'tc.saldos',
  'tc.limites',
  'tc.medios_pago',
  'tc.peaje_saldos',
  'tc.peaje_reglas',
  'tc.peaje_medios',
  'tc.mantenimiento',
  'tc.facturas',
  'tc.parametros',
  'tc.asistente',
  'tc.recomendaciones',
] as const

export type TcCapabilityId = (typeof TC_CAPABILITIES)[number]

export type PortalCapabilityId = AdrPortalCapabilityId | TcCapabilityId

export const PORTAL_CAPABILITY_NAMES: Record<PortalCapabilityId, string> = {
  'auth.sso_login': 'SSO / login',
  'dashboard.kpis': 'Resumen · indicadores y gráficas',
  'dashboard.widgets': 'Personalización de widgets',
  'dashboard.filtros': 'Filtros globales',
  'consumos.drivers': 'Análisis de consumo · Reportes e Insights',
  'consumos.ineficiencias': 'Optimizador de estaciones',
  'consumos.export': 'Exportar reportes',
  'inventario.ver': 'Ver vehículos y conductores',
  'inventario.editar': 'Editar unidades (alta, alias, grupo, metadatos)',
  'inventario.vin': 'Tabla de equivalencias VIN',
  'alertas.panel': 'Ver alertas',
  'alertas.configurar': 'Configurar umbrales de alertas',
  'alertas.destinatarios': 'Gestionar destinatarios de alertas',
  'admin.usuarios': 'Gestión de usuarios',
  'admin.roles': 'Asignación de roles',
  'admin.log': 'Log de accesos',
  'admin.estructura': 'Estructura organizacional',
  'tc.saldos': 'Combustible · Saldos y reglas de fondeo',
  'tc.limites': 'Combustible · Reglas y límites',
  'tc.medios_pago': 'Combustible · Medios de pago',
  'tc.peaje_saldos': 'Peaje · Saldos y recargas',
  'tc.peaje_reglas': 'Peaje · Reglas y límites',
  'tc.peaje_medios': 'Peaje · TAGs (alta, baja y reasignación; saldo y consumo por TAG)',
  'tc.mantenimiento': 'Mantenimiento',
  'tc.facturas': 'Empresa · Facturas',
  'tc.parametros': 'Empresa · Parámetros',
  'tc.asistente': 'Asistente TED (solo explica, resume y enlaza)',
  'tc.recomendaciones': 'Enviar recomendación de estación al conductor',
}

const g = (level: PermissionLevel, scope: GrantScope = 'cuenta', note: string | null = null): Grant => ({ level, scope, note })

const C = g('completo')
const L = g('lectura')
const G = g('gestion')
const N = g('ninguno', 'n_a')

/**
 * Matriz rol × capacidad del portal. Orden de columnas: admin | flota | finanzas | consulta.
 *
 * Las filas de ADR-001 salen de su matriz por la regla de cada rol (ver
 * `derivedFromAdr`); las celdas que la superan están en `EXTENSIONS`. Las
 * filas `tc.*` son de Ticket Car+ y no tienen referente en el ADR.
 */
export const PORTAL_MATRIX: Record<PortalCapabilityId, Record<PortalRoleId, Grant>> = {
  'auth.sso_login': { admin: C, flota: C, finanzas: C, consulta: C },
  'dashboard.kpis': { admin: C, flota: L, finanzas: L, consulta: L },
  'dashboard.widgets': { admin: C, flota: N, finanzas: N, consulta: N },
  'dashboard.filtros': { admin: C, flota: C, finanzas: C, consulta: C },
  'consumos.drivers': { admin: L, flota: L, finanzas: L, consulta: L },
  'consumos.ineficiencias': { admin: L, flota: L, finanzas: L, consulta: L },
  'consumos.export': { admin: C, flota: N, finanzas: C, consulta: N },
  'inventario.ver': { admin: L, flota: L, finanzas: L, consulta: L },
  'inventario.editar': { admin: C, flota: N, finanzas: N, consulta: N },
  'inventario.vin': { admin: C, flota: L, finanzas: N, consulta: N },
  'alertas.panel': { admin: L, flota: C, finanzas: L, consulta: L },
  'alertas.configurar': { admin: C, flota: C, finanzas: N, consulta: N },
  'alertas.destinatarios': { admin: C, flota: C, finanzas: N, consulta: N },
  'admin.usuarios': { admin: G, flota: N, finanzas: N, consulta: N },
  'admin.roles': { admin: G, flota: N, finanzas: N, consulta: N },
  'admin.log': { admin: L, flota: N, finanzas: N, consulta: N },
  'admin.estructura': { admin: G, flota: N, finanzas: N, consulta: N },

  'tc.saldos': { admin: C, flota: N, finanzas: C, consulta: N },
  'tc.limites': { admin: C, flota: C, finanzas: N, consulta: N },
  'tc.medios_pago': { admin: C, flota: N, finanzas: C, consulta: N },
  'tc.peaje_saldos': { admin: C, flota: L, finanzas: C, consulta: L },
  'tc.peaje_reglas': { admin: C, flota: C, finanzas: L, consulta: L },
  'tc.peaje_medios': { admin: C, flota: C, finanzas: L, consulta: L },
  'tc.mantenimiento': { admin: C, flota: C, finanzas: N, consulta: N },
  'tc.facturas': { admin: C, flota: N, finanzas: C, consulta: N },
  'tc.parametros': { admin: G, flota: N, finanzas: N, consulta: N },
  'tc.asistente': { admin: L, flota: L, finanzas: L, consulta: L },
  'tc.recomendaciones': { admin: C, flota: C, finanzas: N, consulta: N },
}

/** Celdas de filas de ADR-001 que el portal sube por encima de lo que el ADR concede al rol base. */
export const EXTENSIONS: { capability: AdrPortalCapabilityId; role: PortalRoleId; reason: string }[] = [
  { capability: 'inventario.vin', role: 'flota', reason: 'Flota ve la tabla de equivalencias VIN en lectura; editarla sigue siendo solo de admin, como en ADR-001.' },
  { capability: 'consumos.export', role: 'finanzas', reason: 'Finanzas exporta reportes para conciliación y presupuesto.' },
]

// ── Derivación desde ADR-001 ─────────────────────────────────────────────

const RANK: Record<PermissionLevel, number> = {
  ninguno: 0,
  sin_gobernar: 0,
  limitado: 1,
  lectura: 2,
  completo: 3,
  gestion: 4,
}

export function levelRank(level: PermissionLevel): number {
  return RANK[level]
}

/**
 * Nivel que el rol del portal hereda de ADR-001 sobre una fila del ADR: el
 * mayor de sus roles base. Es la regla «X = Visualizador + Gestor de Alertas»
 * escrita como función, para que los tests la comparen con la matriz.
 */
export function derivedFromAdr(role: PortalRoleId, capability: AdrPortalCapabilityId): PermissionLevel {
  return PORTAL_ROLES[role].adrBase
    .map((base) => PERMISSION_MATRIX[capability][base].level)
    .reduce((best, level) => (RANK[level] > RANK[best] ? level : best), 'ninguno' as PermissionLevel)
}

// ── Decisión de acceso ───────────────────────────────────────────────────

export type Intent = 'ver' | 'escribir' | 'administrar'

const SATISFIES: Record<Intent, PermissionLevel[]> = {
  ver: ['completo', 'lectura', 'limitado', 'gestion'],
  escribir: ['completo', 'gestion'],
  administrar: ['gestion'],
}

const isAdrRow = (capability: PortalCapabilityId): capability is AdrPortalCapabilityId =>
  (ADR_PORTAL_CAPABILITIES as readonly string[]).includes(capability)

/**
 * Celda que rige a un rol de sesión.
 *
 * Los internos toman su columna de ADR-001 en las filas del ADR —con el
 * alcance recortado a la cuenta activa— y en las filas de Ticket Car+ el Admin
 * Edenred opera y el Account Manager solo lee. El envío al conductor es una
 * acción, así que la lectura no le sirve de nada al AM: queda sin acceso.
 */
export function grantForSession(role: SessionRoleId, capability: PortalCapabilityId): Grant {
  if (!isInternalRole(role)) return PORTAL_MATRIX[capability][role]
  if (isAdrRow(capability)) return { ...PERMISSION_MATRIX[capability][role], scope: 'cuenta' }
  if (role === 'admin_edenred') return capability === 'tc.parametros' ? G : C
  return capability === 'tc.recomendaciones' ? N : L
}

export function canSession(role: SessionRoleId, capability: PortalCapabilityId, intent: Intent = 'ver'): boolean {
  return SATISFIES[intent].includes(grantForSession(role, capability).level)
}
