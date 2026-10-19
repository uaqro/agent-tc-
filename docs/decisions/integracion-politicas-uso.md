# Integración con la rama de Políticas de uso

| Campo | Valor |
| --- | --- |
| Estado | **Decidido**: pendiente de ejecutar |
| Fecha | 2026-10-19 |
| Ramas | `feature/cambios-prototipo` (esta, en `d488817` al escribirlo) y `origin/feat/politicas-uso-redes-estaciones` (Damian Vera, `36ca35f`). Las dos salen de `main` en `b27d056` |
| Relacionado con | ADR-TCP-001 (roles del portal), directorio de estaciones compartido (`25eeab1`), fecha de demo (`7ce8077`) |

El análisis se hizo en solo lectura: `git diff` y `git log` contra `main` y contra esta rama, y el merge se simuló con `git merge-tree --write-tree`, sin aplicar nada. `origin/feat/migracion-flow` no entra en el plan: apunta a `b27d056`, igual que `main`, y no tiene commits ni archivos propios.

## 1. Qué trae la rama de Damian

Un commit (`36ca35f`, «feat: actualizar politicas de uso y redes de estaciones») que cambia 22 archivos (+1.397 / −367 líneas).

- **Políticas de uso.** «Reglas y límites» pasa a llamarse «Políticas de uso». `LimitPolicy` incorpora `settings?: PolicySettings` con:
  - controles de transacción: placa, conductor y NIP, kilometraje, horómetro y rendimiento;
  - límites por periodo: monto, volumen y número de transacciones;
  - horarios por bloques de días;
  - mínimos y máximos por carga;
  - opciones de experiencia al transaccionar.

  `policySettings()` traduce las políticas antiguas al formato nuevo.
- **Redes de estaciones.** Desaparece `StationSubnet` y entra `StationNetwork`:
  - cada red es una lista de estaciones permitidas o bloqueadas (`mode: 'allow' | 'block'`), con autor, fecha y «Notas Vales»;
  - las estaciones salen de un catálogo propio, `networkStations`: 7.500 estaciones sintéticas `ES-00001`… con estado, ciudad y marca, en 10 estados;
  - página nueva «Red de estaciones personalizadas», ruta `station-networks`, en el menú como `red-estaciones`.
- **Estado persistido.** `FuelPolicyContext` envuelve toda la app y guarda en `localStorage` (`tc-plus-fuel-policies-v1`) las políticas, las asignaciones y las redes.

## 2. Conflictos textuales

Simulación de `git merge-tree --write-tree HEAD origin/feat/politicas-uso-redes-estaciones`: 11 archivos tocados por las dos ramas, 4 con conflicto.

| Archivo | Choque |
| --- | --- |
| `src/App.tsx` | Nuestra ruta `limits` recibe `stationRequest` del optimizador; la suya añade la ruta `station-networks`. |
| `src/pages/LimitsPage.tsx` (2 bloques) | Nuestros imports (`StationExceptionDialog`, `DevNote`, `autoconsumoUnits`) y el estado local con `seedPolicies` y `seedAssignments`, contra su `useFuelPolicies()`. |
| `src/data/limits.ts` | Imports: los nuestros (`onSessionChange`, `unitInScope`, `fleetGroups`, el TODO de Autoconsumo) contra los suyos (`stationNetworks`). |
| `src/components/limits/PolicyDialog.css` | Estilos añadidos al final por las dos ramas. |

Se fusionan solos: `package-lock.json`, `AssignmentsTable.tsx`, `apiCoverage.ts`, `dashboard.ts`, `intelligence.ts`, `src/types.ts` y `src/types/limits.ts`.

## 3. Conflictos de modelo (git no los marca)

1. **Se pierde el alcance de sesión en Límites.** `FuelPolicyContext` toma las asignaciones del módulo una sola vez y las persiste en `localStorage`. Así salta el filtrado por nodo del organigrama de ADR-TCP-001, que esta rama recalcula en `onSessionChange`: un usuario acotado a una división vería las asignaciones de toda la cuenta.
2. **Los dos directorios de estaciones no son compatibles.**
   - El de esta rama (`src/domain/stations/directory.ts`): unas 120 estaciones `EST-MTY-001`… con coordenadas y precio de contrato diario, en Monterrey, Saltillo, Hermosillo, Culiacán y Guadalajara, más las plantas `AUTO-*` de Autoconsumo.
   - El de Damian: `ES-00001`… con estado, ciudad y marca, sin coordenadas ni precios, y sin Sonora, Sinaloa ni Coahuila.
   - Consecuencia: ninguna estación que recomienda el optimizador existe en su catálogo, así que no puede formar parte de una red.
