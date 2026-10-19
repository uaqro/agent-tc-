import { useMemo, useState } from 'react';
import { addToSelection, searchUnits, selectableNodes, unitsUnderNode } from '../../data/unitSelection';
import type { Vehicle } from '../../types/dispersion';
import { formatCount } from '../../utils/format';
import { SearchIcon } from '../icons/Icons';
import { Pagination, usePagination } from '../ui/Pagination';
import './UnitSelector.css';

interface UnitSelectorProps {
  vehicles: Vehicle[];
  selected: string[];
  onChange: (vehicleIds: string[]) => void;
}

const PAGE_SIZE = 20;

/**
 * Picks specific units for a funding rule out of a few hundred: search by plate, economic number or driver, mark a
 * whole org node at once, select what the search shows, and page through the list.
 */
export function UnitSelector({ vehicles, selected, onChange }: UnitSelectorProps) {
  const [query, setQuery] = useState('');
  const [nodeId, setNodeId] = useState('');
  const nodes = useMemo(selectableNodes, []);
  const visible = useMemo(() => searchUnits(vehicles, query), [vehicles, query]);
  const underNode = useMemo(() => (nodeId ? unitsUnderNode(vehicles, nodeId) : []), [vehicles, nodeId]);
  const pagination = usePagination(visible, PAGE_SIZE);
  const chosen = useMemo(() => new Set(selected), [selected]);

  const toggle = (vehicleId: string, checked: boolean) =>
    onChange(checked ? addToSelection(selected, [vehicleId]) : selected.filter((id) => id !== vehicleId));

  return (
    <div className="unit-selector">
      <div className="unit-selector__tools">
        <label className="unit-selector__search">
          <SearchIcon width={14} height={14} />
          <span className="visually-hidden">Buscar unidad</span>
          <input type="search" value={query} placeholder="Placa, ECO-xxxx o conductor" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="unit-selector__node">
          <span className="visually-hidden">Nodo del organigrama</span>
          <select value={nodeId} onChange={(event) => setNodeId(event.target.value)}>
            <option value="">Nodo del organigrama…</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {'  '.repeat(node.level - 1)}
                {node.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={underNode.length === 0}
          onClick={() => onChange(addToSelection(selected, underNode.map((vehicle) => vehicle.id)))}
        >
          Marcar sus {formatCount(underNode.length)} unidades
        </button>
      </div>

      <div className="unit-selector__bar">
        <span className="unit-selector__count" aria-live="polite">
          {formatCount(selected.length)} de {formatCount(vehicles.length)} seleccionadas
        </span>
        <div className="unit-selector__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={visible.length === 0}
            onClick={() => onChange(addToSelection(selected, visible.map((vehicle) => vehicle.id)))}
          >
            Seleccionar visibles ({formatCount(visible.length)})
          </button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={selected.length === 0} onClick={() => onChange([])}>
            Limpiar
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="unit-selector__empty">Ninguna unidad coincide con «{query}».</p>
      ) : (
        <ul className="unit-selector__list">
          {pagination.pageRows.map((vehicle) => (
            <li key={vehicle.id}>
              <label>
                <input type="checkbox" checked={chosen.has(vehicle.id)} onChange={(event) => toggle(vehicle.id, event.target.checked)} />
                <strong>{vehicle.plate}</strong>
                <span>
                  {vehicle.id} · {vehicle.driver}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <Pagination {...pagination} noun="unidades" onPage={pagination.setPage} />
    </div>
  );
}
