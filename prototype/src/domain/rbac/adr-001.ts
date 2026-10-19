/**
 * ADR-001 · Control de acceso basado en roles (RBAC).
 * ══════════════════════════════════════════════════
 * Transcripción literal de la decisión de arquitectura. Es la FUENTE DE VERDAD
 * del control de acceso de eOne y el fixture de los tests automatizados: si la
 * matriz cambia aquí, cambian la navegación, los paneles y la suite a la vez.
 *
 * Estado: PROPUESTO — pendiente de aprobación por Ulises Aquino.
 * Nada de lo que hay aquí se ha dado por aprobado en el prototipo.
 *
 * Una nota sobre el anexo: la matriz del ADR cubre los módulos de producto
 * (EP-02 a EP-05 y US-005) y no menciona los módulos de plataforma de EP-01
 * —ingesta, normalización y warehouse— que este prototipo ya tiene
 * construidos. Dejarlos sin gobernar contradiría el criterio «sin excepción»,
 * así que se declararon en un ANEXO restringido a Admin Edenred.
 * El anexo está RATIFICADO y gobierna igual que el resto de la matriz.
 */

export type RoleId =
  | 'admin_edenred'
  | 'account_manager'
  | 'admin_cuenta'
  | 'visualizador'
  | 'gestor_alertas'

/** Nivel de permiso tal como lo define la sección 4 del ADR. */
export type PermissionLevel =
  /** Leer, escribir y ejecutar. */
  | 'completo'
  /** Solo ver. */
  | 'lectura'
  /** Parcial, según la nota de la celda. */
  | 'limitado'
  /** Administra la configuración. */
  | 'gestion'
  /** Sin acceso: el módulo no es visible. */
  | 'ninguno'
  /**
   * NO ES UN NIVEL DE ACCESO: es la ausencia de decisión — EP-08 · US-050.
   * ═══════════════════════════════════════════════════════════════════════
   * La matriz de ADR-001 cubre EP-02 a EP-05 y US-005, más el anexo de
   * plataforma. **EP-08 (Benchmarking y Comparativas) no aparece en ninguna
   * parte del documento**, y esa es una laguna real del ADR, no un despiste
   * de este prototipo.
   *
   * Ante eso había dos salidas malas y una decente:
   *
   *   · inventar una fila —«Admin Edenred completo, Visualizador lectura»…—
   *     y dejar en el código, con la misma forma que las filas reales, algo
   *     que nadie ha decidido. Es lo peor: al leer la matriz no habría manera
   *     de distinguir lo acordado de lo supuesto;
   *   · dejar el módulo fuera de la navegación hasta que se decida, que es
   *     no entregar la historia;
   *   · declarar explícitamente que NO está gobernado.
   *
   * Esto es lo tercero. `sin_gobernar` es el mismo valor para los cinco roles
   * —no hay matriz que inventar—, permite VER y nada más, y se propaga a la
   * pantalla de roles y a «Mi acceso», donde sale etiquetado como pendiente.
   * El hueco se ve en el producto en vez de taparse.
   *
   * ── Segundo hueco: reportería embebida — EP-04 · US-090 ───────────────
   * El mismo valor lo usa `reporteria.envio`, y conviene decir por qué no es
   * una excepción cómoda: EP-04 SÍ está en la matriz. Lo que está es
   * «Inventario de flota», con sus tres celdas —ver, editar, VIN—. El flujo
   * US-090 → 093 comparte el número de épica y nada más. Reutilizar
   * `inventario.ver` para gobernar el envío de reportes habría sido peor que
   * inventar una fila, porque habría parecido una decisión tomada.
   *
   * Ese hueco tiene una consecuencia que EP-08 no tenía y que hay que mirar de
   * frente: `sin_gobernar` solo satisface la intención «ver». US-090 es una
   * historia de ESCRIBIR —el AM envía—, así que la matriz, por sí sola, deja
   * la historia sin actor. La salida está en `STORY_ACTORS`, abajo: el actor
   * lo pone la historia, queda marcado como no ratificado, y no puede tocar
   * ninguna capacidad que el ADR sí gobierne.
   *
   * Cuando Ulises Aquino resuelva estas dos lagunas, esta constante desaparece
   * y sus capacidades pasan a tener filas de verdad.
   */
  | 'sin_gobernar'

/** Alcance sobre el que se ejerce el permiso. */
export type GrantScope = 'global' | 'cuenta' | 'asignadas' | 'n_a'

export type Grant = {
  level: PermissionLevel
  scope: GrantScope
  /** Nota literal de la celda del ADR, cuando la tiene. */
  note: string | null
}

// ── Metadatos ────────────────────────────────────────────────────────────

