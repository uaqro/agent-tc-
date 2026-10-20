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
- Reportes ya usa `Tabs`/`TabPanel` de Flow con IDs enlazados, panel asociado y
  navegación de flechas; sus filtros de periodo y grupo usan `Select` con
  `insetLabel`. TopBar usa `Input` Flow para la búsqueda global y conserva el
  envío del formulario. La navegación de tabs, apertura/selección de opciones,
  filtro/limpieza y envío de búsqueda se verificaron en el navegador. Los
  botones de Reporte dinámico también se verificaron para agregar/quitar
  filtros, seleccionar columnas, generar y restablecer. La acción para quitar
  filtros muestra texto e icono para no depender de reconocer un glifo aislado.
  Los overlays quedan pendientes; `Modal` no implementa trampa ni restauración
  de foco. Resolver al migrar esas superficies; no se recrean localmente en
  esta fase.
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
  permanece activa. Los botones segmentados del tipo de servicio siguen siendo
  controles de selección propios del producto.
- El diálogo de excepción temporal usa `Field` y `Select` Flow para vigencia y
  motivo. El importe en MXN usa `InputAmount`; la ampliación en litros conserva
  el input numérico y su incremento de 10 L, asociados con `Field`, ya que
  `Input` no publica los atributos `min`/`step`.
- El formulario de políticas de límites usa `Input`, `InputAmount`, `Select` y
  `Field` para nombre, medida/periodo, límite monetario, número de cargas,
  intervalo y estaciones. Se conservan inputs nativos para litros y horarios,
  que requieren `min`/`step` o `type="time"`; los grupos de selección y
  switches usan los primitives estables `Checkbox` y `Switch`. Los botones
  segmentados de combustible/días permanecen como controles propios.
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

## Primitives: inventario de madurez y adopción

La fuente de madurez es `items.*.maturity` en el manifiesto del paquete
`@er-mobility-mx/design-system@3.0.0-beta.9`. El inventario siguiente mapea
cada primitive de formulario marcado `stable` en ese manifiesto. Los paths son
relativos al directorio `src/`.

| Primitive | Madurez | Usos Flow actuales | Pendiente / decisión |
|---|---|---|---|
| `Checkbox` | Estable | `components/company/InviteUserDialog.tsx`, `components/company/ParameterCatalogDialog.tsx`, `components/dispersion/RuleBuilderDialog.tsx`, `components/limits/PolicyDialog.tsx`, `components/reports/DynamicReportBuilder.tsx`, `components/toll/TollPolicyDialog.tsx`. | No quedan casillas nativas (`type="checkbox"`) en TSX/JSX. |
| `Dialog` | Estable | Sin adopción directa. | Revisar contrato de foco, Escape, retorno de foco y capas antes de sustituir overlays locales. |
| `Field` | Estable | `components/company/InviteUserDialog.tsx`, `components/company/ParameterCatalogDialog.tsx`, `components/company/ParameterRecordDialog.tsx`, `components/dispersion/RuleBuilderDialog.tsx`, `components/limits/OverrideDialog.tsx`, `components/limits/PolicyDialog.tsx`, `components/maintenance/ServiceOrderDialog.tsx`, `components/reports/DynamicReportBuilder.tsx`, `components/toll/TollAmountDialog.tsx`, `components/toll/TollAssignDialog.tsx`, `components/toll/TollPolicyDialog.tsx`. | En entradas numéricas nativas se conserva para etiqueta y descripción cuando Flow `Input` no publica `min`/`step`. |
| `IconButton` | Estable | `components/layout/TopBar.tsx` (Ayuda y Notificaciones). | Sin otros botones solo-icono incorporados en este lote. |
| `InputAmount` | Estable | `components/dispersion/RuleBuilderDialog.tsx`, `components/limits/OverrideDialog.tsx`, `components/limits/PolicyDialog.tsx`, `components/toll/TollAmountDialog.tsx`, `components/toll/TollPolicyDialog.tsx`. | Mantener límites de moneda y formato vía la API publicada. |
| `InputPhone` | Estable | Sin uso actual. | No hay flujo de teléfono equivalente identificado. |
| `OtpInput` | Estable | Sin uso actual. | No hay flujo OTP equivalente identificado. |
| `Radio` | Estable | `components/company/InviteUserDialog.tsx` (selección de rol). | No quedan otros grupos de radio nativos mapeados. |
| `Select` | Estable | `components/company/ParameterCatalogDialog.tsx`, `components/company/ParameterRecordDialog.tsx`, `components/dispersion/RuleBuilderDialog.tsx`, `components/limits/AssignmentsTable.tsx`, `components/limits/OverrideDialog.tsx`, `components/limits/PolicyDialog.tsx`, `components/maintenance/ServiceOrderDialog.tsx`, `components/reports/DynamicReportBuilder.tsx`, `components/toll/TollAssignDialog.tsx`, `components/toll/TollPolicyDialog.tsx`, `pages/DriversPage.tsx`, `pages/PaymentMediaPage.tsx`, `pages/ReportsPage.tsx`, `pages/VehiclesPage.tsx`, `pages/company/InvoicesPage.tsx`, `pages/company/UsersPage.tsx`, `pages/dev/ApiImprovementsPage.tsx`, `pages/toll/TollMediaPage.tsx`, `pages/toll/TollRulesPage.tsx`. | No quedan elementos `<select>` nativos en TSX/JSX. `value` y `onChange(string)` se mantienen controlados. |
| `Switch` | Estable | `components/api/ApiCoverage.tsx`, `components/dev/DevMode.tsx`, `components/limits/PolicyDialog.tsx`, `components/toll/TollPolicyDialog.tsx`, `pages/company/ParametersPage.tsx`, `pages/toll/TollBalancesPage.tsx`. | No quedan switches nativos (`role="switch"`) en TSX/JSX; los callbacks reciben booleano. |
| `Tabs` | Estable | `pages/ReportsPage.tsx` (`Tabs` y `TabPanel`). | No hay otra tablist identificada en el inventario actual. |
| `Textarea` | Estable | `components/maintenance/ServiceOrderDialog.tsx`. | Sin otro textarea candidato. |

