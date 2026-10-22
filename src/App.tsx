import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { GlobalSearch, PageChromeProvider, SidebarProvider, useBreakpoint, useToast } from '@er-mobility-mx/design-system';
import { globalSearchCatalog, searchEntities, type SearchDestination, type SearchRoute } from './data/globalSearch';
import { GlobalFilterBar, chipText } from './components/filters/GlobalFilterBar';
import { useGlobalFilters } from './components/filters/GlobalFilters';
import { FloatingControls } from './components/layout/FloatingControls';
import { PageHeader } from './components/layout/PageHeader';
import { SideMenu } from './components/layout/SideMenu';
import { PageUtilities } from './components/layout/PageUtilities';
import { HelpDialog } from './components/layout/HelpDialog';
import { AccountDialog } from './components/layout/AccountDialog';
import { NotificationInbox } from './components/layout/NotificationInbox';
import { activeAlerts, alertNotifications, alertReducer, INITIAL_ALERT_STATE } from './data/alertState';
import { fleetAlerts } from './data/intelligence';
import { devMenuGroup, menuGroups } from './data/dashboard';
import { useSession } from './components/session/Session';
import { ROUTE_CAPABILITY, canAccessRoute } from './data/access';
import { clientAccount, scopeLabel } from './data/client';
import { DEFAULT_PRINCIPAL } from './data/session';
import { canSession, sessionRoleName } from './domain/rbac/portal-roles';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { FuelDashboardPage } from './pages/FuelDashboardPage';
import { LimitsPage } from './pages/LimitsPage';
import { StationNetworksPage } from './pages/StationNetworksPage';
import { FuelPolicyProvider } from './data/FuelPolicyContext';
import { DriversPage } from './pages/DriversPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { PaymentMediaPage } from './pages/PaymentMediaPage';
import { ReportsPage } from './pages/ReportsPage';
import { TollReportsPage } from './pages/TollReportsPage';
import { IntelligenceReportsPage } from './pages/intelligence/IntelligenceReportsPage';
import { CarbonFootprintPage } from './pages/move-for-good/CarbonFootprintPage';
import { OperationalAlertsPage } from './pages/OperationalAlertsPage';
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
import { useDevMode } from './components/dev/DevMode';
import './App.css';

