# Ticket Car · Edenred One

Ticket Car fuel-management mockup built with React + Vite + TypeScript, styled after Edenred One (Flow design system: energy palette, Ubuntu + Edenred typefaces, white shell on a light-blue canvas).
Charts are hand-rolled SVG components, with no charting dependency. The Flow packages are not a dependency: their values are copied into `src/index.css` tokens.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run typecheck
npm test           # Vitest, one pass
npm run test:watch
```

## Data shared with eOne

Fleet data comes from the eOne Fleet Management prototype, ported into `src/domain/` (phase 0 of the eOne integration). The client account is **Grupo Alimentario Norte** (512 units, 563 drivers, five-level org chart). Vehicles, drivers and payment media are derived from its padrón, so every page talks about the same units. The hand-written Ticket Car scenarios in `src/data/` (attention items, limit assignments, service orders, toll tags, insights) point at padrón ids such as `ECO-3004`, and `src/data/__tests__/client.test.ts` checks that they exist.

- `src/domain/` keeps eOne's code style (no semicolons) and its folder names, so later phases can bring more eOne modules without rewriting their imports. Its tests come from eOne without the RBAC cases, which have no counterpart here yet.
- Business date: `src/domain/demo/clock.ts` pins "today" to 16 Oct 2026, so the demo shows the same data every day. The mocks are dated mid-October 2026.
- Roles and scope: ADR-TCP-001 (`docs/decisions/ADR-TCP-001_roles_portal_TC.md`, PROPOSED) maps the portal roles admin, flota, finanzas and consulta onto the client roles of eOne's ADR-001 (`src/domain/rbac/`). The menu comes from that matrix. Each user is limited to an org chart node, and the data modules apply that scope through live `let` bindings that `src/data/session.ts` recomputes. Dev mode can show the portal as another user, including Edenred's internal roles, always on the active account.
- Global filters (period, org chart, product, group, cost center, route, fuel, driving behaviour, unit, driver) live in `components/filters/` and persist in `sessionStorage`. They drive the Resumen indicators and its three consumption charts (`src/data/dashboardCharts.ts`). Recargas y recortes comes from Saldos and stays static.
- Reportes · Reporte consolidado is eOne's US-024 (`src/domain/consolidated-report/`): Autoconsumo and TicketCar+ in one document, CSV/XLSX/PDF export for roles with `consumos.export`, always within the session scope. Its sources cover Oct 2025–Sep 2026 and are a separate synthetic dataset from the Resumen activity, as in eOne.
- Inteligencia · Optimizador is eOne's load optimizer (`src/domain/optimizer/`, Leaflet map loaded on demand) plus the view by region of the previous Ticket Car screen. It is analytical only. «Aplicar en Límites» opens Límites with the unit and station preloaded and changes nothing until the user confirms. «Enviar al conductor» is manual and per card, logged (`src/data/recommendations.ts`) and goes through a simulated channel, marked as a mock in the dev-mode API coverage.

## Structure

| Path | Content |
| --- | --- |
| `src/App.tsx` | Application shell and routing: top bar, side menu, page header, floating controls |
| `src/pages/intelligence/` | Inteligencia modules: `InsightsPage` (alerts and optimization insights), `GasOptimizerPage`, `TedPage` (assistant chat) |
| `src/pages/PaymentMediaPage.tsx`, `VehiclesPage.tsx`, `DriversPage.tsx` | Catalogue pages (Medios de pago, Vehículos, Conductores) sharing `TablePage.css` |
| `src/pages/FuelDashboardPage.tsx` | Dashboard layout: four summary cards and four chart cards |
| `src/pages/DispersionPage.tsx` | Funding control tower: next run, exceptions, rules, receipts |
| `src/pages/LimitsPage.tsx` | Limit assignment: fuelling-lock policies per group, per-unit assignment, temporary exceptions |
| `src/pages/ReportsPage.tsx` | Reports: consumption-and-budget and dynamic report views behind one menu entry (empty states until the back end exists) |
| `src/components/layout/` | `TopBar`, `SideMenu`, `PageHeader`, `FloatingControls` |
| `src/components/dashboard/` | `SummaryCard`, `ChartCard` |
| `src/components/dispersion/` | `NextRunCard`, `AttentionList`, `QuickTopUp`, `RulesSection`, `SimulationDialog`, `ReceiptDialog`, `ActivitySection` |
| `src/components/limits/` | `PoliciesSection`, `PolicyDialog`, `AssignmentsTable`, `OverrideDialog` |
| `src/pages/MaintenancePage.tsx` | Mantenimiento · Resumen: search by order or vehicle, create-service-order CTA (`components/maintenance/ServiceOrderDialog`), KPIs, open orders, upcoming preventive services, spend by system |
| `src/components/api/ApiCoverage.tsx`, `src/data/apiCoverage.ts` | Coverage of the headless fuel API (TicketCarServices SOAP v1.8, documented in `src/assets/ZERO_Servicios_Externos_API.md`) on every Combustible page, on Flota (Vehículos, Conductores) and on Empresa · Parámetros: a banner with available / partial / unavailable counts and detail, and inline tags (switchable) next to each feature |
| `src/components/dev/DevMode.tsx`, `src/pages/dev/ApiImprovementsPage.tsx`, `src/data/apiImprovements.ts` | Dev mode (top bar "Dev" switch, saved in localStorage): adds the Dev menu section with the API ZERO improvement backlog (priority, type, suggested contract, coverage gaps each one unlocks, copy as Markdown) and gates the API coverage banners and tags |
| `src/pages/company/` | Empresa: `ParametersPage` (modular catalogs — billing groups, regions, cost centers, branches and custom catalogs whose fields can reference other catalogs; forms render from field definitions in `components/company/ParameterRecordDialog`), `InvoicesPage` (CFDI list with PDF/XML downloads) and `UsersPage` (roles, region scope, invitations) |
| `src/pages/toll/` | Peaje: `TollBalancesPage` (bolsa, saldo por TAG, recarga automática), `TollRulesPage` (políticas de peaje), `TollMediaPage` (TAGs) |
| `src/components/toll/` | `TollAmountDialog`, `TollPolicyDialog`, `TollAssignDialog` |
| `src/components/ui/` | `Modal`, `EmptyState`, `Pagination` (with `usePagination`, 25 rows per page) |
| `src/components/filters/` | `GlobalFiltersProvider` / `useGlobalFilters` (context over `domain/filters`) and `GlobalFilterBar`, shown in the page header of pages that consume the filters |
| `src/domain/` | Ported from eOne: fleet and fuelling generator (`data/fleet-activity.ts`), accounts, fleet alerts, metrics (`dashboard/`), org chart (`org/`), global filters (`filters/`), business clock (`demo/`) and browser storage helper |
| `src/data/client.ts` | Bridge to the domain: client account, padrón, org chart, group labels and the cached activity snapshot |
| `src/data/summary.ts` | Resumen indicators for the filtered period against the previous one |
| `src/components/reports/` | `DynamicReportBuilder`: report type, basic and advanced filters, grouper and column picker |
| `src/components/charts/` | `LineChart`, `BarChart`, `EmptyChart` and SVG geometry helpers |
| `src/data/` | Mock data for menu groups (Resumen, then Combustible · Peaje · Mantenimiento · Inteligencia · Flota · Empresa), series, funding rules, vehicles, limit policies, fleet master data and payment media (`fleet.ts`), service orders (`maintenance.ts`), company catalogs, invoices and users (`company.ts`) and intelligence modules |
| `public/` | Edenred webfonts and the Edenred One logo |
| `docs/` | Functional specifications of the pages |

Replace the contents of `src/data/` with API calls when the back end is available.
