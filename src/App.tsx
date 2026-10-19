import { useCallback, useEffect, useState } from 'react';
import { GlobalFilterBar, chipText } from './components/filters/GlobalFilterBar';
import { useGlobalFilters } from './components/filters/GlobalFilters';
import { FloatingControls } from './components/layout/FloatingControls';
import { PageHeader } from './components/layout/PageHeader';
import { SideMenu } from './components/layout/SideMenu';
import { TopBar } from './components/layout/TopBar';
import { devMenuGroup, menuGroups } from './data/dashboard';
import { useSession } from './components/session/Session';
import { ROUTE_CAPABILITY, canAccessRoute } from './data/access';
import { clientAccount, scopeLabel } from './data/client';
import { DEFAULT_PRINCIPAL } from './data/session';
import { canSession, sessionRoleName } from './domain/rbac/portal-roles';
import { DispersionPage } from './pages/DispersionPage';
import { FuelDashboardPage } from './pages/FuelDashboardPage';
import { LimitsPage } from './pages/LimitsPage';
import { DriversPage } from './pages/DriversPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { PaymentMediaPage } from './pages/PaymentMediaPage';
import { ReportsPage } from './pages/ReportsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { TollBalancesPage } from './pages/toll/TollBalancesPage';
import { TollMediaPage } from './pages/toll/TollMediaPage';
import { TollRulesPage } from './pages/toll/TollRulesPage';
import { GasOptimizerPage } from './pages/intelligence/GasOptimizerPage';
import { InsightsPage } from './pages/intelligence/InsightsPage';
import { TedPage } from './pages/intelligence/TedPage';
import { InvoicesPage } from './pages/company/InvoicesPage';
import { ParametersPage } from './pages/company/ParametersPage';
import { UsersPage } from './pages/company/UsersPage';
import { ApiImprovementsPage } from './pages/dev/ApiImprovementsPage';
import type { AppRoute } from './types';
import type { StationRecommendationRequest } from './types/limits';
import { DevModeMenu, useDevMode } from './components/dev/DevMode';
import './App.css';

const TOP_BAR_MESSAGES: Record<string, string> = {
  help: 'Centro de ayuda abierto.',
  notifications: 'Tienes 4 alertas críticas en Insights & Alertas.',
  profile: 'Menú de perfil de usuario abierto.',
};

const ROUTES: Record<AppRoute, { menuItem: string; section: string; title: string; crumb?: string; subtitle: string }> = {
  dashboard: {
    menuItem: 'resumen',
    section: 'Combustible',
    title: 'Resumen',
    subtitle: clientAccount.name,
  },
  dispersion: {
    menuItem: 'saldos',
    section: 'Combustible',
    title: 'Saldos',
    subtitle: 'Fondeo automático, envíos puntuales y recortes de saldo',
  },
  limits: {
    menuItem: 'reglas-limites',
    section: 'Combustible',
    title: 'Reglas y límites',
    subtitle: 'Candados de carga por grupo y por unidad',
  },
  'payment-media': {
    menuItem: 'medios-pago',
    section: 'Combustible',
    title: 'Medios de pago',
    subtitle: 'Tarjetas chip, tags y tarjetas virtuales de la flota',
  },
  'toll-balances': {
    menuItem: 'peaje-saldos',
    section: 'Peaje',
    title: 'Saldos',
    subtitle: 'Bolsa de peaje, saldo por TAG y recarga automática',
  },
  'toll-rules': {
    menuItem: 'peaje-reglas-limites',
    section: 'Peaje',
    title: 'Reglas y límites',
    subtitle: 'Gasto, cruces, autopistas y horarios permitidos por grupo y por TAG',
  },
  'toll-media': {
    menuItem: 'peaje-medios-pago',
    section: 'Peaje',
    title: 'Medios de pago',
    subtitle: 'TAGs de telepeaje y Drive Tag de la flota',
  },
  maintenance: {
    menuItem: 'mantenimiento-resumen',
    section: 'Mantenimiento',
    title: 'Mantenimiento',
    crumb: 'Resumen',
    subtitle: 'Órdenes de servicio, preventivos próximos y gasto en taller',
  },
  reports: {
    menuItem: 'reportes',
    section: 'Inteligencia',
    title: 'Reportes',
    subtitle: 'Consumo, presupuesto y reportes dinámicos de transacciones',
  },
  insights: {
    menuItem: 'insights',
    section: 'Inteligencia',
    title: 'Insights & Alertas',
    subtitle: 'Alertas de consumo y oportunidades de ahorro detectadas por TED',
  },
  optimizer: {
    menuItem: 'optimizador',
    section: 'Inteligencia',
    title: 'Optimizador de gasolineras',
    subtitle: 'Estaciones de la red con mejor precio en la ruta de cada tarjeta',
  },
  ted: {
    menuItem: 'ted',
    section: 'Inteligencia',
    title: 'TED',
    subtitle: 'Asistente de inteligencia para tu flota · Telemetría, eficiencia y decisiones',
  },
  vehicles: {
    menuItem: 'vehiculos',
    section: 'Flota',
    title: 'Vehículos',
    subtitle: 'Unidades, combustible, rendimiento esperado y medio de pago asignado',
  },
  drivers: {
    menuItem: 'conductores',
    section: 'Flota',
    title: 'Conductores',
    subtitle: 'Conductores, unidad asignada, licencias y rendimiento del mes',
  },
  'company-parameters': {
    menuItem: 'empresa-parametros',
    section: 'Empresa',
    title: 'Parámetros',
    subtitle: 'Catálogos de la empresa: grupos de facturación, regiones, centros de costo y los que definas',
  },
  'company-invoices': {
    menuItem: 'empresa-facturas',
    section: 'Empresa',
    title: 'Facturas',
    subtitle: 'CFDI emitidos por producto y grupo de facturación',
  },
  'company-users': {
    menuItem: 'empresa-usuarios',
    section: 'Empresa',
    title: 'Usuarios',
    subtitle: 'Accesos al portal, roles y alcance por nodo del organigrama',
  },
  'dev-api-improvements': {
    menuItem: 'dev-mejoras-api',
    section: 'Dev',
    title: 'Mejoras API ZERO',
    subtitle: 'Lo que la API headless de combustible necesitaría para cubrir todo el mockup',
  },
};