const ROUTES: Record<AppRoute, { menuItem: string; title: string; subtitle: string }> = {
  dashboard: {
    menuItem: 'resumen',
    title: 'Resumen',
    subtitle: clientAccount.name,
  },
  dispersion: {
    menuItem: 'saldos',
    title: 'Asignaciones',
    subtitle: 'Administración del saldo global y asignaciones a medios de pago',
  },
  limits: {
    menuItem: 'reglas-limites',
    title: 'Políticas de uso',
    subtitle: 'Controles de transacción, restricciones de consumo y configuraciones de uso por grupo y vehículo',
  },
  'payment-media': {
    menuItem: 'medios-pago',
    title: 'Medios de pago',
    subtitle: 'Tarjetas chip, tags y tarjetas virtuales de la flota',
  },
  'station-networks': {
    menuItem: 'red-estaciones',
    title: 'Red de estaciones',
    subtitle: 'Consulta estaciones afiliadas y administra tus redes personalizadas',
  },
  'toll-balances': {
    menuItem: 'peaje-saldos',
    title: 'Saldos',
    subtitle: 'Bolsa de peaje, saldo por TAG y recarga automática',
  },
  'toll-rules': {
    menuItem: 'peaje-reglas-limites',
    title: 'Reglas y límites',
    subtitle: 'Gasto, cruces, autopistas y horarios permitidos por grupo y por TAG',
  },
  'toll-media': {
    menuItem: 'peaje-medios-pago',
    title: 'Medios de pago',
    subtitle: 'TAGs de telepeaje y Drive Tag de la flota',
  },
  maintenance: {
    menuItem: 'mantenimiento-resumen',
    title: 'Mantenimiento',
    subtitle: 'Órdenes de servicio, preventivos próximos y gasto en taller',
  },
  reports: {
    menuItem: 'reportes',
    title: 'Reportería · Combustible',
    subtitle: 'Reportes del producto contratado',
  },
  'toll-reports': {
    menuItem: 'reportes-peaje',
    title: 'Reportería · Peaje',
    subtitle: 'Reportes de cruces, TAGs y movimientos de peaje',
  },
  'intelligence-reports': {
    menuItem: 'intelligence-reportes',
    title: 'Reportes',
    subtitle: 'Consumo y presupuesto por periodo y grupo',
  },
  'carbon-footprint': {
    menuItem: 'huella-carbono',
    title: 'Huella de carbono',
    subtitle: 'Combustible consumido, emisiones generadas y compensadas',
  },
  'operational-alerts': {
    menuItem: 'alertas-operativas',
    title: 'Alertas',
    subtitle: 'Reglas operativas, grupos de notificación e historial de envíos',
  },
  insights: {
    menuItem: 'insights',
    title: 'Insights & Alertas',
    subtitle: 'Alertas de consumo y oportunidades de ahorro detectadas por TED',
  },
  optimizer: {
    menuItem: 'optimizador',
    title: 'Optimizador de gasolineras',
    subtitle: 'Estaciones de la red con mejor precio en la ruta de cada tarjeta',
  },
  ted: {
    menuItem: 'ted',
    title: 'TED',
    subtitle: 'Asistente de inteligencia para tu flota · Telemetría, eficiencia y decisiones',
  },
  vehicles: {
    menuItem: 'vehiculos',
    title: 'Vehículos',
    subtitle: 'Unidades, combustible, rendimiento esperado y medio de pago asignado',
  },
  drivers: {
    menuItem: 'conductores',
    title: 'Conductores',
    subtitle: 'Conductores, unidad asignada, licencias y rendimiento del mes',
  },
  'company-parameters': {
    menuItem: 'empresa-parametros',
    title: 'Parámetros',
    subtitle: 'Catálogos de la empresa: grupos de facturación, regiones, centros de costo y los que definas',
  },
  'company-invoices': {
    menuItem: 'empresa-facturas',
    title: 'Facturas',
    subtitle: 'CFDI emitidos por producto y grupo de facturación',
  },
  'company-users': {
    menuItem: 'empresa-usuarios',
    title: 'Usuarios',
    subtitle: 'Accesos al portal, roles y alcance por nodo del organigrama',
  },
  'dev-api-improvements': {
    menuItem: 'dev-mejoras-api',
    title: 'Mejoras API ZERO',
    subtitle: 'Lo que la API headless de combustible necesitaría para cubrir todo el mockup',
  },
};

const ROUTE_BY_MENU_ITEM = Object.fromEntries(
  (Object.keys(ROUTES) as AppRoute[]).map((route) => [ROUTES[route].menuItem, route]),
) as Record<string, AppRoute>;