export const ADR_001 = {
  id: 'ADR-001',
  title: 'Control de acceso basado en roles (RBAC)',
  product: 'eOne — Edenred One Mobility · Fase NOW',
  status: 'propuesto' as const,
  statusLabel: 'PROPUESTO — pendiente de aprobación',
  pendingApprovalBy: 'Ulises Aquino',
  date: '2025-07-28',
  author: 'Álvaro Innerarity — Product Manager',
  relatedStory: 'US-005 · RBAC — Fase NOW · Sprint 2',
  context:
    'eOne es una plataforma multi-tenant de datos de movilidad B2B que consolida datos de Autoconsumo, TicketCar+, Sentinel y sistemas propios del cliente. Sirve a dos universos de usuarios: internos de Edenred (administradores y account managers) y usuarios del cliente (administradores de flota, supervisores y operadores). La ausencia de un modelo de control de acceso definido es el bloqueador transversal más crítico del backlog de Fase NOW.',
  decision:
    'Se adopta un modelo RBAC con cinco roles estáticos asignables por usuario. Los permisos se aplican por módulo y están restringidos al scope del tenant (cuenta) del usuario, con excepción de los roles internos de Edenred que operan de forma cross-tenant.',
  prdRequirements: [
    'Control de acceso basado en roles (RBAC), permisos configurables a nivel de módulo.',
    'Log de accesos y cambios de configuración conservados durante al menos 12 meses, de forma inmutable.',
    'Un usuario solo puede ver datos de su cuenta/flota asignada.',
    'Autenticación multifactor obligatoria para cuentas Enterprise, integrada con SSO corporativo de Edenred.',
  ],
} as const

// ── Sección 3 · Roles ────────────────────────────────────────────────────

export type RoleOrigin = 'interno_edenred' | 'cliente'

export type RoleDefinition = {
  id: RoleId
  name: string
  origin: RoleOrigin
  summary: string
  /** `true` si dispone del selector de cuenta en sesión. */
  hasAccountSwitcher: boolean
  /** Alcance de datos del rol. */
  tenantScope: 'cross_tenant' | 'cartera' | 'cuenta_propia'
  /** Roles que puede conceder. Vacío = no administra roles. */
  grantableRoles: RoleId[]
}

export const ROLE_ORDER: RoleId[] = [
  'admin_edenred',
  'account_manager',
  'admin_cuenta',
  'visualizador',
  'gestor_alertas',
]

export const ROLES: Record<RoleId, RoleDefinition> = {
  admin_edenred: {
    id: 'admin_edenred',
    name: 'Admin Edenred',
    origin: 'interno_edenred',
    summary:
      'Acceso total a todas las cuentas. Configura la plataforma globalmente, gestiona usuarios de cualquier tenant y tiene visibilidad cross-account. Único rol que puede crear otros Admin Edenred.',
    hasAccountSwitcher: false,
    tenantScope: 'cross_tenant',
    grantableRoles: ['admin_edenred', 'account_manager', 'admin_cuenta', 'visualizador', 'gestor_alertas'],
  },
  account_manager: {
    id: 'account_manager',
    name: 'Account Manager',
    origin: 'interno_edenred',
    summary:
      'Lectura de las cuentas asignadas en su cartera. Usa el selector de cuenta en sesión para alternar entre ellas. Mismos datos que un Admin de Cuenta del cliente, sin permisos de escritura ni RBAC.',
    hasAccountSwitcher: true,
    tenantScope: 'cartera',
    grantableRoles: [],
  },
  admin_cuenta: {
    id: 'admin_cuenta',
    name: 'Admin de Cuenta',
    origin: 'cliente',
    summary:
      'Administrador de la empresa cliente. Gestiona usuarios y roles dentro de su cuenta, configura alertas, edita inventario y define la estructura organizacional de su flota. No puede acceder a otras cuentas.',
    hasAccountSwitcher: false,
    tenantScope: 'cuenta_propia',
    // No puede conceder roles internos de Edenred: escalaría privilegios.
    grantableRoles: ['admin_cuenta', 'visualizador', 'gestor_alertas'],
  },
  visualizador: {
    id: 'visualizador',
    name: 'Visualizador',
    origin: 'cliente',
    summary:
      'Perfil de solo lectura del dashboard, consumos e inventario de su empresa. Sin exportación ni administración. Para directivos y supervisores.',
    hasAccountSwitcher: false,
    tenantScope: 'cuenta_propia',
    grantableRoles: [],
  },
  gestor_alertas: {
    id: 'gestor_alertas',
    name: 'Gestor de Alertas',
    origin: 'cliente',
    summary:
      'Acceso exclusivo al módulo de alertas: ver, configurar umbrales y gestionar destinatarios. Sin visibilidad de consumos ni inventario. Para responsables operativos de turno.',
    hasAccountSwitcher: false,
    tenantScope: 'cuenta_propia',
    grantableRoles: [],
  },
}

export const ALL_ROLES: RoleDefinition[] = ROLE_ORDER.map((id) => ROLES[id])

// ── Sección 4 · Matriz de permisos por módulo ────────────────────────────

export type ModuleGroupId =
  | 'auth'
  | 'dashboard'
  | 'consumos'
  | 'inventario'
  | 'alertas'
  | 'admin'
  | 'benchmarking'
  | 'reporteria'
  | 'anexo_plataforma'

export type ModuleGroup = {
  id: ModuleGroupId
  name: string
  epic: string
  /**
   * `true` cuando el grupo está gobernado por una decisión vigente.
   *
   * Lo están todos menos `benchmarking` y `reporteria`: el anexo de plataforma
   * se ratificó tras la aprobación inicial, pero ni EP-08 ni el flujo de
   * reportería embebida aparecen en el documento — ver `sin_gobernar`.
   */
  inAdr: boolean
  /** Matiz de gobierno del grupo, si lo tiene. */
  note: string | null
}

