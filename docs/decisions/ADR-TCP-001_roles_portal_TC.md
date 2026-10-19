# ADR-TCP-001 · Roles del portal Ticket Car+ sobre ADR-001

| Campo | Valor |
| --- | --- |
| Estado | **PROPUESTO**: pendiente de aprobación |
| Fecha | 2026-10-19 |
| Relacionado con | ADR-001 · Control de acceso basado en roles (RBAC) de eOne, también en estado PROPUESTO |
| Código | `src/domain/rbac/portal-roles.ts` (matriz), `src/domain/rbac/scope.ts` (alcance), `src/data/access.ts` (páginas) |
| Tests | `src/domain/rbac/__tests__/portal-roles.test.ts` usa la tabla de la sección 4 como fixture. `src/data/__tests__/scope.test.ts` cubre el alcance |

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
   | `flota` · Operador de flota | Visualizador + Gestor de Alertas (ver, configurar umbrales, gestionar destinatarios) | Operación de flota: Vehículos y Conductores (editar), Mantenimiento, Límites, reglas de peaje y envío de recomendaciones de estación al conductor |
   | `finanzas` · Finanzas | Visualizador | Exportar reportes, Saldos, Medios de pago (combustible y peaje), Saldos de peaje y Facturas. No configura alertas |
   | `consulta` · Consulta | Visualizador, tal cual: solo lectura y **sin exportación** | — |

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
| `inventario.editar` · Editar vehículos y conductores | C | C* | — | — | C | — | — |
| `inventario.vin` · Equivalencias VIN | C | C* | — | — | C | — | — |
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
| `tc.peaje_saldos` · Peaje · Saldos | C | — | C | — |
| `tc.peaje_reglas` · Peaje · Reglas y límites | C | C | — | — |
| `tc.peaje_medios` · Peaje · TAGs | C | — | C | — |
| `tc.mantenimiento` · Mantenimiento | C | C | — | — |
| `tc.facturas` · Facturas | C | — | C | — |
| `tc.parametros` · Parámetros | G | — | — | — |
| `tc.asistente` · Asistente TED | L | L | L | L |
| `tc.recomendaciones` · Enviar recomendación de estación al conductor | C | C | — | — |

## 5. Supuestos por confirmar

1. **Peaje.** La decisión de producto no lo menciona. Se aplicó la misma lógica que en combustible: los saldos y los TAGs de peaje son de `finanzas`, como Saldos y Medios de pago, y las reglas de peaje son de `flota`, como Límites.
2. **TED.** Responde preguntas de consumo, así que lo ve quien ve consumos: los cuatro roles, en lectura.
3. **`inventario.vin` para `flota`.** Conciliar el VIN se trató como parte de la ficha del vehículo, es decir, de la operación de flota.
4. **Admin y alertas.** `alertas.panel` es L para `admin` porque ADR-001 lo da así al Admin de Cuenta. Aun así puede configurar umbrales y destinatarios (C).

## 6. Consecuencias

- La navegación sale de la matriz. Una página que el rol no puede ver no está en su menú, y un grupo vacío desaparece (`src/data/access.ts`).
- Un usuario acotado a un nodo no ve unidades, cargas ni indicadores de fuera de su subárbol. Tampoco puede elegirlos en los filtros globales.
- Si cambia una celda de esta matriz sin cambiar la tabla de la sección 4, la suite falla. También falla si una fila de ADR-001 sube por encima del rol base sin figurar como extensión (`EXTENSIONS`).
