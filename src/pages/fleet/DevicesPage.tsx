import { useMemo, useState } from 'react';
import { CardIcon, SearchIcon } from '../../components/icons/Icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import { useDevices } from '../../data/DevicesContext';
import { fleetVehicles } from '../../data/dispersion';
import { EV_CARD_STATUS, EV_CARD_TYPE_LABEL, vehicleById as evVehicleById } from '../../data/electromobility';
import { PAYMENT_STATUS_LABEL, PAYMENT_TYPE_LABEL } from '../../data/fleet';
import { TOLL_TAG_STATUS_LABEL, TOLL_TAG_TYPE_LABEL } from '../../data/toll';
import { formatCount, formatDateTime } from '../../utils/format';
import { EvCardsPanel } from './EvCardsPanel';
import { FuelMediaPanel } from './FuelMediaPanel';
import { TollMediaPanel } from './TollMediaPanel';
import { useEvHistory } from '../electromobility/useEvHistory';
import '../TablePage.css';
import '../intelligence/intelligence.css';

export type DeviceProduct = 'fuel' | 'toll' | 'ev';

/** What the role may do with each product's devices; 'none' hides the product (ADR-TCP-001). */
export type DeviceAccess = Record<DeviceProduct, 'none' | 'read' | 'write'>;

interface DevicesPageProps {
  onNotice: (message: string) => void;
  access: DeviceAccess;
}

export const DEVICE_PRODUCT_LABEL: Record<DeviceProduct, string> = {
  fuel: 'Combustible',
  toll: 'Peaje',
  ev: 'Electromovilidad',
};

/** One status vocabulary across products, so the consolidated list can be filtered as a whole. */
type DeviceState = 'active' | 'blocked' | 'unassigned' | 'replacement' | 'inactive';

const STATE_META: Record<DeviceState, { label: string; chip: string }> = {
  active: { label: 'Activo', chip: 'chip--active' },
  blocked: { label: 'Bloqueado', chip: 'chip--danger' },
  unassigned: { label: 'Sin asignar', chip: 'chip--paused' },
  replacement: { label: 'En reposición', chip: 'chip--review' },
  inactive: { label: 'Vencido o cancelado', chip: 'chip--paused' },
};

interface DeviceRow {
  id: string;
  product: DeviceProduct;
  number: string;
  kind: string;
  unit: { main: string; sub: string } | null;
  state: DeviceState;
  /** The product's own label, which can be more precise than the shared state. */
  stateLabel: string;
  lastUse: { at: string; where: string } | null;
}

type Tab = 'all' | DeviceProduct;

export function DevicesPage({ onNotice, access }: DevicesPageProps) {
  const products = (Object.keys(DEVICE_PRODUCT_LABEL) as DeviceProduct[]).filter((product) => access[product] !== 'none');
  const [tab, setTab] = useState<Tab>('all');
  const { fuelMedia, tollTags, evCards } = useDevices();
  const { sessions } = useEvHistory();

  const rows = useMemo<DeviceRow[]>(() => {
    const vehicles = new Map(fleetVehicles.map((vehicle) => [vehicle.id, vehicle]));
    const fleetUnit = (id: string | null) => {
      const vehicle = id ? vehicles.get(id) : undefined;
      return vehicle ? { main: vehicle.plate, sub: `${vehicle.id} · ${vehicle.driver}` } : null;
    };
    const lastCharge = new Map<string, { at: string; where: string }>();
    for (const session of sessions) {
      if (session.status !== 'denied' && !lastCharge.has(session.cardId)) lastCharge.set(session.cardId, { at: session.at, where: 'Recarga eléctrica' });
    }

    const all: DeviceRow[] = [];
    if (access.fuel !== 'none') {
      for (const medium of fuelMedia) {
        all.push({
          id: medium.id,
          product: 'fuel',
          number: medium.number,
          kind: PAYMENT_TYPE_LABEL[medium.type],
          unit: fleetUnit(medium.vehicleId),
          state: medium.status,
          stateLabel: PAYMENT_STATUS_LABEL[medium.status],
          lastUse: medium.lastUse ? { at: medium.lastUse, where: medium.lastStation ?? '' } : null,
        });
      }
    }
    if (access.toll !== 'none') {
      for (const tag of tollTags) {
        all.push({
          id: tag.id,
          product: 'toll',
          number: tag.number,
          kind: TOLL_TAG_TYPE_LABEL[tag.type],
          unit: fleetUnit(tag.vehicleId),
          state: tag.status,
          stateLabel: TOLL_TAG_STATUS_LABEL[tag.status],
          lastUse: tag.lastCrossing ? { at: tag.lastCrossing, where: tag.lastPlaza ?? '' } : null,
        });
      }
    }
    if (access.ev !== 'none') {
      for (const card of evCards) {
        const vehicle = evVehicleById(card.vehicleId ?? '');
        all.push({
          id: card.id,
          product: 'ev',
          number: card.masked,
          kind: EV_CARD_TYPE_LABEL[card.type],
          unit: vehicle ? { main: vehicle.plate, sub: `${vehicle.alias} · ${vehicle.brand} ${vehicle.model}` } : null,
          state: card.status === 'cancelled' || card.status === 'expired' ? 'inactive' : card.status,
          stateLabel: EV_CARD_STATUS[card.status].label,
          lastUse: lastCharge.get(card.id) ?? null,
        });
      }
    }
    return all;
  }, [access.fuel, access.toll, access.ev, fuelMedia, tollTags, evCards, sessions]);

  return (
    <div className="table-page">
      <div className="intel-tabs" role="tablist" aria-label="Producto">
        {(['all', ...products] as Tab[]).map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="tab"
            aria-selected={tab === candidate}
            className={tab === candidate ? 'is-active' : ''}
            onClick={() => setTab(candidate)}
          >
            {candidate === 'all' ? 'Todos' : DEVICE_PRODUCT_LABEL[candidate]} (
            {formatCount(candidate === 'all' ? rows.length : rows.filter((row) => row.product === candidate).length)})
          </button>
        ))}
      </div>

      {tab === 'all' && <AllDevices rows={rows} products={products} onOpen={setTab} />}
      {tab === 'fuel' && <FuelMediaPanel onNotice={onNotice} readOnly={access.fuel !== 'write'} />}
      {tab === 'toll' && <TollMediaPanel onNotice={onNotice} readOnly={access.toll !== 'write'} />}
      {tab === 'ev' && <EvCardsPanel onNotice={onNotice} readOnly={access.ev !== 'write'} />}
    </div>
  );
}