export const MODULE_GROUPS: ModuleGroup[] = [
  { id: 'auth', name: 'Autenticación y sesión', epic: 'EP-01', inAdr: true, note: null },
  { id: 'dashboard', name: 'Dashboard principal', epic: 'EP-02', inAdr: true, note: null },
  { id: 'consumos', name: 'Gestión de consumos', epic: 'EP-03', inAdr: true, note: null },
  { id: 'inventario', name: 'Inventario de flota', epic: 'EP-04', inAdr: true, note: null },
  { id: 'alertas', name: 'Alertas y notificaciones', epic: 'EP-05', inAdr: true, note: null },
  { id: 'admin', name: 'Administración y RBAC', epic: 'US-005', inAdr: true, note: null },
  {
    id: 'benchmarking',
    name: 'Benchmarking y comparativas',
    epic: 'EP-08',
    /**
     * `inAdr: false` no es un matiz de gobierno: es que la épica entera falta
     * en el documento. Ver `sin_gobernar`.
     */
    inAdr: false,
    // La nota se lee en pantalla, así que nombra el MÓDULO y no su número de
     // épica: el barrido previo al cliente piloto sacó el mapeo historia↔épica de la
     // interfaz. El campo `epic` de arriba se queda: es transcripción del ADR.
    note: 'Módulo ausente de ADR-001 — pendiente de decisión de Ulises Aquino',
  },
  {
    id: 'reporteria',
    name: 'Reportería embebida',
    epic: 'EP-04',
    /**
     * El segundo hueco, y el más fácil de pasar por alto: EP-04 SÍ tiene fila
     * en el ADR, pero esa fila gobierna «Inventario de flota» —ver, editar,
     * VIN—. El flujo de reportería embebida (US-090 → 093) comparte número de
     * épica y no comparte ni una celda con ella.
     *
     * Colgar el envío de reportes de `inventario.ver` habría hecho pasar por
     * gobernado algo que nadie ha decidido, con el agravante de que la matriz
     * lo habría respaldado con una fila real. Ver `sin_gobernar`.
     */
    inAdr: false,
    note: 'Flujo ausente de ADR-001 — la fila que el documento sí trae gobierna el inventario de flota, no la reportería',
  },
  {
    id: 'anexo_plataforma',
    name: 'Anexo · Plataforma de datos',
    epic: 'EP-01',
    // Ratificado: gobierna igual que el resto de la matriz.
    inAdr: true,
    note: 'Admin Edenred exclusivo',
  },
]

export type CapabilityId =
  | 'auth.sso_login'
  | 'auth.account_switcher'
  | 'dashboard.kpis'
  | 'dashboard.widgets'
  | 'dashboard.filtros'
  | 'consumos.drivers'
  | 'consumos.ineficiencias'
  | 'consumos.export'
  | 'inventario.ver'
  | 'inventario.editar'
  | 'inventario.vin'
  | 'alertas.panel'
  | 'alertas.configurar'
  | 'alertas.destinatarios'
  | 'admin.usuarios'
  | 'admin.roles'
  | 'admin.log'
  | 'admin.estructura'
  | 'comparativas.ver'
  | 'reporteria.envio'
  | 'reporteria.catalogo'
  | 'anexo.ingesta'
  | 'anexo.normalizacion'
  | 'anexo.warehouse'

/** Releases del producto. El eje de ENTREGA, no el de alcance. */
export type ReleaseNumber = 1 | 2 | 3 | 4 | 5

export type Capability = {
  id: CapabilityId
  group: ModuleGroupId
  name: string
  /** Sección de la aplicación que materializa esta capacidad, si existe. */
  section: string | null
  /** `false` mientras el módulo esté sin construir en el prototipo. */
  built: boolean
  /**
   * Release en la que la capacidad entra en producto — `null` si el backlog
   * todavía no le ha asignado ninguna.
   * ════════════════════════════════════════════════════════════════════════
   * Contesta a una pregunta DISTINTA de `built`: aquella dice si hay pantalla
   * detrás, esta dice si toca ya. Separarlas es lo que permite que algo
   * construido no se enseñe —el benchmark sectorial de EP-08— y que algo
   * pendiente tenga sitio reservado sin aparecer.
   *
   * `null` NO significa «todas»: significa que nadie ha decidido, y hasta que
   * se decida no se muestra. Es el mismo criterio que la columna «Release» del
   * Backlog Maestro, donde ese hueco se escribe «⚠ Pendiente».
   */
  release: ReleaseNumber | null
}

