# Roadmap de migración a Flow

## Objetivo y estado de partida

Plan de ejecución del 21-oct-2026 para Ticket Car+, basado en la
[revisión de foundations y primitives](./migracion-flow-foundations-primitives.md).
No es una propuesta de rediseño de Flow ni una autorización para cambiar
comportamientos del producto.

- Base publicada del producto: `b01696f`. Navegación, líneas, tablas de
  Administración y cierre de E2.2 ya están publicadas; E2.3 y E2.4 permanecen
  locales.
- Dependencia instalada: Flow `3.0.0-beta.10`, artefacto local
  `vendor/flow/er-mobility-mx-design-system-3.0.0-beta.10-line-charts.tgz`.
  Incluye las correcciones previas de selección/densidad y el cierre de líneas
  descrito en E4. No es una publicación oficial del DS; el contrato ampliado
  permanece local en el repositorio del canon.
- Integración base, fuentes, múltiples primitives, Tabs y Accordion ya tienen
  adopción. No se reinician como tareas pendientes.
- Tablas: 23 instancias identificadas originalmente; Facturas, las dos tablas
  de Administración, las tres de listados paginados, cinco de Peaje/Mantenimiento
  y cinco de Asignación/Optimizador usan Table. Quedan siete instancias de ese
  inventario por evaluar. Las siete tablas desplegables de datos de charts son
  adiciones, no parte del conteo original.
- Charts: las siete gráficas usan FlowChart: cuatro barras y tres líneas.
  Los siete marcos usan WidgetFrame; vacíos y leyendas consumen Flow. Las líneas
  y barras añaden datos exactos mediante Accordion + Table, sin ordenamiento
  nuevo. Comparten la composición local ChartDataTable, no un renderer nuevo.
- Adopción directa por tipo (corte actual contra el manifiesto beta.10):
  27/57 primitives, 16/66 components y 2/64 patterns. Estos porcentajes no son
  una medida de finalización ni el objetivo del plan; el inventario explica el
  alcance del escaneo CSS y las limitaciones de interpretar estos conteos.

**Implementación actual:** E0/E1 de Facturas, E2.1 de Administración y E2.2 de
Vehículos, Conductores y Medios de pago están publicadas. E2.3 y E2.4 quedan
migradas y validadas localmente. E2.3 cubre Peaje y Mantenimiento: las tablas de
TAGs, asignación de políticas, saldos, movimientos y órdenes usan Table; resumen
y acciones usan primitives Flow; se conservan estados, búsqueda/filtros,
asignación y operaciones. E2.4 cubre AssignmentsTable, ranking de estaciones,
transiciones de control volumétrico, detalle de cargas e historial de envíos.
Las cinco usan Table sin añadir orden ni paginación; se conservan los filtros,
acciones, selección visual, y la paginación de producto que ya existe. La
validación incluye pruebas focalizadas, build y recorridos en navegador. Se
mantienen nativos los campos numéricos de recarga automática para preservar
`min`/`step`, no publicados por el tipo de Input beta.10. E2.3/E2.4 no están
commit/push. No activar compact global, sustituir todo por DataTable ni
modificar Flow sin una necesidad transversal comprobada.
La revisión móvil encontró y corrigió que los nombres accesibles ocultos de los
Select de asignación vivían en celdas fuera del scrollport. Su posicionamiento
absoluto elevaba el `scrollWidth` del documento a 542 px con viewport de 390 px,
aunque el body permanecía ajustado. Los nombres ahora se anclan en la primera
celda de cada fila y `aria-labelledby` se conserva. En navegador, el documento
mide 390 px mientras la tabla mantiene 1432 px de ancho dentro de su scrollport
de 308 px. No se fijan anchos de columna: esa alternativa las reducía a unos
51 px y las hacía ilegibles.

### Corrección posterior: alturas gobernadas por density

La entrega inicial no cerró la diferencia de alturas. Este ajuste sustituye
la decisión anterior de conservar variantes diferentes en filtros y búsqueda:

- No se elige una altura en Facturas ni se modifica el diccionario. La cadena
  es `data-density` → `--type-body-md` y `--pad-control-*` → ControlShell →
  Input/Select → FilterSet/BulkBar → producto.
- Flow FilterSet deja de imponer `size="sm"`; Select conserva su default `md`,
  cuyo padding consume los roles de densidad. El cambio afecta al pattern
  compartido, no solo a esta pantalla.
- Flow Input deja de sustituir el interlineado por `1.4` y hereda el de
  ControlShell. Afecta también a otros Input: es una corrección de consumo de
  tipografía, no una excepción visual para Facturas.
- Implementación local en `FlowHANA-migration-review`, base `214f69b`, con
  pruebas y guía de uso actualizadas. No se cambian contratos ni tokens.
- `npm pack -w packages/flow-react --pack-destination
  ../prototype-tc-plus-flow-review/vendor/flow` ejecuta el build/prepack.
  El producto consume el artefacto nuevo
  `vendor/flow/er-mobility-mx-design-system-3.0.0-beta.9.tgz`, con su integridad
  en el lockfile. No se sobrescribe el tarball anterior ni se edita node_modules.
  Es una variante local de beta.9, no una versión publicada.

| Density | Los tres Select | Input de búsqueda |
|---|---:|---:|
| Base, sin atributo | 50.8 px | 50.8 px |
| Compact | 44 px | 44 px |
| Comfortable | 62.8 px | 62.8 px |

Medición real de las nueve combinaciones: tres densidades por 390/768/1280 px.
Sin overflow global, con el menú lateral cerrado; se conserva el scroll de
tabla. Se restablece el contexto base al terminar. No se activa compact global.
Se verifica además 10 filas → Peaje 2 → Vencida 1 → búsqueda vacía → limpiar 10,
selección y apertura/cierre por teclado. El resumen financiero no cambia.

Validación: 49 pruebas focalizadas de Flow, typecheck de Flow, tres pruebas de
Facturas y build de producto pasan. Las medidas son recorridos del navegador,
no tests E2E persistentes. Continúan los warnings SSR y de bundle; npm install
reporta seis vulnerabilidades de dependencias, fuera de este ajuste.
La X de limpiar sin selección se corrige en el siguiente ajuste.

