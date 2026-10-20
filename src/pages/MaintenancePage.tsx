import { useMemo, useState } from 'react';
import { Badge, Button, Chip, Input, StatusPill, TabPanel, Tabs } from '@er-mobility-mx/design-system';
import { ServiceOrderDialog } from '../components/maintenance/ServiceOrderDialog';
import { AlertIcon, CalendarIcon, GearIcon, PlusIcon, SearchIcon, WalletIcon } from '../components/icons/Icons';
import { EmptyState } from '../components/ui/EmptyState';
import { fleetVehicles as vehicles } from '../data/dispersion';
import { VEHICLE_STATUS_LABEL, vehicleDetails } from '../data/fleet';
import {
  ORDER_KIND_LABEL,
  ORDER_STATUS_LABEL,
  serviceOrders as seedOrders,
  spendBySystem,
  upcomingServices,
  type OrderStatus,
  type ServiceOrder,
} from '../data/maintenance';
import { today } from '../domain/demo/clock';
import { daysUntil, formatCount, formatDateLong, formatMoney } from '../utils/format';
import './intelligence/intelligence.css';
import './MaintenancePage.css';

interface MaintenancePageProps {
  onNotice: (message: string) => void;
}

type SearchMode = 'orders' | 'vehicles';

const STATUS_TONE: Record<OrderStatus, 'info' | 'warning' | 'danger' | 'success'> = {
  scheduled: 'info',
  'in-shop': 'warning',
  'waiting-parts': 'danger',
  done: 'success',
};

const OPEN_STATUSES: OrderStatus[] = ['scheduled', 'in-shop', 'waiting-parts'];
const MAINTENANCE_TABS_ID = 'maintenance-search-tabs';
const MAINTENANCE_MODES = [
  { value: 'orders', label: 'Órdenes' },
  { value: 'vehicles', label: 'Vehículos' },
];

const vehicleOf = (id: string) => vehicles.find((vehicle) => vehicle.id === id);
const detailOf = (id: string) => vehicleDetails.find((detail) => detail.vehicleId === id);