export const CAPABILITIES: Capability[] = [
  { id: 'auth.sso_login', group: 'auth', name: 'SSO / login', section: 'access', built: true, release: 1 },
  { id: 'auth.account_switcher', group: 'auth', name: 'Selector de cuenta', section: null, built: true, release: 1 },

  { id: 'dashboard.kpis', group: 'dashboard', name: 'KPIs y widgets', section: 'dashboard', built: true, release: 1 },
  { id: 'dashboard.widgets', group: 'dashboard', name: 'Personalización de widgets', section: 'dashboard', built: true, release: 1 },
  { id: 'dashboard.filtros', group: 'dashboard', name: 'Filtros globales', section: 'dashboard', built: true, release: 1 },

  // US-016 la construyó: el ranking de drivers de gasto abre la sección de
  // consumos. «Drivers» es el término contable —qué explica el gasto—, no el
  // conductor; el conductor es uno de los nueve ejes por los que se pregunta.
  { id: 'consumos.drivers', group: 'consumos', name: 'Análisis de drivers', section: 'consumption', built: true, release: 1 },
  /**
   * EP-03 · Optimizador de cargas — Sprint 8 (US-018, US-020, US-086, US-087,
   * US-111, US-112, US-113, US-023).
   *
   * La fila ya estaba decidida en ADR-001 y el módulo, sin construir: es el
   * caso NORMAL, el mismo que US-097 con el inventario. Detectar qué cargas
   * podrían hacerse en una estación más barata ES detectar una ineficiencia,
   * así que el optimizador cuelga de esta capacidad en vez de estrenar una
   * fila que habría que inventar. Va como pestaña de Consumos.
   *
   * La release pasa de 1 a 2 en el Sprint 8: el ahorro acumulado salió de
   * Release 1 precisamente porque el optimizador no estaba (ver `KpiGrid`).
   */
  {
    id: 'consumos.ineficiencias',
    group: 'consumos',
    name: 'Detección de ineficiencias · optimizador de cargas',
    section: 'consumption',
    built: true,
    release: 2,
  },
  /**
   * EP-04 · US-024 — Reporte consolidado bajo demanda. Sprint 8.
   *
   * «Exportar reportes» es la fila del ADR que gobierna exactamente esto, con
   * el Visualizador fuera («sin exportación», ADR-001 §3). Que la historia sea
   * EP-04 y la fila esté en el grupo de consumos (EP-03) es otra vez la
   * colisión de numeración de EP-04, documentada en `FleetCatalogView`.
   * Sección propia y NO la de `reporting`: aquella es el flujo de envío del
   * AM (US-090/091) y no se mezclan.
   */
  {
    id: 'consumos.export',
    group: 'consumos',
    name: 'Exportar reportes · reporte consolidado',
    section: 'reports',
    built: true,
    release: 2,
  },

  /**
   * Construida en EP-02 · US-097 — Catálogo de vehículos.
   *
   * No estrena nada: la fila estaba escrita desde el primer día y con las
   * cinco celdas decididas. Lo único que cambia aquí es `built`, que dice si
   * hay pantalla detrás. Es el caso NORMAL —una historia que se apoya en una
   * decisión vigente— y conviene señalarlo porque las tres anteriores no
   * pudieron serlo: su épica falta en el documento.
   */
  { id: 'inventario.ver', group: 'inventario', name: 'Ver inventario', section: 'fleet', built: true, release: 1 },
  /**
   * Siguen SIN construir, y a propósito.
   *
   * US-097 es de consultar. Dar de alta, editar y conciliar bastidores son
   * operaciones de escritura que ninguna historia ha pedido todavía; activarlas
   * de paso habría puesto en pantalla dos permisos que nadie ejerció. La fila
   * las espera con su nivel ya decidido para el día que llegue su historia.
   */
  { id: 'inventario.editar', group: 'inventario', name: 'Editar unidades', section: null, built: false, release: null },
  { id: 'inventario.vin', group: 'inventario', name: 'Tabla de equivalencias VIN', section: null, built: false, release: 2 },

  { id: 'alertas.panel', group: 'alertas', name: 'Ver panel de alertas', section: 'alerts', built: true, release: null },
  { id: 'alertas.configurar', group: 'alertas', name: 'Configurar alertas', section: 'alerts', built: true, release: null },
  { id: 'alertas.destinatarios', group: 'alertas', name: 'Gestionar destinatarios', section: 'alerts', built: true, release: null },

  { id: 'admin.usuarios', group: 'admin', name: 'Gestión de usuarios', section: 'rbac', built: true, release: 1 },
  { id: 'admin.roles', group: 'admin', name: 'Asignación de roles', section: 'rbac', built: true, release: 1 },
  { id: 'admin.log', group: 'admin', name: 'Log de accesos', section: 'audit', built: true, release: 1 },
  { id: 'admin.estructura', group: 'admin', name: 'Estructura organizacional', section: 'structure', built: true, release: 1 },

  // ── Benchmarking y comparativas (EP-08) ─────────────────────────────
  // Construida y SIN gobernar. Ver `sin_gobernar` arriba.
  {
    id: 'comparativas.ver',
    group: 'benchmarking',
    name: 'Comparativas vs. periodos anteriores',
    section: 'benchmarking',
    built: true,
    release: 1,
  },

  // ── Reportería embebida (EP-04 · US-090) ────────────────────────────
  // Construida y SIN gobernar, por el motivo que explica su grupo: la fila
  // EP-04 del ADR es la de Inventario. Ver `sin_gobernar` y `STORY_ACTORS`.
  {
    id: 'reporteria.envio',
    group: 'reporteria',
    // El identificador se queda como nació —renombrarlo no aporta y rompe
    // referencias—, pero el nombre visible cubre ya los dos lados: US-090
    // manda, US-091 sanea, sube y avisa. Ver `STORY_ACTORS`.
    name: 'Envío y publicación de reportes embebidos',
    section: 'reporting',
    built: true,
    release: 1,
  },
  /**
   * El otro lado del módulo: quien LEE los reportes — EP-04 · US-092.
   * ════════════════════════════════════════════════════════════════
   * Capacidad separada, y conviene decir por qué no se colgó de la anterior.
   *
   * `reporteria.envio` gobierna la CANALIZACIÓN: componer, sanear, subir,
   * avisar. Es trabajo de Edenred sobre el reporte de un cliente. Esta
   * gobierna el CONSUMO: el catálogo que ve la empresa cliente y el reporte
   * que abre. Son dos preguntas distintas —quién opera la tubería y quién lee
   * lo que sale por ella— y el día que Ulises Aquino resuelva EP-04 va a tener
   * que contestarlas por separado: no hay ninguna combinación sensata en la
   * que «puede publicar» implique «puede leer» ni al revés.
   *
   * Meterlas en una sola capacidad habría obligado a esa fila imposible. Las
   * dos están `sin_gobernar`, así que declarar dos no inventa nada: declara
   * que lo que falta por decidir son dos cosas, no una.
   */
  {
    id: 'reporteria.catalogo',
    group: 'reporteria',
    name: 'Catálogo de reportes publicados',
    section: 'reporting',
    built: true,
    release: 1,
  },

  { id: 'anexo.ingesta', group: 'anexo_plataforma', name: 'Ingesta de datos', section: 'ingestion', built: true, release: null },
  { id: 'anexo.normalizacion', group: 'anexo_plataforma', name: 'Normalización', section: 'normalization', built: true, release: null },
  { id: 'anexo.warehouse', group: 'anexo_plataforma', name: 'Data Warehouse', section: 'warehouse', built: true, release: 1 },
]

