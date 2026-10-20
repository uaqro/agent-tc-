# Migración a Flow: foundations, diccionario y primitives

## Alcance y base de revisión

Esta matriz precede a cualquier migración de componentes, patterns o templates.
Relaciona el CSS actual del prototipo con las foundations y los contratos de Flow;
no prescribe una conversión mecánica por nombre.

- Prototipo: `b27d056` (`feat/migracion-flow`), sin cambios de interfaz pendientes.
- Flow: `ER-Mobility-MX/FlowHANA`, `main` en `214f69b`.
- Canon usado por Flow: `ER-Mobility-MX/Flow-DesignData-HANA`, `97a1d43`.
- Diccionario: W3C Design Tokens, versión `3.0.0-beta.9`; 768 valores (`ref`,
  `sys` y `brand`). El emisor y el diccionario viven en el canon, no son una
  hoja editable del prototipo.
- Verificación del sistema: `check:foundations` pasa (7 contratos, 0
  bloqueantes, 0 avisos); `check:tokens-parity` pasa con cero diferencias en
  las 16 combinaciones comprobadas de modo, densidad y producto.
- En los 124 CSS/TSX/TS del prototipo se identificaron 733 usos de las 31
  variables de tema listadas abajo. El conteo es de referencias `var(...)`, no
  una estimación de declaraciones o selectores.
- Un escaneo de valores de declaraciones CSS encontró 186 usos de 70 literales
  de color, incluyendo 8 usos de `transparent` (178 ocurrencias cromáticas).
  Esto excluye comentarios, cadenas, `var(...)` y URLs; es una medición por
  valores, no por selectores. El contrato de color de Flow no permite mantener
  los literales cromáticos en estilos de producto.
- Se siguió la ruta local del README de Flow: `npm pack` ejecutó `prepack`,
  compiló el paquete `3.0.0-beta.9` y generó el tarball. El artefacto se
  versiona en `vendor/flow/` y se declara como dependencia `file:` en
  `package.json`/`package-lock.json`, por lo que la instalación es reproducible
  sin acceso al registry privado.

## Integración de foundations: estado actual

- `src/main.tsx` importa primero `index.css` y después el `styles.css` oficial
  de Flow. No se importa el reset global durante la migración gradual.
- Los 31 tokens locales usan el prefijo `--tc-local-*`. Los aliases de canvas,
  barra superior, superficies card/sunken, tinta primary/secondary, radios y
  familias tipográficas ya consumen foundations Flow; los restantes conservan
  sus valores mientras se revisa su semántica por uso. El escaneo confirmó
  cero referencias a los nombres locales anteriores.
- Las acciones Ayuda y Notificaciones de la barra superior ya usan
  `IconButton` de Flow, con ligaduras oficiales, nombres accesibles, target
  `44×44px` y badge booleano Flow. Sus callbacks siguen funcionando y la
  animación del badge se apaga con `prefers-reduced-motion`.
- La acción de regreso en `PageHeader` ya usa el `Button` de Flow, la ligadura
  `arrow_back` y el nombre accesible "Regresar al resumen"; no conserva CSS
  local y usa el target mínimo del primitive.
- La etiqueta Ticket Car ya no usa el fondo tintado; conserva tipografía
  display y `--flow-red-600`, la variante Flow con contraste suficiente para
  texto pequeño sobre blanco.
- Se copiaron a `public/fonts` las fuentes autoalojadas y licencias oficiales
  del paquete. `index.html` carga `selfhost.css`, que define Ubuntu, IBM Plex
  Mono y Material Symbols sin depender de Google Fonts.
- La app sigue limitada al modo claro. La inspección confirmó que
  `--surface-canvas` resuelve a `#f1f7ff`, `--height-bar` a `56px`, cargan las
  tres familias tipográficas y el foco visible del shell usa el anillo Flow.
  El `--focus-ring` oficial es una sombra azul con alpha; su contraste medido
  es 1.53:1 sobre blanco y 1.52:1 sobre canvas, inferior a 3:1 para un
  indicador de foco. No se añadió un override local: el usuario aceptó
  continuar con el anillo oficial y la brecha queda registrada.
  Los roles de texto comprobados superan 4.5:1; `--flow-red-500` no lo supera
  para texto pequeño sobre blanco (3.99:1), por lo que la etiqueta usa
  `--flow-red-600` (6.68:1). No se activó modo oscuro.
- Reportes, Mantenimiento, ActivitySection, Insights y Optimizador usan
  `Tabs`/`TabPanel` de Flow con IDs enlazados, panel asociado y navegación de
  flechas; los filtros de Reportes usan `Select` con
  `insetLabel`. TopBar usa `Input` Flow para la búsqueda global y conserva el
  envío del formulario. La navegación de tabs, apertura/selección de opciones,
  filtro/limpieza y envío de búsqueda se verificaron en el navegador. Los
  botones de Reporte dinámico también se verificaron para agregar/quitar
  filtros, seleccionar columnas, generar y restablecer. La acción para quitar
  filtros muestra texto e icono para no depender de reconocer un glifo aislado.
  Los 13 diálogos del producto comparten `Modal`, que delega el portal, backdrop,
  foco inicial, trampa de Tab, Escape y restauración de foco a `OverlayShell`
  de Flow; la composición visual del diálogo sigue siendo propia del producto.
- El constructor de automatizaciones de dispersión usa `Field` y `Select` Flow
  para grupo de unidades, umbral, modo de recarga, ventana de consumo, colchón
  y cadencia; los importes usan `InputAmount`. El tope en litros conserva el
  input nativo con `min=50` y `step=50`, porque `Input` no declara esos
  atributos en su API pública; `Field` Flow mantiene la asociación accesible.
  La selección individual de unidades usa `Checkbox` de Flow; las cantidades
  de alcance y los resúmenes mantienen su cálculo actual.
- El formulario de órdenes de servicio usa `Select`, `DatePicker` de fecha
  única y `Textarea` de Flow, asociados con `Field`. La fecha promesa conserva
  el límite mínimo de la fecha de ingreso; la validación previa al envío
  permanece activa. La selección de tipo de servicio usa `Chip` dentro de
  `ChipGroup` y conserva su selección única controlada.
- El diálogo de excepción temporal usa `Field` y `Select` Flow para vigencia y
  motivo. El importe en MXN usa `InputAmount`; la ampliación en litros conserva
  el input numérico y su incremento de 10 L, asociados con `Field`, ya que
  `Input` no publica los atributos `min`/`step`.
- El formulario de políticas de límites usa `Input`, `InputAmount`, `Select` y
  `Field` para nombre, medida/periodo, límite monetario, número de cargas,
  intervalo y estaciones. Se conservan inputs nativos para litros por sus
  restricciones `min`/`step` y para horarios por su estilo local específico;
  `Input` sí acepta `type="time"`. Los grupos de selección de combustible/días
  usan `Chip`/`ChipGroup` y los switches usan `Switch`.
- La tabla de asignación de unidades usa `Input` y `Select` Flow para la
  búsqueda, el filtro por grupo y la asignación de política. Se conservan los
  filtros y la opción «Sin política»; el resto de controles de la tabla no
  cambia. Las acciones de excepción y de limpiar filtros usan `Button` Flow.
- Los diálogos de catálogos de parámetros usan `Input`, `Select` y `Field` Flow
  para metadatos, campos definidos por catálogo y registros. Se preservan las
  opciones de referencia activa, la opción opcional «Sin asignar» y las
  validaciones de campos obligatorios y nombres duplicados.
- El diálogo de invitación usa `Radio` Flow para elegir el rol y `Checkbox`
  para el alcance por región, además de `Input`/`Field` ya migrados para nombre
  y correo. Se conservan las descripciones de rol y la validación de regiones.
- La sección de políticas usa `Button` de Flow en crear, editar, activar y
  pausar; las acciones conservan iconos del set Material Symbols de Flow y los
  mismos callbacks. `EmptyState` recibe el mismo botón Flow para crear la
  primera política.

## Adopción de primitives Button/Input y component DatePicker

Esta pasada amplía la adopción de estos primitives de Flow `3.0.0-beta.9`;
siguen siendo beta y no se consideran una aprobación para reemplazo mecánico.

- `Button` reemplaza las acciones comunes de producto en dispersión, límites,
  mantenimiento, peajes, flota, administración, cobertura API, TED, solicitudes
  y simulación; también el cierre de los diálogos. `IconButton` cubre los
  controles de información/opciones de las tarjetas del dashboard y las
  acciones flotantes. Se preservan callbacks, estados y nombres accesibles.
  La adopción es parcial: tras migrar las cuatro tablists locales, el barrido
  encuentra 14 sitios JSX de `<button>` nativo en 9 archivos. Seis son acciones
  y ocho son navegación o selección; su CSS local es una pista para rastrear la
  cascada, no una razón automática para pedir `className` ni para reemplazar el
  control por `Button`. Se evalúan abajo desde los tokens y el contrato de la
  capa correcta.
- `Input` cubre búsquedas simples de flota, mantenimiento, medios de pago,
  facturas, usuarios, parámetros, mejoras API, medios de peaje y menú; también
  búsqueda global, asignaciones, formularios de catálogos/invitación, campos
  de política y composición de TED. Quedan 11 inputs nativos en cinco módulos:
  ocho numéricos que necesitan restricciones `min`/`step`, dos horarios que
  usan `type="time"` con una carcasa local y un combobox enlazado a `Listbox`.
  La implementación de `Input` reenvía las props HTML restantes al `<input>`
  nativo y convierte `onChange` a `string`; su declaración beta.9 no tipa
  `min`/`step` ni los atributos ARIA del combobox. La carga de archivos usa el
  component `FileUpload`.
- `DatePicker` ya está en uso en órdenes de servicio y en el constructor de
  reportes. No se encontraron inputs nativos `type="date"` pendientes; se
  conservan los límites de fecha y la validación actuales.
- `SectionHeader` se adoptó en `ChartCard`, `ActivitySection`,
  `AttentionList`, `RulesSection`, `PoliciesSection` y `AssignmentsTable`.
  La adopción cubre cuatro tarjetas de gráficas y los encabezados de esas
  secciones; conserva niveles `h2`/`h3`, IDs usados por `aria-labelledby`,
  descripciones de gráficas y acciones/filtros en el slot trailing. Es una
  migración selectiva, no un reemplazo de todos los headings del inventario.
- `Stack` se piloteó en las acciones del encabezado de `RulesSection`: `gap={2}`
  conserva la separación de 8 px y `wrap` mantiene el salto de línea en
  ventanas estrechas. La adopción se amplió a las acciones de `PoliciesSection`
  y a los filtros y estados agrupados de `AssignmentsTable`, preservando la
  alineación y el wrapping con el mismo paso de espacio. Los layouts
  estructurales siguen en CSS; el conteo bruto no determina adopciones.
- `Popover` reemplaza el panel flotante propio de `ApiTag`, el marcador
  compartido de cobertura API. Flow ahora administra portal, anclaje inferior,
  colisión con viewport, reposicionamiento en scroll/resize, cierre por clic
  exterior/Escape y retorno del foco. Se conserva el trigger con estado API,
  el nombre accesible, el detalle de cada capacidad y su piel local mediante
  `surface="none"`; no se migran paneles que son diálogos.
- `Badge` reemplaza los contadores de cobertura API, solicitudes de saldo,
  órdenes abiertas y catálogos de parámetros, además de las etiquetas locales
  de estados, severidad, tipos de movimiento y actividad en API, Insights,
  Dispersión, Peaje, Atención y asignaciones. Las marcas de cobertura API mantienen el
  popover interactivo y componen el estado con un `Badge`.
- `Chip` y `ChipGroup` reemplazan las opciones tipo pill de filtros y
  formularios (seis grupos en cinco módulos), conservando selección y
  multiselección. `Chip` también cubre etiquetas informativas de esfuerzo,
  tipo de regla y orden asociada. Los filtros de severidad
  mantienen su paleta específica con `style` del primitive.
- No se sustituyen los tablists ni el recuadro cuadrado del icono de dispersión
  puntual: son navegación y decoración, respectivamente, no etiquetas, estados,
  contadores ni opciones tipo pill.
- El contenedor compartido de los 13 diálogos usa ahora `OverlayShell` de Flow.
  Se conservan el encabezado, subtítulo, pie, tamaños y contenido propios del
  producto; el shell aporta portal, bloqueo/restauración del scroll, cierre
  con Escape o backdrop, foco inicial, trampa de Tab y retorno del foco al
  disparador. Los títulos tienen IDs únicos para asociar el diálogo accesible.

## Inventario de primitives públicos

### Criterio de capas de Flow

Flow define la cascada `foundations → primitives → components → patterns →
templates`. La capa de cada pieza se toma de la distinción conceptual que
documenta `docs/ARQUITECTURA.md`, no se infiere por el nombre, el barrel desde
el que se importa ni por el proyecto de producto que la consume: primitives
son piezas básicas de interfaz; components son conceptos compuestos de
interfaz; patterns resuelven composiciones de negocio. Hay una discrepancia
en el paquete: `items.json` marca `Card` y `Select` como primitives, pero
`docs/ARQUITECTURA.md` los clasifica explícitamente como components. Para que
el inventario refleje la cascada conceptual de Flow, aquí se registran como
components y se documenta esa diferencia.