### Corrección posterior: limpieza solo con selección

- Select normaliza el valor single vacío a ausencia de selección, excepto
  cuando existe una opción declarada explícitamente con `value: ''`. No se
  altera ese caso compatible ni los valores no vacíos fuera del catálogo.
- Se conserva la API: limpiar single emite `''`, limpiar multiple emite `[]`.
  FilterSet mantiene su estado y chips; no se ocultan botones mediante CSS.
- El paquete final consumido es
  `vendor/flow/er-mobility-mx-design-system-3.0.0-beta.9-selection-fix.tgz`;
  incluye también el ajuste de densidad. Se genera con el mismo `npm pack`
  anterior, se copia con ese nombre y se instala tras cambiar el manifiesto.
  El lockfile registra su integridad. Sigue siendo una variante local no
  publicada, con fuentes en `FlowHANA-migration-review`.
- Pasan 57 pruebas focalizadas de Flow, su typecheck, las tres regresiones
  SSR de Facturas y el build de producto.
- Navegador: inicio 10 filas/0 botones Limpiar; Peaje 2/1; limpiar el control
  10/0; Peaje + Vencida 1/2; quitar chip de Estado 2/1; limpiar todos 10/0.
  Resumen financiero intacto. Base/compact/comfortable a 390 y 1280 px
  conservan igualdad de alturas y ausencia de overflow global.

### Resultado de E0/E1

Línea base de la entrega inicial; las referencias a conservar size y a alturas
diferentes quedan sustituidas por la corrección de density anterior.

- Facturas usa su propio CSS, sin los estilos compartidos de TablePage:
  roles `--type-data`, `--type-data-sm/lg`, texto, estado, padding, superficie,
  borde y radios. Se preserva el resumen semántico `<dl>`.
- Table vuelve a ser dueña de su superficie y scroll; se retiran la carcasa
  exterior redundante y el mínimo local de 900 px. Las siete columnas siguen
  presentes y el ancho intrínseco se recorre en scroll local.
- Se corrige el recorte de acciones de lote con overflow horizontal mediante
  `BulkBar.style`. El wrapper de producto asegura que el objetivo enfocado se
  desplace completo a la vista; no hay selectores de interiores de Flow.
- No cambian size, densidad de producción, filtros, cálculos, selección ni
  dependencia. Los avisos PDF/XML/ambos continúan siendo simulados.
- Tres pruebas Vitest cubren estructura, resumen, fechas y separación de dato
  frente a metadato. La interacción y geometría se comprobaron en el navegador
  disponible; no se añadió un runner E2E ni se afirma automatización persistente
  de esos recorridos.
- Navegador: 10 filas iniciales; Peaje 2; más Vencida 1; más Corporativo vacío;
  restablecer 10. Búsqueda por folio normalizado y UUID, seleccionar todo el
  conjunto filtrado, limpiar selección al cambiar filtros y tres formatos
  verificados. El resumen permanece en $919,938 / $706,950 / $198,476 / 10.
- Base/compact/comfortable a 390/768/1280 px: sin overflow horizontal global
  en reposo ni con selección. La tabla conserva scroll local; botones de lote
  y limpiar miden al menos 44 px. En móvil, Tab recorre las cuatro acciones
  completas con foco visible; el Select abre por teclado y Escape devuelve foco.
- El importe de resumen responde a densidad con 26/22/30 px; el identificador
  con 13/12/14 px. Se mantiene la diferencia de variantes entre filtro y búsqueda;
  no se presenta igualdad de alturas como criterio de conformance.
- Build y pruebas focalizadas pasan. Permanecen los warnings SSR de Popover
  Flow y de tamaño de bundle. Los problemas del menú móvil preexistente y la
  pérdida de contexto de portales no se declaran corregidos por este lote.

## Reglas de avance

### Piloto de búsqueda global (posterior a E1)

- Intención: navegar desde una paleta GlobalSearch a unidades, medios de pago
  TicketCar+ y conductores. No ejecuta acciones ni abre detalle automáticamente.
  El patrón CRUD de Flow sigue siendo la receta para listado + Drawer; no se
  implementan fichas nuevas en este lote.
- Datos: catálogo construido desde los bindings ya acotados de `data/fleet`,
  comprobando `canAccessRoute` antes de indexar. Sin VIN ni campos ocultos.
  Revalida tipo + ID al elegir. No usa los filtros temporales del dashboard.
- Coincidencia: búsqueda local síncrona sobre los campos ya disponibles en
  los tres listados, con normalización existente sin acentos, trim y minúsculas.
  Prioriza etiquetas exactas; orden estable por etiqueta e ID. La paleta muestra
  hasta diez coincidencias por tipo y lo comunica en su orientación inicial.
  Las búsquedas locales no cambian su normalización.
- Interacción: un solo GlobalSearch en modo palette, disparador accesible
  también en móvil, atajo anunciado, recientes de cinco IDs en memoria y
  limpieza del historial. Los recientes se resuelven contra el catálogo actual.
  El cambio de sesión remonta la app y descarta consulta e historial.
  Sin API remota: no se inventan debounce, cargas ni fallos de red.
- Destino acordado: limpiar los filtros del listado, calcular la página por ID
  y enfocar/desplazar la fila exacta. No se filtra por etiqueta ni se remonta
  el listado para navegar dentro de él. Las ediciones locales mantienen la
  persistencia existente; no se añade almacenamiento entre módulos/recargas.
- Las limitaciones previamente encontradas de GlobalSearch inline y su
  `minChars` no se declaran corregidas. Este lote usa una única paleta con el
  mínimo por defecto y no modifica Flow.
- Validación: 416 pruebas de producto pasan y build pasa (warning existente
  de chunks grandes). Cinco pruebas nuevas cubren catálogo, normalización,
  ranking/límite por grupo, permisos y un subárbol organizacional real.
  Navegador: unidad en página 12 y medio en página 4 enfocados por ID; filtro
  local que ocultaba la unidad limpiado; bloqueo local conservado al volver a
  buscar el mismo medio; atajo, foco de entrada/restauración y disparador táctil
  a 320/390/768/1280 px comprobados. Los recorridos no son E2E persistentes.
