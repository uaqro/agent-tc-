import { useState } from 'react';
import { Checkbox, Input, Radio, Select, Table, type GridColumn } from '@er-mobility-mx/design-system';
import { Modal } from '../ui/Modal';
import { ArrowLeftIcon, ChevronIcon } from '../icons/Icons';
import { networkStations, stationBrands, stationLocations, type StationNetwork } from '../../data/stationNetworks';
import { formatCount } from '../../utils/format';
import { account } from '../../data/dispersion';

export function NetworkPager({ page, size, total, onPage, onSize, label, sizeLabel = 'Filas' }: {
  page: number; size: number; total: number; onPage: (page: number) => void; onSize: (size: number) => void; label: string; sizeLabel?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  const sizeControlLabel = `${label} por página`;
  return <div className="networks__pager">
    <span>{total ? `${formatCount((page - 1) * size + 1)}–${formatCount(Math.min(page * size, total))}` : '0'} de {formatCount(total)}</span>
    <div>
      <label>{sizeLabel} <span id={`${label}-page-size-label`} className="visually-hidden">{sizeControlLabel}</span>
        <Select
          aria-labelledby={`${label}-page-size-label`}
          options={[10, 25, 50].map((value) => ({ value: String(value), label: String(value) }))}
          value={String(size)}
          style={{ width: '6rem' }}
          onChange={(value) => {
            const nextSize = Number(value);
            if ([10, 25, 50].includes(nextSize)) onSize(nextSize);
          }}
        />
      </label>
      <button type="button" className="networks__icon" aria-label={`Página anterior de ${label}`} title="Página anterior" disabled={page <= 1} onClick={() => onPage(page - 1)}><ArrowLeftIcon width={16} height={16} /></button>
      <span>{page} / {pages}</span>
      <button type="button" className="networks__icon" aria-label={`Página siguiente de ${label}`} title="Página siguiente" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronIcon width={16} height={16} /></button>
    </div>
  </div>;
}

export function StationNetworkDialog({ network, networks, initialStationIds = [], onClose, onSave }: {
  network: StationNetwork | null;
  networks: StationNetwork[];
  initialStationIds?: string[];
  onClose: () => void;
  onSave: (network: StationNetwork) => string | null;
}) {
  const [name, setName] = useState(network?.name ?? '');
  const [mode, setMode] = useState<StationNetwork['mode']>(network?.mode ?? 'allow');
  const [selected, setSelected] = useState(() => new Set(network?.stationIds ?? initialStationIds));
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(() => initialStationIds.length > 0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [error, setError] = useState('');
  const needle = query.trim().toLocaleLowerCase('es-MX');
  const filtered = networkStations.filter((station) => (!state || station.state === state) &&
    (!city || station.city === city) && (!brand || station.brand === brand) && (!selectedOnly || selected.has(station.id)) &&
    (!needle || `${station.id} ${station.name} ${station.state} ${station.city} ${station.brand}`.toLocaleLowerCase('es-MX').includes(needle)));
  const selectedCount = filtered.filter((station) => selected.has(station.id)).length;
  const allSelected = filtered.length > 0 && selectedCount === filtered.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / size)));
  const rows = filtered.slice((currentPage - 1) * size, currentPage * size);
  const stationColumns: GridColumn<(typeof networkStations)[number]>[] = [
    {
      key: 'selection',
      label: 'Seleccionar',
      align: 'center',
      render: (station) => (
        <Checkbox
          ariaLabel={`Seleccionar ${station.id} · ${station.name}`}
          checked={selected.has(station.id)}
          onChange={() => toggleStation(station.id)}
        />
      ),
    },
    { key: 'id', label: 'ID', mono: true },
    { key: 'name', label: 'Estación', render: (station) => <strong>{station.name}</strong> },
    { key: 'city', label: 'Ciudad / municipio' },
    { key: 'state', label: 'Estado' },
    { key: 'brand', label: 'Marca' },
  ];
  const cities = state ? stationLocations[state] : [...new Set(Object.values(stationLocations).flat())].sort((left, right) => left.localeCompare(right, 'es-MX'));

  const toggleFiltered = () => setSelected((current) => {
    const next = new Set(current);
    filtered.forEach((station) => allSelected ? next.delete(station.id) : next.add(station.id));
    return next;
  });
  const toggleStation = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = () => {
    if (!name.trim()) { setError('Ingresa el nombre de la red.'); return; }
    if (networks.some((candidate) => candidate.id !== network?.id && candidate.name.trim().toLocaleLowerCase('es-MX') === name.trim().toLocaleLowerCase('es-MX'))) {
      setError('Ya existe una red con ese nombre.'); return;
    }
    if (!selected.size) { setError('Selecciona al menos una estación.'); return; }
    const today = new Date();
    const result = onSave({
      id: network?.id ?? `red-${crypto.randomUUID()}`,
      name: name.trim(), mode, stationIds: [...selected],
      updated: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
      updatedBy: account.user, voucherNotes: network?.voucherNotes ?? [],
    });
    if (result) setError(result);
  };

  return <Modal open size="lg" title={network ? 'Editar red de estaciones' : 'Nueva red de estaciones'} onClose={onClose}
    footer={<><button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
      <button type="button" className="btn btn--primary" onClick={save}>{network ? 'Guardar cambios' : 'Crear red'}</button></>}>
    <div className="network-editor">
      <div className="network-editor__identity">
        <div className="network-editor__field">
          <label htmlFor="station-network-name">Nombre de la red <small>{name.length}/50</small></label>
          <Input
            id="station-network-name"
            autoFocus
            type="text"
            value={name}
            onChange={(value) => { setName(value.slice(0, 50)); setError(''); }}
            placeholder="Ej. Red de estaciones Bajío"
            style={{ width: '100%', maxWidth: 'none' }}
          />
        </div>
        <fieldset className="network-editor__mode">
          <legend>La red contiene estaciones</legend>
          <Radio name="network-mode" value="allow" checked={mode === 'allow'} label="Permitidas" onChange={() => setMode('allow')} />
          <Radio name="network-mode" value="block" checked={mode === 'block'} label="No permitidas" onChange={() => setMode('block')} />
        </fieldset>
      </div>
      <h3 className="network-editor__title">Estaciones</h3>
      <div className="network-editor__filters">
        <div className="table-page__flow-search network-editor__flow-search">
          <Input
            type="search"
            icon="search"
            size="sm"
            ariaLabel="Buscar estaciones"
            placeholder="Nombre, ID o ubicación"
            value={query}
            onChange={(value) => { setQuery(value); setPage(1); }}
            style={{ width: '100%', maxWidth: 'none' }}
          />
        </div>
        <span id="station-state-filter-label" className="visually-hidden">Filtrar por estado</span>
        <Select
          aria-labelledby="station-state-filter-label"
          options={[
            { value: '', label: 'Todos los estados' },
            ...Object.keys(stationLocations).map((location) => ({ value: location, label: location })),
          ]}
          value={state}
          style={{ width: '100%' }}
          onChange={(value) => { setState(value); setCity(''); setPage(1); }}
        />
        <span id="station-city-filter-label" className="visually-hidden">Filtrar por ciudad o municipio</span>
        <Select
          aria-labelledby="station-city-filter-label"
          options={[
            { value: '', label: 'Todas las ciudades' },
            ...cities.map((location) => ({ value: location, label: location })),
          ]}
          value={city}
          style={{ width: '100%' }}
          onChange={(value) => { setCity(value); setPage(1); }}
        />
        <span id="station-brand-filter-label" className="visually-hidden">Filtrar por marca</span>
        <Select
          aria-labelledby="station-brand-filter-label"
          options={[
            { value: '', label: 'Todas las marcas' },
            ...stationBrands.map((item) => ({ value: item, label: item })),
          ]}
          value={brand}
          style={{ width: '100%' }}
          onChange={(value) => { setBrand(value); setPage(1); }}
        />
      </div>
      <div className="network-editor__selection" aria-live="polite">
        <strong>{formatCount(selected.size)} estaciones seleccionadas</strong>
        <Checkbox
          ariaLabel={`Seleccionar todas las estaciones filtradas (${filtered.length})`}
          label="Seleccionar todas las filtradas"
          checked={allSelected}
          indeterminate={selectedCount > 0 && !allSelected}
          disabled={!filtered.length}
          onChange={toggleFiltered}
        />
        <Checkbox
          label="Solo seleccionadas"
          checked={selectedOnly}
          onChange={(checked) => { setSelectedOnly(checked); setPage(1); }}
        />
        <button type="button" className="btn btn--ghost btn--sm" disabled={!selected.size} onClick={() => setSelected(new Set())}>Limpiar selección</button>
      </div>
      {rows.length > 0 ? (
        <Table
          caption="Estaciones disponibles para la red"
          columns={stationColumns}
          rows={rows}
          rowKey="id"
          surface="none"
          sortable={false}
          density="compact"
        />
      ) : (
        <p className="networks__empty">No hay estaciones con estos filtros.</p>
      )}
      <NetworkPager page={currentPage} size={size} total={filtered.length} label="estaciones" onPage={setPage} onSize={(value) => { setSize(value); setPage(1); }} />
      {error && <p className="network-editor__error" role="alert">{error}</p>}
    </div>
  </Modal>;
}