3. **La excepción por estación encaja solo a medias.** «Aplicar en Límites» compila contra su modelo, porque `stationSubnetId` y `stationsLabel()` siguen existiendo. Pero:
   - guarda la estación por nombre, no por id, y no se puede cruzar con las redes;
   - el diálogo da por hecho una red de permitidas. Con una red de bloqueadas, la excepción solo hace falta si la estación recomendada está bloqueada; hoy se ofrecería siempre.
4. **Permisos (ADR-TCP-001).** En `ROUTE_CAPABILITY` cada ruta tiene que tener su capacidad: tras el merge, `station-networks` no la tiene y el typecheck falla. Además, `StationNetworksPage` muestra «Nueva red» y la acción de cancelar a cualquier rol, sin modo de solo lectura.
5. **Fecha de demo.** `StationNetworkDialog.tsx` usa `new Date()` para la fecha de cambio de la red. `periodEnd` y `overrideUntil` también vuelven a la fecha del equipo en su rama, aunque el merge conservaría nuestra versión porque él no tocó esas líneas.
6. **Datos guardados antiguos.** `loadState` valida la forma de los datos, pero no que los vehículos y grupos existan. Una sesión guardada con ids de `main` (`v-1`, `g-norte`) se cargaría con nuestro padrón (`ECO-…`, `grp-01`) sin avisar.
7. **Nombres.** «Reglas y límites» pasa a «Políticas de uso» en el menú y en los textos. La capacidad `tc.limites` («Combustible · Reglas y límites»), la ADR y los tests de esta rama siguen con el nombre antiguo.

## 4. Decisiones

### 4.1 Directorio de estaciones: manda el catálogo de Damian

- El catálogo `ES-xxxxx` es el único directorio de estaciones de red.
- Se amplía con **coordenadas y precio de contrato**, como campos opcionales en su modelo, y con cobertura de **Sonora, Sinaloa y Coahuila**.
- El directorio de esta rama, de unas 120 estaciones, desaparece. El optimizador y el generador de cargas pasan a usar los ids `ES-xxxxx`.
- Las plantas `AUTO-*` de Autoconsumo **quedan aparte**: son instalaciones propias del cliente, no estaciones de red, y nunca se recomiendan.
- **Depende de Damian:** que acepte coordenadas y precio en su modelo.

### 4.2 Alcance en `FuelPolicyContext`

- En `localStorage` solo se guardan las **ediciones del usuario, por id**. Las asignaciones base no se persisten.
- Las asignaciones base se calculan a partir de los datos **filtrados por el alcance** de la sesión y se recalculan al cambiar de sesión.
- Al cargar se descarta lo guardado que quede fuera del alcance o que tenga ids inexistentes, con aviso en el modo Dev.
- **A Damian le pedimos** que el contexto reciba las asignaciones base desde fuera, en vez de importarlas del módulo.
- **Test:** un usuario de flota acotado a una división no ve asignaciones de otras divisiones, ni al entrar ni tras recargar.

### 4.3 Excepción por estación

Se guarda el **id de la estación**, no su nombre. Según la red de la política:

| Situación | Resultado |
| --- | --- |
| Red de **permitidas** sin la estación | Excepción para permitirla. |
| Red de **bloqueadas** con la estación bloqueada | Excepción para desbloquearla, con aviso reforzado. |
| La estación ya es válida (sin red, permitida o no bloqueada) | No hay excepción. Se muestra «Ya permitida en Límites». |

Siempre con confirmación explícita en Límites, como hoy: el optimizador no aplica nada.

### 4.4 Página de redes de estaciones

- Va con la capacidad de Políticas de uso: `admin` y `flota` escriben; `finanzas` y `consulta`, solo lectura, sin acciones y con el aviso «Solo lectura».
- La ruta `station-networks` entra en `ROUTE_CAPABILITY`.
- La capacidad, la ADR-TCP-001 y los tests de permisos se renombran a **«Políticas de uso»**.
- La fecha de cambio de la red usa la **fecha de demo** (`businessNow()`), nunca la del equipo.

## 5. Orden

1. **Damian integra su rama** en `main` cuando él decida. Esta rama no la toca ni la mergea.
2. Después, **merge de `main` en `feature/cambios-prototipo`, sin rebase**. Se resuelven los 4 conflictos textuales.
3. En un **commit propio** se aplican 4.2, 4.3 y 4.4, con typecheck, tests y build en verde.
4. **4.1 queda a la espera** de que Damian acepte coordenadas y precio de contrato en su modelo. Hasta entonces, el optimizador y el generador siguen con el directorio actual.

Reglas del repositorio compartido: sin push forzado, sin rebase de commits ya subidos y sin merge a `main` ni PR salvo que se pida.