Revisión del catálogo exportado por el paquete instalado
`@er-mobility-mx/design-system` `3.0.0-beta.9`: el manifiesto contiene 57
entradas marcadas `primitives`, 66 `components` y 64 `patterns`. Para alinearlo
con la cascada conceptual documentada, esta matriz registra 55 primitives y
68 components: `Card` y `Select` se reclasifican como components por la
discrepancia descrita arriba. La matriz detallada de adopción de primitives
contiene exclusivamente las 55 entradas de esa capa; components y patterns no
forman parte de su denominador de avance. `ToastStack` es un export auxiliar
asociado a `Toast`, sin entrada independiente en el manifiesto, y no se cuenta
como primitive separado. La madurez web y el uso se contrastan con el
manifiesto y los imports de `src/`. "No usado" describe el estado del código,
no implica que todo primitive deba adoptarse. Se registra la oportunidad más
cercana y la razón para adoptarlo, evaluarlo después o no incorporarlo.

Con un criterio de caso de uso concreto (la app ya consume el primitive o
tiene una función equivalente que merece una evaluación, aunque la API actual
no cubra todos sus requisitos), **30 de los 55 primitives** tienen relación
aplicable. Hay al menos un uso Flow identificado para 26: **26/55 = 47.3%**
de todo el catálogo conceptual y **26/30 = 86.7%** de los primitives con caso
aplicable tienen adopción iniciada. Los otros 4 aplicables aún no tienen
adopción; 25 no tienen un caso actual identificado. Estos porcentajes miden
presencia/adopción por primitive, no la proporción de instancias migradas ni
la finalización total del trabajo: por ejemplo, `Button` e `Input` ya se usan,
pero tienen superficies que aún deben auditarse. `Toast` se cuenta entre los
adoptados porque `ToastHost` lo compone en la experiencia de avisos, aunque la
app importa directamente el host y no `Toast`. Esta cifra no obliga a migrar
cada candidato: por ejemplo, `LimitBar` tiene un caso funcional, pero no
representa los umbrales operativos que exige el producto.

### Trabajo pendiente: cobertura dentro de primitives ya adoptados

La matriz cuenta un primitive como adoptado cuando existe al menos un uso
Flow, no cuando se han reemplazado todas las instancias potencialmente
equivalentes. Este backlog de cobertura se mantiene separado de los 4
primitives aplicables que todavía no tienen adopción:

| Área | Evidencia actual | Trabajo pendiente |
|---|---|---|
| `Button` | 14 sitios JSX de `<button>` nativo en 9 archivos: 6 acciones y 8 controles de selección/navegación. | Distinguir `ChatComposer`/`Conversation`, `IconButton`, `Sidebar`/navegación, `Radio` y `Chip` antes de considerar `Button`. No pedir `className`: el estilo de Flow se aplica por variante y tokens. Los únicos huecos de API a validar son atributos de relación como `aria-controls` en triggers que sí se compongan con Button/IconButton; `ref` solo si el trigger necesita anclaje o gestión de foco desde Flow. |
| `Tabs` (component) | `ReportsPage` y las cuatro tablists locales usan `Tabs`/`TabPanel`. | Migración completada en `MaintenancePage`, `ActivitySection`, `InsightsPage` y `GasOptimizerPage`, conservando selección controlada, asociación tab/panel, IDs y navegación por teclado. |
| `Chip` / `ChipGroup` / `Radio` / `SegmentedControl` | Seis grupos de chips ya migrados; quedan tres grupos de elección (monto, tipo y alcance), distribuidos en cinco sitios JSX de selección. | `Chip` aplica selección como filtro/toggle y `SegmentedControl` renderiza `role="tablist"`; ninguno se elige por la forma de píldora. Los importes, tipos y alcances del formulario son elecciones exclusivas: comparar `Radio` (y una composición de tarjeta cuando haga falta contenido enriquecido). |
| `Input` | Búsquedas y campos simples usan Flow; quedan 11 `<input>` nativos en `TollBalancesPage`, `RuleBuilderDialog`, `PolicyDialog`, `OverrideDialog` y `QuickTopUp`. | `min`/`step` y las props ARIA se reenvían en runtime por `...rest`, pero faltan en `InputProps`; esto es una brecha de tipado, no un bloqueo de runtime para esta app JavaScript. Los dos `type="time"` pueden usar `ControlShell` de Flow. Para el combobox, recomponer la carcasa con `Input` (`icon`, `trailing`, `ref`, `onKeyDown`) y conservar `Listbox`, `aria-activedescendant` y el adaptador de `onChange(value)`. Ningún caso requiere `className` para heredar el diccionario. |

Los conteos de botones son sitios JSX, no cantidad de botones renderizados: los
sitios dentro de `.map()` pueden producir varias instancias en tiempo de
ejecución. Los componentes y patterns se registran en sus tablas de capa y no
se suman al denominador de 55 primitives.

#### Trazabilidad del diccionario a los controles residuales

La revisión contrasta el diccionario beta.9, los estilos de los primitives y
components de Flow y los tipos del paquete beta.9 instalado en la app. La
decisión de migración sigue la cascada; la ausencia de una prop visual no es,
por sí sola, un hueco de diseño:

`className` no es una extensión visual segura para `Button` ni `Input`: ambos
asignan su clase CSS Module interna y después reenvían props al nodo, de modo
que pasar `className` desde JavaScript la sustituiría en vez de componerla.
`Button.style` se aplica al `<button>` y `Input.style` a la raíz de
`ControlShell`; ninguno sirve para saltarse los roles del diccionario. Para
layout se usan contenedores, y para la apariencia, las variantes/estados y
tokens semánticos del dueño de cada capa.

| Capa / rol | Aplicación en Flow | Consecuencia para esta app |
|---|---|---|
| Diccionario `sys`: `--surface-card`, `--surface-sunken`, `--text-primary`, `--text-secondary`, `--border-default`, `--border-focus` y `--focus-ring`. | `Button` y `ControlShell` toman estos roles para superficie, tinta, borde y foco. `Input` no dibuja una carcasa aparte: compone `ControlShell`, que mantiene el borde y el anillo alrededor del campo. | Los aliases locales `--tc-local-surface`, `--tc-local-surface-sunken`, `--tc-local-text-strong` y `--tc-local-text-body` ya apuntan a foundations de Flow. Los estilos restantes se comparan por función con el token semántico; no se infiere equivalencia por un hex o un nombre local parecido. |
| Roles de acción: `--action-primary`/`--action-primary-hover`, `--action-accent` y `--text-link`. | `Button` expone `primary`, `secondary`, `ghost`, `danger` y `link`; `primary` consume la acción de tinta y `link` consume el rol de enlace. `IconButton` dispone de `ghost`, `tonal`, `primary` y `secondary`. | El azul de marca local no equivale automáticamente a la acción primaria: el diccionario separa acción primaria, acento y enlace. No añadir una variante azul ni reemplazar el token primario sin una decisión de producto sobre el rol de esa acción. |
| Selección y estado: `--surface-inverse`/`--text-on-inverse`, `--surface-accent-subtle`/`--text-accent`. | `Chip[selected]` usa superficie inversa; `QuickAction[active]` usa superficie de acento sutil y tinta de acento; `SegmentedControl` usa una pista hundida y un indicador de tarjeta; `Radio` compone `ToggleControl`. | Son contratos diferentes, aunque todos puedan verse como controles “activos”. Usar el par de tokens que corresponda a la semántica del control; no trasladar el azul local a todos los estados seleccionados. |
| Geometría y densidad: `--hit-target-min`, `--pad-control-*` y escala de tipografía. | `Button` y `ControlShell` conservan el objetivo mínimo tokenizado incluso en tamaño `sm`; la geometría la gobierna el componente, no una clase del consumidor. | Varios botones locales miden 32–38 px y algunos inputs 36 px. No conservar esas dimensiones mediante `className`: al adoptar Flow, aceptar el objetivo mínimo del sistema y ajustar el layout alrededor; validar el cambio visual y de densidad. |
| Presentación local. | `ChatComposer` ya pinta sus sugerencias con `--border-default`, `--surface-card`, `--surface-sunken`, `--radius-pill` y tipografía/tinta del sistema. `Conversation` compone `ChatThread` y `ChatComposer`; no duplica el estilo de botón. | `ChatComposer.suggestions` es un componente candidato para TED; pasarle la lista conserva que al elegir una pregunta se envía inmediatamente. `QuickAction` no es un sustituto de botones de formulario solo por compartir el estado activo. |

En particular, `--tc-local-brand-blue: #0060df`, `--tc-local-brand-red`,
`--tc-local-text-muted: #64748b` y los bordes/sombras locales son valores
locales, no aliases de roles de acción del diccionario. El rojo y azul de
marca, los acentos de visualización, los estados de selección y los errores
no son intercambiables. Las decisiones de color de los controles de abajo
deben apuntar a roles `sys` como `--action-accent`, `--surface-accent-subtle`,
`--text-accent`, `--status-danger` o `--border-focus`, según el significado
medido, y no a la rampa de referencia directamente.

#### Casos residuales de Button e Input

| Primitive / contrato | Casos identificados | Diferencia que impide o condiciona la migración |
|---|---|---|
| `Button` — acciones (6 sitios) | TED (preguntas sugeridas); `ApiTag` (trigger de `Popover`); `PageHeader` (toggle de menú); perfil de `TopBar`; «Cambiar» unidad en `QuickTopUp`; trigger del diálogo de `DevMode`. | TED debe usar `ChatComposer.suggestions`, que ya aplica los tokens y tiene la misma acción de envío inmediato. `ApiTag` debe conservar su botón nativo como trigger del `Popover` y `Badge` como presentación; no forzarlo al primitive de acción. Su foco local debe pasar a `--focus-ring`/`--border-focus`, no usar la tinta de texto como sustituto del rol de foco. Para `PageHeader`, preferir comparar el pattern `PageHeader` o `IconButton` ghost; el contrato instalado no declara `aria-controls`, así que habría que añadirlo si se migra. El perfil puede usar `TopBar` de Flow o `Button` secondary alrededor de `Avatar`; la etiqueta responsive puede seguir siendo layout local. «Cambiar» es mejor candidato para `TextAction` que para `Button link`: es una acción textual secundaria, no un enlace ni un CTA; validar que su objetivo de 44 px y la carcasa de búsqueda compongan bien. `DevMode` puede usar una acción secundaria con una etiqueta de estado Flow; su activo morado actual no es un token de acción, así que se debe retirar o mapear a un rol semántico (no reutilizar `viz-*`). |
| `Button` — navegación y toggle (5 sitios) | Selector de catálogo en `ParametersPage`; pin y opción actual de `SideMenu`; las dos opciones de `scope` en `RuleBuilderDialog`. | En `ParametersPage`, decidir primero si se navega a páginas (`Sidebar`/enlaces con `aria-current`) o se cambia una vista dentro de la página (`Tabs` con tab/panel enlazados y teclado); no marcar como página sin confirmar esa semántica. Los elementos de `SideMenu` son navegación, no acciones genéricas: evaluar el component `Sidebar` o conservar navegación nativa. El pin sí es toggle binario y puede usar `IconButton selected`, que ya refleja `aria-pressed`; si se necesita relacionarlo con otro elemento, falta tipar `aria-controls`. `scope` es selección de formulario; no usar `SegmentedControl`, porque renderiza `tablist`/`tab` y su semántica es pestañas. Preferir un grupo de `Radio`. |
| `Button` — elección de importe/tipo (3 sitios) | Montos sugeridos y «Otro monto» en `QuickTopUp`; tipo de regla en `RuleBuilderDialog`. | Son elecciones mutuamente excluyentes dentro de formularios, no un conjunto de acciones ni filtros. `Radio` es el contrato semántico inicial. El tipo de regla tiene label, hint y ejemplo dentro de una tarjeta: `Radio` cubre valor, label y descripción, pero no la tercera línea enriquecida; preservar ese contenido componiendo una tarjeta con `Radio` o proponer un componente reutilizable, sin ampliar `Button` con `aria-pressed`. La superficie activa puede usar `--surface-accent-subtle`/`--border-focus` y textos `--text-primary`/`--text-muted`/`--text-accent` si esa composición se valida. |
| `Input` — números (8 sitios) | `TollBalancesPage`: umbral y saldo objetivo (`min=0`, `step=100`); `RuleBuilderDialog`: tope de litros (`min=50`, `step=50`); `PolicyDialog`: límite del periodo (`min=1`, `step=10`), máximo por carga (`min=1`, `step=5`) y rendimiento mínimo (`min=0.5`, `step=0.1`); `OverrideDialog`: ampliación en litros (`min=1`, `step=10`); `QuickTopUp`: monto personalizado (`min=1`, `step=50`). | El runtime de `Input` reenvía `min`/`step` por `...rest`, así que la app JavaScript puede preservar las restricciones hoy. La declaración pública no las tipa; añadir `min`, `max` y `step` a `InputProps` es una mejora acotada de contrato para seguridad de tipos, no una nueva tokenización. Comparar también el `size`/`ControlShell` de Flow con la carcasa local y verificar la edición numérica. |
| `Input` — hora (2 sitios) | `PolicyDialog`: hora «Desde» y «Hasta», ambas `type="time"`. | Flow acepta `type="time"` y `ControlShell` mantiene borde, foco y superficies con tokens. El estilo `policy-form__native-control` mezcla geometría local (36 px), borde, radio y fondo; no se debe migrar esa clase. Usar `Input` con la densidad/tamaño Flow, dejar el ancho y el grid al layout del formulario y verificar los controles nativos del navegador. |
| `Input` — combobox (1 sitio) | `QuickTopUp`: búsqueda de unidad enlazada a `Listbox`. | `Input` ya reenvía `role` y atributos ARIA restantes, acepta `ref` y `onKeyDown`, y entrega `onChange(value: string)`; el consumidor debe adaptar el callback, no depender del evento DOM. En runtime se puede conservar `aria-expanded`, `aria-controls`, `aria-activedescendant` y `aria-autocomplete`; el hueco es que `InputProps` no los tipa. Recomponer la carcasa actual con `Input` (`icon` y `trailing`) en vez de anidar una carcasa Flow dentro de `.quick__search`, conservar el `Listbox` y validar flechas, Enter, Escape, foco y anuncio del activo. |

