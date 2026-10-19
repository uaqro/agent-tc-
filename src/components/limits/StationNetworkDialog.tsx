import { useEffect, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { ArrowLeftIcon, ChevronIcon, SearchIcon } from '../icons/Icons';
import { networkStations, stationBrands, stationLocations, type StationNetwork } from '../../data/stationNetworks';
import { formatCount } from '../../utils/format';
import { account } from '../../data/dispersion';

export function NetworkPager({ page, size, total, onPage, onSize, label, sizeLabel = 'Filas' }: {
  page: number; size: number; total: number; onPage: (page: number) => void; onSize: (size: number) => void; label: string; sizeLabel?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <div className="networks__pager">
    <span>{total ? `${formatCount((page - 1) * size + 1)}–${formatCount(Math.min(page * size, total))}` : '0'} de {formatCount(total)}</span>
    <div>
      <label>{sizeLabel} <select aria-label={`${label} por página`} value={size} onChange={(event) => onSize(Number(event.target.value))}>
        {[10, 25, 50].map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <button type="button" className="networks__icon" aria-label={`Página anterior de ${label}`} title="Página anterior" disabled={page <= 1} onClick={() => onPage(page - 1)}><ArrowLeftIcon width={16} height={16} /></button>
      <span>{page} / {pages}</span>
      <button type="button" className="networks__icon" aria-label={`Página siguiente de ${label}`} title="Página siguiente" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronIcon width={16} height={16} /></button>
    </div>
  </div>;
}

export function StationNetworkDialog({ network, networks, onClose, onSave }: {
  network: StationNetwork | null;
  networks: StationNetwork[];
  onClose: () => void;
  onSave: (network: StationNetwork) => string | null;
}) {
  const [name, setName] = useState(network?.name ?? '');
  const [mode, setMode] = useState<StationNetwork['mode']>(network?.mode ?? 'allow');
  const [selected, setSelected] = useState(() => new Set(network?.stationIds ?? []));
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [error, setError] = useState('');
  const selectAllRef = useRef<HTMLInputElement>(null);
  const needle = query.trim().toLocaleLowerCase('es-MX');
  const filtered = networkStations.filter((station) => (!state || station.state === state) &&
    (!city || station.city === city) && (!brand || station.brand === brand) && (!selectedOnly || selected.has(station.id)) &&
    (!needle || `${station.id} ${station.name} ${station.state} ${station.city} ${station.brand}`.toLocaleLowerCase('es-MX').includes(needle)));
  const selectedCount = filtered.filter((station) => selected.has(station.id)).length;
  const allSelected = filtered.length > 0 && selectedCount === filtered.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / size)));
  const rows = filtered.slice((currentPage - 1) * size, currentPage * size);
  const cities = state ? stationLocations[state] : [...new Set(Object.values(stationLocations).flat())].sort((left, right) => left.localeCompare(right, 'es-MX'));

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedCount > 0 && !allSelected;
  }, [selectedCount, allSelected]);

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
        <label className="network-editor__field"><span>Nombre de la red <small>{name.length}/50</small></span>
          <input autoFocus type="text" maxLength={50} value={name} onChange={(event) => { setName(event.target.value); setError(''); }} placeholder="Ej. Red de estaciones Bajío" />
        </label>
        <fieldset className="network-editor__mode"><legend>La red contiene estaciones</legend>
          <label><input type="radio" name="network-mode" checked={mode === 'allow'} onChange={() => setMode('allow')} />Permitidas</label>
          <label><input type="radio" name="network-mode" checked={mode === 'block'} onChange={() => setMode('block')} />No permitidas</label>
        </fieldset>
      </div>
      <h3 className="network-editor__title">Estaciones</h3>
      <div className="network-editor__filters">
        <label className="table-page__search"><SearchIcon width={16} height={16} /><input type="search" aria-label="Buscar estaciones" placeholder="Nombre, ID o ubicación" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label>
        <select aria-label="Filtrar por estado" value={state} onChange={(event) => { setState(event.target.value); setCity(''); setPage(1); }}><option value="">Todos los estados</option>{Object.keys(stationLocations).map((location) => <option key={location}>{location}</option>)}</select>
        <select aria-label="Filtrar por ciudad o municipio" value={city} onChange={(event) => { setCity(event.target.value); setPage(1); }}><option value="">Todas las ciudades</option>{cities.map((location) => <option key={location}>{location}</option>)}</select>
        <select aria-label="Filtrar por marca" value={brand} onChange={(event) => { setBrand(event.target.value); setPage(1); }}><option value="">Todas las marcas</option>{stationBrands.map((item) => <option key={item}>{item}</option>)}</select>
      </div>
      <div className="network-editor__selection" aria-live="polite">
        <strong>{formatCount(selected.size)} estaciones seleccionadas</strong>
        <label><input type="checkbox" checked={selectedOnly} onChange={(event) => { setSelectedOnly(event.target.checked); setPage(1); }} />Solo seleccionadas</label>
        <button type="button" className="btn btn--ghost btn--sm" disabled={!selected.size} onClick={() => setSelected(new Set())}>Limpiar selección</button>
      </div>
      <div className="table-page__scroll">
        <table className="table-page__table network-editor__table"><thead><tr>
          <th><input type="checkbox" ref={selectAllRef} aria-label={`Seleccionar todas las estaciones filtradas (${filtered.length})`} checked={allSelected} disabled={!filtered.length} onChange={toggleFiltered} /></th>
          <th>ID</th><th>Estación</th><th>Ciudad / municipio</th><th>Estado</th><th>Marca</th>
        </tr></thead><tbody>
          {rows.map((station) => <tr key={station.id}>
            <td><input type="checkbox" aria-label={`Seleccionar ${station.id} · ${station.name}`} checked={selected.has(station.id)} onChange={() => toggleStation(station.id)} /></td>
            <td>{station.id}</td><td><strong>{station.name}</strong></td><td>{station.city}</td><td>{station.state}</td><td>{station.brand}</td>
          </tr>)}
          {!rows.length && <tr><td colSpan={6} className="networks__empty">No hay estaciones con estos filtros.</td></tr>}
        </tbody></table>
      </div>
      <NetworkPager page={currentPage} size={size} total={filtered.length} label="estaciones" onPage={setPage} onSize={(value) => { setSize(value); setPage(1); }} />
      {error && <p className="network-editor__error" role="alert">{error}</p>}
    </div>
  </Modal>;
}