- Pendiente del componente Flow detectado en este recorrido: al borrar todos
  los recientes desaparece el botón enfocado y el foco cae fuera del diálogo;
  Escape no llega al shell hasta volver a enfocar el campo. No se presenta
  esta transición como resuelta ni se parchea con selectores DOM de producto.

Cada entrega produce cambios acotados, evidencia de equivalencia y una
actualización del inventario. El siguiente lote depende de la salida del
anterior, no de que haya terminado una fecha estimada.

| Clasificación | Acción |
|---|---|
| Consumo incorrecto del producto | Corregir props, roles semánticos, composición o CSS propio en este repositorio. |
| Funcionalidad ya cubierta por Flow | Adoptar la API existente y retirar solo la implementación que reemplaza. |
| Diferencia de comportamiento deliberada | Conservarla; cualquier cambio de UX o negocio requiere una decisión explícita. |
| Desfase entre fuente y paquete | Comparar ambos comportamientos antes de decidir una actualización de dependencia. |
| Defecto o necesidad transversal del DS | Reproducción aislada, promesa/uso afectados, prueba y propuesta acotada; no bloquear entregas independientes. |
| Sin equivalencia o sin caso de uso | Mantener la solución local con la razón registrada. No construir abstracciones para completar el catálogo. |

No se extrae un wrapper genérico por adelantado. Una segunda adopción equivalente
debe demostrar qué estado, composición o estilo conviene compartir.

### Navegación: shell del Overview (posterior al piloto de búsqueda)

Se adopta la composición del banco: Sidebar responsive + PageHeader con
SidebarProvider y PageChromeProvider, no TopBar y Sidebar independientes.
La decisión aprobada sustituye pin/ocultar de escritorio por sidebar completo,
carril intermedio y cajón compacto. No se cambia la dependencia ni Flow.

| Entrega | Implementación local |
|---|---|
| N0 — Contrato | Rutas, permisos y datos de sesión siguen siendo del producto. Marca e identidad en Sidebar; búsqueda, ayuda, notificaciones y Dev en PageHeader. |
| N1 — Navegación | Adaptador de grupos autorizados a SidebarItem; captions no navegables; activo derivado de la ruta. La búsqueda local del menú se retiró posteriormente por solicitud del usuario en completo, carril y cajón; se conserva la búsqueda global del encabezado. |
| N2 — Chrome | Una sola paleta GlobalSearch; PageHeader consume su disparador compartido. Conserva títulos, subtítulos y filtros del dashboard. Por decisión posterior del usuario se retiran breadcrumbs y el botón de regreso al resumen en todas las vistas: la navegación poco profunda se resuelve con Sidebar, sin una jerarquía artificial ni un regreso redundante. |
| N3 — Geometría | Sidebar gobierna ancho y rangos; el shell gobierna pad-section, content-max y scroll principal. Se retiran TopBar, CSS del encabezado y menú anteriores, padding exterior duplicado y tokens locales de esas geometrías. |
| N4 — Regresión | Cinco pruebas persistentes nuevas y recorridos de navegador descritos abajo. No es una suite E2E persistente. |

- Cascada: density → roles de padding, tipografía y geometría de navegación →
  Sidebar/IconButton/Dialog/OverlayShell → PageHeader y providers →
  adaptación de rutas, marca, permisos y utilidades de Ticket Car.
  No se impone una densidad global ni breakpoints propios del producto.
- Los filtros del dashboard ajustan su ancho y el grupo de periodo permite
  envolver controles para caber en el slot de filtros. No cambian dimensiones,
  alcance, valores ni lógica de aplicación. Su migración visual completa
  continúa fuera de este lote.
- Dev abre Dialog desde el header: foco inicial, ciclo de tabulación,
  Escape y retorno de foco pertenecen al sistema. Se descartó el Popover para
  esta configuración porque Tab desde el disparador saltaba al contenido
  fuera del panel. Se conserva la configuración, impersonación y acceso a
  Mejoras API. Las utilidades posteriores se describen abajo; las alertas de
  la campana reutilizan Insights sin inventar un catálogo paralelo.
- Navegar reinicia el scroll principal antes de renderizar el destino. La
  búsqueda global conserva el desplazamiento posterior a su fila exacta.
  El cajón no reaparece al regresar a compacto después de pasar por escritorio.
  Se mantiene un enlace de salto al contenido principal.
- Validación inicial del shell: 421 pruebas de producto pasan (25 archivos), build pasa y
  diff-check limpio. Persisten los warnings SSR de useLayoutEffect de Flow
  y el aviso existente de chunks grandes.
- Navegador: 18 destinos del menú principal, activo único y scroll inicial;
  filtro de menú y navegación a Facturas; búsqueda desde el carril; Escape,
  backdrop, ciclo de foco y retorno al disparador del cajón; Dev en escritorio,
  carril y cajón; sesión Finanzas con menú autorizado y restauración del
  administrador; al desactivar Dev se vuelve a Resumen. Búsqueda global de
  ECO-3281 conserva foco en la fila y activo Vehículos.
- Matriz medida en Resumen: base/compact/comfortable × 320/390/768/1280 px,
  sin overflow horizontal del encabezado ni del scroll principal. Pad-section
  medido: 32/24/40 px respectivamente; carril 64/64/80 px. Son resultados de
  tokens, no dimensiones copiadas al producto. Se restablece density base.

### Ayuda de contacto

El botón Ayuda deja de emitir un toast y abre Dialog de Flow con enlaces
`tel:` y `mailto:`, cierre explícito y acceso a la vista TED cuando el rol
tiene permiso. Abrir TED cierra el diálogo; no crea ni reinicia conversaciones.
Los contactos +1 202 555 0147 y soporte@ticketcar.example son ficticios y el
diálogo lo comunica: deben sustituirse antes de ofrecer atención real.
No se incorpora HelpCenter ni se cambian notificaciones o perfil en este lote.

### Utilidades, cuenta y notificaciones compartidas

- Dev vuelve al header con Ayuda y búsqueda. Usa el mismo IconButton de Flow
  que las demás utilidades en todos los rangos, con icono de código, estado
  accesible ON/OFF e indicador cuando está activo. Su configuración sigue
  usando Dialog.