| Primitive | Madurez web | Uso/relación observada | Evaluación |
|---|---|---|---|
| `AutoGrid` | estable | Las páginas usan grids CSS locales. | No migrar en bloque; layout estructural amplio y actualmente no hay contrato visual de app que exija el wrapper. Evaluar al tocar un grid concreto. |
| `Avatar` | estable | `TopBar` renderiza las iniciales del perfil con `Avatar` tamaño `sm`. | Adoptado dentro del botón de perfil; el wrapper conserva el nombre de usuario como nombre accesible y oculta las iniciales duplicadas. |
| `Badge` | estable | Contadores de cobertura API, solicitudes, órdenes abiertas y catálogos; etiquetas informativas/semánticas y estado de cobertura API interactivo. | Adoptado en contadores y etiquetas de actividad, atención, movimientos, severidad, asignaciones y cobertura con tonos semánticos. En `ApiTag`, el botón/popover conserva su comportamiento y usa `Badge` como visual del estado. |
| `Breadcrumb` | estable | `PageHeader` usa `Breadcrumb` para Ticket Car, sección y página actual. | Adoptado; se mantiene separado el botón de regreso. Flow fija el nombre accesible del landmark como “Breadcrumb”. |
| `BrandCanvas` | beta | Sin superficie decorativa de marca equivalente. | Sin caso actual; es decorativo y no reemplaza canvas ni visualizaciones con datos. |
| `Button` | beta | Acciones comunes en múltiples páginas y diálogos; quedan 14 sitios nativos en 9 archivos, con semántica de acción, navegación y elección. | Adoptado parcialmente. No exponer `className` para transportar estilos locales: sus variantes ya aplican roles del diccionario. `aria-controls` no está tipado en `Button`/`IconButton`; `IconButton selected` ya expresa `aria-pressed`. `aria-current` corresponde al contrato de navegación, no a un botón de acción genérico. Clasificar cada sitio con la tabla residual antes de proponer cambios de Flow. |
| `Calendar` | estable | Interno al `DatePicker`; la app no lo importa directamente. | No consumir por separado en formularios; usar el componente compuesto `DatePicker`. |
| `ChartLegend` | estable | `FuelDashboardPage` usa Flow `ChartLegend` bajo las barras multiserie de recargas/recortes; la línea local usa una leyenda propia. | Adopción parcial. Flow permite representar en la leyenda las tramas y trazos no basados en color mediante `marks`; en `BarChart` falta `marks="fill"`, así que el swatch hoy no refleja la trama que el lienzo puede asignar a cada serie. Evaluar la leyenda de la línea junto con el título/subtítulo redundante antes de reemplazarla. |
| `ChatMessage` | estable | TED usa `ChatMessage` para cada mensaje, dentro de una lista dinámica; conserva el formato enriquecido, timestamps, avatar de marca y estado de escritura. | Adoptado en TED; Flow renderiza las burbujas y el indicador de escritura, mientras el avatar y el contenido enriquecido siguen siendo propios de la pantalla. |
| `Checkbox` | estable | Selección múltiple en formularios y tablas. | En uso; mantiene el comportamiento controlado y las descripciones del producto. |
| `Chip` | estable | Etiquetas informativas de orden asociada, esfuerzo y tipo de regla; seis grupos interactivos de filtros y selección. | Adoptado para etiquetas y opciones agrupadas. Los filtros de severidad aplican su paleta de producto mediante `style` sin reemplazar el contrato de selección accesible del primitive. |
| `ChipGroup` | estable | Seis grupos locales de selección/pills en cinco módulos. | Adoptado para agrupar filtros de severidad y opciones de formularios; se conservan selección controlada, multiselección y nombres accesibles de los grupos. |
| `CircularProgress` | beta | No se encontró indicador circular de progreso. | Sin uso actual identificable; no añadir uno para decorar KPIs. |
| `ControlShell` | estable | No se importa desde la app. | Export marcado por el paquete como shell interno/no publicado para consumo de producto; no adoptarlo directamente. |
| `DetailRow` | estable | Adoptado en las tres filas etiqueta-valor de presupuesto en `SimulationDialog`. Además hay 63 pares semánticos `<dt>/<dd>` en 16 grupos `<dl>` y 15 módulos. | Adopción parcial. La API publicada renderiza `div`/`span`, por lo que no reemplaza los pares semánticos; preservar los `<dl>` hasta que exista un contrato compatible. |
| `Divider` | beta | No hay `<hr>` en JSX; se identifican 41 declaraciones `border-top/bottom` en 23 CSS, en su mayoría límites decorativos. | No priorizar por ese conteo: no equivale a separadores semánticos ni justifica reemplazo masivo. |
| `EmptyState` | estable | Adoptado en 24 usos distribuidos en 18 módulos; el wrapper local delega el renderizado a Flow y conserva las variantes `card`/`compact`. | Migración del wrapper completada; Flow controla iconografía, tipografía y contenido. Revisar en uso visual los tamaños/densidad heredados. |
| `Field` | estable | Envuelve los campos migrados. | En uso; conserva etiquetas, requerido, ayuda y error accesible. |
| `Flag` | estable | No se identificaron banderas de país. | Sin caso actual; no sustituir iconos genéricos ni emojis que no representan países. |
| `FlowChart` | estable | Una de las dos visualizaciones con datos de `FuelDashboardPage` (`bar` de recargas/recortes) ya usa Flow; `LineChart` (`line` de costo/km) sigue como SVG local. Dos de las cuatro tarjetas muestran estados vacíos. | Adopción parcial. La diferencia contractual es concreta: `LineChart` añade `MXN/km` al tooltip, pero deja el eje Y como número; `FlowChart.format` formatea tanto el eje como el tooltip. Migrar si producto acepta la unidad en ambos o cuando exista un contrato sencillo para separar los formatos; validar también la interacción y una alternativa textual accesible. |
| `FlowLogo` | estable | La marca mostrada es Edenred One/Ticket Car. | No aplica: no sustituye el logo del producto por el wordmark de Flow. |
| `IconButton` | estable | Acciones solo-icono de barra, gráficas y controles flotantes. | En uso; nombre accesible y tamaño se declaran explícitamente. |
| `InlineCode` | estable | Cinco sitios JSX de `<code>` en dos módulos de integración/API. | Candidato pequeño y localizado; limitarlo a identificadores/métodos inline, no bloques de código. |
| `Input` | beta | Búsquedas y campos de texto simples migrados. | En uso deliberado; se mantienen nativos los campos que requieren atributos no publicados o ARIA especializado. |
| `LimitBar` | estable | Un medidor de políticas de peaje compara gasto con tope y alerta al 75%/90%. | Hay un caso, pero no migrar: la API actual marca el cruce del 100% y no representa los umbrales operativos ni la semántica accesible necesaria. |
| `Listbox` | beta | `QuickTopUp` usa `Listbox` para renderizar las opciones del combobox de vehículos. | Adoptado como lista de opciones controlada; se conservan el filtro por placa/dispositivo/conductor, la navegación desde el input, la selección y las clases visuales de resultado. |
| `OverlayScope` | beta | La app corre como pantalla completa, no como superficie embebida. | Sin necesidad actual; sirve para contener overlays dentro de un marco anfitrión embebido. |
| `OverlayShell` | estable | Base del `Modal` compartido por 13 diálogos. | En uso; el shell se delega a Flow y el contenido/presentación sigue siendo del producto. |
| `PageFrame` | deprecado | No importado. | No adoptar; el manifiesto indica que se retira en 4.0. |
| `Popover` | beta | `components/api/ApiCoverage.tsx` lo usa en el `ApiTag` compartido por 43 apariciones en 14 módulos TSX. | Adoptado en el detalle flotante API; Flow administra portal, posicionamiento, colisión, cierre y retorno del foco. Se conservan apariencia y contenido de producto. Los dos paneles de solicitudes/Dev son diálogos y no se migran como popovers. |
| `Progress` | estable | No hay progreso general de tarea o carga; el único medidor con cifras es gasto contra límite. | No adoptar: no hay un caso de progreso genérico y no cubre los umbrales semánticos del medidor de peaje. |
| `Radio` | estable | Selección de rol en invitaciones. | En uso; se conserva la descripción de las opciones y la validación del grupo. |
| `ScaleLegend` | estable | No se encontró leyenda de escala continua. | Sin caso actual; no equivale a leyendas categóricas de gráficas. |
| `SectionBar` | estable | No se encontró una barra de sección sticky con contenido/trailing equivalente; los tres `sticky` locales corresponden a navegación o encabezado de tabla. | Sin caso coincidente identificado; no migrar solo por tener encabezados de sección. |
| `SectionHeader` | estable | `ChartCard` (cuatro tarjetas), `ActivitySection`, `AttentionList`, `RulesSection`, `PoliciesSection` y `AssignmentsTable`. | Adoptado selectivamente; conservar IDs accesibles, niveles semánticos y contenido trailing. Los demás headings no son candidatos automáticos. |
| `SheetBody` | beta | No hay bottom sheets de Flow en la app. | No aplica hasta que exista una superficie tipo sheet. |
| `SheetHeader` | beta | No hay bottom sheets de Flow en la app. | No aplica hasta que exista una superficie tipo sheet. |
| `Skeleton` | estable | El prototipo muestra datos mock sin estados de carga. | Sin caso visible actual; no introducir placeholders donde no hay carga asíncrona. |
| `Slider` | estable | No se encontró un input `range`. | Sin caso actual; los importes/cantidades son entradas discretas con `min`/`step`, no rangos continuos. |
| `Sparkline` | estable | Los KPIs muestran cifras y variaciones, no microseries inline. | Sin equivalencia directa en la UI actual; evaluar solo si se agrega tendencia temporal compacta. |
| `Stack` | beta | Acciones agrupadas de `RulesSection` y `PoliciesSection`; filtros y estados agrupados de `AssignmentsTable`. | Adoptado selectivamente con `gap={2}` (8 px) y `wrap`; preservar layouts estructurales y migrar solo grupos de hermanos con contrato equivalente. |
| `Specimen` | estable | Sin catálogo de especímenes dentro del producto. | Herramienta de exhibición/validación, no primitive de pantalla de usuario. |
| `Spinner` | estable | No se identificó operación asíncrona con espera visual en el mock. | Sin caso actual; incorporar solo junto a una acción realmente en curso. |
| `StatusPill` | estable | Reemplaza etiquetas de estado estáticas en facturas, accesos, medios de pago, mantenimiento, flota, políticas y reglas. | Adoptado para estados: success, warning, danger, info y neutral según significado. Se conservan chips de tipo/clasificación e interactivos. |
| `StatusView` | beta | No hay pantalla de indisponibilidad/error de servicio. | Sin caso actual en el prototipo offline/mock. |
| `Stepper` | estable | Los formularios actuales no son asistentes multipaso. | No aplica; no representa pasos de combustible o selecciones segmentadas. |
| `Switch` | estable | Preferencias de desarrollo y estados on/off. | En uso; mantiene el modelo controlado y los nombres accesibles. |
| `TabBar` | beta | La navegación principal es un menú lateral/top bar. | No aplica a la navegación actual; diseñado para navegación inferior móvil. |
| `Textarea` | estable | Descripción de orden de servicio y otros textos largos. | En uso; conserva filas, valores y cambios controlados. |
| `Timeline` | beta | Mantenimiento usa tablas/listas, no una cronología de eventos por registro. | Posible necesidad futura, no reemplazo de tablas de órdenes. |
| `Toast` | estable | `App` muestra avisos breves mediante `ToastHost` y `useToast`. | Adoptado con tono neutral y duración de 3.6 s; mantiene el tiempo del aviso anterior y pausa el temporizador por puntero/foco. |
| `ToastHost` | estable | Envuelve el punto de entrada y aloja los avisos de toda la app. | Adoptado con la cola FIFO de Flow; los callbacks de notificación conservan su firma. |
| `ToggleControl` | beta | No se importa directamente. | Mecanismo compartido interno; usar `Checkbox`/`Switch` según semántica, no el helper de bajo nivel. |
| `NavCard` | estable | No hay navegación entre páginas con tarjeta prev/next. | Sin caso actual; el menú lateral y breadcrumbs cubren otras tareas. |
| `TextAction` | beta | `QuickTopUp` muestra la acción textual secundaria «Cambiar» junto al combobox de unidad. | Candidata por jerarquía y semántica; su tinta `--text-accent` reemplaza el azul local por un rol del diccionario. Validar el objetivo de 44 px y la integración como acción trailing de la búsqueda. No es reemplazo universal de `Button`. |

### Orden de prioridad e impacto de las 7 oportunidades restantes o parciales

