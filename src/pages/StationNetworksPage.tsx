import { lazy, Suspense, useState } from 'react';
import { NetworkPager, StationNetworkDialog } from '../components/limits/StationNetworkDialog';
import { CloseIcon, PlusIcon, SlidersIcon, TrendDownIcon, TrendUpIcon } from '../components/icons/Icons';
import { Modal } from '../components/ui/Modal';
import { useFuelPolicies } from '../data/FuelPolicyContext';
import { networkModeLabel, type StationNetwork } from '../data/stationNetworks';
import { formatCount } from '../utils/format';
import './TablePage.css';
import './LimitsPage.css';
import '../components/limits/PoliciesSection.css';
import './StationNetworksPage.css';

const COLUMNS = [
  { key: 'name', label: 'Nombre de la red' },
  { key: 'mode', label: 'Tipo de red' },
  { key: 'stations', label: 'Estaciones' },
  { key: 'policies', label: 'Políticas de uso' },
  { key: 'voucherNotes', label: 'Nota Vales' },
  { key: 'updated', label: 'Última modificación' },
  { key: 'updatedBy', label: 'Usuario' },
] as const;
type FilterColumn = typeof COLUMNS[number]['key'];
const EMPTY_FILTERS: Record<FilterColumn, string> = { name: '', mode: '', stations: '', policies: '', voucherNotes: '', updated: '', updatedBy: '' };
const dateLabel = (date: string) => new Intl.DateTimeFormat('es-MX').format(new Date(`${date}T12:00:00`));
const StationMap = lazy(() => import('../components/stations/StationMap').then(({ StationMap: Component }) => ({ default: Component })));