- El pie de Sidebar muestra Avatar + nombre + rol; en carril solo Avatar
  con nombre accesible. Abre un Dialog de cuenta con nombre, rol y alcance
  actuales. No incluye presencia online, perfil editable ni cierre de sesión
  ficticios. Es el alcance elegido por el usuario.
- No se adopta ProfileMenu para esa identidad de solo lectura: requiere una
  lista de acciones y fuerza `online`. No se crea otro patrón de perfil en
  Flow. Queda como propuesta DS revisar presencia configurable y composición
  de disparador + shell + ProfileMenu antes de ampliar su contrato a escritorio.
- La campana usa la misma fuente `fleetAlerts` que Insights y un estado
  compartido en el shell. Leer y descartar son independientes. Marcar todas
  leídas no elimina alertas activas; descartar elimina la misma entidad del
  listado y la campana. No se añade una resolución de negocio inexistente.
- Seleccionar una notificación revalida su ID y permiso de Insights, la marca
  leída y abre la alerta exacta, limpiando filtro de severidad y seleccionando
  la pestaña Alertas. La tarjeta recibe foco y scroll; no ejecuta su acción.
- Estado en memoria durante la sesión: sobrevive al cambio de módulo, no a
  recarga o cambio de sesión. El shell ya se remonta al cambiar usuario/rol/
  alcance. Se conserva el catálogo estático de demo de Insights: esta entrega
  no convierte sus alertas agregadas en eventos de backend ni acredita un
  filtrado organizacional de esas alertas. La campana se oculta sin permiso
  para Insights.
- Se usa NotificationCenter de Flow fuera de compacto. A 320 px su lista
  fija de 340 px se recorta: defecto comprobado, sin corregir Flow ni aplicar
  overrides a sus selectores internos. Por decisión del usuario, compacto
  compone IconButton + Dialog + ListRow + Badge + EmptyState existentes.
  La lista tiene scroll propio limitado a media altura del viewport para
  mantener visibles cabecera y acciones. Lectura y selección comparten los
  mismos callbacks en ambos formatos.
- Los cambios no actualizan la dependencia ni los repositorios de Flow/canon.
- Validación de este lote: 425 pruebas pasan (26 archivos), build y diff-check
  correctos. Navegador: lectura individual/todas, descarte coherente, estados
  vacíos, destino exacto y regreso desde optimización, identidad en cuenta tras
  impersonar y reinicio de alertas al cambiar sesión. Cuenta/cajón y
  notificaciones compactas verificadas con Escape y retorno de foco.
  Matriz de utilidades: base/compact/comfortable × 320/390/768/1280 px sin
  overflow horizontal; scroll del inbox limitado dentro del Dialog.

## E0 — Línea base ejecutable del piloto

**Estado:** verificada localmente para el piloto. Hay pruebas SSR persistentes
y recorridos/medidas de navegador; no una suite E2E persistente completa.
**Dependencias:** ninguna. **Bloquea:** cierre de E1 y escalamiento de tablas.

**Trabajo**

1. Registrar el estado inicial de Facturas: datos, resumen de cuenta completa,
   filtros, búsqueda, selección, vacío y avisos de descarga.
2. Ampliar la prueba existente para las salidas estáticas relevantes y los
   importes; no presentar SSR como prueba de interacción o dimensiones.
3. Comprobar en navegador los flujos de la tabla siguiente. Si automatizar
   interacción exige herramientas no instaladas, usar primero el navegador
   disponible y registrar qué sigue siendo verificación manual.
4. Medir página, región de tabla y barra con y sin selección a 390, 768 y
   1280 px. El overflow global observado anteriormente sigue abierto: medir
   su causa antes de atribuirlo al piloto.

| Invariante | Resultado que debe conservarse |
|---|---|
| Resultado inicial | 10 facturas; seis columnas de datos y selección, sin columna Descargas. |
| Finanzas | Misma fórmula de IVA y redondeo a centavos; resumen no se recalcula sobre el subconjunto filtrado. |
| Filtros | Dimensiones combinadas con AND; Peaje devuelve 2 filas, más Vencida devuelve 1, más Corporativo devuelve vacío. |
| Búsqueda | Folio/UUID; normalización actual de espacios y mayúsculas; no ampliar silenciosamente los campos buscados. |
| Selección | Identidad por UUID; seleccionar todo afecta al resultado visible filtrado; cambiar búsqueda o dimensiones limpia la selección. |
| Limpieza | Chips limpian dimensiones; acción del vacío limpia también búsqueda; restablecer recupera las 10 filas. |
| Acciones | Una o varias seleccionadas permiten PDF, XML o ambos; siguen siendo avisos simulados, no archivos reales. |
| Alcance | Sin orden, paginación, vistas guardadas ni cambios en los vencimientos o estados. |

**Salida:** evidencia de base y fallos clasificados; no se declara “responsive
correcto” solo porque la tabla tenga scroll.

## E1 — Completar la cascada en Facturas

**Estado:** implementada y verificada localmente; pendiente de aceptación visual
para escalar a la siguiente familia.
**Dependencia:** E0 para verificar equivalencia.
**Archivos principales:** `src/pages/company/InvoicesPage.tsx`,
`src/pages/TablePage.css`, `src/pages/company/__tests__/InvoicesPage.test.ts`.
Un CSS específico de Facturas solo se añade si permite aislar realmente el
piloto del stylesheet compartido; no es un requisito del diseño.

### E1.1 — Roles de contenido y superficies

- Separar explícitamente texto, identificadores, importes, metadatos y estado
  en los renders de las columnas.
- Folio/UUID e importes consumen roles `--type-data*`; etiquetas y texto
  consumen `--type-body-*`; no aplicar `mono` a una columna mixta si convierte
  también sus etiquetas en dato.
- Totales/resumen usan el rol de cifra apropiado, no familia display con
  peso sintético. Conservar el `<dl>` y sus relaciones `<dt>/<dd>`.
- Texto auxiliar usa un shorthand tipográfico completo del diccionario, no
  `font-size: 12px` aislado. Vencimiento alertado conserva su texto y usa el rol
  de estado correspondiente, no rojo de marca por semejanza de color.
- Mapear superficie, borde, radio, separación y padding propios a roles
  existentes. Conservar un único dueño de cada carcasa; no añadir Card encima
  de otra superficie ni reestilizar los interiores de Flow.
