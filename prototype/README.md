# Ticket Car · Edenred One

Ticket Car fuel-management mockup built with React + Vite + TypeScript, styled after Edenred One (Flow design system: energy palette, Ubuntu + Edenred typefaces, white shell on a light-blue canvas).
Charts are hand-rolled SVG components, with no charting dependency. The Flow packages are not a dependency: their values are copied into `src/index.css` tokens.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run typecheck
```

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
| `src/components/ui/` | `Modal`, `EmptyState` |
| `src/components/reports/` | `DynamicReportBuilder`: report type, basic and advanced filters, grouper and column picker |
| `src/components/charts/` | `LineChart`, `BarChart`, `EmptyChart` and SVG geometry helpers |
| `src/data/` | Mock data for metrics, menu groups (Resumen, then Combustible · Peaje · Mantenimiento · Inteligencia · Flota · Empresa), series, funding rules, vehicles, limit policies, fleet master data and payment media (`fleet.ts`), service orders (`maintenance.ts`), company catalogs, invoices and users (`company.ts`) and intelligence modules |
| `public/` | Edenred webfonts and the Edenred One logo |
| `docs/` | Functional specifications of the pages |

Replace the contents of `src/data/` with API calls when the back end is available.