La prioridad combina alcance potencial en la app, centralidad del punto de
cambio, valor de producto y viabilidad del contrato de Flow. No es un conteo de
migraciones realizadas: las oportunidades deben confirmarse por superficie y
validarse visual y funcionalmente. Los proxies de CSS son indicios para
investigar, no instancias equivalentes.

| Prioridad | Primitive | Evidencia de uso | Impacto potencial | Acción y condición |
|---:|---|---|---|---|
| 1 | `DetailRow` | Adoptado en tres pares de presentación de presupuesto; 63 pares `<dt>/<dd>` existentes en 16 grupos semánticos. | Alto: amplia presencia en detalles de producto, con una limitación de API relevante. | Mantener el uso en presupuesto; no sustituir los `<dl>` existentes porque Flow renderiza `div`/`span` y no preserva la semántica término-definición. Reabrir al cambiar el contrato público. |
| 2 | `FlowChart` | Dos gráficos con datos en `FuelDashboardPage`: barras multiserie por Flow y línea SVG local; las otras dos tarjetas muestran estados vacíos explicativos. | Alto valor visual en el dashboard, aunque el uso actual se concentra en una página; contrato estable y temas/tokens integrados. | Corregir la alineación de marcas de la barra; pilotear luego la línea si se acepta formatear la unidad en eje y tooltip, o solicitar un formato separado. No migrar los placeholders como gráficos sin datos. |
| 3 | `ChartLegend` | Flow bajo la gráfica multiserie; una leyenda local acompaña la única línea. | Alcance acotado; su legibilidad afecta la lectura de series. | Usar `marks="fill"` para emparejar los swatches de la leyenda con las tramas de FlowChart; revisar tamaño/alineación y duplicación del nombre de serie de la línea antes de adoptar la leyenda ahí. |
| 4 | `InlineCode` | 5 sitios JSX `<code>` en 2 módulos de integración/API. | Bajo en alcance, con impacto localizado. | Adopción pequeña para identificadores y métodos inline; no aplicar a bloques de código. |
| 5 | `LimitBar` | Un medidor de gasto frente a límite en políticas de peaje. | Alto para esa regla, pero el contrato actual no cubre el comportamiento requerido. | Bloqueado: no migrar hasta poder representar umbrales 75%/90% y conservar la semántica accesible. |
| 6 | `Divider` | Cero separadores semánticos `<hr>`; los bordes observados son mayormente decorativos. | Sin impacto de migración demostrado hoy. | No adoptar por semejanza visual; esperar un caso que coincida con el contrato semántico. |
| 7 | `SectionBar` | No hay barra sticky de sección equivalente; los casos sticky actuales son navegación o encabezado de tabla. | Sin impacto de migración demostrado hoy. | No adoptar por compartir el concepto de encabezado; esperar una superficie que coincida con el contrato sticky. |

**Siguiente lote para escalar:** evaluar `InlineCode` en las superficies de
integración/API. `ChatMessage` queda adoptado en TED y `DetailRow` parcialmente;
mantener los `<dl>` semánticos hasta que el contrato de Flow permita
preservarlos. `FlowChart`/`ChartLegend` ya tienen un piloto parcial en el
dashboard. No avanzar con `LimitBar`, `Divider` o `SectionBar` sin
resolver primero sus brechas de contrato.

### Componentes y patterns: catálogo fuera de primitives

Las dos listas siguientes pertenecen a capas distintas de `primitives`; sus
elementos no se cuentan en el avance de migración de primitives. Los nombres
proceden del campo `layer` del manifiesto. `ToastStack` es un export auxiliar
de la composición de `Toast`, no una entrada independiente del catálogo.

**Componentes (`components`, 68):** `Accordion`, `Active filters`, `AvatarGroup`,
`BalanceDisplay`, `Bars`, `BiometricPrompt`, `BottomSheet`, `BrandHero`,
`BulkBar`, `BulletChart`, `Card`, `CardCarousel`, `CardMedia`, `ChatComposer`,
`ChatThread`, `CodeBlock`, `Data freshness`, `DataGrid`, `DatePicker`,
`DateRangePicker`, `Dialog`, `Document viewer`, `Donut`, `Drawer`,
`FileUpload`, `FilterBar`, `FilterableEditableTable`, `GanttChart`,
`GlobalSearch`, `HelpCenter`, `InputAmount`, `InputPhone`, `KanbanBoard`,
`List`, `ListRow`, `MapCanvas`, `Menu`, `NavBar`, `NipReveal`,
`NotificationCenter`, `OTPInput`, `Pagination`, `ParetoChart`,
`PasscodeKeypad`, `PeekSheet`, `QrScanner`, `QuickAction`, `QuickActionBar`,
`RoleMatrix`, `RouteBanner`, `Saved views`, `ScatterPlot`, `SectionRule`,
`SegmentedControl`, `Select`, `Sidebar`, `SmallMultiples`, `StatTile`,
`StationRow`, `TabPanel`, `Table`, `TableTree`, `Tabs`, `Tooltip`, `TopBar`,
`TransactionRow`, `Treemap`, `WidgetFrame`.

**Patterns (`patterns`, 64):** `AnatomyView`, `AuthForm`, `Biometric unlock`,
`Bulk card issue`, `BulkActionsTable`, `Búsqueda global`, `CardControls`,
`Conversation`, `Dashboard / analytics`, `Dashboard customize`, `DataTable`,
`Device pairing`, `DocFooter`, `DocHero`, `DownloadCard`,
`Driver offboarding`, `Fault report`, `FilterSet`, `Fleet assignment`,
`Formulario multi-paso (Wizard)`, `Fuel session`, `GuidanceCard`,
`Guía: data viz para flotas grandes`, `IdentityCheck`, `InstallCard`,
`KpiBand`, `Legacy PIN login`, `Listado + detalle (CRUD)`,
`Notification setup`, `OTP verification`, `OnboardingCarousel`, `PageHeader`,
`Passcode entry`, `PaymentCard`, `PlaygroundCanvas`, `Points redemption`,
`Preventive schedule`, `Profile edit`, `ProfileMenu`, `ProposalCard`,
`PullToRefresh`, `QR station scan`, `Receipt dispute`, `Referral invite`,
`Reward catalogue`, `RideOffer`, `Selector de país`, `Service booking`,
`Sesion de carga`, `Session recovery`, `Settings`, `Spend policy edit`,
`StateGrid`, `Statement export`, `StationFinder`, `Support ticket`,
`Toll passage`, `TransactionGroup`, `TransferList`, `Vehicle onboarding`,
`WidgetGrid`, `WidgetLibrary`, `Wizard`, `Work order review`.

#### Estado de adopción por capa

Conteo basado en imports directos de la app desde
`@er-mobility-mx/design-system`, contrastado con `layer` del manifiesto y la
clasificación conceptual documentada por Flow. Cuenta tipos de componente con
al menos un uso, no instancias ni sustitución completa de patrones locales.

| Capa | Catálogo | Usados directamente | Avance por tipo | Lectura |
|---|---:|---:|---:|---|
| Primitives | 55 | 26 con adopción iniciada | 47.3% del catálogo; 86.7% de los 30 con caso aplicable | No indica el porcentaje de instancias migradas; `Button` e `Input` tienen auditoría de cobertura pendiente. |
| Components | 68 | 9 | 13.2% | Conteo por la clasificación conceptual del inventario; 8 son components según el manifiesto beta.9 y `Select` se cuenta aquí por decisión arquitectónica. El resto no se considera automáticamente pendiente. |
| Patterns | 64 | 0 | 0% de imports directos | Hay patrones locales que podrían ser oportunidades de mapeo, pero no se reclasifican ni se migran por semejanza visual. |

Los 9 components conceptuales con import directo actual son `Accordion`,
`DatePicker`, `FileUpload`, `InputAmount`, `Menu`, `Select`, `TabPanel`,
`Tabs` y `Tooltip`. El manifiesto del paquete marca `Select` como primitive:
con la capa estricta del paquete hay 8 components usados de 66 (12.1%) y
`Select` se registra como primitive. Para el avance principal se mantiene la
clasificación conceptual del inventario (68 components y 55 primitives), sin
mezclar denominadores. `StatusPill`, `Avatar`, `SectionHeader` y otros exports
clasificados como primitives no se suman a los components.

#### Patterns de Flow: oportunidades por mapear

No se identificaron imports directos de la capa `patterns` en la app. La
tabla identifica posibles superficies de comparación, no declara equivalencia
ni que todos deban adoptarse:

| Pattern de Flow | Superficie local relacionada | Pendiente / criterio |
|---|---|---|
| `Búsqueda global` | Búsqueda global de `TopBar`. | Comparar descubrimiento, resultados, teclado y navegación; hoy se usa `Input` Flow y el flujo de resultados es propio. |
| `Dashboard / analytics` | Resumen de combustible en `FuelDashboardPage`. | Comparar el layout de analítica y visualizaciones sin asumir que sustituye el dashboard o sus charts locales. |
| `PageHeader` | `PageHeader` local con breadcrumb, volver y toggle del menú. | Comparar estructura y extensibilidad; ya usa `Breadcrumb` y `Button` primitivos, no es adopción del pattern. |
| `Listado + detalle (CRUD)` | Catálogos, usuarios, facturas, vehículos y medios. | Comparar por flujo; preservar tablas, filtros, acciones y navegación contextual. |
| `Spend policy edit` | Edición de políticas de límites/peaje. | Revisar campos, reglas y validación; las superficies ya consumen primitives y components Flow. |
| `Work order review` | Consulta y edición de órdenes en `MaintenancePage`. | Revisar el ciclo completo y estados; no sustituir la página por parecido de dominio. |
| `Conversation` | TED (`TedPage`). | Comparar hilo, composer y estados de pensamiento; el patrón local no importa un pattern de Flow. |
| `Settings` | Parámetros y preferencias de desarrollo. | Verificar si son ajustes de usuario equivalentes o catálogos administrativos antes de priorizar. |

Los otros 56 patterns del catálogo no tienen una superficie candidata
registrada en este barrido. Esto significa “sin relación identificada”, no
“auditoría exhaustiva que demuestra que nunca aplican”.

### Componentes relacionados con usos observados en la app

La siguiente tabla es una selección de componentes con uso o relación observada,
no parte de la matriz de primitives. El estado de import directo se indica
explícitamente; los componentes sin import siguen siendo oportunidades
condicionadas, no deuda automática.

| Componente (capa Flow) | Madurez web | Relación con el producto | Decisión |
|---|---|---|---|
| `DatePicker` | beta | Órdenes de servicio y reportes. | **En uso directo**; mantener adopción y validación. |
| `FileUpload` | estable | Carga masiva de dispersión. | **En uso directo** para seleccionar/soltar CSV único; parseo, plantilla y validación siguen propios. |
| `InputAmount` | estable | Formularios monetarios de dispersión, límites y peajes. | **En uso directo** con currency/formatting y validación del producto. |
| `Menu` | estable | Menú contextual en `ChartCard`. | **En uso directo**; mantiene callbacks, cierre y navegación administrados por Flow. |
| `Select` | estable | Filtros y opciones de formularios en múltiples superficies. | **En uso directo**; conserva selección y callbacks. Se cuenta en components según la clasificación conceptual de Flow. |
| `TabPanel` | estable | Paneles de Reportes, Mantenimiento, ActivitySection, Insights y Optimizador. | **En uso directo** junto con `Tabs`; los cinco contextos identificados usan IDs enlazados y panel asociado. |
| `Tabs` | estable | Reportes, Mantenimiento, ActivitySection, Insights y Optimizador. | **En uso directo**; las cuatro tablists locales se migraron y conservan selección controlada y navegación por teclado. |
| `Accordion` | estable | `ApiCoverageBanner` y detalle de unidades en `SimulationDialog`. | **En uso directo** en dos disclosures; contenido inicialmente cerrado y trigger/región accesibles generados por Flow. |
| `Tooltip` | estable | `ChartCard`. | **En uso directo**; Flow gestiona hover/foco, relación accesible y posicionamiento adaptable. |
| `Card` | estable | Tarjetas de dashboard y producto con CSS propio. | No importado; evaluar familias concretas, no reemplazo masivo por semejanza visual. |
| `StatTile` | estable | `SummaryCard` presenta KPI, periodo comparativo, delta favorable/desfavorable y unidad en `FuelDashboardPage`. | Candidato concreto; comparar el contrato de delta, estados sin datos, unidad y acentos de producto antes de migrar. |
| `DateRangePicker` | deprecado | No se identificó caso separado; el alias está deprecado. | No adoptar; usar `DatePicker` en modo rango si surge el caso. |
| `Dialog` | estable | Los 13 diálogos usan `Modal` con `OverlayShell`. | No importado directamente; no duplicar adopción del shell sin comparar estructura y presentación. |
| `BottomSheet` / `Drawer` | estable | No hay flujo identificado que requiera sheet móvil o drawer de detalle. | Sin caso actual identificado. |
| `Table` / `DataGrid` | beta | 19 sitios JSX de `<table>` nativo en 17 módulos: listados operativos, historiales, asignaciones y vistas previas. | No importados. `Table` es la piel de presentación que compone `DataGrid`; `DataGrid` posee orden, selección, fila marcada, árbol y cromo de tabla. No hay un primitive tabular de Flow separado: la base semántica local es HTML (`table`, `thead`, `tbody`, `tr`, `th`, `td`) y el contenido de las celdas compone primitives como `Button`, `Select`, `Input`, `Checkbox`, `Badge` y `StatusPill`. Ver auditoría por caso abajo; no tratar las 19 instancias como equivalentes. |
| `DataTable` | beta | Las superficies operativas tienen filtros externos; no se encontró paginación o selección múltiple en las tablas nativas. | Pattern de trabajo compuesto sobre `Table`, `Input`, `Pagination`, `EmptyState`, `StatusView` y `BulkBar`. Candidato donde exista una necesidad coordinada de buscar/filtrar/ordenar/paginar/seleccionar/editar; no envoltorio obligatorio de cada tabla. `searchable`, `sortable` y `paginated` se deben configurar para no añadir interacciones que la pantalla no tiene. |
| `BulkActionsTable` / `FilterableEditableTable` | deprecated | Ninguna tabla local presenta selección múltiple en lote ni edición inline de celdas. | No adoptar. El RFC 0004 de Flow las retira en favor de `DataTable` con `selectable`/`bulkActions` o `editable`/`onCellEdit`, cuando esos flujos sí existan. |
| `TableTree` | beta | No se encontraron filas jerárquicas con hijos expandibles. | No aplica a los listados planos; solo usar si el modelo de datos es realmente arbóreo, no para agrupar filas por estilo. |
| `Pagination` | estable | `ActivitySection` muestra seis dispersiones y un control «Ver más»/«Ver menos»; las demás tablas no exponen páginas. | No sustituir el flujo incremental de actividad por páginas en un primer piloto. Considerar paginación solo si el volumen/demanda de consulta lo justifica; no añadirla por defecto. |
| `TransactionGroup` / `TransactionRow` | estable | Historial de movimientos de peaje y tablas de comprobante/actividad. | No son sustitutos visuales universales: `TransactionGroup` es una lista cronológica agrupada por fecha y `TransactionRow` una fila de transacción compacta. Cuando la tarea compara varios atributos en columnas, mantener la tabla (`Table`/`DataGrid`). |
| `Accordion` | estable | `ApiCoverageBanner` y `SimulationDialog` tienen contenido de detalle expandible. `RequestsPanel` y `DevModeMenu` abren diálogos, no disclosures. | Adoptado en cobertura API y simulación; el contenido inicia cerrado y Flow aporta el trigger y la región accesibles. No aplica a los diálogos ni al botón «Ver más» de ActivitySection. |
| `ChatComposer` / `ChatThread` | estable | TED tiene composer e hilo propios, con estados de pensamiento. | No importados; comparar envío, estados y contenido antes de plantear adopción. |
| `SegmentedControl` | estable | Hay tabs y grupos de selección que no siempre comparten semántica. | No importado; clasificar cada grupo (cambio de vista frente a selección) antes de elegir el control. |
| `FilterBar` / `ActiveFilters` | estable / n/a | Filtros con layout y chips propios. | No importados; evaluar por pantalla. `ActiveFilters` sin madurez web explícita queda fuera de adopción. |