- No editar globalmente `.table-page__main`, `.table-page__sub` o el resumen
  compartido para forzar la migración de las otras páginas.

### E1.2 — Composición y densidad

- Mantener FilterSet fuera de la región de resultados y BulkBar como barra de
  trabajo/selección. No crear otro estado de filtros.
- Mantener inicialmente la densidad base de producción. Comparar base,
  compact y comfortable como matriz de validación, no como tres nuevas
  preferencias de usuario.
- Medir el efecto conjunto de texto, accesorios, chips, búsqueda y acciones;
  la aceptación no exige alturas idénticas entre zonas con distintas funciones.
- Si persiste un problema de jerarquía o ergonomía, presentar una alternativa
  de composición con los roles/variantes existentes y obtener decisión sobre
  el cambio de UX. No ocultarlo con `size="sm"`, una altura literal o un
  atributo global.
- No introducir densidad local como solución cerrada mientras los overlays
  pierdan ese contexto; registrar el límite sin aplicar un parche al portal.

### E1.3 — Cierre del piloto

- Ejecutar E0 de nuevo y revisar foco de búsqueda, selects, checkboxes y acciones.
- Área interactiva computada de al menos 44 px para los objetivos comprobados;
  no confundir altura del glifo o trigger interior con la del control completo.
- A 390/768/1280 px, conservar las columnas mediante scroll local, sin añadir
  ocultación por prioridad. Corregir el overflow causado por esta composición;
  separar el del shell preexistente si la evidencia demuestra otro origen.
- Revisar reposo/selección, filtros con valores largos y estado vacío. Ningún
  control puede quedar recortado o inaccesible.
- Ejecutar la prueba focalizada de Facturas, `npm run build` y
  `git diff --check`. Conservar visibles los warnings preexistentes.

**Salida:** Facturas consume la cascada en contenido y composición, no solo
en el import de Table. Ningún cambio de paquete ni de contrato Flow necesario
por defecto.

## E2 — Escalar tablas por familias, no por reemplazo masivo

**Estado:** E2.1 publicado; E2.2 migrado estructuralmente, validado en
comportamiento y con auditoría visual pendiente de cierre.
**Método:** una pantalla representativa, validación y después su familia.
El orden de candidatos puede ajustarse si el contrato medido revela riesgos.

| Lote | Superficies candidatas | Implementación y comportamiento a preservar | Puerta de salida |
|---|---|---|---|
| E2.1 Administración · publicado en `261d499` | Usuarios y Parámetros | Table para estructura/estilo; conserva invitaciones, permisos, catálogos, switches, validaciones y edición de registros. Sin selección masiva nueva. | Datos/acciones y nombres accesibles iguales; abrir, confirmar y cancelar edición sin regresión. |
| E2.2 Listados paginados · publicado en `b01696f` | Conductores, Vehículos y Medios de pago | Table recibe solo las filas de la página actual; el producto conserva búsqueda, filtros, `usePagination` y `Pagination` existentes. No se activa sorting, selección ni paginación interna. | Probar filtro desde una página posterior, resultado vacío, última página y acción sobre la fila correcta. |
| E2.3 Peaje y mantenimiento · publicado | TAGs, reglas, saldos y órdenes | Table para TAGs, asignaciones, saldos, movimientos y órdenes. Conserva estados, asignaciones, topes, edición/activación y transiciones de servicio. Campos numéricos de recarga mantienen `min`/`step` nativos por límite tipado de Input. | 8 pruebas focalizadas y build; en navegador se validan bloqueo/desbloqueo, filtros, asignación, recarga, pausa/reactivación y apertura de orden sin guardar. A 390 px, el documento permanece en 390 px; las tablas mantienen scroll horizontal propio. Nombres accesibles de asignación fuera del scrollport reubicados en la primera celda. |
| E2.4 Asignación y optimizador · publicado | AssignmentsTable, ranking y transiciones de GasOptimizerPage, detalle de cargas e historial de envíos en LoadDetail | Table para cinco superficies; conserva Select por unidad, medidores, recomendación seleccionada, métricas, acciones manuales, historial vacío y paginación existente. No añade orden ni paginación integrada. | 2 pruebas SSR de AssignmentsTable y 35 regresiones de dominio del optimizador; build. En navegador: 8 asignaciones, 15 estaciones, 4 transiciones y 25 cargas por página; la selección sigue abriendo el panel sin añadir clic a la fila. En móvil, el documento conserva el ancho del viewport y las asignaciones mantienen scroll interno. |
| E2.5 Actividad e historial · local | Dos tablas condicionales de ActivitySection; movimientos de peaje e historial de envíos ya migrados en E2.3/E2.4 | `Table` para últimas dispersiones y pagos programados; conserva comparación por columnas, «Ver más/menos», acciones y comprobantes. No convertir un historial tabular en feed por nombre de pattern. | 3 pruebas SSR: límite inicial de seis recibos, caption/datos/acciones de ambas tablas y estado vacío; regresiones focalizadas y build. En navegador se validaron las dos vistas, comprobantes, revisión y ancho móvil; el control de expansión se conserva. |
| E2.6 Tablas en overlays y previews · local | BulkUploadDialog, ReceiptDialog, SimulationDialog y StationNetworkDialog; el preview de DynamicReportBuilder permanece como cabecera vacía con EmptyState | Table solo en las cuatro superficies que presentan filas. Preservar volumen, edición de estaciones, selección sobre todo el conjunto filtrado, importación CSV, semántica del recibo y resumen de unidades de la simulación. No imponer el layout de una página completa. | 3 pruebas SSR de recibo, simulación y selector de estaciones; build y regresiones focalizadas. En navegador se verificaron selección/filtrado/paginación, CSV válido e inválido, revisión del comprobante y muestra/resumen de simulación; se conserva la acción de descarga. |

Los lotes agrupan casos de revisión; no implican que todas sus superficies sean
equivalentes ni añaden instancias al conteo de 23.

**Decisión Table frente a DataTable**

- Table cuando el producto ya coordina estado y solo necesita la tabla.
- DataTable cuando su búsqueda/orden/página/selección cubren el contrato medido
  sin duplicar filtros ni cambiar el alcance de las operaciones.
