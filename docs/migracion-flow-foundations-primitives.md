# Migración a Flow: foundations, diccionario y primitives

## Alcance y base de revisión

Esta matriz precede a cualquier migración de componentes, patterns o templates.
Relaciona el CSS actual del prototipo con las foundations y los contratos de Flow;
no prescribe una conversión mecánica por nombre.

**Lectura histórica:** los hashes y conteos de esta base corresponden a la
auditoría inicial. El estado vigente de charts está en el cierre de líneas
incluido más abajo y en E4 del roadmap; la dependencia actual es el artefacto
local Flow beta.10 con las correcciones de líneas.

## Auditoría transversal del árbol actual

Recuento estático del producto local contra el paquete instalado
`@er-mobility-mx/design-system@3.0.0-beta.10`. La matriz y las auditorías por
familia que siguen conservan evidencias y decisiones previas; este corte
actualiza las métricas globales, no sustituye la revisión visual por pantalla.

| Capa | Catálogo beta.10 | Tipos importados directamente por `src/` | Cobertura por tipo |
|---|---:|---:|---:|
| Primitives | 57 | 27 | 47.4% |
| Components | 66 | 16 | 24.2% |
| Patterns | 64 | 2 | 3.1% |

El conteo incluye imports de componentes de producción, incluyendo aliases;
excluye tests, tipos, hooks y providers. Los 16 components son `Accordion`,
`BulkBar`, `DatePicker`, `Dialog`, `FileUpload`, `GlobalSearch`, `InputAmount`,
`ListRow`, `Menu`, `NotificationCenter`, `Sidebar`, `TabPanel`, `Table`,
`Tabs`, `Tooltip` y `WidgetFrame`. Los dos patterns son `FilterSet` y
`PageHeader`. Los 27 primitives se listan en la tabla de adopción abajo.
Importar un tipo no demuestra que todas sus instancias equivalentes estén
migradas, ni que la composición consuma todos los roles de foundations.

En las 51 hojas CSS de `src/`, un escaneo léxico encuentra 29 aliases
`--tc-local-*` declarados y 458 referencias `var()` a ellos en 34 archivos. Encuentra
también 162 declaraciones con uno o más colores literales (166 ocurrencias,
74 valores distintos contando `transparent`). Es una señal de deuda distribuida
en composición y estilos locales, no un porcentaje de conformidad: el conteo no
decide semántica, alcance de runtime, excepciones de Dev ni si cada declaración
es visualmente visible. Tampoco es comparable directamente con el inventario
histórico de 124 archivos, que usó otro alcance.

### Lectura de cobertura por la cascada

- **Foundations / diccionario:** fuentes, modo claro, orden de carga y aliases
  ya están integrados; siguen 29 aliases locales, y el inventario de colores,
  espacio, forma, tipografía, foco y movimiento conserva decisiones por
  contexto. El uso de un token en un alias no cierra la migración de los estilos
  que lo consumen.
- **Primitives:** 27/57 tipos tienen import directo. Este denominador incluye
  piezas sin caso de producto y no es una meta de adopción; el trabajo relevante
  sigue siendo cobertura de instancias y uso de roles dentro de primitivas ya
  adoptadas, especialmente `Button`, `Input` y los contenidos de tablas.
- **Components / patterns:** la revisión detecta 16/66 y 2/64 imports directos.
  En tablas, 16 de 23 instancias originales ya usan `Table`; siete permanecen
  por evaluar. En charts, siete gráficas usan `FlowChart` y sus siete tablas de
  datos son una composición de producto. No se debe traducir la baja proporción
  de imports de patterns a deuda sin comprobar que exista un flujo equivalente.
- **Composición de producto:** la estructura Flow puede coexistir con
  contenido, carcasas, espaciado y estados CSS locales. E2.2 quedó cerrada
  visualmente en Vehículos, Conductores y Medios de pago: tabla, tarjetas,
  controles, roles de datos y banda Dev revisados; la comprobación funcional y
  responsive queda registrada en la validación local de este corte.
- **Excepciones y confianza:** las superficies de Dev/API, restricciones de
  negocio no cubiertas por la API y piezas sin caso de uso se separan de deuda
  de producto. Los conteos de manifiesto/import son exactos para el paquete y
  el árbol escaneados; el CSS es una medición léxica. La conformidad final
  requiere revisión semántica, contraste, densidad, teclado y visual por
  superficie.

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

## Revisión de la cascada para continuar la migración (21-oct-2026)