const ROUTE_BY_MENU_ITEM = Object.fromEntries(
  (Object.keys(ROUTES) as AppRoute[]).map((route) => [ROUTES[route].menuItem, route]),
) as Record<string, AppRoute>;

export default function App() {
  const [menuOpen, setMenuOpen] = useState(true);
  const [menuPinned, setMenuPinned] = useState(true);
  const [route, setRoute] = useState<AppRoute>('dashboard');
  const [activeItemId, setActiveItemId] = useState<string | null>(ROUTES.dashboard.menuItem);
  const [notice, setNotice] = useState<string | null>(null);
  // "Aplicar en Límites" from the optimizer: Límites opens with it and applies nothing until confirmed.
  const [stationRequest, setStationRequest] = useState<StationRecommendationRequest | null>(null);
  const { devMode } = useDevMode();
  const { principal, impersonating, signInAs } = useSession();
  const allowed = useCallback((target: AppRoute) => canAccessRoute(principal.role, target), [principal.role]);
  // Pages a role can see but not change render without their actions (ADR-TCP-001).
  const writable = (target: AppRoute) => canSession(principal.role, ROUTE_CAPABILITY[target], 'escribir');
  // ADR-TCP-001: a page the role can't open is not in its menu, and a group left empty disappears.
  const groups = (devMode ? [...menuGroups, devMenuGroup] : menuGroups)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const target = ROUTE_BY_MENU_ITEM[item.id];
        return !target || allowed(target);
      }),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleSelectItem = useCallback(
    (itemId: string) => {
      const label = [...menuGroups, devMenuGroup].flatMap((group) => group.items).find((item) => item.id === itemId)?.label ?? itemId;
      const target = ROUTE_BY_MENU_ITEM[itemId];

      if (target && !allowed(target)) {
        setNotice(`${label}: tu rol no tiene acceso a este módulo.`);
        return;
      }
      setActiveItemId(itemId);
      if (target) {
        setRoute(target);
      } else {
        setNotice(`${label}: módulo en construcción.`);
      }
      if (!menuPinned) setMenuOpen(false);
    },
    [menuPinned, allowed],
  );

  const handleTogglePin = useCallback(() => {
    setMenuPinned((pinned) => {
      if (!pinned) setMenuOpen(true);
      return !pinned;
    });
  }, []);

  const navigate = useCallback(
    (target: AppRoute) => {
      if (!allowed(target)) {
        setNotice(`${ROUTES[target].title}: tu rol no tiene acceso a este módulo.`);
        return;
      }
      setRoute(target);
      setActiveItemId(ROUTES[target].menuItem);
    },
    [allowed],
  );

  // Leaving dev mode while on a dev page goes back home.
  useEffect(() => {
    if (!devMode && route === 'dev-api-improvements') navigate('dashboard');
  }, [devMode, route, navigate]);

  // Viewing the portal as someone else, internal roles included, only exists in dev mode.
  useEffect(() => {
    if (!devMode && impersonating) signInAs(DEFAULT_PRINCIPAL);
  }, [devMode, impersonating, signInAs]);

  const meta = ROUTES[route];
  const { filters, chips } = useGlobalFilters();
  // Pages that cut by the global filters say which slice they show.
  const filtered = route === 'dashboard';
  const subtitle = filtered
    ? `${meta.subtitle} · Últimos ${filters.periodDays} ${filters.periodDays === 1 ? 'día' : 'días'} · ${chips.length > 0 ? chips.map(chipText).join(' · ') : principal.scopeNodeId === null ? 'toda la flota' : scopeLabel(principal.scopeNodeId)}`
    : meta.subtitle;

  return (
    <div className="app">
      <TopBar
        userName={principal.name}
        extra={<DevModeMenu onOpenImprovements={() => navigate('dev-api-improvements')} />}
        onAction={(actionId, detail) =>
          setNotice(actionId === 'search' ? `Buscando “${detail}” en unidades, tarjetas y conductores.` : TOP_BAR_MESSAGES[actionId])
        }
      />

      <SideMenu
        open={menuOpen}
        pinned={menuPinned}
        groups={groups}
        activeItemId={activeItemId}
        onTogglePin={handleTogglePin}
        onSelectItem={handleSelectItem}
      />

      <main className="app__main" id="main">
        {impersonating && (
          <p className="app__impersonation" role="status">
            Modo Dev · viendo el portal como <strong>{principal.name}</strong> · {sessionRoleName(principal.role)} ·{' '}
            {scopeLabel(principal.scopeNodeId)}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => signInAs(DEFAULT_PRINCIPAL)}>
              Volver a mi usuario
            </button>
          </p>
        )}
        <PageHeader
          section={meta.section}
          title={meta.title}
          crumb={meta.crumb}
          subtitle={subtitle}
          menuOpen={menuOpen}
          onBack={route === 'dashboard' ? undefined : () => navigate('dashboard')}
          onToggleMenu={() => setMenuOpen((open) => !open)}
        >
          {filtered && <GlobalFilterBar scopeNote="Los filtros recortan los indicadores y las tres gráficas de consumo. Recargas y recortes viene de Saldos." />}
        </PageHeader>

        {route === 'dashboard' && (
          <FuelDashboardPage onCardOption={(chart, option) => setNotice(`${chart}: ${option}.`)} />
        )}
        {route === 'dispersion' && <DispersionPage onNotice={setNotice} />}
        {route === 'limits' && (
          <LimitsPage onNotice={setNotice} stationRequest={stationRequest} onStationRequestHandled={() => setStationRequest(null)} />
        )}
        {route === 'payment-media' && <PaymentMediaPage onNotice={setNotice} />}
        {route === 'toll-balances' && <TollBalancesPage onNotice={setNotice} readOnly={!writable(route)} />}
        {route === 'toll-rules' && <TollRulesPage onNotice={setNotice} readOnly={!writable(route)} />}
        {route === 'toll-media' && <TollMediaPage onNotice={setNotice} readOnly={!writable(route)} />}
        {route === 'maintenance' && <MaintenancePage onNotice={setNotice} />}
        {route === 'reports' && <ReportsPage />}
        {route === 'insights' && <InsightsPage onNotice={setNotice} onNavigate={navigate} />}
        {route === 'optimizer' && (
          <GasOptimizerPage
            onNotice={setNotice}
            onApplyInLimits={(request) => {
              setStationRequest(request);
              navigate('limits');
            }}
          />
        )}
        {route === 'ted' && <TedPage />}
        {route === 'vehicles' && (
          <VehiclesPage
            onNotice={setNotice}
            canEdit={canSession(principal.role, 'inventario.editar', 'escribir')}
            showVin={canSession(principal.role, 'inventario.vin', 'ver')}
          />
        )}
        {route === 'drivers' && (
          <DriversPage onNotice={setNotice} canEdit={canSession(principal.role, 'inventario.editar', 'escribir')} />
        )}
        {route === 'company-parameters' && <ParametersPage onNotice={setNotice} />}
        {route === 'company-invoices' && <InvoicesPage onNotice={setNotice} />}
        {route === 'company-users' && <UsersPage onNotice={setNotice} />}
        {route === 'dev-api-improvements' && <ApiImprovementsPage onNotice={setNotice} />}
      </main>

      {route !== 'ted' && (
        <FloatingControls onFeedback={() => setNotice('Formulario de opiniones abierto.')} onChat={() => navigate('ted')} />
      )}

      <div className="app__notice-region" role="status" aria-live="polite">
        {notice && <p className="app__notice">{notice}</p>}
      </div>
    </div>
  );
}