const g = (level: PermissionLevel, scope: GrantScope = 'cuenta', note: string | null = null): Grant => ({
  level,
  scope,
  note,
})

const NONE = g('ninguno', 'n_a')
const NA = g('ninguno', 'n_a', 'No aplica a este rol')

/**
 * La fila entera sin gobernar — EP-08 y EP-04 · US-090.
 * Ver `PermissionLevel.sin_gobernar`.
 *
 * La celda es LA MISMA para los cinco roles a propósito: si variara de un rol
 * a otro ya sería una matriz inventada, que es justo lo que no se puede hacer
 * aquí. La nota, en cambio, va por capacidad: los dos huecos son huecos por
 * motivos distintos, y quien lea la matriz tiene que poder saber cuál está
 * mirando sin salir de ella.
 */
function ungovernedRow(note: string): Record<RoleId, Grant> {
  const cell = g('sin_gobernar', 'n_a', note)
  return {
    admin_edenred: cell,
    account_manager: cell,
    admin_cuenta: cell,
    visualizador: cell,
    gestor_alertas: cell,
  }
}

/**
 * Matriz de la sección 4, celda a celda.
 * Orden de columnas: Admin Edenred | AM Edenred | Admin de Cuenta | Visualizador | Gestor de Alertas
 */
export const PERMISSION_MATRIX: Record<CapabilityId, Record<RoleId, Grant>> = {
  // ── Autenticación y sesión ──────────────────────────────────────────
  'auth.sso_login': {
    admin_edenred: g('completo', 'global'),
    account_manager: g('completo', 'asignadas'),
    admin_cuenta: g('completo'),
    visualizador: g('completo'),
    gestor_alertas: g('completo'),
  },
  'auth.account_switcher': {
    admin_edenred: g('completo', 'global'),
    account_manager: g('completo', 'asignadas', 'Solo las cuentas de su cartera'),
    admin_cuenta: NA,
    visualizador: NA,
    gestor_alertas: NA,
  },

  // ── Dashboard principal (EP-02) ─────────────────────────────────────
  'dashboard.kpis': {
    admin_edenred: g('completo', 'global'),
    account_manager: g('lectura', 'asignadas'),
    admin_cuenta: g('completo'),
    visualizador: g('lectura'),
    gestor_alertas: g('lectura'),
  },
  'dashboard.widgets': {
    admin_edenred: g('completo', 'global'),
    account_manager: g('limitado', 'asignadas', 'Solo vista: no puede personalizar'),
    admin_cuenta: g('completo'),
    visualizador: NONE,
    gestor_alertas: NONE,
  },
  'dashboard.filtros': {
    admin_edenred: g('completo', 'global'),
    account_manager: g('completo', 'asignadas'),
    admin_cuenta: g('completo'),
    visualizador: g('completo'),
    gestor_alertas: g('limitado', 'cuenta', 'Solo filtros del módulo de alertas'),
  },

  // ── Gestión de consumos (EP-03) ─────────────────────────────────────
  'consumos.drivers': {
    admin_edenred: g('completo', 'global'),
    account_manager: g('lectura', 'asignadas'),
    admin_cuenta: g('lectura'),
    visualizador: g('lectura'),
    gestor_alertas: NONE,
  },
  'consumos.ineficiencias': {
    admin_edenred: g('completo', 'global'),
    account_manager: g('lectura', 'asignadas'),
    admin_cuenta: g('lectura'),
    visualizador: g('lectura'),
    gestor_alertas: NONE,
  },
  'consumos.export': {
    admin_edenred: g('completo', 'global'),
    account_manager: g('completo', 'asignadas'),
    admin_cuenta: g('completo'),
    visualizador: NONE,
    gestor_alertas: NONE,
  },

  // ── Inventario de flota (EP-04) ─────────────────────────────────────
  'inventario.ver': {
    admin_edenred: g('completo', 'global'),
    account_manager: g('lectura', 'asignadas'),
    admin_cuenta: g('lectura'),
    visualizador: g('lectura'),
    gestor_alertas: NONE,
  },
  'inventario.editar': {
    admin_edenred: g('completo', 'global'),
    account_manager: NONE,
    admin_cuenta: g('completo'),
    visualizador: NONE,
    gestor_alertas: NONE,
  },
  'inventario.vin': {
    admin_edenred: g('completo', 'global'),
    account_manager: NONE,
    admin_cuenta: g('completo'),
    visualizador: NONE,
    gestor_alertas: NONE,
  },

  // ── Alertas y notificaciones (EP-05) ────────────────────────────────
  'alertas.panel': {
    admin_edenred: g('completo', 'global'),
    account_manager: g('lectura', 'asignadas'),
    admin_cuenta: g('lectura'),
    visualizador: g('lectura'),
    gestor_alertas: g('completo'),
  },
  'alertas.configurar': {
    admin_edenred: g('completo', 'global'),
    account_manager: NONE,
    admin_cuenta: g('completo'),
    visualizador: NONE,
    gestor_alertas: g('completo'),
  },
  'alertas.destinatarios': {
    admin_edenred: g('completo', 'global'),
    account_manager: NONE,
    admin_cuenta: g('completo'),
    visualizador: NONE,
    gestor_alertas: g('completo'),
  },

  // ── Administración y RBAC (US-005) ──────────────────────────────────
  'admin.usuarios': {
    admin_edenred: g('gestion', 'global'),
    account_manager: NONE,
    admin_cuenta: g('gestion', 'cuenta', 'Solo su cuenta'),
    visualizador: NONE,
    gestor_alertas: NONE,
  },
  'admin.roles': {
    admin_edenred: g('gestion', 'global'),
    account_manager: NONE,
    admin_cuenta: g('gestion', 'cuenta', 'Solo su cuenta'),
    visualizador: NONE,
    gestor_alertas: NONE,
  },
  'admin.log': {
    // Ningún rol tiene escritura sobre el log: regla transversal 5.
    admin_edenred: g('lectura', 'global'),
    account_manager: NONE,
    admin_cuenta: g('lectura', 'cuenta', 'Solo su cuenta'),
    visualizador: NONE,
    gestor_alertas: NONE,
  },
  'admin.estructura': {
    admin_edenred: g('gestion', 'global'),
    account_manager: NONE,
    admin_cuenta: g('gestion', 'cuenta', 'Solo su cuenta'),
    visualizador: NONE,
    gestor_alertas: NONE,
  },

  // ── Benchmarking (EP-08) · SIN GOBERNAR ─────────────────────────────
  // La fila es idéntica para los cinco roles porque no hay decisión que
  // transcribir. Cualquier diferencia entre columnas sería inventada.
  'comparativas.ver': ungovernedRow(
    'Benchmarking y comparativas no está en ADR-001: pendiente de decisión de producto',
  ),

  // ── Reportería embebida (EP-04 · US-090) · SIN GOBERNAR ─────────────
  // La misma fila, por el mismo motivo. Que EP-04 aparezca en el documento no
  // gobierna este flujo: lo que el documento gobierna bajo EP-04 es el
  // inventario de flota. Ver el grupo `reporteria`.
  'reporteria.envio': ungovernedRow(
    'La reportería embebida no está en ADR-001: la fila que el documento sí trae gobierna el inventario de flota',
  ),
  'reporteria.catalogo': ungovernedRow(
    'Quién lee los reportes publicados tampoco está decidido: es la otra mitad de la misma laguna',
  ),

  // ── ANEXO · ratificado · exclusivo de Admin Edenred ─────────────────
  'anexo.ingesta': {
    admin_edenred: g('completo', 'global'),
    account_manager: NONE,
    admin_cuenta: NONE,
    visualizador: NONE,
    gestor_alertas: NONE,
  },
  'anexo.normalizacion': {
    admin_edenred: g('completo', 'global'),
    account_manager: NONE,
    admin_cuenta: NONE,
    visualizador: NONE,
    gestor_alertas: NONE,
  },
  'anexo.warehouse': {
    admin_edenred: g('completo', 'global'),
    account_manager: NONE,
    admin_cuenta: NONE,
    visualizador: NONE,
    gestor_alertas: NONE,
  },
}