interface AllDevicesProps {
  rows: DeviceRow[];
  products: DeviceProduct[];
  onOpen: (product: DeviceProduct) => void;
}

/** Every device of every product in one list; each product's tab keeps its own actions. */
function AllDevices({ rows, products, onOpen }: AllDevicesProps) {
  const [query, setQuery] = useState('');
  const [product, setProduct] = useState<DeviceProduct | ''>('');
  const [state, setState] = useState<DeviceState | ''>('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const haystack = `${row.number} ${row.unit?.main ?? ''} ${row.unit?.sub ?? ''}`.toLowerCase();
      return (!product || row.product === product) && (!state || row.state === state) && (!needle || haystack.includes(needle));
    });
  }, [rows, query, product, state]);
  const pagination = usePagination(filtered);

  const count = (key: DeviceState) => rows.filter((row) => row.state === key).length;
  const units = new Set(rows.filter((row) => row.unit).map((row) => row.unit!.main)).size;

  return (
    <>
      <dl className="table-page__summary">
        <div>
          <dt>Dispositivos</dt>
          <dd>{formatCount(rows.length)}</dd>
        </div>
        <div>
          <dt>Activos</dt>
          <dd>{formatCount(count('active'))}</dd>
        </div>
        <div>
          <dt>Bloqueados</dt>
          <dd className={count('blocked') > 0 ? 'is-alert' : undefined}>{count('blocked')}</dd>
        </div>
        <div>
          <dt>Sin asignar</dt>
          <dd>{count('unassigned')}</dd>
        </div>
        <div>
          <dt>Unidades con dispositivo</dt>
          <dd>{formatCount(units)}</dd>
        </div>
      </dl>

      <section className="table-page__card" aria-labelledby="devices-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="devices-title">
            Tarjetas, tags y dispositivos de la flota
          </h2>
          <div className="table-page__filters">
            <label className="table-page__search">
              <SearchIcon width={15} height={15} />
              <span className="visually-hidden">Buscar dispositivo</span>
              <input type="search" value={query} placeholder="Número, placa o conductor" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label>
              <span className="visually-hidden">Filtrar por producto</span>
              <select value={product} onChange={(event) => setProduct(event.target.value as DeviceProduct | '')}>
                <option value="">Todos los productos</option>
                {products.map((key) => (
                  <option key={key} value={key}>
                    {DEVICE_PRODUCT_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Filtrar por estado</span>
              <select value={state} onChange={(event) => setState(event.target.value as DeviceState | '')}>
                <option value="">Todos los estados</option>
                {(Object.keys(STATE_META) as DeviceState[]).map((key) => (
                  <option key={key} value={key}>
                    {STATE_META[key].label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {filtered.length === 0 ? (
          <EmptyState
            compact
            icon={<CardIcon width={20} height={20} />}
            title="Ningún dispositivo coincide con los filtros"
            description="Revisa el número, la placa o el conductor, o cambia el producto y el estado seleccionados."
            actions={
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  setQuery('');
                  setProduct('');
                  setState('');
                }}
              >
                Limpiar filtros
              </button>
            }
          />
        ) : (
          <div className="table-page__scroll">
            <table className="table-page__table">
              <thead>
                <tr>
                  <th scope="col">Dispositivo</th>
                  <th scope="col">Producto</th>
                  <th scope="col">Unidad asignada</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Último uso</th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageRows.map((row) => (
                  <tr key={`${row.product}-${row.id}`}>
                    <td>
                      <span className="table-page__main">{row.number}</span>
                      <span className="table-page__sub">{row.kind}</span>
                    </td>
                    <td>{DEVICE_PRODUCT_LABEL[row.product]}</td>
                    <td>
                      {row.unit ? (
                        <>
                          <span className="table-page__main">{row.unit.main}</span>
                          <span className="table-page__sub">{row.unit.sub}</span>
                        </>
                      ) : (
                        <span className="table-page__sub">Sin unidad</span>
                      )}
                    </td>
                    <td>
                      <span className={`chip ${STATE_META[row.state].chip}`}>{row.stateLabel}</span>
                    </td>
                    <td>
                      {row.lastUse ? (
                        <>
                          {formatDateTime(new Date(row.lastUse.at))}
                          <span className="table-page__sub">{row.lastUse.where}</span>
                        </>
                      ) : (
                        <span className="table-page__sub">Sin uso</span>
                      )}
                    </td>
                    <td className="table-page__action">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => onOpen(row.product)}>
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pagination} noun="dispositivos" onPage={pagination.setPage} />
      </section>
    </>
  );
}