#### Prioridad de evaluación de componentes por impacto

La prioridad considera el alcance potencial en superficies de producto, la
frecuencia/reutilización, la importancia de la interacción y la madurez y
equivalencia de la API web. El orden expresa impacto potencial, no autoriza una
migración masiva ni implica que el candidato sea viable sin un piloto.

| Prioridad | Componentes | Evidencia en la app | Impacto potencial | Siguiente paso / condición |
|---:|---|---|---|---|
| 1 | `Table` / `DataGrid` / `DataTable` | 19 tablas nativas en 17 módulos; predominan listados operativos, con flujos distintos en historial, asignaciones y previews. | Muy alto por frecuencia e importancia; la madurez beta de los componentes y las diferencias de comportamiento reducen la confianza para migración masiva. | Piloto de `Table` en `InvoicesPage` para probar piel y celdas sin añadir funciones. Luego evaluar familias; `DataTable` solo cuando haya requisitos explícitos de flujo integrado. No reemplazar en bloque. |
| 2 | `Tabs` (completado) | Reportes y las cuatro tablists locales usan el component en cuatro módulos adicionales. | Alto: interacción repetida en cuatro superficies y contrato Flow estable. | Migración completada en Mantenimiento, ActivitySection, Insights y Optimizador; conservar las comprobaciones de teclado y panel/ID al modificar estas pantallas. |
| 3 | `Accordion` | Detalle expandible en cobertura API y simulación; solicitudes y ajustes Dev son diálogos, no disclosures. | Medio: patrón localizado en dos superficies; Flow publica una API estable y gestiona la relación trigger/panel. | Migrado en ambas superficies, conservando el estado inicial cerrado y el contenido; no aplicar a popovers, diálogos ni acciones de «ver más». |
| 4 | `ChatComposer` / `ChatThread` | TED conserva composer e hilo locales; `ChatMessage` ya está adoptado. | Medio: completa una experiencia importante, pero está concentrado en una sola pantalla. | Evaluar contrato de envío, teclado, sugerencias, contenido enriquecido, scroll y anuncio de estados; migrar solo las partes que coincidan. |
| 5 | `FilterBar` / `ActiveFilters` | Filtros distribuidos por listados y páginas; cada pantalla tiene composición y chips propios. | Medio: puede reducir duplicación entre superficies, pero el impacto y la equivalencia varían por pantalla. | Mapear primero una pantalla representativa. No adoptar `ActiveFilters` mientras su madurez web no esté definida. |
| 6 | `StatTile` | Cuatro KPIs en `FuelDashboardPage`, implementados por `SummaryCard`. | Bajo-medio: visible y repetido en un dashboard, pero limitado a una sola superficie. | Comparar periodo/unidad, valor anterior, ausencia de datos, juicio del delta y acentos de producto; no migrar si esos estados requieren reconstruir la tarjeta fuera de la API. |
| 7 | `SegmentedControl` | Grupos locales de tabs y selecciones discretas con contratos de interacción distintos. | Bajo o condicionado: el impacto depende de hallar casos que realmente sean selección segmentada. | Clasificar cada grupo por semántica antes de elegirlo; no convertir navegación tab ni chips de selección por semejanza visual. |

#### Auditoría de tablas: estructura, componentes y patterns

El inventario JSX encontró **19 elementos `<table>` en 17 módulos**. El
prototipo no importa `Table`, `DataGrid` ni `DataTable`; por ahora sus tablas
usan HTML nativo y CSS de producto. La selección por capa no es “HTML o Flow”:
la estructura semántica de tabla es el primitive de plataforma (`table`,
`thead`, `tbody`, `tr`, `th`, `td`); los controles dentro de las celdas pueden
ser primitives Flow; los componentes `Table`/`DataGrid` administran mecánica y
presentación; `DataTable` compone el flujo de trabajo cuando la pantalla lo
necesita.

**Qué ofrece cada capa de Flow**

| Capa | Pieza | Contrato verificado | Aplicación en este prototipo |
|---|---|---|---|
| Primitive de plataforma | HTML table y controls de celda | La base conserva las relaciones nativas de filas/cabeceras. El catálogo de Flow no declara un primitive tabular separado. | Las 19 instancias son HTML nativo. Todas usan `<th scope="col">`; ninguna tabla declara `<caption>`, `aria-label` o `aria-labelledby` en el elemento, y no se encontró `scope="row"`. Añadir un nombre accesible por tabla es una mejora común, incluso si se conserva el HTML. |
| Primitives Flow en celdas | `Button`, `Input`, `Select`, `Checkbox`, `Badge`, `StatusPill` y similares | Cada primitive resuelve una interacción o dato propio; no sustituye la estructura de tabla. | Varios listados ya usan `Button`, `Select`, `Switch`, `Badge` y `StatusPill` dentro de celdas. Se mantienen esas piezas y sus callbacks al cambiar la carcasa tabular; no se confunde la adopción de un control con la migración de la tabla. |
| Component | `DataGrid` (beta) | Mecánica compartida: columnas, orden, selección, fila marcada/clicable, densidad, vacío y modo árbol. Usa HTML table; expone `caption`, selección controlada/no controlada, orden controlado, `onRowClick`, columnas y `tree`. No contiene búsqueda ni paginación coordinada. | Es la base mecánica cuando se necesita una o más de esas funciones sin el flujo completo del pattern. No activar `onRowClick`, selección ni árbol si la tabla actual no los tiene. |
| Component | `Table` (beta) | Piel de `DataGrid`: superficie de tarjeta, cabecera overline y celdas/datos; las mismas props de orden/selección, `caption` y fila. No es otra mecánica independiente. | Mejor candidato para homogeneizar tablas HTML simples. Por defecto `sortable` está activo y `surface="card"` dibuja tarjeta; para conservar el comportamiento y carcasas existentes, pasar `sortable={false}` cuando no haya orden y `surface="none"` dentro de `.table-page__card`, `.activity` o `.assignments`. |
| Component | `TableTree` (beta) | `DataGrid` con `tree` activo, jerarquía, expansión, indentación y `aria-expanded`. | No aplica: no se identificaron filas con jerarquía padre/hijo; no usar solo para grupos visuales o secciones. |
| Pattern | `DataTable` (beta) | Coordina búsqueda, filtros en slot, orden, página, selección múltiple/acciones en lote y edición inline; compone `Table`, `Input`, `Pagination`, `EmptyState`, `StatusView` y `BulkBar`. Algunas funciones se pueden desactivar por separado. | Para tablas de operación que realmente necesiten flujos integrados. Tiene búsqueda, orden y paginación activas por defecto: configurar explícitamente `searchable`, `sortable` y `paginated` para no introducir UI ni conducta nueva. Mantener los filtros de producto en `filters` o como estado upstream, según el comportamiento actual. |
| Pattern / componente en retiro | `BulkActionsTable` (pattern) y `FilterableEditableTable` (component) | El RFC 0004 los marca deprecados y los absorbe `DataTable`: selección + bulk actions, y edición junto con búsqueda/filtros. | No hay esos flujos en las tablas actuales. No migrar a los exports en retiro ni añadir selección/edición para “completar” la adopción. |
| Pattern de lista | `TransactionGroup` + `TransactionRow` | Historial cronológico como secciones por fecha y filas compactas; no presenta columnas comparables. | El historial de TAGs y los detalles de comprobante tienen campos comparables en columnas: no son candidatos a reescribirse como lista cronológica. Una futura vista de movimientos tipo feed sí podría evaluarse por separado. |

**Distribución de las 19 instancias**

| Familia | Instancias | Lectura de contrato |
|---|---|---|
| Listados operativos (12) | `DriversPage`, `VehiclesPage`, `PaymentMediaPage`, `InvoicesPage`, `UsersPage`, `ParametersPage`, `TollMediaPage`, `TollRulesPage`, tabla de recargas automáticas en `TollBalancesPage`, `MaintenancePage`, `GasOptimizerPage` y `AssignmentsTable`. | Registros con columnas, filtros externos y/o acciones/controles dentro de las filas. Ninguna muestra orden por encabezado, paginación, selección masiva o edición inline. Son candidatos a un piloto de `Table` (presentación) manteniendo cada toolbar y acción; `DataTable` solo si se decide incorporar explícitamente su flujo. `AssignmentsTable` requiere especial cuidado por su `Select`, medidor de uso y acciones por unidad. |
| Actividad e historial (3) | Dos tablas condicionales de `ActivitySection` —dispersiones y pagos programados— y el historial de movimientos en `TollBalancesPage`. | `ActivitySection` revela seis dispersiones inicialmente y usa «Ver más»/«Ver menos», no páginas. Mantener ese flujo; `TransactionGroup` no conserva la comparación por columnas. |
| Previsualización/detalle (4) | Filas importadas en `BulkUploadDialog`, líneas de `ReceiptDialog`, muestra de unidades en `SimulationDialog` y preview de columnas en `DynamicReportBuilder`. | Son tablas de lectura dentro de diálogos o una vista previa: sin búsqueda/orden/selección. El preview de reporte actualmente contiene cabecera sin filas y un `EmptyState`, por lo que no es una tabla de datos para migrar; `BulkUploadDialog` debe considerar tamaño máximo del CSV antes de cambiar a paginación. |

**Cascada visual y riesgos de equivalencia**

`DataGrid` toma roles semánticos del diccionario: `--surface-card`,
`--surface-sunken` para zebra, `--surface-accent-subtle` para hover/selección,
`--action-accent` para la marca lateral de selección, `--border-subtle`,
`--type-data` para columnas mono y `--density-cell-x`,
`--density-cell-y`/`--density-head-y` para densidad. `Table` aporta la
superficie con `--radius-lg`, `--border-subtle` y `--surface-card`; la barra de
selección `BulkBar` usa `--surface-accent-subtle` y `--border-focus`. La
densidad y la tinta se resuelven en `sys`, no con hex copiados del CSS de cada
pantalla.

El CSS local, en cambio, fija tipografía de 13 px, encabezados overline de
11 px, padding de celda de 11–12 px y bordes en `--tc-local-border-subtle`
(literal local); varias familias solo habilitan overflow horizontal, sin zebra,
hover o fila seleccionada. Flow introduce estados/estilos de orden, hover,
selección y una superficie de tarjeta; no son visualmente neutros. Las medidas
de texto/densidad deben probarse por densidad, y `mono` debe marcarse solo para
datos que lo necesiten, no para todas las celdas.

En responsive, las tablas locales preservan columnas mediante
`overflow-x: auto` y `min-width`. `DataGrid` también permite scroll, pero
`priority={2|3}` oculta columnas bajo breakpoints específicos. No asignar
prioridades para hacer caber la tabla sin validar que esos datos puedan
desaparecer; el modo equivalente al prototipo es mantener todas las columnas y
permitir el scroll.