- Configurar funciones explícitamente; no heredar orden/paginación nuevos por
  defecto. El comportamiento remoto, si aparece, requiere evaluación propia.
- Extraer una composición compartida solo tras demostrar equivalencia en dos
  usos. Mantener lógica financiera, de permisos y de operación fuera del DS.
- En E2.2 se eligió Table sobre DataTable: los tres listados ya coordinan filtros
  facetados, búsqueda contextual, PAGE_SIZE=25 y navegación; reutilizar el
  paginador de DataTable duplicaría o alteraría ese contrato. El `rowKey`
  conserva la identidad; `useSearchDestination` asigna identidad DOM a las filas
  visibles para preservar foco y navegación desde búsqueda global.
- E2.2: 3 pruebas SSR cubren estructura, orden inicial, datos y ausencia de
  sorting/selección nuevos. Build y regresiones de Facturas/Administración
  pasan. En navegador, las tres rutas se probaron con filtros desde páginas
  posteriores, vacío y última página; se probó además la acción exacta de
  expediente de conductor y bloqueo/desbloqueo de un medio concreto. A 320,
  390, 768 y 1280 px la tabla mantiene scroll local sin overflow global, y
  Flow responde a `default` (16/14/12px texto/celdaY/headerY), `compact`
  (14/10/8px) y `comfortable` (18/16/16px). No es una suite E2E persistente.
  La auditoría posterior confirma que esto verifica la tabla Flow, no la
  cascada visual completa de la familia: `.table-page__card`, `.table-page__main`,
  `.table-page__sub`, `.table-page__warn` y la banda nueva de etiquetas API aún
  usan roles/medidas locales; además, los datos numéricos/placas/IDs no marcan
  `mono` para activar `--type-data` donde corresponde. Cerrar estos puntos y
  validar densidad/lectura antes de declarar terminada E2.2.

## E3 — Completar barras y composición del dashboard

**Estado:** composición y consulta exacta sin puntero adoptadas y verificadas
localmente. Roles de series y `marks="fill"` ya integrados.
**Dependencia:** E0 no bloquea la investigación; cierre visual después de E1
para reutilizar sus criterios de roles y densidad.
**Archivos:** `src/components/charts/BarChart.tsx`,
`src/components/dashboard/ChartCard.tsx`,
`src/data/dashboardCharts.ts` y las pruebas existentes.

1. Clasificar la leyenda como principal o metadato y contrastar la variante
   existente `md`/`sm`; no crear una tipografía alternativa.
2. Completar roles de superficie, borde, espaciado y tipografía de ChartCard
   sin perder encabezado, filtros, tooltip, menú o callbacks.
3. Conservar datasets, unidades, rangos y distinción entre serie principal y
   contexto; comprobar que lienzo y leyenda mantienen colores y tramas.
4. Verificar valores exactos sin depender solo del puntero. Cuando el primitive
   no los exponga, evaluar una alternativa DOM de datos en producto, sin crear
   otro cálculo divergente.
5. Revisar filtros de dashboard, vacío de negocio, resize y movimiento reducido.
   Comprobar tema en aislamiento no equivale a habilitar modo oscuro en la app.

**Cierre de consulta exacta (21-oct-2026):** las cuatro barras incorporan
«Ver datos de la gráfica». ChartDataTable extrae la composición ya usada por
las líneas (Accordion + Table con caption, surface none y sortable false).
Cada fila lee directamente el mismo array del chart, sin redondear, ordenar,
convertir unidades ni recalcular. Las cabeceras de categoría identifican
Vehículo, Rama del organigrama, Periodo o Distancia de desvío. Se conservan
las leyendas multiserie y no se agrega una a la serie única del Optimizador.

Validación del cierre: 11 pruebas relacionadas (barras, líneas y composición),
build y diff-check. En navegador, coincidencia exacta de las tres tablas de
Resumen y de ahorro bruto/neto del Optimizador con sus opciones ECharts;
apertura/cierre por teclado. La tabla de rendimiento se verificó en las tres
densidades y 320/390/768/1280: scroll local cuando hace falta, sin overflow de
página. No se modificó el DS ni el artefacto en este cierre.

**Salida:** las tres tarjetas de barras usan los roles del diccionario también
en su composición; pruebas de datos/leyenda y build pasan.

## E4 — Líneas: cerrar equivalencias antes de sustituir

**Estado:** implementada y verificada localmente mediante un artefacto Flow
reproducible; fuente y contrato aún sin publicar.
**Dependencias:** E3 para composición; vía DS solo si el caso la demuestra.
**Superficies:** consumo mensual de 12 meses, costo por kilómetro y evolución
diaria del Optimizador.

1. Se reprodujeron con pruebas las brechas de tipo/tooltip de `null`, formatos
   separados, swatch sólido y actualización de densidad/etiquetas/rangos.
2. El canon local declara `ChartSeries.values: Array<number | null>`,
   `ChartSeries.gapLabel`, `FlowChart.gapLabel` y `axisFormat`. La implementación
   conserva `format` como default del eje para consumidores anteriores.
3. FlowChart no conecta huecos, mantiene visibles observaciones aisladas, usa
   vacío para series solo de huecos y reinicializa el canvas al volver a datos.
   Relee tokens de sus ancestros al cambiar modo/densidad.
4. Las tres líneas consumen FlowChart con `smooth={false}`, leyenda `md` con
   `marks="line"` y la misma entrada de datos, unidades y límites. Se retiran
   SVG, tooltip, leyenda y CSS locales. No se cambia la rejilla ni la paleta.
5. Accordion + Table permiten consultar cada observación sin puntero, incluida
   la causa de un hueco. `sortable={false}` conserva el orden temporal. El
   Skeleton comparte proporción 760/260 y mínimo de 240 px con el plot para
   mantener legibles los ejes en móvil.

Validación: 82 pruebas relacionadas de Flow; typecheck de librería y banco;
433 pruebas del producto y build. En navegador: 24 combinaciones de dos vistas,
tres densidades y cuatro anchos, lectura de tamaños reales 14/16/18 en canvas,
tooltip de hueco contenido a 320 × 568 en comfortable, apertura por teclado y
equivalencia tabla/datos, filtros y métrica/bruto-neto.

