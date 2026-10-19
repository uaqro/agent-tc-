# Functional Specification — Combustible Dashboard

Product: Ticket Car — Fuel Management
Page: Home page (fuel dashboard)
Version: 2.0 (rebuild of the legacy page)
Language of the user interface: Spanish (Mexico)

## 1. Purpose

The page shows the fuel dashboard. The dashboard gives the fleet manager the key figures for
fuel volume, distance and cost. From this page the user opens the detailed fuel reports.

## 2. Scope

This document describes the behaviour of the dashboard page only. Report pages that open from
the side menu are out of scope.

## 3. Page layout

```
+--------------------------------------------------------------+
| Top bar: logo | search ............ help | alerts | profile   |
+----------------+---------------------------------------------+
| Side menu      | Page header: menu | breadcrumb               |
|                |              Resumen (title) + subtitle      |
|                | Main area: 4 summary cards                   |
| - search box   |            4 chart cards (2 x 2)             |
| - pin button   |                                     [Opiniones]
| - groups       |                                    (chat) O  |
+----------------+---------------------------------------------+
```

## 4. Top bar

| Element | Behaviour |
| --- | --- |
| Edenred One logo + `Ticket Car` label | Moves the focus to the main content. |
| Search box | Starts a global search for units, cards and drivers when the user presses Enter. |
| Help icon | Opens the help centre. |
| Alerts icon | Shows the number of critical alerts. A red dot marks unread alerts. |
| User button | Shows the user initials and name, and opens the user menu. |

Each icon has an accessible name and a tooltip.

## 5. Page header

| Element | Behaviour |
| --- | --- |
| Menu icon | Opens or closes the side menu. The button reports its state with `aria-expanded`. |
| Back arrow | Shown on every page except Resumen. Returns to Resumen. |
| Breadcrumb | `Ticket Car › <menu section> › <page>`. |
| Title and subtitle | Page name in the Edenred typeface and a one-line description. On this page: `Resumen`. |

## 6. Side menu

- The search box filters the menu items. The filter is not case sensitive and matches any part
  of the label. If no item matches, the menu shows the message `Sin resultados para “…”`.
- The pin button keeps the menu open. When the menu is not pinned, the menu closes after the
  user selects an item.
- `Resumen` sits above the groups. Every item has an icon. The groups are:

| Group | Items |
| --- | --- |
| COMBUSTIBLE | Saldos · Reglas y límites · Medios de pago |
| PEAJE | Saldos · Reglas y límites · Medios de pago |
| MANTENIMIENTO | Resumen |
| INTELIGENCIA | Reportes · Insights & Alertas · Optimizador de gasolineras · TED |
| FLOTA | Vehículos · Conductores |
| EMPRESA | Parámetros · Facturas · Usuarios |

- The selected item stays highlighted and carries `aria-current="page"`.
- On screens narrower than 900 px the open menu floats above the main area.

## 7. Summary cards

Four cards show the key figures. Each card shows the value of the current month, the value of
the last month, and the variation in percent.

| Card | Colour | Metric | Unit |
| --- | --- | --- | --- |
| Consumo en volumen | Blue | Fuel volume used | L |
| Promedio de consumo | Orange | Average fuel use | L |
| Total kilómetros recorridos | Purple | Total distance | km |
| Promedio kilómetros | Green | Average distance per vehicle | km |

The variation uses the formula $\Delta = \dfrac{\text{current} - \text{previous}}{\text{previous}} \times 100$.
The arrow shows the direction. The badge is dark when the direction is not favourable for the
metric (`higherIsBetter` controls this rule).

## 8. Chart cards

Every chart card has a title, an information icon with a tooltip, and a three-dot menu. The
three-dot menu contains: `Actualizar datos`, `Descargar imagen`, `Exportar a Excel` and
`Ver reporte completo`. The menu closes with a click outside the card or with the Escape key.

| Chart | Type | Data |
| --- | --- | --- |
| Rendimiento por vehículo (mes actual) | Empty state | No data for the current month. |
| Costo por kilómetro | Line chart | Vehicle `EDENRED MEXICO1`, value scale 0 to 0.75, time scale January 2026 to July 2026. |
| Consumo organizacional (últimos 30 días) | Empty state | No data. The caption states that the bottom scale shows the number of transactions. |
| Recargas y Recortes | Grouped bar chart | Two series: `Recargas` and `Recortes`, value scale 75 to 175. |

Charts with data show a legend and a tooltip. The line chart follows the pointer and marks the
nearest category. The bar chart highlights the hovered category and dims the other bars.

## 9. Side and floating controls

| Control | Position | Behaviour |
| --- | --- | --- |
| `Opiniones` tab | Vertical, right edge, centred | Opens the feedback form. |
| Chat button | Round, red, bottom right | Opens TED, the fleet assistant. Hidden on the TED page. |

## 10. Feedback to the user

Every action shows a short message in the bottom left corner. The message region uses
`role="status"` and `aria-live="polite"`, and the message disappears after 3.2 seconds.

## 11. Non functional requirements

- Keyboard: all controls are reachable with the Tab key and show a visible focus ring.
- Motion: animations stop when the system requests reduced motion.
- Responsive: the summary cards change to two columns below 1200 px and to one column below
  640 px. The chart grid changes to one column below 900 px.
- Data source: all figures come from `src/data/dashboard.ts`. Connect this module to the API
  without a change in the components.