**Actualización posterior del piloto:** la diferencia de alturas se corrige
siguiendo los roles existentes de densidad, sin cambiar el diccionario.
FilterSet deja de imponer `sm` e Input hereda el interlineado de ControlShell.
Son cambios locales en la implementación Flow, empaquetados e instalados de
forma reproducible en el producto. Las mediciones anteriores de este documento
son la línea base, no el resultado vigente: filtros y búsqueda ahora miden
50.8 / 44 / 62.8 px en base / compact / comfortable, respectivamente.
Ver alcance, pruebas y artefacto en la
[corrección de density del roadmap](./roadmap-migracion-flow.md#corrección-posterior-alturas-gobernadas-por-density).
La limpieza vacía del Select se resolvió en un ajuste posterior: valor single
vacío sin opción explícita ya no genera selección ni botón de limpiar.
Las opciones vacías explícitas y la selección múltiple conservan su semántica.
La evidencia y el artefacto final se registran en el roadmap.

Esta revisión sustituye las conclusiones anteriores que equiparaban densidad
con `size`, proponían alturas nuevas para Flow o reclasificaban piezas desde el
producto. Primero se comprueba el contrato existente; después se decide quién
debe cambiar. Una diferencia visual no demuestra una carencia del DS.

### Fuentes contrastadas y límites

- Producto: `7dd74b1` más los cambios locales del piloto.
- Paquete instalado: `3.0.0-beta.9`, manifiesto con canon `97a1d43`.
- Implementación local de Flow: `214f69b`; su diccionario y el instalado son
  idénticos byte a byte. No significa que todo el código de ambos sea idéntico.
- Canon local actual: `0261b5a`, 786 valores frente a los 768 instalados. Las
  18 incorporaciones son duraciones y easing; no hay diferencias de valores
  en densidad, tipografía, spacing ni geometría entre ambos diccionarios.
- `check:foundations`: 7 contratos visuales, cero bloqueantes y cero avisos.
  `check:tokens-parity`: cero diferencias en las 16 combinaciones comprobadas.
  Es evidencia de foundations y emisión, no de conformance de cada composición.
- El catálogo instalado contiene 9 entradas de foundations: las siete visuales
  más `Feedback` y `Specimen registry`. Estas dos últimas no añaden una escala
  alternativa de estilos.

### Qué gobierna el diccionario y quién lo consume

| Foundation / decisión | Contrato existente | Primitive / dueño | Consecuencia en componentes y patterns |
|---|---|---|---|
| Referencia y semántica | `ref` aporta magnitudes; `sys` decide su función. Densidad redefine decisiones, no cambia la escala `--space-*`. | Las piezas consumen roles; no se copia el valor resuelto al CSS de producto. | Una altura o padding literal del producto no se legitima por parecerse al resultado actual de un token. |
| Spacing y densidad | `--pad-control-*`, `--pad-card`, `--pad-section`, `--gap-inline/stack`, `--density-cell/head-*`. | `ControlShell` posee la geometría del campo; `Card` su superficie; `Stack` el reparto con gap. | La composición decide el ámbito y el layout. No necesita un nuevo token por pantalla ni una prop `density` en cada descendiente para heredar CSS. |
| Tipografía | `--type-*` incluye familia, peso, tamaño e interlineado. Densidad cambia tamaño/línea, no la familia ni el peso. Cifras, montos e IDs tienen familia de dato. | `Input`/`Select` reciben tipografía de `ControlShell`; `ChartLegend` distingue metadato de categoría/valor principal. | Revisar también los contenidos renderizados por producto: un hijo con `font-size: 12px` o `font-weight: 700` puede desconectar la celda de la escala o sintetizar negrita mono. |
| Forma | Radios por tipo de superficie; `--radius-md/lg` responden a densidad. `--radius-pill` no es radio universal. | `ControlShell`, `Card`, `Chip` y `Button` poseen sus carcasas. | No envolver un control Flow en una segunda carcasa; no reconstruir las esquinas internas de Table desde el producto. |
| Color y estado | Superficie/tinta, acción, estado y visualización son roles distintos. Los modos cambian sus valores. | `StatusPill`, `Badge`, `Button`, `FlowChart` y shells consumen sus roles respectivos. | Vencida usa semántica de estado; serie de comparación usa semántica de visualización. No deducir el rol por el hex actual ni por el nombre comercial del color. |
| Accesibilidad | `--hit-target-min` permanece en 44 px; foco y estados no dependen solo del color. | `ToggleControl` posee target y etiqueta de Checkbox/Radio/Switch; `ControlShell` posee foco del campo. | No reducir targets para que una fila sea más baja. Medir el objetivo real y sus accesorios, no solo el icono o el trigger interior. |
| Iconos | Material Symbols y escala de glifos; icono decorativo no equivale a botón. | `IconButton` aporta interacción; la ligadura solo aporta el glifo. | Eliminar un icono duplicado en producto no requiere modificar Input ni crear un buscador del DS. |
| Motion | Duración/easing por función, estado final independiente de animación y movimiento reducido. | Las piezas conservan su estado aunque se anule el movimiento. | Las nuevas incorporaciones de motion del canon no explican la diferencia de alturas. Actualizar el paquete no es una corrección de densidad por sí sola. |

Los tres ámbitos no son sinónimos:

- **Viewport:** los cortes 576/768/982 gobiernan distribución y retirada
  explícita de columnas. No seleccionan automáticamente una densidad.
- **Density:** el atributo del contexto redefine varios roles a la vez.
  La base se obtiene sin atributo; `compact` y `comfortable` son overrides.
  No hay un bloque `data-density="default"` que restablezca una base dentro de
  otro contexto compacto.
- **Size:** variante de una pieza. No es una altura universal ni obliga a
  compartir tamaño a controles de zonas con funciones distintas.

### Prueba de geometría: no confundir size con density

Medidas de altura CSS computada en la demo, con los atributos restaurados al
terminar. La matriz fuerza temporalmente el mismo `size` en ambas carcasas;
no modifica props ni archivos del producto.

| Density | Input sm | Select sm | Input md | Select md |
|---|---:|---:|---:|---:|
| Base | 44 px | 44 px | 48.4 px | 50.8 px |
| Compact | 44 px | 44 px | 44 px | 44 px |
| Comfortable | 44 px | 46.8 px | 59.2 px | 62.8 px |

`md` consume `--pad-control-*`; `sm` usa `--space-2/3`. El Input interior
declara `line-height: 1.4`; el Select hereda el interlineado de la carcasa.
Esto explica por qué igualar `size` tampoco garantiza igual altura. La
existencia de rutas distintas no prueba por sí sola un defecto: hay que
contrastar el uso y la promesa de la pieza, no imponer igualdad geométrica.
En Facturas, además, los filtros y la búsqueda están en zonas separadas.

### Casos de migración y destino de cada ajuste

| Caso | Evidencia y clasificación | Qué sigue / qué NO se justifica |
|---|---|---|
| Buscador con doble borde/icono | Integración de producto: wrapper legacy alrededor de Input. Resuelto en ocho superficies. | Mantener wrappers de layout. No crear otro primitive ni pedir `className` para conservar el buscador anterior. |
| Diferencia de altura en Facturas | `FilterSet` fija `sm`; la búsqueda local usa `md`; también difiere el interlineado interno. Es una mezcla de variantes/contextos, no un token ausente demostrado. | Definir la política de composición por función y probarla en las tres densidades. No dar por aprobados `size="sm"`, `data-density="compact"` ni alturas fijas como corrección automática. |
| Contenido local dentro de Table | El CSS compartido de otros listados aún fija tamaños, pesos y colores locales. E1 desacopla Facturas de esa hoja y usa roles tipográficos completos, datos mono y estado danger; conserva `<dl>`, importes y metadatos. | Resuelto en el piloto, no globalmente. Extender por familia aprobada; no trasladar valores legacy a tokens nuevos del DS. |
| `FilterSet` + `Table` + `BulkBar` | El contrato ya permite filtros controlados y selección controlada por identidad. Es una composición válida del producto. | Mantener estado único de dimensiones, AND, búsqueda por folio/UUID, limpieza de selección al cambiar filtros y PDF/XML/ambos. No imponer DataTable por subir el porcentaje de adopción. |
| `DataTable density="compact"` | En la fuente revisada la prop llega a Table, no al root que contiene filtros, búsqueda y pie. No se consume DataTable en el piloto. | Revisar el alcance prometido antes de cambiarlo: densidad de filas y densidad del flujo completo no son necesariamente la misma decisión. No añadir esta modificación al piloto como si resolviera su caso. |
| Densidad local y portales | Prueba con `data-density="compact"` en la página: el trigger recibe `--pad-control-y: 8px`, mientras la opción portalizada en body recibe 12 px; `--type-body-md` pasa de 14 px a 16 px. El font visible de ambas fue 14 px por otras reglas, así que no se infiere el contexto solo por verlo. | Candidato a revisión del DS si se necesita densidad local que abarque overlays. Reproducir en aislamiento, incluyendo modo/producto y contextos anidados, antes de decidir contrato y fix. No cambiar globalmente el tema del producto para esconder la pérdida de ámbito. |
| `BarChart` + `ChartLegend` | Flow ya tiene roles `--type-viz-category/value` y variantes de leyenda. `marks="fill"` ya está integrado; la leyenda local pide `sm`. | Evaluar si es leyenda principal o metadato y consumir la variante existente. Una diferencia de jerarquía no demuestra que falte un componente de leyenda. |
| Líneas con huecos y formato | El producto distingue `null` de cero y separa unidad de tooltip del eje. El tipo público de Flow usa `number[]` y un format compartido. | Son necesidades reutilizables candidatas al DS, pero requieren casos/pruebas y decisión de API. Conservar las líneas actuales; no usar casts, ceros ni interpolación para aparentar equivalencia. |
| Fuente local frente a paquete | Comparten versión beta.9 y diccionario, pero no se ha probado igualdad de toda la implementación. | Verificar cada comportamiento en el paquete instalado antes de atribuirlo a Flow actual. No empaquetar/publicar una actualización indiscriminada. |

### Orden para actualizar las capas siguientes

1. **Componentes de producto:** completar consumo de roles en el contenido y
   las carcasas locales de la familia piloto; separar ajustes de layout de
   decisiones visuales y no afectar por cascada a las siete instancias originales
   que aún permanecen por evaluar.
2. **Patterns/composición:** decidir el ámbito de densidad del flujo, no una
   altura por control. Conservar los estados de negocio de Facturas y evaluar
   DataTable solo donde sus funciones realmente correspondan.
3. **Contribuciones a Flow:** abrir únicamente casos aislados que demuestren
   una promesa incumplida o una necesidad reutilizable no cubierta. Un cambio
   de contrato no es el requisito previo de toda migración.
4. **Verificación:** base/compact/comfortable, controles vacíos/con valor/con
   accesorios, selección y filtros, foco/teclado, overlays, scroll local y
   gráfico/leyenda. Separar el cambio visual aceptado de la regresión de negocio.

La revisión inicial actualizó el diagnóstico y el inventario sin modificar
canon, Flow o tarball. E0/E1 se implementaron después en producto:
Facturas ya tiene CSS propio con roles de dato/texto/estado y geometría,
Table posee su superficie y la barra permite scroll accesible de acciones.
No cambia size ni densidad de producción. El
[resultado y validaciones de E0/E1](./roadmap-migracion-flow.md#resultado-de-e0e1)
separa lo comprobado en navegador de las pruebas SSR persistentes.

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
  Diecisiete superficies del producto comparten `Modal`, que delega el portal,
  backdrop, foco inicial, trampa de Tab, Escape y restauración de foco a
  `OverlayShell` de Flow. Otras cuatro superficies importan directamente el
  `Dialog` de Flow. La composición visual y el contenido siguen siendo del
  producto.
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

La adopción de estos primitives comenzó con Flow `3.0.0-beta.9`; el corte
actual consume el paquete local `3.0.0-beta.10`. Su madurez no se considera una
aprobación para reemplazo mecánico.

- `Button` reemplaza las acciones comunes de producto en dispersión, límites,
  mantenimiento, peajes, flota, administración, cobertura API, TED, solicitudes
  y simulación; también el cierre de los diálogos. `IconButton` cubre los
  controles de información/opciones de las tarjetas del dashboard y las
  acciones flotantes. Se preservan callbacks, estados y nombres accesibles.
  La adopción es parcial: el escaneo actual encuentra 74 elementos JSX
  `<button>` nativos en 22 módulos. Es una cuenta bruta sin clasificación
  semántica; acciones, navegación, selección y triggers pueden requerir piezas
  distintas. Se evalúan abajo desde los tokens y el contrato de la capa
  correcta, no por la clase CSS local.
- `Input` cubre búsquedas simples de flota, mantenimiento, medios de pago,
  facturas, usuarios, parámetros, mejoras API, medios de peaje y menú; también
  búsqueda global, asignaciones, formularios de catálogos/invitación, campos
  de política y composición de TED. El escaneo actual encuentra 49 `<input>`
  nativos en 14 módulos, incluidos 11 numéricos, 2 horarios, 2 fechas, 4 de
  texto, 3 de búsqueda, 25 casillas y 2 radios; también hay 29 `<select>`
  nativos en 11 módulos. Estos números requieren clasificación por caso antes
  de considerarse trabajo de migración. La API `InputProps` del paquete beta.10
  no declara `min`/`step` ni varias relaciones ARIA; no forzar casts. La carga
  de archivos usa el component `FileUpload`.
- `DatePicker` ya está en uso en órdenes de servicio y en el constructor de
  reportes. El escaneo aún encuentra dos inputs nativos `type="date"` en otras
  superficies; revisar límites y validación antes de sustituirlos.
- `SectionHeader` se adoptó en `ChartCard`, `ActivitySection`,
  `AttentionList`, `RulesSection`, `PoliciesSection` y `AssignmentsTable`.
  La adopción cubre cinco tarjetas de gráficas y los encabezados de esas
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
- El contenedor compartido de 17 superficies usa ahora `OverlayShell` de Flow;
  cuatro superficies adicionales usan directamente el `Dialog` de Flow.
  Se conservan el encabezado, subtítulo, pie, tamaños y contenido propios del
  producto; el shell aporta portal, bloqueo/restauración del scroll, cierre
  con Escape o backdrop, foco inicial, trampa de Tab y retorno del foco al
  disparador. Los títulos tienen IDs únicos para asociar el diálogo accesible.

## Inventario de primitives públicos

### Criterio de capas de Flow

Flow define la cascada `foundations → primitives → components → patterns →
templates`. La capa se toma del inventario y contrato de la versión consumida,
contrastados con la implementación. No se reclasifica desde el producto por
el nombre o por un ejemplo de documentación. `Card` y `Select` son primitives
en el paquete instalado: se corrige su reclasificación manual anterior como
components. La composición con carcasas es una excepción prevista del grafo,
no una razón para promover Select de capa.

Revisión del catálogo exportado por el paquete instalado
`@er-mobility-mx/design-system` `3.0.0-beta.10`: el manifiesto contiene 57
entradas marcadas `primitives`, 66 `components` y 64 `patterns`. La matriz
detallada incluye las 57 entradas de primitives; components y patterns no
forman parte de su denominador de avance. `ToastStack` es un export auxiliar
asociado a `Toast`, sin entrada independiente en el manifiesto, y no se cuenta
como primitive separado. La madurez web y el uso se contrastan con el
manifiesto y los imports de `src/`. "No usado" describe el estado del código,
no implica que todo primitive deba adoptarse. Se registra la oportunidad más
cercana y la razón para adoptarlo, evaluarlo después o no incorporarlo.

Hay **27 primitives con import directo de componente: 27/57 = 47.4%**.
Se excluyen imports de tipos, tests y hooks como `useToast`; `ToastHost`
cuenta como pieza propia, y Toast compuesto no se suma como import directo.
La evaluación anterior de “30 aplicables” no se conserva como porcentaje:
mezclaba otra clasificación y adopción transitiva. La matriz registra casos
individuales, no una obligación de alcanzar el 100%. `Button` e `Input` tienen
uso parcial; `LimitBar` tiene un caso relacionado, pero no cubre los umbrales
operativos que exige el producto.

### Trabajo pendiente: cobertura dentro de primitives ya adoptados

La matriz cuenta un primitive como adoptado cuando existe al menos un uso
Flow, no cuando se han reemplazado todas las instancias potencialmente
equivalentes. Este backlog de cobertura se mantiene separado de los 4
primitives aplicables que todavía no tienen adopción:

| Área | Evidencia actual | Trabajo pendiente |
|---|---|---|
| `Button` | El escaneo JSX actual encuentra 74 elementos `<button>` nativos en 22 módulos de producción. | Es un universo bruto, no 74 migraciones: clasificar cada uso como acción, navegación, selección, trigger de diálogo, control de mapa u otro contrato antes de asignarlo a `Button`, `IconButton`, `Chip` o una pieza compuesta. No pedir `className`: el estilo de Flow se aplica por variante y tokens. Validar atributos ARIA y foco en los triggers que sí correspondan. |
| `Tabs` (component) | `ReportsPage` y las cuatro tablists locales usan `Tabs`/`TabPanel`. | Migración completada en `MaintenancePage`, `ActivitySection`, `InsightsPage` y `GasOptimizerPage`, conservando selección controlada, asociación tab/panel, IDs y navegación por teclado. |
| `Chip` / `ChipGroup` / `Radio` / `SegmentedControl` | El escaneo encuentra 25 `input[type=checkbox]` y 2 `input[type=radio]` nativos en producción, aunque Chip/ChipGroup, Checkbox y Radio ya tienen adopción directa. | Clasificar los controles por semántica, estado y API; no inferir que todo input booleano es Checkbox ni que toda selección exclusiva es Radio. Comprobar en particular las opciones enriquecidas y selecciones de tablas antes de elegir primitive. |
| `Input` / `Select` | El escaneo encuentra 49 `<input>` nativos en 14 módulos: 11 `number`, 2 `time`, 4 `text`, 3 `search`, 2 `date`, además de las 25 casillas y 2 radios contabilizadas arriba. Hay 29 `<select>` nativos en 11 módulos y ningún `<textarea>` nativo. | Esta es una cuenta estática de elementos, no un inventario de brechas equivalentes. Revisar por caso el contrato tipado (`min`/`step`, fechas, ARIA), el estilo y las interacciones; Flow Input/Select ya se usan en otras superficies. No forzar casts ni clases para conservar la apariencia local. |

Los números anteriores son sitios JSX/elementos declarados en TSX/JSX de
producción, no instancias renderizadas; los elementos en `.map()` pueden
producir muchas instancias. El escaneo excluye tests y no asigna equivalencia
semántica. Los componentes y patterns se registran en sus tablas de capa y no
se suman al denominador de 57 primitives.

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

El escaneo actual encuentra 74 `<button>`, 49 `<input>` y 29 `<select>`
nativos en los módulos de producción; la tabla siguiente conserva una
clasificación anterior de algunos casos y no cubre todavía todo ese inventario.
No interpretar sus ejemplos como conteo exhaustivo ni como autorización para
reemplazar controles en bloque. La clasificación completa pendiente debe
identificar propietario, semántica, contrato de teclado/ARIA y estilo local.

| Primitive / contrato | Casos identificados | Diferencia que impide o condiciona la migración |
|---|---|---|
| `Button` — acciones (6 sitios) | TED (preguntas sugeridas); `ApiTag` (trigger de `Popover`); `PageHeader` (toggle de menú); perfil de `TopBar`; «Cambiar» unidad en `QuickTopUp`; trigger del diálogo de `DevMode`. | TED debe usar `ChatComposer.suggestions`, que ya aplica los tokens y tiene la misma acción de envío inmediato. `ApiTag` debe conservar su botón nativo como trigger del `Popover` y `Badge` como presentación; no forzarlo al primitive de acción. Su foco local debe pasar a `--focus-ring`/`--border-focus`, no usar la tinta de texto como sustituto del rol de foco. Para `PageHeader`, preferir comparar el pattern `PageHeader` o `IconButton` ghost; el contrato instalado no declara `aria-controls`, así que habría que añadirlo si se migra. El perfil puede usar `TopBar` de Flow o `Button` secondary alrededor de `Avatar`; la etiqueta responsive puede seguir siendo layout local. «Cambiar» es mejor candidato para `TextAction` que para `Button link`: es una acción textual secundaria, no un enlace ni un CTA; validar que su objetivo de 44 px y la carcasa de búsqueda compongan bien. `DevMode` puede usar una acción secundaria con una etiqueta de estado Flow; su activo morado actual no es un token de acción, así que se debe retirar o mapear a un rol semántico (no reutilizar `viz-*`). |
| `Button` — navegación y toggle (5 sitios) | Selector de catálogo en `ParametersPage`; pin y opción actual de `SideMenu`; las dos opciones de `scope` en `RuleBuilderDialog`. | En `ParametersPage`, decidir primero si se navega a páginas (`Sidebar`/enlaces con `aria-current`) o se cambia una vista dentro de la página (`Tabs` con tab/panel enlazados y teclado); no marcar como página sin confirmar esa semántica. Los elementos de `SideMenu` son navegación, no acciones genéricas: evaluar el component `Sidebar` o conservar navegación nativa. El pin sí es toggle binario y puede usar `IconButton selected`, que ya refleja `aria-pressed`; si se necesita relacionarlo con otro elemento, falta tipar `aria-controls`. `scope` es selección de formulario; no usar `SegmentedControl`, porque renderiza `tablist`/`tab` y su semántica es pestañas. Preferir un grupo de `Radio`. |
| `Button` — elección de importe/tipo (3 sitios) | Montos sugeridos y «Otro monto» en `QuickTopUp`; tipo de regla en `RuleBuilderDialog`. | Son elecciones mutuamente excluyentes dentro de formularios, no un conjunto de acciones ni filtros. `Radio` es el contrato semántico inicial. El tipo de regla tiene label, hint y ejemplo dentro de una tarjeta: `Radio` cubre valor, label y descripción, pero no la tercera línea enriquecida; preservar ese contenido componiendo una tarjeta con `Radio` o proponer un componente reutilizable, sin ampliar `Button` con `aria-pressed`. La superficie activa puede usar `--surface-accent-subtle`/`--border-focus` y textos `--text-primary`/`--text-muted`/`--text-accent` si esa composición se valida. |
| `Input` — números (8 sitios del barrido residual) | `TollBalancesPage`: umbral y saldo objetivo (`min=0`, `step=100`); `RuleBuilderDialog`: tope de litros (`min=50`, `step=50`); `PolicyDialog`: límite del periodo (`min=1`, `step=10`), máximo por carga (`min=1`, `step=5`) y rendimiento mínimo (`min=0.5`, `step=0.1`); `OverrideDialog`: ampliación en litros (`min=1`, `step=10`); `QuickTopUp`: monto personalizado (`min=1`, `step=50`). | `InputProps` no publica las restricciones aunque el runtime las reenvíe. Para este producto TypeScript es un bloqueo real, no una migración resuelta con `...rest`. Preservar los campos actuales; evaluar una contribución tipada solo para atributos necesarios y contrastarla con InputAmount y la validación de negocio. No requiere tokens nuevos ni casts para esconder el contrato. |
| `Input` — hora (2 sitios) | `PolicyDialog`: hora «Desde» y «Hasta», ambas `type="time"`. | Flow acepta `type="time"` y `ControlShell` mantiene borde, foco y superficies con tokens. El estilo `policy-form__native-control` mezcla geometría local (36 px), borde, radio y fondo; no se debe migrar esa clase. Usar `Input` con la densidad/tamaño Flow, dejar el ancho y el grid al layout del formulario y verificar los controles nativos del navegador. |
| `Input` — combobox (1 sitio) | `QuickTopUp`: búsqueda de unidad enlazada a `Listbox`. | `Input` ya reenvía `role` y atributos ARIA restantes, acepta `ref` y `onKeyDown`, y entrega `onChange(value: string)`; el consumidor debe adaptar el callback, no depender del evento DOM. En runtime se puede conservar `aria-expanded`, `aria-controls`, `aria-activedescendant` y `aria-autocomplete`; el hueco es que `InputProps` no los tipa. Recomponer la carcasa actual con `Input` (`icon` y `trailing`) en vez de anidar una carcasa Flow dentro de `.quick__search`, conservar el `Listbox` y validar flechas, Enter, Escape, foco y anuncio del activo. |

| Primitive | Madurez web | Uso/relación observada | Evaluación |
|---|---|---|---|
| `AutoGrid` | estable | Las páginas usan grids CSS locales. | No migrar en bloque; layout estructural amplio y actualmente no hay contrato visual de app que exija el wrapper. Evaluar al tocar un grid concreto. |
| `Avatar` | estable | `TopBar` renderiza las iniciales del perfil con `Avatar` tamaño `sm`. | Adoptado dentro del botón de perfil; el wrapper conserva el nombre de usuario como nombre accesible y oculta las iniciales duplicadas. |
| `Badge` | estable | Contadores de cobertura API, solicitudes, órdenes abiertas y catálogos; etiquetas informativas/semánticas y estado de cobertura API interactivo. | Adoptado en contadores y etiquetas de actividad, atención, movimientos, severidad, asignaciones y cobertura con tonos semánticos. En `ApiTag`, el botón/popover conserva su comportamiento y usa `Badge` como visual del estado. |
| `Breadcrumb` | estable | `PageHeader` usa `Breadcrumb` para Ticket Car, sección y página actual. | Adoptado; se mantiene separado el botón de regreso. Flow fija el nombre accesible del landmark como “Breadcrumb”. |
| `BrandCanvas` | beta | Sin superficie decorativa de marca equivalente. | Sin caso actual; es decorativo y no reemplaza canvas ni visualizaciones con datos. |
| `Button` | beta | Acciones comunes en múltiples páginas y diálogos; el escaneo actual encuentra 74 elementos `<button>` nativos en 22 módulos, todavía sin clasificación completa. | Adoptado parcialmente. No exponer `className` para transportar estilos locales: sus variantes ya aplican roles del diccionario. `aria-controls` no está tipado en `Button`/`IconButton`; `IconButton selected` ya expresa `aria-pressed`. `aria-current` corresponde al contrato de navegación, no a un botón de acción genérico. |
| `Calendar` | estable | Interno al `DatePicker`; la app no lo importa directamente. | No consumir por separado en formularios; usar el componente compuesto `DatePicker`. |
| `Card` | estable | Carcasas locales en tablas y dashboards; sin import directo. | Comparar superficie, padding, contenido y semántica antes de migrar una familia. Es primitive; no promoverlo de capa ni adoptar por semejanza visual. |
| `ChartLegend` | estable | `FuelDashboardPage` usa Flow `ChartLegend` bajo las barras multiserie de recargas/recortes; las líneas locales usan leyenda propia. | Adopción parcial; `BarChart` ya entrega `marks="fill"`. Revisar jerarquía `sm`/`md` según el rol de la leyenda y evaluar las líneas sin perder sus estados de dato. |
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
| `FlowChart` | estable | Tres tarjetas de barras usan Flow: rendimiento, consumo organizacional y recargas/recortes. Dos tarjetas de líneas siguen en SVG: consumo mensual multiserie y costo/km. Cada tarjeta puede mostrar un estado vacío según los datos. | Adopción parcial. La línea mensual necesita preservar `null` como hueco sin interpolar; el contrato público de Flow declara `values?: number[]`. También falta formato separado de eje/tooltip para las unidades. Mantener ambas excepciones hasta resolver contratos y accesibilidad. |
| `FlowLogo` | estable | La marca mostrada es Edenred One/Ticket Car. | No aplica: no sustituye el logo del producto por el wordmark de Flow. |
| `IconButton` | estable | Acciones solo-icono de barra, gráficas y controles flotantes. | En uso; nombre accesible y tamaño se declaran explícitamente. |
| `InlineCode` | estable | Cinco sitios JSX de `<code>` en dos módulos de integración/API. | Candidato pequeño y localizado; limitarlo a identificadores/métodos inline, no bloques de código. |
| `Input` | beta | Búsquedas y campos de texto simples migrados. | En uso deliberado; se mantienen nativos los campos que requieren atributos no publicados o ARIA especializado. |
| `LimitBar` | estable | Un medidor de políticas de peaje compara gasto con tope y alerta al 75%/90%. | Hay un caso, pero no migrar: la API actual marca el cruce del 100% y no representa los umbrales operativos ni la semántica accesible necesaria. |
| `Listbox` | beta | `QuickTopUp` usa `Listbox` para renderizar las opciones del combobox de vehículos. | Adoptado como lista de opciones controlada; se conservan el filtro por placa/dispositivo/conductor, la navegación desde el input, la selección y las clases visuales de resultado. |
| `OverlayScope` | beta | La app corre como pantalla completa, no como superficie embebida. | Sin necesidad actual; sirve para contener overlays dentro de un marco anfitrión embebido. |
| `OverlayShell` | estable | Base del `Modal` compartido por 17 superficies de diálogo. | En uso; el shell se delega a Flow y el contenido/presentación sigue siendo del producto. |
| `PageFrame` | deprecado | No importado. | No adoptar; el manifiesto indica que se retira en 4.0. |
| `Popover` | beta | `components/api/ApiCoverage.tsx` lo usa en el `ApiTag` compartido por 43 apariciones en 14 módulos TSX. | Adoptado en el detalle flotante API; Flow administra portal, posicionamiento, colisión, cierre y retorno del foco. Se conservan apariencia y contenido de producto. Los dos paneles de solicitudes/Dev son diálogos y no se migran como popovers. |
| `Progress` | estable | No hay progreso general de tarea o carga; el único medidor con cifras es gasto contra límite. | No adoptar: no hay un caso de progreso genérico y no cubre los umbrales semánticos del medidor de peaje. |
| `Radio` | estable | Selección de rol en invitaciones. | En uso; se conserva la descripción de las opciones y la validación del grupo. |
| `ScaleLegend` | estable | No se encontró leyenda de escala continua. | Sin caso actual; no equivale a leyendas categóricas de gráficas. |
| `Select` | estable | Formularios y filtros, incluido el uso transitivo de FilterSet en Facturas. | En uso directo; compone ControlShell, Popover y Listbox. Conservar selección, limpieza, nombre accesible y teclado; no reconstruir su carcasa en componentes o patterns. |
| `SectionBar` | estable | No se encontró una barra de sección sticky con contenido/trailing equivalente; los tres `sticky` locales corresponden a navegación o encabezado de tabla. | Sin caso coincidente identificado; no migrar solo por tener encabezados de sección. |
| `SectionHeader` | estable | `ChartCard` (cinco tarjetas), `ActivitySection`, `AttentionList`, `RulesSection`, `PoliciesSection` y `AssignmentsTable`. | Adoptado selectivamente; conservar IDs accesibles, niveles semánticos y contenido trailing. Los demás headings no son candidatos automáticos. |
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
| 2 | `FlowChart` | Cinco tarjetas en `FuelDashboardPage`: tres de barras por Flow y dos de líneas SVG locales. | Alto valor visual; barras con roles dataviz y marcas de leyenda alineadas. | Resolver en Flow los huecos tipados `null` y el formato separado eje/tooltip antes de completar líneas. Validar alternativas accesibles para valores exactos. |
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

**Componentes (`components`, 66):** `Accordion`, `Active filters`, `AvatarGroup`,
`BalanceDisplay`, `Bars`, `BiometricPrompt`, `BottomSheet`, `BrandHero`,
`BulkBar`, `BulletChart`, `CardCarousel`, `CardMedia`, `ChatComposer`,
`ChatThread`, `CodeBlock`, `Data freshness`, `DataGrid`, `DatePicker`,
`DateRangePicker`, `Dialog`, `Document viewer`, `Donut`, `Drawer`,
`FileUpload`, `FilterBar`, `FilterableEditableTable`, `GanttChart`,
`GlobalSearch`, `HelpCenter`, `InputAmount`, `InputPhone`, `KanbanBoard`,
`List`, `ListRow`, `MapCanvas`, `Menu`, `NavBar`, `NipReveal`,
`NotificationCenter`, `OTPInput`, `Pagination`, `ParetoChart`,
`PasscodeKeypad`, `PeekSheet`, `QrScanner`, `QuickAction`, `QuickActionBar`,
`RoleMatrix`, `RouteBanner`, `Saved views`, `ScatterPlot`, `SectionRule`,
`SegmentedControl`, `Sidebar`, `SmallMultiples`, `StatTile`,
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

Conteo basado en imports directos de componentes de la app desde
`@er-mobility-mx/design-system`, contrastado con `layer` del inventario del
paquete. Excluye imports de tipos, tests y hooks. Cuenta tipos de componente
con al menos un uso, no instancias ni sustitución completa de patrones locales.

| Capa | Catálogo | Usados directamente | Avance por tipo | Lectura |
|---|---:|---:|---:|---|
| Primitives | 57 | 27 | 47.4% | `Card` y `Select` permanecen en su capa declarada; se usan en los listados paginados y filtros de TAGs. `Button` e `Input` tienen cobertura parcial. |
| Components | 66 | 16 | 24.2% | La adopción directa creció; no implica que todas las superficies relacionadas estén migradas. |
| Patterns | 64 | 2 | 3.1% | `FilterSet` y `PageHeader` se usan directamente; el resto requiere un flujo que coincida con su contrato. |

Los 16 components con import directo actual son `Accordion`, `BulkBar`,
`DatePicker`, `Dialog`, `FileUpload`, `GlobalSearch`, `InputAmount`, `ListRow`,
`Menu`, `NotificationCenter`, `Sidebar`, `TabPanel`, `Table`, `Tabs`,
`Tooltip` y `WidgetFrame`. `Select`, `StatusPill`, `Avatar` y `SectionHeader`
son primitives y no se suman a components. El uso transitivo de ActiveFilters,
FilterBar y SavedViews por FilterSet no se cuenta como import directo de la app.

#### Patterns de Flow: oportunidades por mapear

`FilterSet` se importa en Facturas y `PageHeader` en la composición de página.
La tabla distingue esas adopciones de las superficies aún por comparar; no
declara equivalencia ni que todos deban adoptarse:

| Pattern de Flow | Superficie local relacionada | Pendiente / criterio |
|---|---|---|
| `FilterSet` | Dimensiones grupo, producto y estado de Facturas. | Adoptado y controlado desde el producto. Mantener filtros separados de resultados, chips derivados del mismo estado y selección limpiada al cambiar el resultado. |
| `Búsqueda global` | Búsqueda global de `TopBar`. | Comparar descubrimiento, resultados, teclado y navegación; hoy se usa `Input` Flow y el flujo de resultados es propio. |
| `Dashboard / analytics` | Resumen de combustible en `FuelDashboardPage`. | Comparar el layout de analítica y visualizaciones sin asumir que sustituye el dashboard o sus charts locales. |
| `PageHeader` | `PageHeader` local con breadcrumb, volver y toggle del menú. | Comparar estructura y extensibilidad; ya usa `Breadcrumb` y `Button` primitivos, no es adopción del pattern. |
| `Listado + detalle (CRUD)` | Catálogos, usuarios, facturas, vehículos y medios. | Comparar por flujo; preservar tablas, filtros, acciones y navegación contextual. |
| `Spend policy edit` | Edición de políticas de límites/peaje. | Revisar campos, reglas y validación; las superficies ya consumen primitives y components Flow. |
| `Work order review` | Consulta y edición de órdenes en `MaintenancePage`. | Revisar el ciclo completo y estados; no sustituir la página por parecido de dominio. |
| `Conversation` | TED (`TedPage`). | Comparar hilo, composer y estados de pensamiento; el patrón local no importa un pattern de Flow. |
| `Settings` | Parámetros y preferencias de desarrollo. | Verificar si son ajustes de usuario equivalentes o catálogos administrativos antes de priorizar. |

Los otros 55 patterns del catálogo no tienen una superficie candidata
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
| `TabPanel` | estable | Paneles de Reportes, Mantenimiento, ActivitySection, Insights y Optimizador. | **En uso directo** junto con `Tabs`; los cinco contextos identificados usan IDs enlazados y panel asociado. |
| `Tabs` | estable | Reportes, Mantenimiento, ActivitySection, Insights y Optimizador. | **En uso directo**; las cuatro tablists locales se migraron y conservan selección controlada y navegación por teclado. |
| `Accordion` | estable | `ApiCoverageBanner` y detalle de unidades en `SimulationDialog`. | **En uso directo** en dos disclosures; contenido inicialmente cerrado y trigger/región accesibles generados por Flow. |
| `Tooltip` | estable | `ChartCard`. | **En uso directo**; Flow gestiona hover/foco, relación accesible y posicionamiento adaptable. |
| `StatTile` | estable | `SummaryCard` presenta KPI, periodo comparativo, delta favorable/desfavorable y unidad en `FuelDashboardPage`. | Candidato concreto; comparar el contrato de delta, estados sin datos, unidad y acentos de producto antes de migrar. |
| `DateRangePicker` | deprecado | No se identificó caso separado; el alias está deprecado. | No adoptar; usar `DatePicker` en modo rango si surge el caso. |
| `Dialog` | estable | Uso directo en HelpDialog, AccountDialog, NotificationInbox y DevMode; otras 17 superficies usan `Modal` con `OverlayShell`. | Ambas vías consumen piezas Flow; revisar el contrato por superficie y preservar la separación de Dev. |
| `BottomSheet` / `Drawer` | estable | No hay flujo identificado que requiera sheet móvil o drawer de detalle. | Sin caso actual identificado. |
| `Table` / `DataGrid` | beta | 23 instancias tabulares identificadas originalmente; 16 ya usan `Table` y siete permanecen por evaluar. | `Table` aporta la piel sobre DataGrid y Facturas activa selección múltiple controlada por UUID, autorizada por producto. BulkBar ofrece PDF/XML/ambos. No se añade orden ni paginación. Ver auditoría por familia abajo. |
| `DataTable` | beta | Las superficies operativas tienen filtros externos; no se encontró paginación o selección múltiple en las tablas nativas. | Pattern de trabajo compuesto sobre `Table`, `Input`, `Pagination`, `EmptyState`, `StatusView` y `BulkBar`. Candidato donde exista una necesidad coordinada de buscar/filtrar/ordenar/paginar/seleccionar/editar; no envoltorio obligatorio de cada tabla. `searchable`, `sortable` y `paginated` se deben configurar para no añadir interacciones que la pantalla no tiene. |
| `BulkActionsTable` / `FilterableEditableTable` | deprecated | No se consumen estos exports; existen controles editables de producto, por ejemplo en redes de estaciones, que no equivalen automáticamente al contrato integrado. | No adoptar. El RFC 0004 los retira en favor de `DataTable`; evaluar sus flujos explícitamente antes de cambiar la edición de producto. |
| `TableTree` | beta | No se encontraron filas jerárquicas con hijos expandibles. | No aplica a los listados planos; solo usar si el modelo de datos es realmente arbóreo, no para agrupar filas por estilo. |
| `Pagination` | estable | `ActivitySection` conserva «Ver más»/«Ver menos». Conductores, vehículos, medios de pago y detalle de cargas del optimizador usan paginación local; `UnitSelector` también pagina su lista. Facturas no tiene paginación. | Preservar cada contrato existente; no sustituir el flujo incremental ni añadir una segunda paginación con `DataTable`. Evaluar el component Flow por separado. |
| `TransactionGroup` / `TransactionRow` | estable | Historial de movimientos de peaje y tablas de comprobante/actividad. | No son sustitutos visuales universales: `TransactionGroup` es una lista cronológica agrupada por fecha y `TransactionRow` una fila de transacción compacta. Cuando la tarea compara varios atributos en columnas, mantener la tabla (`Table`/`DataGrid`). |
| `Accordion` | estable | `ApiCoverageBanner` y `SimulationDialog` tienen contenido de detalle expandible. `RequestsPanel` y `DevModeMenu` abren diálogos, no disclosures. | Adoptado en cobertura API y simulación; el contenido inicia cerrado y Flow aporta el trigger y la región accesibles. No aplica a los diálogos ni al botón «Ver más» de ActivitySection. |
| `ChatComposer` / `ChatThread` | estable | TED tiene composer e hilo propios, con estados de pensamiento. | No importados; comparar envío, estados y contenido antes de plantear adopción. |
| `SegmentedControl` | estable | Hay tabs y grupos de selección que no siempre comparten semántica. | No importado; clasificar cada grupo (cambio de vista frente a selección) antes de elegir el control. |
| `FilterBar` / `ActiveFilters` | Ver manifiesto por pieza | Se componen transitivamente dentro del FilterSet adoptado en Facturas. | No tienen import directo de producto. Evaluar el pattern completo y su contrato, no duplicar sus controles/chips desde la pantalla. |

#### Prioridad de evaluación de componentes por impacto

La prioridad considera el alcance potencial en superficies de producto, la
frecuencia/reutilización, la importancia de la interacción y la madurez y
equivalencia de la API web. El orden expresa impacto potencial, no autoriza una
migración masiva ni implica que el candidato sea viable sin un piloto.

| Prioridad | Componentes | Evidencia en la app | Impacto potencial | Siguiente paso / condición |
|---:|---|---|---|---|
| 1 | `Table` / `DataGrid` / `DataTable` | 23 instancias originales; 16 usan `Table`, siete permanecen por evaluar. | Muy alto por frecuencia e importancia; beta y diferencias de contrato impiden migración masiva. | Avanzar por familias preservando contratos; no extender selección ni flujos integrados sin requisito explícito. |
| 2 | `Tabs` (completado) | Reportes y las cuatro tablists locales usan el component en cuatro módulos adicionales. | Alto: interacción repetida en cuatro superficies y contrato Flow estable. | Migración completada en Mantenimiento, ActivitySection, Insights y Optimizador; conservar las comprobaciones de teclado y panel/ID al modificar estas pantallas. |
| 3 | `Accordion` | Detalle expandible en cobertura API y simulación; solicitudes y ajustes Dev son diálogos, no disclosures. | Medio: patrón localizado en dos superficies; Flow publica una API estable y gestiona la relación trigger/panel. | Migrado en ambas superficies, conservando el estado inicial cerrado y el contenido; no aplicar a popovers, diálogos ni acciones de «ver más». |
| 4 | `ChatComposer` / `ChatThread` | TED conserva composer e hilo locales; `ChatMessage` ya está adoptado. | Medio: completa una experiencia importante, pero está concentrado en una sola pantalla. | Evaluar contrato de envío, teclado, sugerencias, contenido enriquecido, scroll y anuncio de estados; migrar solo las partes que coincidan. |
| 5 | `FilterSet` sobre `FilterBar` / `ActiveFilters` | Piloto controlado en Facturas; otros listados conservan sus composiciones. | Medio: coordinación de dimensiones/chips sin duplicar estado, condicionada al contrato de cada pantalla. | Validar densidad y negocio del piloto antes de escalar; usar los componentes por separado solo si no corresponde el flujo del pattern. |
| 6 | `StatTile` | Cuatro KPIs en `FuelDashboardPage`, implementados por `SummaryCard`. | Bajo-medio: visible y repetido en un dashboard, pero limitado a una sola superficie. | Comparar periodo/unidad, valor anterior, ausencia de datos, juicio del delta y acentos de producto; no migrar si esos estados requieren reconstruir la tarjeta fuera de la API. |
| 7 | `SegmentedControl` | Grupos locales de tabs y selecciones discretas con contratos de interacción distintos. | Bajo o condicionado: el impacto depende de hallar casos que realmente sean selección segmentada. | Clasificar cada grupo por semántica antes de elegirlo; no convertir navegación tab ni chips de selección por semejanza visual. |

#### Auditoría de tablas: estructura, componentes y patterns

Separación de filtros en Facturas: `FilterSet` vive fuera de la tarjeta y
permanece visible al seleccionar filas. Grupo, producto y estado son dimensiones
de selección única, controladas por un solo estado que también genera los chips.
No se añaden vistas guardadas. La búsqueda por folio/UUID sigue en `BulkBar`;
los filtros se combinan con AND y cada cambio limpia la selección. Limpiar los
chips solo borra las dimensiones; la acción del vacío restablece también la
búsqueda. Los indicadores conservan el alcance de cuenta completa, IVA,
vencimientos y estados sin cambios. La presentación
sin selección pasa de «Todos…» a la dimensión de `FilterSet`, autorizada por
producto. Verificación en navegador: Peaje devuelve dos filas; al añadir
Vencida queda una; Corporativo produce vacío; restablecer recupera diez.

Ampliación solicitada para Facturas (21-oct-2026): el piloto ahora compone
`Table selectable` con `BulkBar`, selección controlada por UUID y tres acciones:
PDF, XML o ambos en ZIP. Son descargas simuladas de la demo. La barra sustituye
la búsqueda mientras hay selección y permite limpiarla; seleccionar todo afecta
solo al resultado filtrado. Cambiar filtros borra la selección. Se conservan
la descarga individual seleccionando una sola fila. Se eliminan la columna
Descargas y «Descargar todas»: para descargar el
resultado completo se usa seleccionar todo y el formato deseado en `BulkBar`.
No se añade orden ni paginación. Se eligió la composición `Table` + `BulkBar`
porque mantiene la carcasa, filtros y vacío propios sin duplicar el flujo de
`DataTable`. La selección es una ampliación explícita de producto, no un efecto
colateral de adoptar Flow.

Corrección de integración de buscadores (21-oct-2026): Facturas, Usuarios,
Parámetros, Conductores, Medios de pago, TAGs, Mejoras API y Mantenimiento
delegan la carcasa y el icono a `Input icon="search"`. Sus wrappers solo
controlan el ancho/layout: no añaden borde, padding ni altura fija, ni
sobrescriben el input interno de Flow. Los buscadores nativos de Vehículos
y del editor de estaciones conservan `.table-page__search`.

Revisión inicial posterior al rebase, 21-oct-2026: **23 instancias tabulares
en 19 módulos**. Facturas inicia el piloto de `Table`; en esa base quedaban
**22 elementos `<table>` locales en 18 módulos**. No hay consumo directo de `DataGrid` ni
`DataTable`. La selección por capa no es “HTML o Flow”:
la estructura semántica de tabla es el primitive de plataforma (`table`,
`thead`, `tbody`, `tr`, `th`, `td`); los controles dentro de las celdas pueden
ser primitives Flow; los componentes `Table`/`DataGrid` administran mecánica y
presentación; `DataTable` compone el flujo de trabajo cuando la pantalla lo
necesita.

**Qué ofrece cada capa de Flow**

| Capa | Pieza | Contrato verificado | Aplicación en este prototipo |
|---|---|---|---|
| Primitive de plataforma | HTML table y controls de celda | La base conserva las relaciones nativas de filas/cabeceras. El catálogo de Flow no declara un primitive tabular separado. | El piloto de Facturas entrega `caption="Facturas emitidas"` a Flow, que genera HTML table. Las 22 estructuras locales restantes se mantienen; revisar su nombre accesible por familia antes de migrarlas. |
| Primitives Flow en celdas | `Button`, `Input`, `Select`, `Checkbox`, `Badge`, `StatusPill` y similares | Cada primitive resuelve una interacción o dato propio; no sustituye la estructura de tabla. | Varios listados ya usan `Button`, `Select`, `Switch`, `Badge` y `StatusPill` dentro de celdas. Se mantienen esas piezas y sus callbacks al cambiar la carcasa tabular; no se confunde la adopción de un control con la migración de la tabla. |
| Component | `DataGrid` (beta) | Mecánica compartida: columnas, orden, selección, fila marcada/clicable, densidad, vacío y modo árbol. Usa HTML table; expone `caption`, selección controlada/no controlada, orden controlado, `onRowClick`, columnas y `tree`. No contiene búsqueda ni paginación coordinada. | Es la base mecánica cuando se necesita una o más de esas funciones sin el flujo completo del pattern. No activar `onRowClick`, selección ni árbol si la tabla actual no los tiene. |
| Component | `Table` (beta) | Piel de `DataGrid`: superficie de tarjeta, cabecera overline y celdas/datos; las mismas props de orden/selección, `caption` y fila. No es otra mecánica independiente. | Mejor candidato para homogeneizar tablas HTML simples. Por defecto `sortable` está activo y `surface="card"` dibuja tarjeta; para conservar el comportamiento y carcasas existentes, pasar `sortable={false}` cuando no haya orden y `surface="none"` dentro de `.table-page__card`, `.activity` o `.assignments`. |
| Component | `TableTree` (beta) | `DataGrid` con `tree` activo, jerarquía, expansión, indentación y `aria-expanded`. | No aplica: no se identificaron filas con jerarquía padre/hijo; no usar solo para grupos visuales o secciones. |
| Pattern | `DataTable` (beta) | Coordina búsqueda, filtros en slot, orden, página, selección múltiple/acciones en lote y edición inline; compone `Table`, `Input`, `Pagination`, `EmptyState`, `StatusView` y `BulkBar`. Algunas funciones se pueden desactivar por separado. | Para tablas de operación que realmente necesiten flujos integrados. Tiene búsqueda, orden y paginación activas por defecto: configurar explícitamente `searchable`, `sortable` y `paginated` para no introducir UI ni conducta nueva. Mantener los filtros de producto en `filters` o como estado upstream, según el comportamiento actual. |
| Pattern / componente en retiro | `BulkActionsTable` (pattern) y `FilterableEditableTable` (component) | El RFC 0004 los marca deprecados y los absorbe `DataTable`: selección + bulk actions, y edición junto con búsqueda/filtros. | Facturas ya tiene selección + BulkBar mediante composición de piezas vigentes. No migrar a los exports en retiro ni añadir edición para “completar” la adopción. |
| Pattern de lista | `TransactionGroup` + `TransactionRow` | Historial cronológico como secciones por fecha y filas compactas; no presenta columnas comparables. | El historial de TAGs y los detalles de comprobante tienen campos comparables en columnas: no son candidatos a reescribirse como lista cronológica. Una futura vista de movimientos tipo feed sí podría evaluarse por separado. |

**Distribución de las 23 instancias**

| Familia | Instancias | Lectura de contrato |
|---|---|---|
| Listados operativos (15) | `DriversPage`, `VehiclesPage`, `PaymentMediaPage`, `InvoicesPage`, `UsersPage`, `ParametersPage`, `TollMediaPage`, `TollRulesPage`, saldo por TAG en `TollBalancesPage`, `MaintenancePage`, dos tablas de `GasOptimizerPage`, `AssignmentsTable`, `StationNetworkDialog` y cargas de `LoadDetail`. | Facturas usa Table con multiselección/BulkBar, sin orden ni paginación. Conductores, vehículos, medios de pago y cargas del optimizador tienen paginación local. Preservar filtros, acciones y controles, incluida la edición de redes; no asumir que todos son listados pasivos. `AssignmentsTable` conserva `Select`, medidor y acciones por unidad. |
| Actividad e historial (4) | Dos tablas condicionales de `ActivitySection`, movimientos en `TollBalancesPage` y registro de envíos al conductor en `LoadDetail`. | `ActivitySection` conserva «Ver más»/«Ver menos», no páginas. Mantener ese flujo y la comparación por columnas; no sustituir por un feed automáticamente. |
| Previsualización/detalle (4) | Filas importadas en `BulkUploadDialog`, líneas de `ReceiptDialog`, muestra de unidades en `SimulationDialog` y preview de columnas en `DynamicReportBuilder`. | Son tablas de lectura dentro de diálogos o una vista previa: sin búsqueda/orden/selección. El preview de reporte actualmente contiene cabecera sin filas y un `EmptyState`, por lo que no es una tabla de datos para migrar; `BulkUploadDialog` debe considerar tamaño máximo del CSV antes de cambiar a paginación. |

**Actualización de adopción, 21-oct-2026:** `Table` ya reemplazó las estructuras
de Facturas, las dos tablas de Administración, los tres listados paginados,
cinco tablas de Peaje/Mantenimiento y cinco de Asignación/Optimizador (16 de las
23 instancias originales; siete permanecen por evaluar). Las siete tablas
desplegables para datos de charts son adiciones, fuera de ese conteo. E2.2 está
publicado; conserva los filtros externos, `usePagination`, `Pagination` de 25
filas y callbacks en producto. E2.3 conserva importes, asignaciones, estados y
operaciones de dominio, y sus tablas usan `Table` sin añadir ordenamiento,
selección ni paginación; la prueba focalizada cubre estructura, filas, acciones
y controles de acceso. En navegador se comprobaron filtros/estados,
bloqueo/desbloqueo, asignación, pausa/reactivación, diálogos y scroll horizontal
interno a 390 px. E2.4 migra la asignación por unidad, ranking, transiciones,
detalle de cargas e historial de envíos. Conserva la selección de estación, las
acciones manuales y la paginación local del detalle; las tablas no añaden
ordenamiento ni paginación integrada. La búsqueda global de E2.2 conserva foco y
desplazamiento de la fila exacta: el hook completa en DOM la identidad de las
filas visibles de Table, que no expone atributos de fila personalizados. E2.3 y
E2.4 siguen locales y sin commit; los importes de recarga automática mantienen
inputs numéricos nativos para preservar `min`/`step`, que no expone el tipo
público de Input beta.10.

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

El CSS compartido de las tablas aún no migradas fija tipografía de 13 px, encabezados overline de
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

1. Piloto implementado en `InvoicesPage`: columnas tipadas `GridColumn<Invoice>`,
   identidad por UUID y filtros/producto intactos; las descargas PDF/XML se
   concentran ahora en `BulkBar`, sin columna de acciones por fila,
   `caption` y `sortable={false}`. Facturas no tenía páginas: no se añadieron.
   E1 retira la tarjeta exterior y deja la superficie, bordes, densidad y scroll
   a Table; el resumen y contenido tienen CSS propio basado en roles sys.
   Se retira el mínimo local de 900 px: el ancho intrínseco conserva columnas
   mediante scroll local sin prioridades que las oculten.
   No se aplica `.table-page__table` sobre Flow ni se copian sus estilos internos.
   La densidad por defecto de Flow es una adopción visual intencional, no una
   equivalencia pixel a pixel con los 13 px locales; no extender a otras tablas
   antes de validar lectura, foco y responsive del piloto.
   Verificación inicial previa a la ampliación: 10 facturas y siete columnas,
   sin orden ni selección; filtros por texto/producto, vacío, restablecimiento y avisos
   PDF/XML comprobados en navegador. A 390 px se mantienen las siete columnas
   en un contenedor de scroll de 360 px. Las celdas por defecto de Flow miden
   16 px de texto y padding 14 x 16 px: diferencia visual registrada.
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

**Actualización del 21-oct-2026:** esta auditoría inicial se amplía con el
Optimizador: hay siete gráficas, cuatro instancias de BarChart/FlowChart y tres
de LineChart. El lote de composición sustituyó las carcasas locales; el cierre
posterior de líneas sustituye también los tres renderers SVG.

**Estado vigente: cierre de líneas (21-oct-2026)**

- Canon: el contrato fuente incorpora valores `number | null`, `gapLabel` por
  serie y por chart, y `axisFormat`. No se edita la copia `.canon`. Son cambios
  locales del repositorio independiente; aún no están publicados.
- Primitive: FlowChart conserva los huecos sin conectarlos ni pasarlos al
  formateador numérico, mantiene el cero y muestra la causa aunque ECharts omita
  el punto nulo del tooltip. Marca observaciones aisladas, distingue una serie
  solo de huecos del cero y reconstruye el canvas al volver del vacío.
- Diccionario: sin tokens nuevos. Canvas relee roles de sus ancestros al
  cambiar `data-mode`/`data-density`; las medidas reales pasan de 14 a 16 a
  18 px. Cambiar etiquetas, rango o formateadores también redibuja aunque no
  cambie la serie.
- Leyenda: el primer swatch sólido vuelve a usar el color de serie; los
  discontinuos conservan transparente el espacio entre guiones.
- Tooltip: la causa de fuente faltante usa tipografía de texto y una línea
  completa bajo su categoría, con ancho máximo del host. No usa el rol mono
  ni `nowrap` de los valores numéricos. Se comprobó contenido en el viewport
  de 320 × 568 con densidad comfortable.
- Producto: LineChart queda como adaptador de FlowChart + ChartLegend `md`,
  `marks="line"` + Accordion/Table. Las tres vistas mantienen datos, filtros,
  rangos, sufijos, trazos rectos y colores existentes. La tabla no recalcula ni
  ordena; expone las mismas observaciones y causas con caption accesible.
  Se retiran tooltip, leyenda, geometría SVG y CSS locales. La proporción
  760/260 se conserva con mínimo de 240 px para plot y Skeleton en móvil.
- Artefacto: dependencia local reproducible
  `vendor/flow/er-mobility-mx-design-system-3.0.0-beta.10-line-charts.tgz`;
  la integridad queda fijada en el lockfile. No implica publicar Flow o canon
  ni superar sus puertas de release.
- Validación: 82 pruebas en 10 archivos relacionados de Flow y typecheck de
  librería/banco; 433 pruebas en 28 archivos del producto y build. Recorridos
  de navegador de dos vistas × tres densidades × 320/390/768/1280 sin overflow
  una vez completado el resize; hueco de febrero, cambio de producto y nodo
  hoja; valores exactos por teclado, métrica y modo bruto/neto. Se conserva
  movimiento reducido y se comprueba la carga final sin errores de página.
- Cierre posterior de barras: las cuatro barras comparten con las líneas la
  composición local ChartDataTable → Accordion + Table. Sus filas leen los
  arrays originales, sin ordenar, seleccionar, redondear ni convertir unidades.
  La categoría se rotula según la vista (vehículo, rama, periodo o distancia).
  Se mantienen marcas, leyendas y la ausencia de leyenda de serie única.
  Once pruebas relacionadas y build pasan; se cotejaron las tres tablas de
  Resumen y ahorro bruto/neto con los datos del canvas. Rendimiento se verificó
  en tres densidades y cuatro anchos, con scroll de tabla contenido y sin
  overflow de página. Este cierre no requiere cambios adicionales de Flow.
- Límites: `axisLabels` continúa siendo específico de scatter; no se necesita
  para estas tres líneas. No se altera WidgetGrid/BulletChart, no se cambian
  colores por aproximación. Con el canon local, inventory pasa; api-drift conserva nueve
  divergencias ajenas a charts (FilterSet/PaymentCard). No se toca el bloqueo
  previo de publicación Flutter.

Los apartados siguientes documentan los lotes y hallazgos anteriores a este
cierre; sus referencias a líneas locales y brechas abiertas son históricas.

**Adopción anterior de la cascada ya disponible**

- Las cinco tarjetas de Resumen delegan superficie, título h2, descripción,
  acciones y padding a WidgetFrame → Card + SectionHeader. ChartCard queda
  como adaptador de las acciones del producto; se elimina su hoja de estilos
  y los overrides de 30 px en IconButton. Menú e información conservan nombres
  accesibles y callbacks. Las opciones del menú siguen siendo avisos demo:
  no se implementan descarga, exportación ni actualización real.
- Los dos paneles gráficos del Optimizador también usan WidgetFrame. La métrica
  diaria permanece en el slot actions y conserva su estado y cálculo. La serie
  de ahorro adopta `--viz-positive` en lugar del verde literal.
- BarChart usa Stack para separar plot y leyenda, y ChartLegend `size="md"`
  para la leyenda principal; conserva `marks="fill"`, orden y colores. No
  añade leyenda redundante a la serie única del Optimizador.
- EmptyChart delega en EmptyState de Flow, conservando título y causa de
  negocio. Se retiran su icono SVG y estilos locales, no las explicaciones.
- El mensual separa carga de vacío y no muestra el resultado de filtros
  anteriores mientras recalcula. Usa Skeleton de Flow con la proporción del
  SVG existente y `aria-busy` en su contenedor. No usa el placeholder interno
  de WidgetFrame: su altura de 120 px no reserva el plot mensual (de proporción
  760/260). La composición del Skeleton no modifica selectores internos; las
  notas de datos faltantes se incorporan al llegar los datos.
- Se conserva la rejilla actual: WidgetGrid existe, pero sus columnas 1.5:1 y
  corte de 982 px no son equivalentes a las columnas iguales del producto.
  No se cambia distribución, KPIs, filtros, escalas, cálculos ni motores.

**Brechas verificadas, fuera de este lote**

Flow sí tiene las recetas Dashboard / analytics y Data viz para flotas grandes.
Esta última prescribe BulletChart para real frente a objetivo, pero la
implementación actual colorea superar la meta como danger, no imprime el
objetivo y siempre incluye periodo anterior en la leyenda. No se aplica
automáticamente a rendimiento km/L. Tampoco se crean piezas nuevas.

El generador de opciones de FlowChart preserva `null` en runtime, pero el tipo
sigue siendo `number[]` y su formatter de línea no representa «Sin datos».
`format` es compartido; `axisLabels` solo se aplica a scatter. La densidad
cambia los roles pero no repinta por sí sola el canvas ya montado. ChartLegend
`marks="line"` deja transparente el primer swatch sólido. Estas diferencias se
comprobaron en el paquete instalado; no se corrigen con casts ni overrides.
Se conservan las tres líneas SVG y sus tooltips/leyendas hasta cerrar los casos
relevantes. No se actualiza el paquete ni se modifica Flow o el canon.

**Validación de esta adopción:** 429 pruebas en 27 archivos, build y
diff-check correctos. Cuatro regresiones nuevas cubren composición del marco,
proporción del Skeleton, causa del vacío y ausencia de leyenda redundante;
la prueba multiserie comprueba también `size="md"`. Recorridos de navegador,
no E2E persistentes: 24 combinaciones de Resumen/Optimizador ×
base/compact/comfortable × 320/390/768/1280 sin overflow de los charts.
Botones de información/menú de 44 px, tooltip por foco, apertura del menú por
teclado y retorno de foco con Escape. Cambio de producto conserva el hueco
mensual al volver a Todos; un nodo hoja conserva su causa de vacío.
Cambio de métrica y ahorro bruto/neto del Optimizador permanecen operables.
El Skeleton del plot y el SVG resultante midieron ambos 307.07 px de alto
en el mismo viewport de escritorio; las notas aparecen al completar el cálculo.
No se acredita aquí que los defectos de densidad dinámica o de línea de Flow
estén resueltos. Persisten los avisos SSR de Flow y de tamaño de chunks.

Tras el rebase, `FuelDashboardPage` tiene **cinco tarjetas de gráfica**:
`Rendimiento por vehículo`, `Consumo organizacional` y `Recargas y Recortes`
usan el adaptador `BarChart` sobre `FlowChart`; `Consumo mensual (12 meses)`
y `Costo por kilómetro` usan `LineChart` SVG local. Las tres primeras métricas
de consumo/rendimiento y costo se calculan con los filtros globales; el consumo
mensual toma doce meses completos y omite el filtro de periodo. Recargas y
recortes conserva su dataset de demostración. Cada tarjeta mantiene su vacío
de negocio cuando no hay datos; ya no hay dos tarjetas permanentemente vacías.

**Capas de Flow**

| Capa | Pieza | Contrato y lugar en la composición |
|---|---|---|
| Primitive de visualización | `FlowChart` (estable) | Primitive genérico basado en ECharts y carga diferida. Declara 16 tipos (`line`, `area`, `bar`, apiladas, `donut`, `pie`, `scatter`, `heatmap`, `radar`, `waterfall`, `pareto`, `gauge`, `funnel`, `treemap` y `boxplot`), series/labels o matriz, `format`, altura, leyenda, animación, carga, vacío, `ariaLabel` y `onSelect`. Lee tokens en runtime, observa cambios de tema y tamaño, respeta movimiento reducido y muestra estado ante fallo de carga. El gráfico actual de barras ya lo consume a través de `BarChart`. |
| Primitive de soporte | `ChartLegend` (estable) | Leyenda DOM para swatches, categorías y valores/detalles; soporta tamaño, orientación, ancho y `marks="line"|"fill"` para repetir trazos/tramas no cromáticas del gráfico. El piloto de barras la consume de forma separada porque `FlowChart` se monta con su `legend` desactivada. |
| Componentes de visualización | `Bars`, `BulletChart`, `Donut`, `ParetoChart`, `ScatterPlot`, `SmallMultiples`, `Treemap`, `GanttChart` | Resuelven semánticas más específicas sobre Flow o composiciones propias: comparación simple, real vs meta, parte-del-total, concentración acumulada, relación X/Y, series pequeñas con escala compartida, jerarquía por área y cronograma. No son wrappers intercambiables de un gráfico genérico. Ninguno tiene uso encontrado en las páginas actuales. |
| Pattern / dashboard | No se encontró un pattern de charts dedicado en `ui/patterns`. Flow publica una plantilla `Dashboard / analytics`, pero es guía de composición, no un pattern gráfico ni reemplazo de un dashboard existente. | `ChartCard` es composición propia del prototipo: título, subtítulo, controles y cuerpo. Delega encabezado y botones de icono a los primitives SectionHeader/IconButton, y tooltip/menú a los components Tooltip/Menu; su carcasa visual permanece local. `WidgetGrid`/`WidgetFrame` pueden ordenar widgets, no resuelven el contrato de una visualización ni reemplazan esta tarjeta por sí solos. |

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
recargas/recortes ya usan `--viz-positive` y `--viz-negative`. Las barras de
rendimiento y consumo organizacional ahora usan `--viz-accent` para la serie
principal y `--viz-neutral` para el contexto, en lugar de azul/gris literales.
Por lo tanto, el
SVG no está completamente integrado en la cascada dataviz aunque su layout sea
adaptable al ancho. Migrar a Flow cambia la apariencia y la respuesta a tema,
no solo el motor; no conservar los hex locales como override. La superficie y
el borde de `.chart-card` siguen siendo decisiones locales independientes de
los tokens internos del plot.

Para series múltiples Flow asigna además marcas no cromáticas (tramas en
rellenos, trazos en líneas y símbolos en puntos), porque las paletas no bastan
para distinguir datos bajo todas las deficiencias de visión cromática. Hay una
brecha de la leyenda de barras quedó corregida con `marks="fill"`: la leyenda
recibe el mismo orden y color de series que el lienzo. No se asignan tramas
propietarias desde producto. La línea mensual ahora es multiserie: conservar su
leyenda y verificar correspondencia de colores y trazos al evaluar Flow.

**Contratos, accesibilidad y decisiones**

- La línea mensual usa `(number | null)[]`, rompe el trazo en cada hueco y
  explica «Sin datos» sin convertirlo en cero ni interpolar. La API beta.9 de
  `FlowChart` declara `values?: number[]`; no usar casts ni el escape `option`
  para fingir soporte tipado. Se requiere un contrato de huecos en Flow y su
  validación antes de migrar esta visualización.
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
  para sustituir automáticamente los tipos elegidos por estas composiciones.

**Secuencia recomendada**

1. `BarChart` ya entrega `ChartLegend marks="fill"` y roles semánticos para
   las series de comparación. Completar la revisión visual y
   verificar apariencia, serie positiva/negativa, marcas, modo oscuro, leyenda
   y tamaño responsive. Es una alineación de contrato ya soportado por Flow.
2. Evaluar el piloto de línea con producto: si se acepta `MXN/km` tanto en
   tooltip como en eje, probar `FlowChart type="line"` con la misma unidad,
   escala, fechas y series; si no, mantener el SVG local como excepción
   documentada hasta disponer de formatos separados. La línea mensual tiene
   además el bloqueo tipado de `null`; no se considera migrada. Probar movimiento
   reducido, actualización de tema y alternativa textual de los datos.
3. Mantener `ChartCard` y `EmptyChart` como composiciones de producto durante
   esta evaluación. No migrar la superficie de la tarjeta como si fuera parte
   del primitive de chart ni inferir tipos para gráficas que todavía no tienen
   datos.

Verificación inicial de barras: las tres instancias montan ECharts con la
leyenda interna desactivada y las tramas multiserie habilitadas. Los colores
resueltos cambian al modificar `data-mode` de claro a oscuro, sin cambiar
los datos. Se restauró el tema inicial tras la prueba. Esto no cierra todavía
la revisión de teclado, valores exactos sin puntero ni todos los tamaños.

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
`@er-mobility-mx/design-system@3.0.0-beta.10`; los paths son relativos a `src/`.
Las tablas se separan por la capa declarada en el paquete. Esta selección
no sustituye el inventario completo ni mezcla los componentes dentro del
denominador de primitives.

### Primitives usados en formularios y controles

| Primitive | Madurez | Usos Flow actuales | Pendiente / decisión |
|---|---|---|---|
| `Checkbox` | Estable | `components/company/InviteUserDialog.tsx`, `components/company/ParameterCatalogDialog.tsx`, `components/dispersion/RuleBuilderDialog.tsx`, `components/limits/PolicyDialog.tsx`, `components/reports/DynamicReportBuilder.tsx`, `components/toll/TollPolicyDialog.tsx`. | Adoptado en seis módulos; el escaneo aún encuentra 25 casillas nativas en otras composiciones o dentro de esos módulos. Clasificarlas por semántica antes de migrar. |
| `Field` | Estable | `components/company/InviteUserDialog.tsx`, `components/company/ParameterCatalogDialog.tsx`, `components/company/ParameterRecordDialog.tsx`, `components/dispersion/RuleBuilderDialog.tsx`, `components/limits/OverrideDialog.tsx`, `components/limits/PolicyDialog.tsx`, `components/maintenance/ServiceOrderDialog.tsx`, `components/reports/DynamicReportBuilder.tsx`, `components/toll/TollAmountDialog.tsx`, `components/toll/TollAssignDialog.tsx`, `components/toll/TollPolicyDialog.tsx`. | Se conserva para etiqueta y descripción de los campos. `Input` reenvía `min`/`step` en runtime, pero faltan en el tipo público; se pueden componer juntos sin perder las restricciones. |
| `IconButton` | Estable | `components/layout/TopBar.tsx`, `components/dashboard/ChartCard.tsx` y `components/layout/FloatingControls.tsx`. | Los triggers conservan nombres accesibles. |
| `Radio` | Estable | `components/company/InviteUserDialog.tsx` (selección de rol). | Adoptado para el rol de invitación; el escaneo aún encuentra dos inputs nativos `type="radio"` por revisar. |
| `Switch` | Estable | `components/api/ApiCoverage.tsx`, `components/dev/DevMode.tsx`, `components/limits/PolicyDialog.tsx`, `components/toll/TollPolicyDialog.tsx`, `pages/company/ParametersPage.tsx`, `pages/toll/TollBalancesPage.tsx`. | No quedan switches nativos (`role="switch"`) en TSX/JSX; los callbacks reciben booleano. |
| `Textarea` | Estable | `components/maintenance/ServiceOrderDialog.tsx`. | Sin otro textarea candidato. |
| `Button` | Beta | Usado en páginas y diálogos de producto. | Adoptado para acciones; se conserva el control local cuando tiene semántica distinta. |
| `Input` | Beta | Búsquedas, formularios, asignaciones y navegación. | Adoptado para texto simple; el escaneo encuentra 11 campos numéricos, 2 horarios, 2 fechas y otros controles nativos, que requieren clasificación y cotejo de API antes de migrar. `type="time"` está aceptado por la API; revisar también la carcasa local. |
| `Select` | Estable | Formularios, filtros y páginas de Reportes, Flota, Medios de pago, Facturas, Usuarios, TAGs y reglas. | Adoptado parcialmente; el escaneo aún encuentra 29 `<select>` nativos en 11 módulos. Es primitive y no se vuelve a contar en la tabla de components. |

### Componentes usados en formularios y navegación

| Componente | Madurez | Usos Flow actuales | Pendiente / decisión |
|---|---|---|---|
| `DatePicker` | Beta | `components/maintenance/ServiceOrderDialog.tsx`, `components/reports/DynamicReportBuilder.tsx`. | Adoptado; el escaneo todavía encuentra dos inputs nativos `type="date"` en otras superficies. Revisar límites y comportamiento antes de sustituirlos. |
| `Dialog` | Estable | Uso directo en HelpDialog, AccountDialog, NotificationInbox y DevMode; 17 superficies adicionales usan `Modal` con `OverlayShell`. | Ambas vías consumen piezas Flow; revisar el contrato por superficie y preservar la separación de Dev. |
| `InputAmount` | Estable | `components/dispersion/RuleBuilderDialog.tsx`, `components/limits/OverrideDialog.tsx`, `components/limits/PolicyDialog.tsx`, `components/toll/TollAmountDialog.tsx`, `components/toll/TollPolicyDialog.tsx`. | Adoptado; mantiene límites de moneda y formato vía la API publicada. |
| `Tabs` / `TabPanel` | Estable | `pages/ReportsPage.tsx`, `pages/MaintenancePage.tsx`, `components/dispersion/ActivitySection.tsx`, `pages/intelligence/InsightsPage.tsx` y `pages/intelligence/GasOptimizerPage.tsx`. | Adoptado en las cinco superficies identificadas; los paneles usan IDs asociados y conservan la navegación por teclado. |

Los usos existentes beta se conservan considerando su madurez publicada. El
escaneo estático actual encuentra en TSX de producción 29 `<select>` nativos,
25 `input[type="checkbox"]`, 2 `input[type="radio"]`, 11 `input[type="number"]`,
2 `input[type="time"]` y 2 `input[type="date"]`; no encuentra `<textarea>`
nativo. `InputProps` beta.10 no publica `min`/`step` ni varias relaciones ARIA.
La cuenta orienta el siguiente inventario por superficie, pero no clasifica
qué controles son equivalentes o excepciones legítimas.

Otros primitives y components se siguen evaluando por separado. Compartir
apariencia o nombre no implica equivalencia de contrato; revisar interacción,
accesibilidad y API pública antes de migrarlos.

El shell de navegación y los charts se evalúan por separado de la tabla inicial
de adopción: el sidebar actual combina búsqueda, pin, filtrado, navegación y
colapso; los charts mezclan una integración Flow activa con un SVG local,
estados vacíos y contratos de datos propios. Aplicar la auditoría de charts más
arriba; no asumir equivalencia por compartir un nombre o una función superficial.

## Secuencia y bloqueos

La secuencia ejecutable, con alcance, archivos, dependencias, pruebas y puertas
de salida por entrega, vive en el
[roadmap de migración](./roadmap-migracion-flow.md). Sustituye la secuencia
anterior, que todavía presentaba el piloto de Table como futuro y cambios de
contrato en Flow como pasos obligatorios.

E0/E1 están implementadas y verificadas localmente en Facturas: roles
tipográficos de dato/texto/estado, superficies y layout propios, aislamiento
respecto al CSS compartido y validación de densidad/interacción. No cambian
size, densidad de producción, lógica de negocio ni paquete.
Después de aceptar visualmente el piloto se escalan familias de tablas y charts con sus
respectivas puertas de aceptación. Los posibles aportes al DS siguen una vía
condicional, independiente de los lotes que ya pueden resolverse en producto.