Límite de integración: `check:inventory` pasa con el canon local, pero
`check:api-drift` informa nueve divergencias previas de FilterSet/PaymentCard.
No hay hallazgos nuevos de charts ni se presenta esto como una release
certificada. No se modifica el bloqueo previo de publicación relacionado con
Flutter.

**Salida:** huecos siguen siendo huecos, cero sigue siendo cero, tooltip y eje
mantienen su significado y hay acceso a valores exactos. “Dos líneas migradas”
no es un criterio de éxito si se altera cualquiera de esos contratos.

## E5 — Cobertura residual de formularios y acciones

**Estado:** evaluaciones parciales en el inventario; pilotos locales de `Radio`
en `StationNetworkDialog` y `Select` en `LoadDetail`, `GasOptimizerPage`,
`StationExceptionDialog`, `StationNetworkDialog`, `InviteUserDialog` y
`UnitSelector`.
**Dependencia:** no depende de completar todas las tablas; ejecutar como lotes
separados después de cerrar el piloto, sin mezclarlo con E1.

- Clasificar los controles nativos restantes por acción, navegación, selección
  o entrada; repetir el conteo antes de implementar porque el inventario cambia.
- Migrar primero los casos cubiertos por Button/IconButton, Radio/Chip,
  Input/Field y componentes existentes.
- `StationNetworkDialog` ya usa `Radio` de Flow para el modo permitido/bloqueado;
  se conserva el grupo exclusivo y el modo inicial. La prueba SSR comprueba una
  sola opción marcada; en navegador se verificó el cambio a «No permitidas».
  No quedan radios nativos.
- `LoadDetail` usa `Select` de Flow para filtrar las cargas por vista; conserva
  las cuatro opciones, sus conteos dinámicos y el nombre accesible del control.
  En navegador se verificó cambiar a «No compensan el desvío» y filtrar las
  filas. El inventario baja de 29 a 28 `<select>` nativos.
- `GasOptimizerPage` usa `Select` para periodo, combustible, tipo de vehículo,
  zona y métrica de la gráfica diaria; conserva los filtros, opciones, etiqueta
  accesible y recálculo del dashboard. En navegador se comprobó que cambiar a
  «Premium» actualiza los indicadores y que elegir «Gasto» actualiza la serie
  diaria. El inventario baja de 28 a 23 `<select>` nativos en 9 módulos.
- `StationExceptionDialog` usa `Select` de Flow para la vigencia de la
  excepción. Se conservan el valor inicial, el cálculo y el texto de vencimiento
  (asociado como ayuda del campo); el cambio sigue requiriendo confirmación
  explícita. En navegador se verificó que «7 días» actualiza la fecha y que
  confirmar permanece deshabilitado hasta marcar la casilla. El inventario baja
  de 23 a 22 `<select>` nativos.
- Los filtros de estado, ciudad y marca, y el tamaño de página de
  `StationNetworkDialog` usan `Select` de Flow. Se conserva el reinicio de página,
  el reinicio de ciudad al cambiar estado y los tamaños permitidos 10/25/50.
  En navegador, cambiar a Monterrey actualizó las filas; cambiar después a
  Jalisco limpió la ciudad y reinició el resultado. Cambiar el tamaño a 25
  mostró `1–25 de 47`. El inventario baja de 22 a 18 `<select>` nativos en 7
  módulos.
- `InviteUserDialog` usa `Select` de Flow para el alcance organizacional.
  Mantiene el valor inicial «Toda la empresa», la jerarquía visual de opciones
  por nivel y la conversión de la selección vacía a `scopeNodeId: null`. El
  inventario baja de 18 a 17 `<select>` nativos en 6 módulos.
- `UnitSelector` usa `Select` de Flow para el nodo del organigrama. Conserva el
  prompt inicial, la jerarquía visual y la selección de unidades bajo el nodo;
  el inventario baja de 17 a 16 `<select>` nativos en 5 módulos.
- `StationNetworksPage` usa `Select` de Flow para elegir la columna del filtro
  de redes. Conserva las siete opciones, la etiqueta accesible y la relación
  con el filtro de texto; el inventario baja de 16 a 15 `<select>` nativos y
  de 5 a 4 módulos.
- `GlobalFilterBar` usa `Select` de Flow en sus nueve dimensiones, incluidas
  las opciones organizacionales jerárquicas, los recuentos dinámicos de unidad
  y conductor, y «Sin conductor asignado». Conserva valores «todos», opciones
  dependientes y etiquetas accesibles; el inventario baja de 15 a 6 `<select>`
  nativos y de 4 a 3 módulos.
- `ConsolidatedReportPanel` usa `Select` de Flow para tipo, alcance, entidad y
  atajo de periodo. Conserva las opciones limitadas por sesión, el reinicio de
  entidad al cambiar alcance, el placeholder y el bloqueo durante la generación;
  las fechas nativas mantienen sus límites `min`/`max`. El inventario baja de
  6 a 2 `<select>` nativos y de 3 a 2 módulos.
- `PolicyDialog` usa `Select` de Flow para asociar una red de estaciones a una
  política. Conserva la etiqueta, el placeholder, los nombres/modos/recuentos
  de redes y solo acepta IDs configurados; al desactivar la restricción sigue
  guardándose `null`. El inventario baja de 2 a 1 `<select>` nativo y de 2 a 1
  módulos.
- Se conserva el selector nativo de `DevMode`: divide las opciones con grupos
  visibles «Usuarios del portal» e «Internos de Edenred · solo Dev». Aunque el
  tipo `SelectOption` beta.10 declara `group`, la implementación publicada no
  consume esa propiedad; migrarlo hoy quitaría una distinción funcional. Queda
  como excepción comprobable hasta que Flow exponga agrupación real.
- La búsqueda de redes en `StationNetworksPage` ahora usa `Input` de Flow con
  icono, nombre accesible ligado a la columna activa y reinicio de página. El
  inventario de entradas nativas baja de 47 a 46 sitios y de 14 a 13 módulos;
  permanecen dos búsquedas nativas entre las que aún requieren revisión.
- Las búsquedas de unidades en `UnitSelector` y de estaciones en
  `StationNetworkDialog` ahora usan `Input` de Flow. Conservan sus nombres
  accesibles, placeholders y reinicio de página donde aplica; el inventario
  baja a 44 entradas nativas en 13 módulos, sin búsquedas nativas pendientes.