// ── Actores declarados por la historia, no por el ADR ────────────────────

/**
 * Quién ejecuta una acción que ADR-001 no gobierna — EP-04 · US-090.
 * ═════════════════════════════════════════════════════════════════
 * Esto NO es una segunda matriz de permisos. Es el mínimo que hace falta para
 * poder entregar una historia de escritura sobre un módulo sin fila, sin que
 * el código acabe decidiendo lo que le toca decidir a producto.
 *
 * El problema, en corto: `sin_gobernar` deja ver y nada más —y hace bien, ver
 * `PermissionLevel.sin_gobernar`—. US-090 es «el AM envía». Con la matriz
 * sola, el envío no lo puede hacer nadie y la historia no existe. Las salidas
 * eran las de siempre:
 *
 *   · inventar la fila de EP-04 · reportería —«AM completo, Admin de Cuenta
 *     lectura»…—: sería una decisión de gobierno tomada por el código, con la
 *     misma pinta que las filas de verdad;
 *   · dejar que envíe cualquiera, porque total, no hay fila: el Visualizador
 *     mandándole reportes al Admin;
 *   · o transcribir el actor QUE LA HISTORIA YA NOMBRA, marcarlo como no
 *     ratificado y enseñarlo así en pantalla.
 *
 * Esto es lo tercero. «Dado que soy Account Manager» es una frase del backlog
 * refinado con Joaquín Miguens y Jared García; no la inventa el prototipo. Lo
 * que aporta este registro es que se vea de dónde sale y que no pueda crecer:
 *
 *   1 · una regla de historia SOLO puede apuntar a una capacidad cuyas cinco
 *       celdas sean `sin_gobernar`. Sobre una capacidad gobernada manda la
 *       matriz, siempre — lo comprueba `canActAsStoryActor` en tiempo de
 *       ejecución y lo fija un test;
 *   2 · nunca amplía nada: solo puede restringir a un rol lo que la matriz ya
 *       dejaba pasar como «ver»;
 *   3 · el aislamiento de tenant sigue aplicándose antes, porque es una regla
 *       transversal del ADR y no depende de ninguna fila.
 *
 * El día que EP-04 · reportería tenga fila, esta entrada se borra y el envío
 * cuelga de una capacidad de verdad. Mientras tanto, el hueco se ve.
 */