**Plan recomendado**

1. Pilotear `Table` en una tabla operativa representativa, por ejemplo
   `InvoicesPage`: preservar filtros/producto y acciones PDF/XML, entregar
   `caption`, `sortable={false}` y `surface="none"` dentro de la tarjeta actual.
   Comparar densidad, contraste, foco, ancho y scroll antes/después.
2. Si el piloto confirma la equivalencia, evaluar una familia a la vez (las
   tablas compartidas de `TablePage.css` primero), normalizando columnas/celdas
   como `GridColumn` con `render` para `Badge`, estado y acciones. No esconder
   columnas ni incorporar selección/paginación por defecto.
3. Evaluar `DataTable` aparte para `AssignmentsTable` o una lista de alto
   volumen solo si producto requiere coordinar búsqueda, filtros, orden,
   páginas, selección o edición. Evitar duplicar el filtro existente; definir
   cuál estado es dueño y cómo se conserva la selección al filtrar/paginar.
4. Mantener las tablas de recibos, simulación, cargas y actividad como
   superficies especializadas hasta verificar volumen y el layout del diálogo.
   Añadir un `caption` accesible en todas; el preview de reporte debe resolverse
   como estado vacío/preview, no envolverse en un pattern de tabla sin filas.

#### Auditoría de charts: diccionario, primitives, componentes y composición

En `FuelDashboardPage` hay **cuatro tarjetas de gráfica**: dos visualizaciones
con datos y dos estados vacíos explicativos. `Recargas y Recortes` es un
`FlowChart` de barras multiserie; `Costo por kilómetro` es un gráfico SVG local
de línea; `Rendimiento por vehículo` y `Consumo organizacional` usan `EmptyChart`
porque el dashboard declara que no tiene datos. No contar estas dos últimas
como charts implementados ni escoger sus tipos hasta conocer datos y pregunta
analítica.

**Capas de Flow**

| Capa | Pieza | Contrato y lugar en la composición |
|---|---|---|
| Primitive de visualización | `FlowChart` (estable) | Primitive genérico basado en ECharts y carga diferida. Declara 16 tipos (`line`, `area`, `bar`, apiladas, `donut`, `pie`, `scatter`, `heatmap`, `radar`, `waterfall`, `pareto`, `gauge`, `funnel`, `treemap` y `boxplot`), series/labels o matriz, `format`, altura, leyenda, animación, carga, vacío, `ariaLabel` y `onSelect`. Lee tokens en runtime, observa cambios de tema y tamaño, respeta movimiento reducido y muestra estado ante fallo de carga. El gráfico actual de barras ya lo consume a través de `BarChart`. |
| Primitive de soporte | `ChartLegend` (estable) | Leyenda DOM para swatches, categorías y valores/detalles; soporta tamaño, orientación, ancho y `marks="line"|"fill"` para repetir trazos/tramas no cromáticas del gráfico. El piloto de barras la consume de forma separada porque `FlowChart` se monta con su `legend` desactivada. |
| Componentes de visualización | `Bars`, `BulletChart`, `Donut`, `ParetoChart`, `ScatterPlot`, `SmallMultiples`, `Treemap`, `GanttChart` | Resuelven semánticas más específicas sobre Flow o composiciones propias: comparación simple, real vs meta, parte-del-total, concentración acumulada, relación X/Y, series pequeñas con escala compartida, jerarquía por área y cronograma. No son wrappers intercambiables de un gráfico genérico. Ninguno tiene uso encontrado en las páginas actuales. |
| Pattern / dashboard | No se encontró un pattern de charts dedicado en `ui/patterns`. Flow publica una plantilla `Dashboard / analytics`, pero es guía de composición, no un pattern gráfico ni reemplazo de un dashboard existente. | `ChartCard` es composición propia del prototipo: título, subtítulo, controles y cuerpo. Ya delega encabezado, tooltip, menú y botones de icono a primitives Flow (`SectionHeader`, `Tooltip`, `Menu`, `IconButton`); su carcasa visual permanece local. `WidgetGrid`/`WidgetFrame` pueden ordenar widgets, no resuelven el contrato de una visualización ni reemplazan esta tarjeta por sí solos. |

**Diccionario de estilos y cascada**

Flow resuelve los colores de datos por roles, no por color de marca: `--viz-1`
a `--viz-8` para categorías; `--viz-accent` para la serie enfatizada;
`--viz-positive`/`--viz-negative` para significado favorable/desfavorable;
`--viz-neutral` para contexto; `--viz-grid`, `--viz-axis` y `--viz-label` para
ejes; `--viz-tooltip-bg`/`--viz-tooltip-text` para el tooltip. El tipado de
categorías y valores consume `--type-viz-category` y `--type-viz-value` (body
para categorías, mono para cifras); Flow también incorpora roles de `surface`,
fuente y paleta desde el diccionario. El tema claro/oscuro modifica esos roles
sin redefinir series en cada pantalla.

El gráfico local de línea conserva varios valores directos: `#2f6bff` como
color de la serie, `#fff` en los puntos y `#0f1b33`/blanco en el tooltip; la
rejilla y el texto usan aliases `--tc-local-*`. En cambio, los colores de
recargas/recortes ya usan `--viz-positive` y `--viz-negative`. Por lo tanto, el
SVG no está completamente integrado en la cascada dataviz aunque su layout sea
adaptable al ancho. Migrar a Flow cambia la apariencia y la respuesta a tema,
no solo el motor; no conservar los hex locales como override. La superficie y
el borde de `.chart-card` siguen siendo decisiones locales independientes de
los tokens internos del plot.

Para series múltiples Flow asigna además marcas no cromáticas (tramas en
rellenos, trazos en líneas y símbolos en puntos), porque las paletas no bastan
para distinguir datos bajo todas las deficiencias de visión cromática. Hay una
brecha concreta en el uso actual: `FlowChart` de barras puede dibujar las
tramas, pero `BarChart` pasa a `ChartLegend` solo label/color, sin
`marks="fill"`. La leyenda no reproduce así la marca del lienzo; al ajustar el
piloto, alinear ambos contratos. La leyenda local de la línea solo tiene una
serie, y el nombre ya aparece como subtítulo de la tarjeta: comprobar si aporta
información adicional antes de sustituirla.

**Contratos, accesibilidad y decisiones**

- `LineChart` usa un eje Y numérico (`formatTick`) y añade `MXN/km` únicamente
  a los valores del tooltip (`valueSuffix`). En `FlowChart`, `format` es un
  formateador compartido por el eje Y y el tooltip; no hay props separados en
  la API pública. El escape `option` permite personalización avanzada, pero no
  equivale a un contrato tipado y reusable de formato por contexto. La línea
  queda condicionada a aceptar la unidad en ambos sitios o a que Flow exponga
  el formato separado; no duplicar una implementación propietaria dentro del
  área de producto solo por conservar una omisión de unidad.
- El SVG local anuncia el gráfico como `role="img"` con `aria-label` y muestra
  tooltip mientras se mueve el puntero. FlowChart también expone un nombre
  accesible y una interacción de selección por callback, pero su lienzo no
  equivale a una tabla navegable de datos. Si el usuario debe consultar valores
  exactos sin puntero, acompañar el gráfico de resumen/lista o datos tabulares;
  no tratar `ariaLabel` como alternativa completa. Revisar teclado, foco,
  tooltip y tema durante cualquier piloto.
- `EmptyChart` contiene icono, título, explicación de negocio y, en un caso,
  texto del eje. No es equivalente al mensaje genérico vacío de `FlowChart`;
  conservar esta explicación o componerla explícitamente con `EmptyState`.
- Para futuros datos, decidir por la pregunta: `Bars` para comparar valores
  individuales; `BulletChart` si hay valor frente a meta; `SmallMultiples` si
  se comparan tendencias por vehículo con escala común; `Donut`/`Treemap` si la
  pregunta es composición parte-todo, y `ScatterPlot` si relaciona dos medidas.
  Confirmar dimensiones, volumen y tarea antes de escoger; hoy no hay evidencia
  para migrar automáticamente las dos tarjetas vacías.

**Secuencia recomendada**

1. Completar la revisión de `BarChart` con `ChartLegend marks="fill"` y
   verificar apariencia, serie positiva/negativa, marcas, modo oscuro, leyenda
   y tamaño responsive. Es una alineación de contrato ya soportado por Flow.
2. Evaluar el piloto de línea con producto: si se acepta `MXN/km` tanto en
   tooltip como en eje, probar `FlowChart type="line"` con la misma unidad,
   escala, fechas y series; si no, mantener el SVG local como excepción
   documentada hasta disponer de formatos separados. Probar movimiento
   reducido, actualización de tema y alternativa textual de los datos.
3. Mantener `ChartCard` y `EmptyChart` como composiciones de producto durante
   esta evaluación. No migrar la superficie de la tarjeta como si fuera parte
   del primitive de chart ni inferir tipos para gráficas que todavía no tienen
   datos.

### Adopción de StatusPill, Avatar y Breadcrumb

- `StatusPill` reemplaza estados fijos de registros en facturas, usuarios,
  parámetros, medios de pago, órdenes de servicio, vehículos, conductores,
  TAGs, reglas y políticas; también los estados de aprobación, sugerencia
  enviada y movimientos rechazados de peaje. Los tonos se asignan por
  significado (`success`, `warning`, `danger`, `info`, `neutral`), no por la
  clase CSS que tenían. Los chips que
  describen tipos de movimiento/actividad, categorías de alertas o filtros
  interactivos permanecen sin cambio.
- El botón de perfil de `TopBar` usa `Avatar` con iniciales determinadas por
  Flow. Se preserva el nombre visible y se oculta el avatar decorativo al árbol
  accesible para no duplicar el nombre del botón.
- `PageHeader` usa el `Breadcrumb` de Flow para la ruta de tres niveles y
  conserva el botón de regreso existente. El primitive no expone una propiedad
  para traducir su nombre de landmark; anuncia “Breadcrumb”.
- Se verificaron visualmente el shell (avatar y breadcrumb) y las pills de
  facturas en la demo. La compilación TypeScript y Vite pasó; este proyecto no
  define script `lint`.

Este inventario prioriza encontrar la cobertura que falta, no maximizar el
número de imports de Flow. Las tabs locales identificadas ya usan el component
estable. Los siguientes candidatos se evalúan uno por uno contra sus contratos
públicos y madurez; no se migran componentes por bloque o semejanza visual.

### Adopción de Listbox y evaluación de barras de uso

- `QuickTopUp` conserva su input de búsqueda porque el usuario filtra por placa,
  dispositivo, conductor y grupo. `Listbox` reemplaza la estructura manual de
  opciones y expone IDs estables, estado activo controlado y selección ARIA; el
  input conserva el contrato de combobox y sus flechas/Enter/Escape existentes.
- No se migra la barra de gasto de peaje a `LimitBar` ni a `Progress`: el
  producto usa estados en 75% y 90%, mientras que `LimitBar` solo marca
  sobrepaso al 100% y `Progress` no ofrece umbrales. Mantener la señal actual
  evita degradar la anticipación de riesgo.

### Adopción de Tooltip y Menu

- `ChartCard` delega en `Tooltip` de Flow la apertura por hover/foco, el
  anuncio accesible del contenido y el posicionamiento inferior con colisión
  contra el viewport. Se elimina el tooltip CSS local; la burbuja adopta la
  superficie visual de Flow.
- `Menu` reemplaza el menú contextual manual de `ChartCard`. Las opciones
  mantienen el callback `onOptionSelect`; Flow gestiona los roles, el cierre
  por selección/clic exterior/Escape, el retorno del foco y la navegación con
  flechas, Home y End.
- Se mantienen los labels accesibles de los dos triggers y la alineación del
  menú al borde derecho de la tarjeta. No se migra otra superficie: estos son
  los únicos tooltip y menú contextuales propios identificados en el producto.

### Adopción de Popover en ApiTag

- El detalle de integración de `ApiTag` usa `Popover` de Flow en las 43
  apariciones del marcador compartido. Se conserva el trigger inline propio y
  se pasa como ancla externa (`anchorRef`) para que el wrapper de layout de
  Flow no rompa los contextos existentes dentro de headings y texto.
- Flow administra el portal, la colisión/reposicionamiento y el cierre por
  clic exterior o Escape; el foco regresa al trigger al cerrar. La superficie
  interna mantiene las clases visuales y los datos de estado, nota y métodos.
- Los paneles de solicitudes/Dev son diálogos de producto, no popovers, y
  quedan fuera de esta migración.

## Cómo leer la matriz

- **Equivalente semántico**: consumir el rol público de Flow, aunque el valor
  visual pueda variar. Esa variación se debe aceptar o discutir; no se corrige
  recreando el valor anterior con CSS de la app.
- **Por contexto**: elegir entre roles existentes según el uso real (texto,
  estado, acción, superficie o dato de gráfico); no sustituir globalmente una
  variable con una sola respuesta.
- **Sin equivalente directo**: no hay permiso para inventar un token ni para
  apropiarse de un rol distinto. Mantener el hallazgo abierto para decisión de
  producto/Core Team.

## Color y superficies

Los roles semánticos de Flow se resuelven con modo y, donde aplique, con el
producto declarado en el subárbol de pantalla. En claro, por ejemplo,
`--surface-canvas` es `#F1F7FF`, `--surface-card` es blanco,
`--surface-sunken` es `#F1F5F9`, `--text-primary` es `#0F172A`,
`--text-secondary` es `#475569`, y `--text-muted` es `#5C6B80`.
En oscuro cambian a roles de superficie y tinta oscuros; no se debe fijar un
hex para conservar el aspecto claro.

