# ADR-TCP-001 · Roles del portal Ticket Car+ sobre ADR-001

| Campo | Valor |
| --- | --- |
| Estado | **PROPUESTO**: pendiente de aprobación |
| Fecha | 2026-10-19 · revisada el mismo día: la sección 5 pasa de supuestos a decisiones |
| Relacionado con | ADR-001 · Control de acceso basado en roles (RBAC) de eOne, también en estado PROPUESTO |
| Código | `src/domain/rbac/portal-roles.ts` (matriz), `src/domain/rbac/scope.ts` (alcance), `src/data/access.ts` (páginas) |
| Tests | `src/domain/rbac/__tests__/portal-roles.test.ts` usa la tabla de la sección 4 como fixture y cubre las decisiones de la sección 5. `src/data/__tests__/scope.test.ts` cubre el alcance. `src/data/__tests__/ted.test.ts` comprueba que TED no lleva acciones |

## 1. Contexto

El portal Ticket Car+ integra la analítica de eOne (Resumen, Reportes, Optimizador, Insights) junto a módulos transaccionales propios: Saldos, Límites, Medios de pago, Peaje, Mantenimiento y Facturas.

- ADR-001 define cinco roles. Tres son de cliente: Admin de Cuenta, Visualizador y Gestor de Alertas. Dos son internos: Admin Edenred y Account Manager.
- La matriz de ADR-001 solo cubre los módulos de eOne. No dice nada de los módulos transaccionales de Ticket Car+.
- Ticket Car+ ya tenía cuatro roles de portal: administrador, operador de flota, finanzas y consulta. Su alcance era por región.

## 2. Decisión

1. El portal usa cuatro roles construidos sobre los roles cliente de ADR-001:

   | Rol del portal | Base en ADR-001 | Extensión de Ticket Car+ |
   | --- | --- | --- |
   | `admin` · Administrador | Admin de Cuenta, tal cual | Nivel completo en los módulos de Ticket Car+ que ADR-001 no cubre |
   | `flota` · Operador de flota | Visualizador + Gestor de Alertas (todo lo del rol, véase 5.4) | Operación de flota: alta, edición y baja de Conductores (5.5), Mantenimiento, Límites, lectura de equivalencias VIN, reglas y TAGs de peaje, y envío de recomendaciones de estación al conductor. Lee Vehículos, pero no los edita (5.1) |
   | `finanzas` · Finanzas | Visualizador | Exportar reportes, Saldos, Medios de pago de combustible, Saldos y recargas de peaje y Facturas. Lee reglas y TAGs de peaje y Conductores. No configura alertas |
   | `consulta` · Consulta | Visualizador, tal cual: solo lectura y **sin exportación** | Lectura de Peaje (saldos, reglas y TAGs) y de Conductores |

   Con esto ningún permiso de ADR-001 queda huérfano: los tres roles cliente del ADR están contenidos en algún rol del portal. `flota` y `finanzas` **no están en ADR-001**; son una extensión de Ticket Car+ y esta decisión las documenta.

2. **Los roles internos de Edenred no aparecen en el portal.** No se pueden asignar desde Empresa · Usuarios. Solo se pueden simular desde el modo Dev («Ver el portal como»):
   - En las filas de ADR-001 conservan el nivel de su columna del ADR.
   - En las filas de Ticket Car+, Admin Edenred opera y Account Manager solo lee.

3. **Alcance por nodo del organigrama.** Cada usuario está limitado a un nodo (división, departamento o área) o a toda la cuenta. El alcance se aplica en la capa de dominio (`scopeSnapshot`, `inOrgScope`) y no en las pantallas. Recorta unidades, cargas, histórico, periodo anterior, catálogos de filtros, medios de pago, órdenes de servicio, TAGs y asignaciones de límites. El alcance anterior por región queda sustituido.

4. **La analítica siempre está limitada a la cuenta activa.** No hay comparación entre cuentas, tampoco para los roles internos simulados. Es el aislamiento de tenant de ADR-001 sin su excepción multicuenta.