export type StoryActor = {
  /** Historia que nombra al actor. */
  storyId: string
  /** Capacidad sobre la que actúa. Tiene que estar sin gobernar. */
  capability: CapabilityId
  /** Rol que la historia nombra. */
  role: RoleId
  /** Frase de la historia de la que sale, literal. */
  source: string
  /** Siempre `false`: si fuera `true`, tendría fila y esto sobraría. */
  ratifiedInAdr: false
}

export const STORY_ACTORS: StoryActor[] = [
  {
    storyId: 'US-090',
    capability: 'reporteria.envio',
    role: 'account_manager',
    source: '«Dado que soy Account Manager, cuando quiero enviar el reporte HTML…»',
    ratifiedInAdr: false,
  },
  /**
   * La otra mitad del mismo módulo — US-091.
   *
   * Misma capacidad y otro actor, y eso no es una contradicción: la capacidad
   * es «reportería embebida», que tiene dos lados. El AM manda y el Admin
   * publica, y ninguno de los dos hace lo del otro. Con una fila de verdad en
   * el ADR esto serían dos niveles distintos en la misma fila; sin ella, son
   * dos actores declarados por dos historias.
   */
  {
    storyId: 'US-091',
    capability: 'reporteria.envio',
    role: 'admin_edenred',
    source: '«Dado que soy Admin de Edenred, cuando quiero subir el HTML recibido a Azure Blob Storage…»',
    ratifiedInAdr: false,
  },
  /**
   * US-092 NO tiene entrada aquí, y es deliberado.
   * ═════════════════════════════════════════════
   * «Dado que soy cliente, cuando quiero ver el listado de reportes
   * embebidos…». Parece el tercer actor de la serie y no lo es, por dos
   * motivos que conviene dejar escritos antes de que alguien lo «arregle»:
   *
   *   1 · ES UNA HISTORIA DE LEER. `STORY_ACTORS` existe solo porque
   *       `sin_gobernar` no satisface «escribir» y las dos historias
   *       anteriores escribían. Para «ver», la matriz YA contesta que sí —es
   *       lo que significa un módulo sin gobernar— y no hace falta que la
   *       historia ponga a nadie. Declarar un actor aquí no añadiría un
   *       permiso: añadiría una RESTRICCIÓN que el ADR no ha decidido, que es
   *       exactamente lo que este mecanismo existe para evitar.
   *
   *   2 · «CLIENTE» NO ES UN ROL. En ADR-001 §3 es un ORIGEN, y lo comparten
   *       tres roles: Admin de Cuenta, Visualizador y Gestor de Alertas.
   *       Elegir uno sería inventarse cuál; aceptar los tres sería escribir
   *       aquí media fila de la matriz. Además hay lecturas internas
   *       legítimas —el AM que comprueba qué ve su cliente antes de una
   *       reunión— que ninguna lista de roles del backlog contempla.
   *
   * Lo que de verdad protege los datos del cliente en esta historia no es un
   * actor: es el AISLAMIENTO DE TENANT, que es regla transversal del ADR y se
   * aplica esté o no gobernada la épica. Un Visualizador de Distribuidora
   * Centro ve los reportes de Distribuidora Centro porque `isAccountInScope`
   * lo dice, no porque el catálogo lo decida.
   */
]

export function storyActorFor(storyId: string): StoryActor | undefined {
  return STORY_ACTORS.find((actor) => actor.storyId === storyId)
}

/** ¿Las cinco celdas de esta capacidad dicen «sin gobernar»? */
export function isUngoverned(capability: CapabilityId): boolean {
  return ROLE_ORDER.every((role) => grantFor(role, capability).level === 'sin_gobernar')
}

// ── Sección 5 · Reglas de negocio transversales ──────────────────────────

export type BusinessRule = {
  id: string
  text: string
  /** `true` si el prototipo la implementa de forma comprobable. */
  enforced: boolean
  /** Dónde se comprueba. */
  where: string
}