| Variable del prototipo | Valor actual | Usos | Revisión frente a Flow |
|---|---:|---:|---|
| `--brand-navy` | `#0F172A` | 9 | Coincide con `--text-primary` y `--action-primary` en claro. Elegir el rol según se use como tinta o acción; no llevar ambos usos a una sola semántica. |
| `--brand-navy-soft` | `#1E293B` | 2 | No es el hover de `--action-primary` de Flow (que se resuelve por modo). Sin equivalente semántico directo; revisar cada uso. |
| `--brand-blue` | `#0060DF` | 30 | Coincide con la referencia azul 500, pero no con todos los roles: acción/enlace/estado/gráfico tienen semánticas distintas. Clasificar por uso. |
| `--brand-red` | `#CA0E00` | 29 | Coincide con `--status-danger` en claro, no con el rojo de marca Flow (`--flow-red-500`, `#F72717`). Usarlo solo cuando el uso sea realmente peligro/estado; no mapearlo como identidad/acento. |
| `--brand-red-hover` | `#A30B00` | 5 | Coincide con `--status-danger-text` en claro; no equivale al hover de la acción primaria ni al hover de una acción de marca. Revisar por contexto. |
| `--brand-red-tint` | `#FFE3E0` | 4 | Coincide con `--status-danger-bg` en claro. Consumir el rol de estado y dejar que Flow resuelva el modo oscuro. |
| `--accent-blue` | `#0060DF` | 2 | No conservar como acento universal. Para acciones usar el rol de acción; para series, paleta `--viz-*`; para identidad de producto, token de producto solo en su subárbol. |
| `--accent-orange` | `#ED571C` | 3 | Coincide con referencia orange 400, pero no con `--status-warning` claro (orange 500). Estados y visualización tienen roles propios; determinar el uso de cada llamada. |
| `--accent-purple` | `#6B4DC7` | 1 | Sin color semántico genérico equivalente en la paleta de Flow. No forzarlo a identidad, estado o serie; elevar la necesidad si su uso es de producto. |
| `--accent-green` | `#007840` | 6 | Coincide con `--status-success` claro, pero no todo verde es estado: clasificar usos decorativos y de gráfico antes de mapear. |
| `--surface` | `#FFFFFF` | 110 | Coincide con `--surface-card` claro; no usar como superficie fija en ambos modos. |
| `--surface-muted` | `#F8FAFC` | 16 | Es referencia `grey-50`, sin equivalencia semántica universal de “muted”. `--surface-sunken` es `grey-100`, un valor distinto; decidir según función y aceptar cambio. |
| `--surface-sunken` | `#F1F5F9` | 38 | Coincide con `--surface-sunken` claro. Sustituir por el rol semántico, no por su valor literal. |
| `--page-bg` | `#E0EEFF` | 2 | Es referencia `blue-50`; no coincide con `--surface-canvas` (`#F1F7FF`). La migración cambia el fondo de página y requiere aceptación visual de producto. |
| `--text-strong` | `#0F172A` | 114 | Coincide con `--text-primary` claro. Determinar si el contenido es primario o secundario antes de reemplazar. |
| `--text-body` | `#334155` | 45 | Coincide con referencia `grey-700`; `--text-secondary` Flow es `grey-600` (`#475569`). Sin equivalencia exacta por nombre/valor: revisar contraste y jerarquía por superficie. |
| `--text-muted` | `#64748B` | 133 | Coincide con referencia `grey-500`; `--text-muted` Flow es `grey-550` (`#5C6B80`). Usar el rol Flow si la función es texto auxiliar y validar el cambio. |
| `--text-inverse` | `#FFFFFF` | 3 | No hay un blanco universal. Para texto sobre acción acento puede corresponder `--text-on-accent`; sobre superficie inversa, `--text-on-inverse`. Elegir por fondo. |
| `--border` | `#E2E8F0` | 103 | Coincide con `--border-subtle` claro, no con `--border-default` (`#CBD5E1`). Clasificar separación sutil frente a borde visible. |
| `--border-subtle` | `#F1F5F9` | 34 | Coincide con referencia `grey-100`, no con `--border-subtle` Flow (`grey-200`). No asignar por el nombre local solamente. |
| `--border-control` | `#CBD5E1` | 13 | Coincide con `--border-default` claro. Los controles migrados deben delegar carcasa/foco al primitive, no conservar un borde propio. |

El rojo, el naranja, el verde y el azul actuales aparecen en más de un rol.
Antes de cambiar sus referencias, hay que separar al menos acciones, estados,
decoración de marca y series de datos. Flow prohíbe usar el rojo de marca como
decoración o serie y distingue el rojo de marca de `danger`.

### Clasificación por uso observada

| Uso actual | Qué indica el código | Traducción semántica Flow que corresponde estudiar |
|---|---|---|
| `.chip--danger` (facturas vencidas, medios bloqueados, rechazos, saldo cero, etc.) y tramos de barra `--danger` | Estado peligroso explícito. | `--status-danger`, `--status-danger-text` y `--status-danger-bg`; no el rojo de marca. |
| `.chip--info` (selección, invitación, tipo de actividad) | Información, no identidad roja/azul. | `--status-info` y roles de texto/fondo info. |
| Barras de asignación y peaje `--green`/`--warn`/`--danger` | Uso/umbral con estados codificados. | Roles `--status-success`/`warning`/`danger` si el color efectivamente expresa estado; revisar que el texto y el color comuniquen el mismo significado. |
| `--brand-blue` en bordes de control, selección, foco y enlaces | Mezcla de foco, selección y acción; además la guía del chart lo usa como cursor. | `--border-focus`/`--focus-ring` para foco, `--action-accent` para CTA, `--text-link` para enlace y paleta `--viz-*` solo para dato. El token local no puede tener una sustitución global única. |
| `--brand-red-tint` en `.chip--danger`, pero también en la etiqueta del producto Ticket Car | El mismo par local se usa tanto para estado como para decoración de marca. | Estado: roles `--status-danger-*`. Etiqueta de producto: `--brand` solo si el rol de marca está permitido en ese contexto, sin inventar un fondo tintado; alternativamente retirar el relleno. |
| Cuatro acentos/tintes de `.summary-card--blue/orange/purple/green` | Categorías decorativas de KPI; los colores no identifican errores, éxito ni series. | Flow no ofrece una paleta abierta de acentos decorativos. `--identity-*` identifica entidades; `--viz-*` se reserva para datos. La opción compatible con Flow existente es presentar esas tarjetas sin acento decorativo, salvo que Flow publique un primitive/token específico. |
| `#e1f4eb`, `#065b33`, `#fffbeb`, `#b45309`, `#fde8e6` y tonos semejantes | Pasteles y tinta de chips, alertas, insignias y estados repetidos manualmente. | Reemplazar por el par de tokens semánticos del estado que describan, con valores de modo claros/oscuros resueltos por Flow. No mantener los hex como excepción por elemento. |
| Gradiente azul de `.next-run`, superficie oscura de tooltip de chart y velos RGBA locales | Tratamientos de marca/superficie y overlays hechos con valores locales. | No hay token semántico intercambiable uno-a-uno. Usar la superficie/card/tooltip de Flow correspondiente y aceptar el cambio; no reconstruir el gradiente ni el overlay con colores propios. |

El resultado operativo es que varios mapeos son claros por intención, pero no
preservan el aspecto actual: rojo de estado pasa a roles `danger`, los estados
informativos a `info`, y los tratamientos decorativos sin primitive Flow no se
recrean con tokens de datos o identidad. Las 70 literales incluyen además
colores dentro de charts, pantallas de inteligencia, estados de API y
transparencias de overlay; al migrar cada superficie deben desaparecer mediante
el primitive/tokens propietarios, no mediante un reemplazo en bloque.

### Decisión de alcance visual pendiente

El usuario pidió revisar cada diferencia visual antes de migrar esa superficie.
Decisiones ya confirmadas:

| Superficie/diferencia | Decisión | Efecto en la migración |
|---|---|---|
| Summary Cards con acentos/tintes azul, naranja, morado y verde | Aplazar hasta decidir su tratamiento. | No migrar estas tarjetas ni recrear la paleta; el resto de superficies puede avanzar. |
| Panel “próxima ejecución” con gradiente | Aplazar el panel. | No recrear el gradiente ni migrar esta superficie por ahora. |
| Etiqueta Ticket Car con fondo rojo pálido | Quitar el fondo tintado y conservar solo el tratamiento de marca permitido por Flow. | Aplicado: tipografía display y `--flow-red-600` (6.68:1 sobre blanco), sin fondo/píldora. |
| Altura topbar 72px frente a `--height-bar` | Adoptar `--height-bar` y ajustar el layout. | Aplicado: escala estándar 56px; la densidad seleccionada podrá dar 48/60px. |
| Canvas de página `#E0EEFF` frente a `--surface-canvas` | Adoptar `--surface-canvas` en ambos modos. | Aplicado: en claro es `#F1F7FF`; modo oscuro resuelve su propio valor. |
| Texto corporal local `#334155` (45 usos) | Adoptar `--text-secondary`. | Aplicado: en claro es `#475569`; en oscuro cambia con el modo. |
| Superficies `--surface-muted` (`#F8FAFC`, 16 usos) | Revisar cada superficie secundaria y elegir un rol Flow por su función. | Aplicado: los 16 usos revisados son áreas hundidas/controles y consumen `--surface-sunken`. |
| Radios locales 8/12/16px | Adoptar radios propios de los primitives/superficies Flow, sin overrides. | Aplicado a los aliases legacy: `12/16/20px`; la forma sigue el contrato Flow. |
| Botones 36px (30px en `sm`) frente a target mínimo de Flow de 44px | Usar tamaños/target Flow aunque aumente la altura. | No reducirlos con estilos propios; el crecimiento puede ajustar el wrap de acciones en pantallas estrechas. |
| Tipografía Ubuntu/Edenred y estilos locales frente a roles Flow `--type-*` | Adoptar los roles tipográficos Flow por función, también la familia mono para datos/montos/IDs. | Aceptar cambios de jerarquía y cargar las fuentes según la guía Flow; no fijar tamaños/pesos locales en los elementos migrados. |
| Iconos SVG propios frente a Material Symbols Rounded | Convertir iconos por equivalencia semántica en cada superficie migrada. | No mezclar sets de iconos; cargar la fuente de Flow y mantener los nombres accesibles al cambiar el glifo. |
| Modo del sistema frente al prototipo claro | Mantener claro mientras exista CSS legacy y activar `system` al completar la migración. | No habilitar oscuro todavía: los literales/roles legacy no migrados no tendrían paridad de contraste. |

La conversión de estados informativos, success, warning y danger a sus roles
Flow sí tiene correspondencia semántica; no se deben conservar sus hex locales
para buscar paridad visual. Recomendación: aceptar los valores, dimensiones y
apariencia propios de Flow para las superficies aprobadas; si una diferencia
queda aplazada, detener solo esa superficie y solicitar a Flow un
primitive/token, sin implementar una imitación en el prototipo. La altura
mínima de controles y las diferencias restantes de forma/tipografía se
confirmarán antes de cada grupo de primitives.

## Forma, elevación y espacio

| Variable del prototipo | Valor actual | Usos | Revisión frente a Flow |
|---|---:|---:|---|
| `--radius-sm` | `8px` | 50 | El valor está en Flow como `--radius-xs`, no `--radius-sm` (`12px`). El nombre actual no preserva la semántica de la escala Flow. |
| `--radius-md` | `12px` | 31 | El valor equivale a Flow `--radius-sm`. |
| `--radius-lg` | `16px` | 9 | El valor equivale a Flow `--radius-md`; Flow `--radius-lg` es `20px`. |
| `--shadow-sm` | `0 1px 2px rgba(15,23,42,.05)` | 21 | Aproxima `--shadow-rest`, pero no es idéntica. Cuando una superficie se migre a `Card`, dejar la elevación al componente. |
| `--shadow-md` | `0 4px 14px rgba(15,23,42,.07)` | 5 | Mapear por función (raised/float/overlay), no por la palabra “md”; no hay equivalencia exacta garantizada. |
| `--shadow-lg` | `0 12px 32px rgba(15,23,42,.16)` | 6 | No es la sombra `--shadow-overlay` de Flow. En overlays migrados, usar la carcasa de Flow y no conservar la sombra local. |
| `--topbar-height` | `72px` | 6 | Flow define `--height-bar` (56px en escala, con densidades compact/comfortable de 48/60px). No hay correspondencia de 72px; cambiarlo afecta el shell entero. |
| `--sidemenu-width` | `272px` | 1 | Coincide con el ancho base de sidebar de Flow, pero la implementación Flow controla el ancho y colapso. Comparar el contrato de navegación antes de adoptar ese primitive. |

No debe hacerse un reemplazo textual como `radius-lg → radius-lg`: el radio
nombrado por tamaño en el prototipo difiere un paso de la escala semántica de
Flow. Además, Flow prescribe que la forma sea propiedad de la superficie y que
las piezas sean dueñas de su carcasa.

### Espaciado