Primitives que actualmente se usan, pero **no** figuran como estables en el
mismo manifiesto:

| Primitive | Madurez | Usos actuales |
|---|---|---|
| `Button` | Beta | `components/layout/PageHeader.tsx`, `components/limits/AssignmentsTable.tsx`, `components/limits/PoliciesSection.tsx`, `components/reports/DynamicReportBuilder.tsx`, `pages/ReportsPage.tsx`. |
| `DatePicker` | Beta | `components/maintenance/ServiceOrderDialog.tsx`, `components/reports/DynamicReportBuilder.tsx`. |
| `Input` | Beta | `components/company/InviteUserDialog.tsx`, `components/company/ParameterCatalogDialog.tsx`, `components/company/ParameterRecordDialog.tsx`, `components/layout/TopBar.tsx`, `components/limits/AssignmentsTable.tsx`, `components/limits/PolicyDialog.tsx`, `components/reports/DynamicReportBuilder.tsx`, `components/toll/TollPolicyDialog.tsx`. |

Los usos existentes beta se conservan para no ampliar el alcance de madurez
de este lote. La medición estática del estado actual encuentra cero
`<select>`, `type="checkbox"` y `role="switch"` nativos en los TSX/JSX de
`src/`; los inputs numéricos nativos con restricciones `min`/`step` o
`type="time"` se mantienen donde la API pública de `Input` no cubre el
comportamiento requerido.

Otros componentes y patrones siguen evaluándose por separado: `ControlShell`
(beta), `Stack`, `Card`, `EmptyState`, charts y overlays. Compartir apariencia
o nombre no implica equivalencia de contrato; revisar interacción, accesibilidad
y API pública antes de migrarlos.

El shell de navegación y los charts se mantienen fuera de esta primera tabla de
adopción: el sidebar actual combina búsqueda, pin, filtrado, navegación y
colapso; los charts son un módulo interno SVG con interacción y datos propios.
Evaluarlos como flujos de producto separados, no asumir sustitución por compartir
un nombre o una función superficial.

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
6. **Primitives, en orden**: continuar con Button/Input/DatePicker beta con
   adopción deliberada y validación de los contratos no cubiertos; después
   evaluar `Dialog`/overlays y restantes patrones de superficie. Cada grupo
   debe pasar build, contratos de interacción/teclado y revisión visual antes
   del siguiente.
7. **Components y patrones**: shell, tablas y patrones solo tras verificar sus
   dependencias inferiores. Charts conservan una decisión independiente
   basada en comparación de capacidades y accesibilidad.

Continuar la verificación de foundations por superficie; el search de TopBar ya
consume `Input` de Flow. No migrar las Summary Cards o Next Run hasta resolver
sus contratos visuales y accesibles.