## 3. Niveles

Son los de ADR-001: **C** completo (leer, escribir, ejecutar) · **L** lectura · **G** gestión (administra la configuración) · **—** sin acceso (el módulo no es visible).

Para ver basta con cualquier nivel distinto de «—». Para escribir hace falta C o G. Para administrar hace falta G.

## 4. Matriz rol × módulo

Las celdas marcadas con `*` superan lo que ADR-001 concede al rol base. Son extensión de Ticket Car+.

### 4.1 Filas de ADR-001

| Capacidad | admin | flota | finanzas | consulta | Admin de Cuenta | Visualizador | Gestor de Alertas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `auth.sso_login` · SSO / login | C | C | C | C | C | C | C |
| `dashboard.kpis` · Resumen | C | L | L | L | C | L | L |
| `dashboard.widgets` · Personalización | C | — | — | — | C | — | — |
| `dashboard.filtros` · Filtros globales | C | C | C | C | C | C | Limitado |
| `consumos.drivers` · Reportes e Insights | L | L | L | L | L | L | — |
| `consumos.ineficiencias` · Optimizador | L | L | L | L | L | L | — |
| `consumos.export` · Exportar reportes | C | — | C* | — | C | — | — |
| `inventario.ver` · Vehículos y conductores | L | L | L | L | L | L | — |
| `inventario.editar` · Alta y edición de unidades (alias, grupo, metadatos) | C | — | — | — | C | — | — |
| `inventario.vin` · Equivalencias VIN | C | L* | — | — | C | — | — |
| `alertas.panel` · Ver alertas | L | C | L | L | L | L | C |
| `alertas.configurar` · Umbrales | C | C | — | — | C | — | C |
| `alertas.destinatarios` · Destinatarios | C | C | — | — | C | — | C |
| `admin.usuarios` · Usuarios | G | — | — | — | G | — | — |
| `admin.roles` · Roles | G | — | — | — | G | — | — |
| `admin.log` · Log de accesos | L | — | — | — | L | — | — |
| `admin.estructura` · Estructura organizacional | G | — | — | — | G | — | — |

Quedan fuera del portal, porque Ticket Car+ no tiene esos módulos:
- `auth.account_switcher`: solo para roles internos.
- `comparativas.ver` y `reporteria.*`: sin gobernar en ADR-001.
- El anexo de plataforma: exclusivo de Admin Edenred.

### 4.2 Filas de Ticket Car+ (extensión, sin referente en ADR-001)

| Capacidad | admin | flota | finanzas | consulta |
| --- | --- | --- | --- | --- |
| `tc.saldos` · Saldos y reglas de fondeo | C | — | C | — |
| `tc.limites` · Reglas y límites | C | C | — | — |
| `tc.medios_pago` · Medios de pago | C | — | C | — |
| `tc.peaje_saldos` · Peaje · Saldos y recargas | C | L | C | L |
| `tc.peaje_reglas` · Peaje · Reglas y límites | C | C | L | L |
| `tc.peaje_medios` · Peaje · TAGs (alta, baja, reasignación; saldo y consumo por TAG) | C | C | L | L |
| `tc.conductores` · Conductores: alta, edición y baja (véase 5.5) | C | C | L | L |
| `tc.mantenimiento` · Mantenimiento | C | C | — | — |
| `tc.ev_cuenta` · Electromovilidad · Cuenta y fondeo | C | L | C | L |
| `tc.ev_recargas` · Electromovilidad · Resumen y recargas | L | L | L | L |
| `tc.ev_restricciones` · Electromovilidad · Restricciones de carga | C | C | L | L |
| `tc.ev_cargadores` · Electromovilidad · Cargadores y solicitudes de instalación | C | C | L | L |
| `tc.ev_flota` · Electromovilidad · Unidades y tarjetas de recarga | C | C | L | L |
| `tc.facturas` · Facturas | C | — | C | — |
| `tc.parametros` · Parámetros | G | — | — | — |
| `tc.asistente` · Asistente TED (nunca transaccional, véase 5.3) | L | L | L | L |
| `tc.recomendaciones` · Enviar recomendación de estación al conductor | C | C | — | — |