En propiedades `gap`, `padding` y `margin` de los CSS locales aparecen como
medidas explícitas `12px` (97 veces), `10px` (88), `8px` (87), `14px` (73),
`16px` (67), `6px` (51), `18px` (49), `4px` (33) y `2px` (31). Es un conteo de
medidas, incluyendo cada valor de declaraciones abreviadas, no un conteo de
reglas únicas. La escala pública Flow incluye `--space-1` a `--space-8` (4px a
32px, pasos de 4px), además de `--space-10`, `--space-12` y `--space-16`;
también expone roles como `--gap-inline`, `--pad-control-*` y `--pad-card`.
Medidas frecuentes locales como 6, 10, 14 y 18px no son pasos de esa escala.
No redondearlas automáticamente: determinar si cada distancia es separación,
padding de control, área táctil o geometría y, al migrar, aceptar el paso
semántico Flow que corresponda. `Stack` es apropiado solo para distribución
entre hermanos; no para reemplazar espaciado interno de controles o superficies.

## Tipografía, iconos, movimiento y accesibilidad

| Foundation | Situación en el prototipo | Contrato/decisión de Flow |
|---|---|---|
| Tipografía | `--font-sans` usa Ubuntu; `--font-brand` apila Edenred y Ubuntu. Títulos, valores y pesos se estilizan en CSS de páginas. | `--font-body`, `--font-display` y `--font-mono`; los estilos completos salen de `--type-*` (familia, tamaño, peso e interlineado). Datos, montos, placas e IDs usan familia mono. Flow carga Edenred Black; Ubuntu e IBM Plex Mono necesitan la carga documentada por el consumidor. No componer el shorthand con tamaños o pesos independientes. |
| Iconografía | Componentes SVG propios distribuidos por `src/components/icons/Icons.tsx`. | Material Symbols Rounded y nombres de ligadura; los iconos deben respetar tamaños Flow y etiqueta accesible. El contrato de Flow solo declara excepciones de SVG para Flag y Sparkline: el inventario SVG del prototipo necesita una conversión específica, no un override de CSS. |
| Movimiento | Hay transiciones y `@keyframes` locales; la media query global de `App.css` reduce animación y transición a `0.01ms`, pero no elimina explícitamente desplazamientos/escalas. | Duraciones/easing y reduced-motion son foundations de Flow. `prefers-reduced-motion` debe quitar desplazamiento/escala conservando el cambio de estado. El criterio de Flow prohíbe `@keyframes` y curvas literales fuera de sus tokens. Inventariar antes de retirar animaciones: no reescribirlas en una segunda capa local. |
| Accesibilidad/foco | `:focus-visible` actual usa un outline azul de 2px y radio local; los controles tienen CSS global de botón/input. | Flow define `--focus-ring`, objetivos táctiles mínimos de 44px, reglas para el foco y contratos de teclado/overlays. No importar `reset.css` en una convivencia gradual: es opt-in y sus selectores de elementos afectan al resto de la app. `styles.css` aporta tokens y reglas de Flow sin ese reset. |

Los 733 usos medidos se concentran en superficies, tinta, bordes y radios. Por
ello la adopción de foundations no es un cambio aislado de `:root`: hay que
comprobar por página los contrastes y jerarquías en claro/oscuro, además de
validar que reglas globales existentes no anulen el foco de Flow.

## Convivencia de CSS y orden de carga

- `src/main.tsx` carga `src/index.css` y después `styles.css` de Flow. El
  entry público de Flow carga tokens y reglas de tipografía,
  movimiento, accesibilidad y controles. `reset.css` es un entry aparte y
  optativo; no importarlo durante una migración gradual.
- Hay seis colisiones exactas entre custom properties declaradas en el
  `:root` local y tokens Flow: `--border-subtle`, `--radius-sm`, `--radius-md`,
  `--radius-lg`, `--surface-sunken` y `--text-muted`. Como Flow también declara
  sus tokens en `:root`, ningún orden de importación evita el conflicto:
  importarlo después rompe esos valores de las vistas antiguas; importarlo
  antes hace que el tema local falsee los tokens que leen los primitives Flow.
- Los 31 tokens legacy ya están prefijados como `--tc-local-*`, sin alterar
  sus valores ni la apariencia legacy. A medida que cada superficie migre,
  retirar sus referencias locales; estos nombres no pasan a ser tokens Flow.
- `tokens/a11y.css` añade foco global con
  `:where(...):focus-visible`, que tiene la misma especificidad que el
  `:focus-visible` actual. Al importar el CSS de Flow después del legado,
  prevalece el anillo Flow; esa regla también alcanza controles legacy y debe
  validarse en convivencia. Las reglas de `controls.css` con `[data-*]` y las
  CSS Modules de componentes sí quedan acotadas a elementos Flow.
- El prototipo es hoy solo claro (`color-scheme: light`) y no monta un
  `FlowModeProvider`. El diccionario de Flow soporta oscuro con
  `[data-mode='dark']`, pero habilitar `system` antes de retirar o migrar los
  colores literales locales puede dejar texto/estados ilegibles. El momento de
  activar modo oscuro es una decisión separada de usar tokens Flow en las
  superficies ya aprobadas.
- `public/fonts` conserva Edenred Regular/Medium/Bold/Black e incluye los
  archivos autoalojados que requiere `selfhost.css`, el woff2 de Material
  Symbols y sus licencias. Ubuntu e IBM Plex Mono también se sirven desde esos
  assets; no se carga una fuente de iconos de Google en paralelo.

## Evidencia de uso por capa: formularios y navegación

La madurez procede de `items.*.maturity` en el manifiesto del paquete
`@er-mobility-mx/design-system@3.0.0-beta.9`; los paths son relativos a `src/`.
Las tablas se separan por la capa conceptual documentada arriba. Esta selección
no sustituye el inventario completo ni mezcla los componentes dentro del
denominador de primitives.

### Primitives usados en formularios y controles

| Primitive | Madurez | Usos Flow actuales | Pendiente / decisión |
|---|---|---|---|
| `Checkbox` | Estable | `components/company/InviteUserDialog.tsx`, `components/company/ParameterCatalogDialog.tsx`, `components/dispersion/RuleBuilderDialog.tsx`, `components/limits/PolicyDialog.tsx`, `components/reports/DynamicReportBuilder.tsx`, `components/toll/TollPolicyDialog.tsx`. | No quedan casillas nativas (`type="checkbox"`) en TSX/JSX. |
| `Field` | Estable | `components/company/InviteUserDialog.tsx`, `components/company/ParameterCatalogDialog.tsx`, `components/company/ParameterRecordDialog.tsx`, `components/dispersion/RuleBuilderDialog.tsx`, `components/limits/OverrideDialog.tsx`, `components/limits/PolicyDialog.tsx`, `components/maintenance/ServiceOrderDialog.tsx`, `components/reports/DynamicReportBuilder.tsx`, `components/toll/TollAmountDialog.tsx`, `components/toll/TollAssignDialog.tsx`, `components/toll/TollPolicyDialog.tsx`. | Se conserva para etiqueta y descripción de los campos. `Input` reenvía `min`/`step` en runtime, pero faltan en el tipo público; se pueden componer juntos sin perder las restricciones. |
| `IconButton` | Estable | `components/layout/TopBar.tsx`, `components/dashboard/ChartCard.tsx` y `components/layout/FloatingControls.tsx`. | Los triggers conservan nombres accesibles. |
| `Radio` | Estable | `components/company/InviteUserDialog.tsx` (selección de rol). | No quedan otros grupos de radio nativos mapeados. |
| `Switch` | Estable | `components/api/ApiCoverage.tsx`, `components/dev/DevMode.tsx`, `components/limits/PolicyDialog.tsx`, `components/toll/TollPolicyDialog.tsx`, `pages/company/ParametersPage.tsx`, `pages/toll/TollBalancesPage.tsx`. | No quedan switches nativos (`role="switch"`) en TSX/JSX; los callbacks reciben booleano. |
| `Textarea` | Estable | `components/maintenance/ServiceOrderDialog.tsx`. | Sin otro textarea candidato. |
| `Button` | Beta | Usado en páginas y diálogos de producto. | Adoptado para acciones; se conserva el control local cuando tiene semántica distinta. |
| `Input` | Beta | Búsquedas, formularios, asignaciones y navegación. | Adoptado para texto simple; permanecen ocho campos numéricos por `min`/`step` y un combobox por sus atributos ARIA. `type="time"` sí está aceptado por la API; evaluar migración de esos dos campos con revisión de estilo. |

### Componentes usados en formularios y navegación

| Componente | Madurez | Usos Flow actuales | Pendiente / decisión |
|---|---|---|---|
| `DatePicker` | Beta | `components/maintenance/ServiceOrderDialog.tsx`, `components/reports/DynamicReportBuilder.tsx`. | Adoptado; no hay input nativo `type="date"` pendiente. |
| `Dialog` | Estable | Sin adopción directa; los diálogos del producto usan `Modal` con `OverlayShell`. | No duplicar la migración del shell; evaluar la composición antes de reemplazarla. |
| `InputAmount` | Estable | `components/dispersion/RuleBuilderDialog.tsx`, `components/limits/OverrideDialog.tsx`, `components/limits/PolicyDialog.tsx`, `components/toll/TollAmountDialog.tsx`, `components/toll/TollPolicyDialog.tsx`. | Adoptado; mantiene límites de moneda y formato vía la API publicada. |
| `Select` | Estable | Formularios, filtros y páginas de Reportes, Flota, Medios de pago, Facturas, Usuarios y reglas. | Adoptado; no quedan elementos `<select>` nativos en TSX/JSX y `value`/`onChange(string)` siguen controlados. |
| `Tabs` / `TabPanel` | Estable | `pages/ReportsPage.tsx`, `pages/MaintenancePage.tsx`, `components/dispersion/ActivitySection.tsx`, `pages/intelligence/InsightsPage.tsx` y `pages/intelligence/GasOptimizerPage.tsx`. | Adoptado en las cinco superficies identificadas; los paneles usan IDs asociados y conservan la navegación por teclado. |

Los usos existentes beta se conservan considerando su madurez publicada. La
medición estática del estado actual encuentra cero
`<select>`, `type="checkbox"` y `role="switch"` nativos en los TSX/JSX de
`src/`. Los ocho inputs numéricos nativos conservan `min`/`step`, que `Input`
no publica; los dos `type="time"` son compatibles con el prop `type` de Flow,
pero dependen de clases visuales locales no expuestas por su API. El campo de
búsqueda combobox conserva roles y relaciones ARIA que `Input` tampoco publica.

Otros primitives y components se siguen evaluando por separado. Compartir
apariencia o nombre no implica equivalencia de contrato; revisar interacción,
accesibilidad y API pública antes de migrarlos.

El shell de navegación y los charts se evalúan por separado de la tabla inicial
de adopción: el sidebar actual combina búsqueda, pin, filtrado, navegación y
colapso; los charts mezclan una integración Flow activa con un SVG local,
estados vacíos y contratos de datos propios. Aplicar la auditoría de charts más
arriba; no asumir equivalencia por compartir un nombre o una función superficial.

## Secuencia y bloqueos

1. **Cierre de equivalencias**: las decisiones visuales aprobadas y los casos
   aplazados están registrados arriba. La paleta púrpura decorativa y el
   gradiente local siguen sin mapeo legítimo mientras Flow no publique un
   rol/primitive.
2. **Contrato de migración CSS**: completado para la integración base: hoja
   oficial después del CSS local, tokens legacy aislados, reset excluido y
   fuentes oficiales servidas con sus licencias. Revisar el foco global en las
   superficies que conviven con reglas locales.
3. **Carga de fuentes e iconos**: completada mediante `selfhost.css` y los
   archivos oficiales de `public/fonts`. Mapear los nombres de icono al migrar
   cada superficie.
4. **Verificación de foundations**: las pruebas iniciales cubren dashboard,
   contraste de roles adoptados, tokens, fuentes, foco del shell y los
   primitives adoptados. El usuario autorizó seguir con `--focus-ring` oficial
   sin override, manteniendo registrada su brecha. La tablist de Reportes ya
   satisface su contrato mediante Flow; overlays conservan bloqueos accesibles.
5. **Instalación reproducible**: completada con el artefacto local versionado y
   dependencia `file:`. La publicación/instalación desde GitHub Packages queda
   como mejora posterior cuando el acceso de registry esté disponible.
6. **Cobertura de primitives**: aplicar la trazabilidad de tokens → primitive
   → component/pattern → uso local de esta auditoría para `Button` e `Input`.
   No añadir `className` para reproducir CSS: migrar por semántica y contrato,
   tipar en Flow `min`/`max`/`step` y los atributos ARIA/`role` del combobox que
   hoy solo se reenvían en runtime, y registrar únicamente las excepciones
   visuales justificadas. En paralelo, priorizar los primitives aún no
   adoptados según el orden de candidatos. Cada lote debe pasar build,
   contratos de interacción/teclado y revisión visual.
7. **Components y patterns**: `Tabs` y `Accordion` quedan adoptados en las
   superficies compatibles ya identificadas; clasificar por separado los 14
   sitios nativos descritos arriba. El siguiente candidato de alto impacto es
   un piloto acotado de `Table`/`DataGrid`, sujeto a validar la API beta,
   semántica, selección, acciones y responsive. Para charts, completar primero
   la alineación de marcas de `ChartLegend` y decidir el contrato de formato y
   alternativa accesible de la línea según la auditoría específica.

Continuar la verificación de foundations por superficie; el search de TopBar ya
consume `Input` de Flow. No migrar las Summary Cards o Next Run hasta resolver
sus contratos visuales y accesibles.