export function StationNetworksPage({ onNotice }: { onNotice: (message: string) => void }) {
  const { networks, policies, saveNetwork, cancelNetwork, storageError } = useFuelPolicies();
  const [editor, setEditor] = useState<{ network: StationNetwork | null; initialStationIds?: string[] } | null>(null);
  const [activeView, setActiveView] = useState<'map' | 'networks'>('map');
  const [confirmation, setConfirmation] = useState<{ network: StationNetwork; cancel: boolean } | null>(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [activeFilter, setActiveFilter] = useState<FilterColumn>('name');
  const [ascending, setAscending] = useState(true);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const associatedPolicies = (id: string) => policies.filter((policy) => policy.stationSubnetId === id);
  const rows = networks.map((network) => ({ network, values: {
    name: network.name, mode: networkModeLabel(network.mode), stations: String(network.stationIds.length),
    policies: String(associatedPolicies(network.id).length), voucherNotes: String(network.voucherNotes.length),
    updated: dateLabel(network.updated), updatedBy: network.updatedBy,
  } })).filter((row) => COLUMNS.every(({ key }) => row.values[key].toLocaleLowerCase('es-MX').includes(filters[key].trim().toLocaleLowerCase('es-MX'))))
    .sort((left, right) => (ascending ? 1 : -1) * left.network.name.localeCompare(right.network.name, 'es-MX', { sensitivity: 'base' }));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  const pageRows = rows.slice((currentPage - 1) * size, currentPage * size);
  const related = confirmation ? associatedPolicies(confirmation.network.id) : [];
  const blocked = confirmation && (related.length > 0 || confirmation.network.voucherNotes.length > 0);
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setPage(1); };
  const createNetworkFromStations = (stationIds: string[]) => {
    setEditor({ network: null, initialStationIds: stationIds });
    setActiveView('networks');
  };

  return <div className="table-page networks">
    {storageError && <p className="network-editor__error" role="status">No fue posible guardar los cambios en este navegador. Se conservarán solo durante esta sesión.</p>}
    <div className="station-networks__tabs" role="group" aria-label="Vistas de Red de estaciones">
      <button type="button" className={activeView === 'map' ? 'is-active' : ''} aria-pressed={activeView === 'map'} onClick={() => setActiveView('map')}>Mapa de estaciones</button>
      <button type="button" className={activeView === 'networks' ? 'is-active' : ''} aria-pressed={activeView === 'networks'} onClick={() => setActiveView('networks')}>Redes personalizadas</button>
    </div>
    {activeView === 'map' ? <Suspense fallback={<p className="station-map__loading" role="status">Cargando mapa...</p>}><StationMap onCreateNetwork={createNetworkFromStations} /></Suspense> : <>
    <dl className="limits__summary networks__summary">
      <div><dt>Redes configuradas</dt><dd>{formatCount(networks.length)}</dd></div>
      <div><dt>Permitidas</dt><dd>{formatCount(networks.filter((network) => network.mode === 'allow').length)}</dd></div>
      <div><dt>No permitidas</dt><dd>{formatCount(networks.filter((network) => network.mode === 'block').length)}</dd></div>
      <div><dt>Políticas asociadas</dt><dd>{formatCount(policies.filter((policy) => policy.stationSubnetId !== null).length)}</dd></div>
    </dl>
    <section className="networks__catalog" aria-label="Redes de estaciones">
      <header className="table-page__head">
        <div><h2 className="table-page__title">Redes configuradas</h2><p className="table-page__sub">Catálogo de muestra · Guardado local en este navegador</p></div>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setEditor({ network: null })}><PlusIcon width={16} height={16} />Nueva red</button>
      </header>
      <div className="networks__filter">
        <label htmlFor="network-filter-field">Filtrar por</label>
        <select id="network-filter-field" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as FilterColumn)}>
          {COLUMNS.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
        </select>
        <label className="visually-hidden" htmlFor="network-column-filter">Filtrar por {COLUMNS.find((column) => column.key === activeFilter)?.label.toLocaleLowerCase('es-MX')}</label>
        <input id="network-column-filter" type="search" placeholder="Buscar redes" value={filters[activeFilter]} onChange={(event) => { setFilters({ ...filters, [activeFilter]: event.target.value }); setPage(1); }} />
        <button type="button" className="btn btn--ghost btn--sm" disabled={!filters[activeFilter]} onClick={() => { setFilters({ ...filters, [activeFilter]: '' }); setPage(1); }}>Limpiar</button>
        <button type="button" className="btn btn--ghost btn--sm networks__sort" title={ascending ? 'Ordenar de Z a A' : 'Ordenar de A a Z'} aria-label={ascending ? 'Ordenar de Z a A' : 'Ordenar de A a Z'} onClick={() => { setAscending(!ascending); setPage(1); }}>
          {ascending ? <TrendUpIcon width={16} height={16} /> : <TrendDownIcon width={16} height={16} />}Nombre: {ascending ? 'A–Z' : 'Z–A'}
        </button>
      </div>
      {Object.values(filters).some(Boolean) && <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>Limpiar todos los filtros</button>}
      <ul className="policies__list networks__cards">
        {pageRows.map(({ network, values }) => <li className={`policy-card network-card${network.mode === 'block' ? ' network-card--blocked' : ''}`} key={network.id}>
          <header className="policy-card__head">
            <h3 className="policy-card__name">{network.name}</h3>
            <span className={`chip ${network.mode === 'allow' ? 'chip--active' : 'chip--danger'}`}>{values.mode}</span>
          </header>
          <dl className="policy-card__summary" aria-label={`Resumen de ${network.name}`}>
            <div><dt>Estaciones</dt><dd>{formatCount(network.stationIds.length)}</dd></div>
            <div><dt>Políticas de uso</dt><dd><button type="button" className="network-card__metric" title="Ver políticas asociadas" aria-label={`Ver asociaciones de ${network.name}`} onClick={() => setConfirmation({ network, cancel: false })}>{values.policies}</button></dd></div>
            <div><dt>Nota Vales</dt><dd>{network.voucherNotes.length ? <button type="button" className="network-card__metric" title="Ver Nota Vales asociadas" aria-label={`Ver Nota Vales de ${network.name}`} onClick={() => setConfirmation({ network, cancel: false })}>{values.voucherNotes}</button> : '0'}</dd></div>
          </dl>
          <dl className="policy-card__locks">
            <div><dt>Última modificación</dt><dd>{values.updated}</dd></div>
            <div><dt>Usuario</dt><dd>{values.updatedBy}</dd></div>
          </dl>
          <footer className="policy-card__foot">
            <button type="button" className="btn btn--secondary btn--sm" aria-label={`Editar ${network.name}`} onClick={() => setEditor({ network })}><SlidersIcon width={15} height={15} />Editar</button>
            <button type="button" className="btn btn--ghost btn--sm networks__cancel" aria-label={`Cancelar ${network.name}`} onClick={() => setConfirmation({ network, cancel: true })}><CloseIcon width={15} height={15} />Cancelar red</button>
          </footer>
        </li>)}
      </ul>
      {!pageRows.length && <p className="networks__empty">{networks.length ? 'No hay redes que coincidan con los filtros.' : 'No hay redes de estaciones personalizadas configuradas.'}</p>}
      <NetworkPager label="redes" sizeLabel="Redes" page={currentPage} size={size} total={rows.length} onPage={setPage} onSize={(value) => { setSize(value); setPage(1); }} />
    </section>
    {editor && <StationNetworkDialog network={editor.network} networks={networks} initialStationIds={editor.initialStationIds} onClose={() => setEditor(null)} onSave={(network) => {
      const error = saveNetwork(network);
      if (!error) { setEditor(null); onNotice(editor.network ? 'Cambios de la red guardados.' : 'Red creada correctamente.'); }
      return error;
    }} />}
    {confirmation && <Modal open title={confirmation.cancel ? blocked ? 'No se puede cancelar esta red' : 'Cancelar red' : 'Configuraciones asociadas'} onClose={() => setConfirmation(null)}
      footer={confirmation.cancel && !blocked ? <>
        <button type="button" className="btn btn--ghost" onClick={() => setConfirmation(null)}>Conservar red</button>
        <button type="button" className="btn btn--primary networks__danger" onClick={() => {
          const error = cancelNetwork(confirmation.network.id);
          setConfirmation(null);
          onNotice(error ?? 'Red cancelada. Ya no está disponible en las políticas de uso.');
        }}>Cancelar red</button>
      </> : <button type="button" className="btn btn--primary" onClick={() => setConfirmation(null)}>Entendido</button>}>
      <p><strong>{confirmation.network.name}</strong></p>
      {confirmation.cancel && <p>{blocked ? 'La red está asociada a las siguientes configuraciones. Retira las asociaciones antes de cancelarla.' : 'La red dejará de estar disponible para nuevas políticas de uso.'}</p>}
      {!related.length && !confirmation.network.voucherNotes.length && !confirmation.cancel && <p>Esta red no tiene configuraciones asociadas.</p>}
      {related.length > 0 && <><h3 className="network-editor__title">Políticas de uso</h3><ul>{related.map((policy) => <li key={policy.id}>{policy.name}{policy.status === 'paused' ? ' · Pausada' : ''}</li>)}</ul></>}
      {confirmation.network.voucherNotes.length > 0 && <><h3 className="network-editor__title">Nota Vales · Muestra</h3><ul>{confirmation.network.voucherNotes.map((note) => <li key={note}>{note}</li>)}</ul></>}
    </Modal>}
    </>}
  </div>;
}