- El nombre de política de `PolicyDialog` ahora usa `Input` de Flow; el estilo
  local sigue limitado a los controles nativos del formulario. El inventario
  baja a 43 entradas, con 3 campos de texto nativos restantes por revisar.
- Los dos campos horarios de `ScheduleEditor` ahora usan `Input` de Flow con
  `type="time"`. Se conservan los nombres accesibles, los valores controlados y
  la validación de rangos; el inventario baja a 41 entradas nativas en 12
  módulos y ya no quedan campos horarios nativos.
- Las fechas «Desde» y «Hasta» de `ConsolidatedReportPanel` ahora usan
  `DatePicker` de Flow con los límites de cobertura, estado controlado y bloqueo
  durante la generación. El inventario baja a 39 entradas nativas en 11 módulos;
  ya no quedan campos `type="date"` nativos.
- Las tres casillas de `StationNetworkDialog` ahora usan `Checkbox` de Flow:
  selección de filas, selección parcial de estaciones filtradas y filtro «Solo
  seleccionadas». Se conservan etiquetas accesibles y estados checked,
  indeterminate y disabled; el inventario baja a 36 inputs nativos y 22
  casillas nativas en 11 módulos.
- Preservar `min`, `max`, `step`, atributos ARIA, autorrelleno y validación.
  Reenvío en runtime no resuelve una API TypeScript incompatible.
- Para atributos necesarios no publicados, documentar la brecha y evaluar su
  aporte al contrato genérico; no usar casts ni quitar restricciones.
- Probar envío/cancelación, requerido, errores, límites y teclado. No retomar
  Tabs/Accordion ya completados salvo regresión del lote.

**Salida:** cada control residual queda migrado o con una excepción comprobable;
no una lista indefinida de “pendientes” por diferencias de apariencia.

## E6 — Patterns específicos y shell de aplicación

**Estado:** candidatos, no migraciones autorizadas por equivalencia.
**Dependencia:** contrato por superficie; puede avanzar sin E4.

| Superficie | Comparación requerida | Qué impide una sustitución automática |
|---|---|---|
| TED | ChatComposer/ChatThread/Conversation frente a envío, sugerencias, contenido rico, pensamiento y scroll actuales. | Adoptar ChatMessage no demuestra equivalencia del flujo completo. |
| KPIs | StatTile y roles de cifras frente a SummaryCard: unidad, periodo, comparación, delta y ausencia de datos. | Un KPI parecido no garantiza la misma valoración favorable/desfavorable. |
| TopBar y navegación | Búsqueda global, rutas, menú, pin, estado activo y perfil frente a piezas Flow. | Input no sustituye descubrimiento/navegación; Sidebar no se adopta solo por dibujar un menú. |
| Diálogos | Composición Dialog/Drawer frente al Modal ya basado en OverlayShell. | No duplicar una migración de foco/portal ya resuelta ni cambiar modal por sheet por estética. |

Cada adopción exige su propio fixture de negocio, prueba de interacción y
retirada de CSS reemplazado. Si el contrato no coincide, se conserva la
composición local consumiendo las capas inferiores.

## Vía DS — Solo aportes demostrados

Es una vía condicional, no una fase obligatoria ni un permiso para actualizar
Flow durante cada lote.

| Candidato | Evidencia que falta para autorizar un cambio |
|---|---|
| Contexto de densidad y portal | Reproducción aislada del ámbito prometido, contextos anidados y comparación entre paquete y fuente; definir si el contrato ya exige preservarlo. |
| Huecos y formatos de líneas | Fixtures de negocio, capacidad actual medida y diseño de API reutilizable sin degradar otras visualizaciones. |
| Atributos nativos/ARIA necesarios | Usos concretos, alternativa existente descartada y prueba de tipos/interacción que falle con el contrato actual. |
| Diferencias Input/Select | Demostrar promesa incumplida o fallo ergonómico; una altura distinta no basta. |

Proceso: caso de producto → reproducción mínima → clasificación → propuesta
acotada → prueba de regresión → cambio en la capa dueña, si corresponde →
validación de Flow → artefacto reproducible → regresión del producto.
El contrato se cambia solo cuando sea necesario, no para acomodar un fix.
Sin publicación, push o actualización de dependencias implícitos.

## Matriz de cierre de cada entrega

- **Negocio:** fixtures antes/después; sin pérdida de campos, restricciones,
  estados, permisos, cálculo ni acciones.
- **Cascada:** rol existente por uso; sin hex, tamaños/pesos locales añadidos,
  tokens inventados ni selectores sobre hashes privados de Flow.
- **Interacción:** teclado, foco/retorno, selección, filtros y vacíos pertinentes.
- **Geometría:** base/compact/comfortable y 390/768/1280 px en las superficies
  afectadas; medir controles y accesorios, no inferir dimensiones desde CSS.
- **Regresión:** comando focalizado con Vitest, después build para TS y bundle
  cuando cambie código. Suite completa al integrar lotes transversales o ante
  indicios de efectos compartidos, no por cada ajuste documental.
- **Trazabilidad:** archivos cambiados, resultado de validación, limitaciones,
  excepción local o caso DS y siguiente lote habilitado.

No hay un script lint en el producto. Usar los comandos existentes y ejecutar
npm desde la raíz del proyecto después de `source ~/.nvm/nvm.sh`.
No silenciar los warnings SSR de Flow ni declarar corregido el overflow global
sin medirlo.

## Secuencia de ejecución

```text
E0 base del piloto
  └─ E1 Facturas: contenido + superficies + composición + validación
       ├─ E2.1 administración → E2.2 paginados → E2.3 dominio
       │    → E2.4 asignación/optimizador → E2.5 historial → E2.6 overlays
       ├─ E3 barras/dashboard → E4 líneas si existe equivalencia
       └─ E5 controles residuales → E6 patterns/shell por caso

Vía DS: se abre solo desde un bloqueo demostrado; no detiene las otras ramas.
```

La bifurcación indica independencia de entregas, no una obligación de trabajo
simultáneo. Prioridad inmediata: revisar el resultado E0/E1 antes de ampliar
el alcance a la siguiente familia.