export const BUSINESS_RULES: BusinessRule[] = [
  {
    id: 'tenant_isolation',
    text: 'Aislamiento de tenant: ningún usuario ve datos de otra cuenta, salvo usuario interno de Edenred con acceso multi-cuenta explícito.',
    enforced: true,
    where: 'permissions.isAccountInScope · suite de conformidad',
  },
  {
    id: 'am_via_selector',
    text: 'El Account Manager accede a cuentas cliente vía selector de sesión, no por permisos especiales: mismos datos que un Admin de Cuenta.',
    enforced: true,
    where: 'permissions.switchActiveAccount · suite de conformidad',
  },
  {
    id: 'single_role',
    text: 'Un usuario tiene un solo rol activo por cuenta. Sin acumulación.',
    enforced: true,
    where: 'CorporateUser.role es un único RoleId, no una lista',
  },
  {
    id: 'no_self_promotion',
    text: 'Admin de Cuenta no puede asignarse a sí mismo un rol superior al que posee.',
    enforced: true,
    where: 'permissions.canAssignRole · suite de conformidad',
  },
  {
    id: 'immutable_log',
    text: 'Log de accesos inmutable, mínimo 12 meses. Ningún rol tiene permiso de escritura sobre él.',
    enforced: true,
    where: 'audit-log.verifyChain · matriz: admin.log solo concede «lectura»',
  },
  {
    id: 'session_expiry',
    text: 'Las sesiones expiran tras 8 horas de inactividad, para todos los roles.',
    enforced: true,
    where: 'session-policy.INACTIVITY_TIMEOUT_MS, sin excepción por rol',
  },
  {
    id: 'org_structure',
    text: 'Estructura organizacional (empresa → división → departamento → unidad) configurable solo por Admin Edenred y Admin de Cuenta.',
    enforced: true,
    where: 'matriz: admin.estructura solo concede «gestion» a esos dos roles',
  },
  {
    id: 'mendoza',
    text: 'Gobierno de Mendoza: la estructura RBAC aplica tal cual para el piloto. Un rol «Admin de división» se evalúa tras el onboarding con el cliente — fuera de scope de esta decisión.',
    enforced: false,
    where: 'Fuera de alcance: no se implementa ningún rol de división',
  },
]

// ── Sección 6 · Alternativas ─────────────────────────────────────────────

export const ALTERNATIVES = [
  {
    id: 'A',
    name: 'Cinco roles estáticos con scoping por tenant',
    adopted: true,
    rationale: 'Simple, auditable y suficiente para el piloto.',
  },
  {
    id: 'B',
    name: 'Roles personalizables por cliente',
    adopted: false,
    rationale:
      'Mayor flexibilidad, mayor complejidad y riesgo de configuración incorrecta. Descartada para NOW, candidata a NEXT/LATER si hay demanda validada.',
  },
  {
    id: 'C',
    name: 'ABAC — control por atributos',
    adopted: false,
    rationale: 'Más granular, curva de implementación alta, no justificable para el piloto. Descartada.',
  },
] as const

// ── Sección 7 · Consecuencias ────────────────────────────────────────────

export const CONSEQUENCES = {
  positive: [
    'Desbloquea el control de acceso y todo lo que depende de autorización en frontend.',
    'Modelo simple de comunicar en onboarding.',
    'El log de accesos cumple la auditoría del PRD y la LFPDPPP.',
    'La separación interno/cliente evita lógica de enmascaramiento de datos.',
  ],
  risks: [
    {
      risk:
        'Los cinco roles estáticos pueden ser insuficientes para clientes con estructuras complejas (Gobierno de Mendoza, múltiples divisiones autónomas).',
      mitigation:
        'Riesgo acotado: la estructura del piloto se define en sesión con el cliente antes del lanzamiento.',
    },
    {
      risk:
        'Si en el futuro se requieren roles personalizables, la refactorización implica cambios en la capa de autorización del backend.',
      mitigation:
        'Mitigado diseñando el schema de permisos como si la tabla de roles fuera dinámica desde el día 1, aunque el piloto cargue valores estáticos.',
    },
  ],
} as const

// ── Consultas ────────────────────────────────────────────────────────────

export function grantFor(role: RoleId, capability: CapabilityId): Grant {
  return PERMISSION_MATRIX[capability][role]
}

export function getCapability(id: CapabilityId): Capability | undefined {
  return CAPABILITIES.find((c) => c.id === id)
}

export function capabilitiesOfGroup(group: ModuleGroupId): Capability[] {
  return CAPABILITIES.filter((c) => c.group === group)
}

export const LEVEL_LABELS: Record<PermissionLevel, string> = {
  completo: 'Completo',
  lectura: 'Lectura',
  limitado: 'Limitado',
  gestion: 'Gestión',
  ninguno: '—',
  sin_gobernar: 'Sin gobernar',
}

export const LEVEL_DESCRIPTIONS: Record<PermissionLevel, string> = {
  completo: 'Leer, escribir y ejecutar.',
  lectura: 'Solo ver.',
  limitado: 'Parcial, según la nota de la celda.',
  gestion: 'Administra la configuración del módulo.',
  ninguno: 'Sin acceso: el módulo no es visible.',
  sin_gobernar:
    'ADR-001 no cubre esta épica. El módulo es visible para cualquier sesión y solo de lectura, a la espera de que producto decida su fila.',
}

export const SCOPE_LABELS: Record<GrantScope, string> = {
  global: 'Global',
  cuenta: 'Su cuenta',
  asignadas: 'Cuentas asignadas',
  n_a: 'No aplica',
}

export const ORIGIN_LABELS: Record<RoleOrigin, string> = {
  interno_edenred: 'Interno Edenred',
  cliente: 'Cliente',
}