## 5. Decisiones (antes supuestos por confirmar)

Revisión del 19-oct-2026. Los cuatro supuestos de la primera versión quedan cerrados así, y se añade Conductores (5.5):

1. **VIN y edición de unidades.** La tabla de equivalencias VIN y la edición de unidades (alias, grupo, metadatos) son **solo de `admin`**, como el Admin de Cuenta de ADR-001. `flota` lee el inventario y el VIN, pero no los edita.
   - `inventario.editar` vuelve a ser exactamente la columna de ADR-001: deja de ser extensión.
   - `inventario.vin` es L para `flota`. Es la única extensión de lectura en las filas de ADR-001.
   - En pantalla: «Alta de vehículo» y «Alta de conductor» solo aparecen a `admin`. El VIN de cada unidad aparece en el detalle de Vehículos para `admin` y `flota`.
2. **Peaje.** Se reparte igual que combustible, separando dinero y operación:

   | Peaje | Escribe | Lee |
   | --- | --- | --- |
   | Saldos y recargas | `finanzas` | `flota`, `consulta` |
   | Reglas | `flota` | `finanzas`, `consulta` |
   | TAGs: alta, baja y reasignación | `flota` | `finanzas` ve el saldo y el consumo por TAG; `consulta` |

   `admin` tiene nivel completo en todo y `consulta` lectura en todo. En pantalla, quien solo lee ve la página sin sus acciones y con el aviso «Solo lectura».
3. **TED.** Lo ven los cuatro roles.
   - Nunca es transaccional: explica, resume y enlaza a la pantalla que corresponda, donde la acción sigue sujeta al permiso de esa pantalla. Sus respuestas son texto y no llevan acciones; un test lo comprueba.
   - Solo responde con datos del alcance de la sesión y de la cuenta activa. **Fase 2**: hoy las respuestas son textos fijos que no dependen de la sesión; hay un TODO en `TedPage.tsx`.
4. **Alertas.** Se aplica ADR-001 tal cual.
   - `admin` ve el panel en lectura y configura umbrales y destinatarios.
   - `flota` tiene todo lo del Gestor de Alertas, incluidos reconocer y resolver alertas. Reconocer y resolver llegan en la **Fase 2**.
   - **Punto a revisar en ADR-001, no en ADR-TCP-001:** con la matriz actual, el Admin de Cuenta configura las alertas pero no las resuelve. Si se cambia, se cambia en ADR-001 y esta matriz lo hereda.

5. **Conductores.** Revisión del 19-oct-2026. Es un permiso **propio de Ticket Car+, sin equivalente en ADR-001**, igual que Peaje: `tc.conductores`.
   - Alta, edición y baja de conductores: `admin` y `flota`. Mantener el padrón de conductores es operación de flota.
   - `finanzas` y `consulta`: lectura.
   - Vehículos no cambia: el alta y la edición de unidades siguen siendo solo de `admin` (`inventario.editar`, 5.1).
   - ADR-001 juntaba vehículos y conductores en `inventario.editar`. Ticket Car+ los separa y esa fila queda solo para unidades. Si ADR-001 quiere separarlos también, es un punto a revisar allí.

Sigue abierta, fuera de esta ADR: **¿Autoconsumo tiene límites propios?** Hoy Límites y Medios de pago excluyen Autoconsumo.

## 6. Consecuencias

- La navegación sale de la matriz. Una página que el rol no puede ver no está en su menú, y un grupo vacío desaparece (`src/data/access.ts`).
- Un usuario acotado a un nodo no ve unidades, cargas ni indicadores de fuera de su subárbol. Tampoco puede elegirlos en los filtros globales.
- Si cambia una celda de esta matriz sin cambiar la tabla de la sección 4, la suite falla. También falla si una fila de ADR-001 sube por encima del rol base sin figurar como extensión (`EXTENSIONS`).