function AppContent() {
  const mainRef = useRef<HTMLElement>(null);
  const breakpoint = useBreakpoint();
  const [menuOpen, setMenuOpen] = useState(false);
  const [route, setRoute] = useState<AppRoute>('dashboard');
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [alertState, dispatchAlert] = useReducer(alertReducer, INITIAL_ALERT_STATE);
  const [alertDestination, setAlertDestination] = useState<{ id: string; requestId: number }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [searchDestination, setSearchDestination] = useState<(SearchDestination & { route: SearchRoute })>();
  // "Aplicar en Límites" from the optimizer: Límites opens with it and applies nothing until confirmed.
  const [stationRequest, setStationRequest] = useState<StationRecommendationRequest | null>(null);
  const { devMode } = useDevMode();
  const { principal, impersonating, signInAs } = useSession();
  const toast = useToast();
  useEffect(() => {
    if (breakpoint !== 'compact') setMenuOpen(false);
  }, [breakpoint]);
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

  const notify = useCallback(
    (message: string) => {
      toast.show({ message, tone: 'neutral', duration: 3600 });
    },
    [toast],
  );

  const handleSelectItem = useCallback(
    (itemId: string) => {
      const label = [...menuGroups, devMenuGroup].flatMap((group) => group.items).find((item) => item.id === itemId)?.label ?? itemId;
      const target = ROUTE_BY_MENU_ITEM[itemId];

      if (target && !allowed(target)) {
        notify(`${label}: tu rol no tiene acceso a este módulo.`);
        return;
      }
      if (target) {
        mainRef.current?.scrollTo({ top: 0 });
        setRoute(target);
      } else {
        notify(`${label}: módulo en construcción.`);
      }
      setMenuOpen(false);
    },
    [allowed, notify],
  );

  const navigate = useCallback(
    (target: AppRoute) => {
      if (!allowed(target)) {
        notify(`${ROUTES[target].title}: tu rol no tiene acceso a este módulo.`);
        return;
      }
      mainRef.current?.scrollTo({ top: 0 });
      setRoute(target);
      setMenuOpen(false);
    },
    [allowed, notify],
  );

  useEffect(() => {
    setSearchDestination((current) => current && current.route !== route ? undefined : current);
    if (route !== 'insights') setAlertDestination(undefined);
  }, [route]);

  // Leaving dev mode while on a dev page goes back home.
  useEffect(() => {
    if (!devMode && route === 'dev-api-improvements') navigate('dashboard');
  }, [devMode, route, navigate]);

  // Viewing the portal as someone else, internal roles included, only exists in dev mode.
  useEffect(() => {
    if (!devMode && impersonating) signInAs(DEFAULT_PRINCIPAL);
  }, [devMode, impersonating, signInAs]);

  const meta = ROUTES[route];
  const alerts = activeAlerts(fleetAlerts, alertState);
  const searchCatalog = globalSearchCatalog();
  const searchResults = searchEntities(searchQuery, searchCatalog);
  const recents = recentIds.flatMap((id) => {
    const result = searchCatalog.find((item) => item.id === id);
    return result ? [result] : [];
  });
  const { filters, chips } = useGlobalFilters();
  // Pages that cut by the global filters say which slice they show.
  const filtered = route === 'dashboard';
  const subtitle = filtered
    ? `${meta.subtitle} · Últimos ${filters.periodDays} ${filters.periodDays === 1 ? 'día' : 'días'} · ${chips.length > 0 ? chips.map(chipText).join(' · ') : principal.scopeNodeId === null ? 'toda la flota' : scopeLabel(principal.scopeNodeId)}`
    : meta.subtitle;

  return (
    <SidebarProvider value={() => setMenuOpen((open) => !open)}>
    <PageChromeProvider value={{
      onSearch: () => setSearchOpen(true),
      searchLabel: 'Búsqueda global (⌘K / Ctrl+K)',
      trailing: (
        <PageUtilities
          onHelp={() => setHelpOpen(true)}
          onOpenImprovements={() => navigate('dev-api-improvements')}
          notifications={allowed('insights') && (
            <NotificationInbox
              items={alertNotifications(fleetAlerts, alertState)}
              onMarkAllRead={() => dispatchAlert({ type: 'read', ids: alerts.map((alert) => alert.id) })}
              onSelect={(item) => {
                if (!allowed('insights') || !alerts.some((alert) => alert.id === item.id)) {
                  notify('La alerta ya no está disponible para tu sesión.');
                  return;
                }
                dispatchAlert({ type: 'read', ids: [item.id] });
                setAlertDestination((current) => ({ id: item.id, requestId: (current?.requestId ?? 0) + 1 }));
                navigate('insights');
              }}
            />
          )}
        />
      ),
    }}>
    <div className="app">
      <a className="app__skip" href="#main">Ir al contenido principal</a>
      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        name={principal.name}
        role={sessionRoleName(principal.role)}
        scope={scopeLabel(principal.scopeNodeId)}
      />
      <HelpDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        onStartTed={allowed('ted') ? () => navigate('ted') : undefined}
      />
      <GlobalSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        value={searchQuery}
        onValueChange={setSearchQuery}
        results={searchResults}
        recents={recents}
        onClearRecents={() => setRecentIds([])}
        groupOrder={['Unidades', 'Medios de pago', 'Conductores']}
        placeholder="Buscar unidades, medios de pago o conductores"
        emptyTitle="Busca en los listados"
        emptyDescription="Escribe una placa, unidad, número de medio, nombre o número de empleado. Se muestran hasta 10 coincidencias por tipo; precisa la consulta para encontrar más."
        emptyHint="Revisa el texto o prueba con otro identificador dentro de tu alcance."
        onSelect={(item) => {
          const result = globalSearchCatalog().find((candidate) => candidate.id === item.id);
          if (!result || !allowed(result.route)) {
            notify('El resultado ya no está disponible para tu sesión.');
            return;
          }
          setRecentIds((current) => [result.id, ...current.filter((id) => id !== result.id)].slice(0, 5));
          setSearchDestination((current) => ({
            entityId: result.entityId, route: result.route, requestId: (current?.requestId ?? 0) + 1,
          }));
          navigate(result.route);
        }}
      />

      <SideMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        groups={groups}
        activeItemId={meta.menuItem}
        onSelectItem={handleSelectItem}
        onHome={() => navigate('dashboard')}
        userName={principal.name}
        userRole={sessionRoleName(principal.role)}
        onAccount={() => setAccountOpen(true)}
      />

      <main ref={mainRef} className="app__main" id="main" tabIndex={-1}>
        {impersonating && (
          <p className="app__impersonation" role="status">
            Modo Dev · viendo el portal como <strong>{principal.name}</strong> · {sessionRoleName(principal.role)} ·{' '}
            {scopeLabel(principal.scopeNodeId)}
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => signInAs(DEFAULT_PRINCIPAL)}>
              Volver a mi usuario
            </button>
          </p>
        )}
        <header className="app__header">
        <PageHeader
          title={meta.title}
          subtitle={subtitle}
        >
          {filtered && <GlobalFilterBar scopeNote="Los filtros recortan los indicadores y las tres gráficas de consumo. Recargas y recortes viene de Saldos." />}
        </PageHeader>
        </header>

        <div className="app__content">
        {route === 'dashboard' && (
          <FuelDashboardPage onCardOption={(chart, option) => notify(`${chart}: ${option}.`)} />
        )}
        {route === 'dispersion' && <AssignmentsPage onNotice={notify} />}
        {route === 'limits' && (
          <LimitsPage onNotice={notify} stationRequest={stationRequest} onStationRequestHandled={() => setStationRequest(null)} />
        )}
        {route === 'station-networks' && <StationNetworksPage onNotice={notify} />}
        {route === 'payment-media' && <PaymentMediaPage onNotice={notify} searchDestination={searchDestination?.route === 'payment-media' ? searchDestination : undefined} />}
        {route === 'toll-balances' && <TollBalancesPage onNotice={notify} readOnly={!writable(route)} />}
        {route === 'toll-rules' && <TollRulesPage onNotice={notify} readOnly={!writable(route)} />}
        {route === 'toll-media' && <TollMediaPage onNotice={notify} readOnly={!writable(route)} />}
        {route === 'maintenance' && <MaintenancePage onNotice={notify} />}
        {route === 'reports' && <ReportsPage key={principal.userId} />}
        {route === 'toll-reports' && <TollReportsPage key={principal.userId} />}
        {route === 'intelligence-reports' && <IntelligenceReportsPage />}
        {route === 'carbon-footprint' && <CarbonFootprintPage />}
        {route === 'operational-alerts' && (
          <OperationalAlertsPage canConfigure={canSession(principal.role, 'alertas.configurar', 'escribir')} key={principal.userId} />
        )}
        {route === 'insights' && (
          <InsightsPage
            alerts={alerts}
            onDismiss={(id) => dispatchAlert({ type: 'dismiss', id })}
            destination={alertDestination}
            onNotice={notify}
            onNavigate={navigate}
          />
        )}
        {route === 'optimizer' && (
          <GasOptimizerPage
            onNotice={notify}
            onApplyInLimits={(request) => {
              setStationRequest(request);
              navigate('limits');
            }}
          />
        )}
        {route === 'ted' && <TedPage />}
        {route === 'vehicles' && (
          <VehiclesPage
            onNotice={notify}
            searchDestination={searchDestination?.route === 'vehicles' ? searchDestination : undefined}
            canEdit={canSession(principal.role, 'inventario.editar', 'escribir')}
            showVin={canSession(principal.role, 'inventario.vin', 'ver')}
          />
        )}
        {route === 'drivers' && (
          <DriversPage onNotice={notify} searchDestination={searchDestination?.route === 'drivers' ? searchDestination : undefined} canEdit={canSession(principal.role, 'tc.conductores', 'escribir')} />
        )}
        {route === 'company-parameters' && <ParametersPage onNotice={notify} />}
        {route === 'company-invoices' && <InvoicesPage onNotice={notify} />}
        {route === 'company-users' && <UsersPage onNotice={notify} />}
        {route === 'dev-api-improvements' && <ApiImprovementsPage onNotice={notify} />}
        </div>
      </main>

      {route !== 'ted' && (
        <FloatingControls onFeedback={() => notify('Formulario de opiniones abierto.')} onChat={() => navigate('ted')} />
      )}
    </div>
    </PageChromeProvider>
    </SidebarProvider>
  );
}

export default function App() {
  return <FuelPolicyProvider><AppContent /></FuelPolicyProvider>;
}