export function MaintenancePage({ onNotice }: MaintenancePageProps) {
  const [orders, setOrders] = useState<ServiceOrder[]>(seedOrders);
  const [mode, setMode] = useState<SearchMode>('orders');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<{ vehicleId?: string } | null>(null);

  const needle = query.trim().toLowerCase();
  const now = today();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const openOrders = orders.filter((order) => OPEN_STATUSES.includes(order.status));
  const inShop = new Set(
    orders.filter((order) => order.status === 'in-shop' || order.status === 'waiting-parts').map((order) => order.vehicleId),
  ).size;
  const monthOrders = orders.filter((order) => order.opened.startsWith(currentMonth));
  const monthSpend = monthOrders.reduce((sum, order) => sum + order.costMXN, 0);
  const overdue = upcomingServices.filter((service) => daysUntil(service.dueDate) < 0);
  const totalSpend = spendBySystem.reduce((sum, item) => sum + item.amountMXN, 0);
  const nextFolio = `OS-2026-${String(425 + orders.length - seedOrders.length).padStart(4, '0')}`;

  const orderResults = useMemo(
    () =>
      orders.filter((order) => {
        const vehicle = vehicleOf(order.vehicleId);
        return `${order.folio} ${vehicle?.plate ?? ''} ${vehicle?.driver ?? ''} ${order.workshop} ${order.system}`
          .toLowerCase()
          .includes(needle);
      }),
    [orders, needle],
  );

  const vehicleResults = useMemo(
    () =>
      vehicles.filter((vehicle) => {
        const detail = detailOf(vehicle.id);
        return `${vehicle.plate} ${vehicle.driver} ${detail?.brand ?? ''} ${detail?.model ?? ''}`.toLowerCase().includes(needle);
      }),
    [needle],
  );

  const createOrder = (order: ServiceOrder) => {
    setOrders((current) => [order, ...current]);
    setDialog(null);
    onNotice(`Orden ${order.folio} creada para ${vehicleOf(order.vehicleId)?.plate} en ${order.workshop}.`);
  };

  const resultCount = mode === 'orders' ? orderResults.length : vehicleResults.length;

  return (
    <div className="intel maintenance">
      <section className="maintenance__toolbar intel-card" aria-label="Consulta de mantenimiento">
        <div className="maintenance__search">
          <Tabs
            id={MAINTENANCE_TABS_ID}
            items={MAINTENANCE_MODES}
            value={mode}
            onChange={(value) => {
              if (value === 'orders' || value === 'vehicles') setMode(value);
            }}
            ariaLabel="Consultar por"
            style={{ flexShrink: 0 }}
          />
          <label className="maintenance__input">
            <SearchIcon width={16} height={16} />
            <Input
              type="search"
              ariaLabel={mode === 'orders' ? 'Buscar órdenes de servicio' : 'Buscar vehículos'}
              value={query}
              placeholder={mode === 'orders' ? 'Folio, placa, taller o sistema' : 'Placa, conductor, marca o modelo'}
              onChange={setQuery}
            />
          </label>
        </div>
        <Button onClick={() => setDialog({})}>
          <PlusIcon width={16} height={16} />
          Crear orden de servicio
        </Button>
      </section>

      <TabPanel tabsId={MAINTENANCE_TABS_ID} value={mode} active>{needle && (
        <section className="maintenance__results intel-card" aria-live="polite" aria-label="Resultados de la consulta">
          <header className="maintenance__results-head">
            <h2>
              {resultCount} {mode === 'orders' ? (resultCount === 1 ? 'orden' : 'órdenes') : resultCount === 1 ? 'vehículo' : 'vehículos'} para “{query.trim()}”
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setQuery('')}>
              Limpiar
            </Button>
          </header>

          {resultCount === 0 ? (
            <EmptyState
              compact
              icon="search"
              title={mode === 'orders' ? 'Ninguna orden coincide con la búsqueda' : 'Ningún vehículo coincide con la búsqueda'}
              description={
                mode === 'orders'
                  ? 'Busca por folio (OS-2026-…), placa, taller o sistema, o cambia a consultar por vehículo.'
                  : 'Busca por placa, conductor, marca o modelo, o cambia a consultar por orden.'
              }
            />
          ) : mode === 'orders' ? (
            <ul className="maintenance__result-list">
              {orderResults.map((order) => {
                const vehicle = vehicleOf(order.vehicleId);
                return (
                  <li key={order.folio}>
                    <div>
                      <p className="maintenance__result-main">
                        {order.folio} · {vehicle?.plate}
                      </p>
                      <p className="maintenance__result-sub">
                        {ORDER_KIND_LABEL[order.kind]} · {order.system} · {order.workshop} · promesa {formatDateLong(order.promised)}
                      </p>
                    </div>
                    <StatusPill label={ORDER_STATUS_LABEL[order.status]} tone={STATUS_TONE[order.status]} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="maintenance__result-list">
              {vehicleResults.map((vehicle) => {
                const detail = detailOf(vehicle.id);
                const open = openOrders.filter((order) => order.vehicleId === vehicle.id).length;
                const next = upcomingServices.find((service) => service.vehicleId === vehicle.id);
                return (
                  <li key={vehicle.id}>
                    <div>
                      <p className="maintenance__result-main">
                        {vehicle.plate} · {detail ? `${detail.brand} ${detail.model}` : vehicle.driver}
                      </p>
                      <p className="maintenance__result-sub">
                        {detail ? `${VEHICLE_STATUS_LABEL[detail.status]} · ${detail.odometerKm === null ? 'sin lectura de odómetro' : `${formatCount(detail.odometerKm)} km`}` : ''} ·{' '}
                        {open === 0 ? 'Sin órdenes abiertas' : `${open} ${open === 1 ? 'orden abierta' : 'órdenes abiertas'}`}
                        {next && ` · próximo: ${next.service}`}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setDialog({ vehicleId: vehicle.id })}>
                      Crear orden
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
      </TabPanel>

      <section className="intel-kpis" aria-label="Indicadores de mantenimiento">
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--amber">
            <GearIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">En taller</p>
            <p className="intel-kpi__value">{inShop}</p>
            <p className="intel-kpi__hint">de {vehicles.length} vehículos</p>
          </div>
        </article>
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--blue">
            <CalendarIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Órdenes programadas</p>
            <p className="intel-kpi__value">{orders.filter((order) => order.status === 'scheduled').length}</p>
            <p className="intel-kpi__hint">{openOrders.length} abiertas en total</p>
          </div>
        </article>
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--green">
            <WalletIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Costo del mes</p>
            <p className="intel-kpi__value">{formatMoney(monthSpend)}</p>
            <p className="intel-kpi__hint">{monthOrders.length} órdenes de servicio</p>
          </div>
        </article>
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--red">
            <AlertIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Servicios vencidos</p>
            <p className="intel-kpi__value">{overdue.length}</p>
            <p className="intel-kpi__hint">{overdue.length > 0 ? 'Requieren orden de servicio' : 'Todo al día'}</p>
          </div>
        </article>
      </section>

      <div className="maintenance__columns">
        <section className="intel-card maintenance__panel" aria-labelledby="open-orders">
          <header className="maintenance__panel-head">
            <h2 id="open-orders">Órdenes abiertas</h2>
            <Badge>{openOrders.length}</Badge>
          </header>
          {openOrders.length === 0 ? (
            <EmptyState
              compact
              icon="build"
              title="Sin órdenes abiertas"
              description="Las órdenes programadas, en taller o esperando refacciones aparecen aquí."
            />
          ) : (
            <div className="maintenance__scroll">
              <table className="maintenance__table">
                <thead>
                  <tr>
                    <th scope="col">Orden</th>
                    <th scope="col">Unidad</th>
                    <th scope="col">Servicio</th>
                    <th scope="col">Promesa</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {openOrders.map((order) => {
                    const vehicle = vehicleOf(order.vehicleId);
                    return (
                      <tr key={order.folio}>
                        <td>
                          <span className="maintenance__strong">{order.folio}</span>
                          <span className="maintenance__sub">{order.workshop}</span>
                        </td>
                        <td>
                          <span className="maintenance__strong maintenance__nowrap">{vehicle?.plate}</span>
                          <span className="maintenance__sub">{vehicle?.driver}</span>
                        </td>
                        <td>
                          {order.system}
                          <span className="maintenance__sub">
                            {ORDER_KIND_LABEL[order.kind]} · {order.costMXN > 0 ? formatMoney(order.costMXN) : 'Por cotizar'}
                          </span>
                        </td>
                        <td className="maintenance__nowrap">{formatDateLong(order.promised)}</td>
                        <td>
                          <StatusPill label={ORDER_STATUS_LABEL[order.status]} tone={STATUS_TONE[order.status]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="intel-card maintenance__panel" aria-labelledby="upcoming">
          <header className="maintenance__panel-head">
            <h2 id="upcoming">Próximos servicios preventivos</h2>
          </header>
          <ul className="maintenance__upcoming">
            {upcomingServices.map((service) => {
              const vehicle = vehicleOf(service.vehicleId);
              const days = daysUntil(service.dueDate);
              const hasOrder = openOrders.some((order) => order.vehicleId === service.vehicleId && order.kind === 'preventive');
              return (
                <li key={`${service.vehicleId}-${service.service}`}>
                  <div>
                    <p className="maintenance__strong">
                      {vehicle?.plate} · {service.service}
                    </p>
                    <p className={`maintenance__sub${days < 0 ? ' maintenance__overdue' : ''}`}>
                      {days < 0 ? `Vencido hace ${-days} días` : days === 0 ? 'Vence hoy' : `En ${days} días · ${formatDateLong(service.dueDate)}`} · {formatCount(service.dueKm)} km
                    </p>
                  </div>
                  {hasOrder ? (
                    <Chip label="Con orden" size="sm" />
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setDialog({ vehicleId: service.vehicleId })}>
                      Crear orden
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="intel-card maintenance__panel" aria-labelledby="spend">
        <header className="maintenance__panel-head">
          <h2 id="spend">Gasto del mes por sistema</h2>
          <span className="maintenance__total">{formatMoney(totalSpend)}</span>
        </header>
        <ul className="maintenance__spend">
          {spendBySystem.map((item) => (
            <li key={item.system}>
              <span className="maintenance__spend-name">{item.system}</span>
              <span className="maintenance__spend-track">
                <span style={{ width: `${(item.amountMXN / spendBySystem[0].amountMXN) * 100}%`, background: item.color }} />
              </span>
              <span className="maintenance__spend-amount">
                {formatMoney(item.amountMXN)} · {((item.amountMXN / totalSpend) * 100).toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      {dialog && (
        <ServiceOrderDialog
          vehicles={vehicles}
          initialVehicleId={dialog.vehicleId}
          nextFolio={nextFolio}
          onClose={() => setDialog(null)}
          onCreate={createOrder}
        />
      )}
    </div>
  );
}
