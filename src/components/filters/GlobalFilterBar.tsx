import { useState } from 'react';
import { FUEL_LABELS, FUEL_PRODUCTS, FUEL_PRODUCT_LABELS, FUEL_TYPES } from '../../domain/dashboard/types';
import type { FilterChip } from '../../domain/filters/describe';
import { visibleDrivers, visibleUnits } from '../../domain/filters/options';
import {
  ANY,
  MAX_PERIOD_DAYS,
  MIN_PERIOD_DAYS,
  NO_DRIVER,
  PERIOD_PRESETS,
  activeCount,
  clampPeriodDays,
  granularityOf,
  type GlobalFilters,
} from '../../domain/filters/types';
import { groupLabel } from '../../data/client';
import { CloseIcon, SlidersIcon } from '../icons/Icons';
import { useGlobalFilters } from './GlobalFilters';
import './GlobalFilterBar.css';

interface GlobalFilterBarProps {
  /** What the filters cut on this page, said next to the controls so nobody expects more. */
  scopeNote: string;
}

/**
 * Short text of an active filter. Groups drop their code and org nodes drop the level when the name already says it
 * ("División Noreste", not "División · División Noreste").
 */
export function chipText(chip: FilterChip): string {
  if (chip.dimension === 'group') return groupLabel(chip.label);
  if (chip.dimension === 'orgNodeId') {
    const [level, ...rest] = chip.label.split(' · ');
    const name = rest.join(' · ');
    return name.startsWith(level) ? name : chip.label;
  }
  return chip.label;
}

/** Dimensions behind "Más filtros". They are set less often and would crowd the first row. */
const SECONDARY: (keyof GlobalFilters)[] = ['costCenter', 'routeId', 'fuel', 'behavior', 'unitId', 'driverId'];

export function GlobalFilterBar({ scopeNote }: GlobalFilterBarProps) {
  const { filters, options, chips, update, clearDimension, clearAll, storageError } = useGlobalFilters();
  const [expanded, setExpanded] = useState(() => SECONDARY.some((dimension) => filters[dimension] !== ANY));
  const granularity = granularityOf(filters.periodDays);
  const units = visibleUnits(options, filters);
  const drivers = visibleDrivers(options, filters);

  return (
    <section className="global-filters" aria-label="Filtros globales">
      <div className="global-filters__row">
        <div className="global-filters__period" role="group" aria-label="Periodo">
          {PERIOD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`global-filters__preset${granularity === preset.id ? ' is-active' : ''}`}
              aria-pressed={granularity === preset.id}
              onClick={() => update({ periodDays: preset.days })}
            >
              {preset.label}
            </button>
          ))}
          <label className={`global-filters__custom${granularity === 'personalizado' ? ' is-active' : ''}`}>
            <span>Últimos</span>
            <input
              type="number"
              min={MIN_PERIOD_DAYS}
              max={MAX_PERIOD_DAYS}
              value={filters.periodDays}
              onChange={(event) => {
                const days = Number(event.target.value);
                if (Number.isFinite(days) && days > 0) update({ periodDays: clampPeriodDays(days) });
              }}
            />
            <span>días</span>
          </label>
        </div>

        <label className="global-filters__field">
          <span>Organigrama</span>
          <select value={filters.orgNodeId} onChange={(event) => update({ orgNodeId: event.target.value })}>
            <option value={ANY}>Toda la empresa</option>
            {options.orgNodes
              .filter((node) => node.level > 0)
              .map((node) => (
                <option key={node.value} value={node.value}>
                  {'  '.repeat(node.level - 1)}
                  {node.label}
                </option>
              ))}
          </select>
        </label>

        <label className="global-filters__field">
          <span>Producto</span>
          <select value={filters.product} onChange={(event) => update({ product: event.target.value as GlobalFilters['product'] })}>
            <option value={ANY}>Todos</option>
            {FUEL_PRODUCTS.map((product) => (
              <option key={product} value={product}>
                {FUEL_PRODUCT_LABELS[product]}
              </option>
            ))}
          </select>
        </label>

        <label className="global-filters__field">
          <span>Grupo</span>
          <select value={filters.group} onChange={(event) => update({ group: event.target.value })}>
            <option value={ANY}>Todos</option>
            {options.groups.map((group) => (
              <option key={group.value} value={group.value}>
                {groupLabel(group.label)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn--ghost btn--sm global-filters__more"
          aria-expanded={expanded}
          aria-controls="global-filters-more"
          onClick={() => setExpanded((open) => !open)}
        >
          <SlidersIcon width={14} height={14} />
          {expanded ? 'Menos filtros' : 'Más filtros'}
        </button>
      </div>

      {expanded && (
        <div className="global-filters__row" id="global-filters-more">
          <label className="global-filters__field">
            <span>Centro de costo</span>
            <select value={filters.costCenter} onChange={(event) => update({ costCenter: event.target.value })}>
              <option value={ANY}>Todos</option>
              {options.costCenters.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="global-filters__field">
            <span>Ruta</span>
            <select value={filters.routeId} onChange={(event) => update({ routeId: event.target.value })}>
              <option value={ANY}>Todas</option>
              {options.routes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="global-filters__field">
            <span>Combustible</span>
            <select value={filters.fuel} onChange={(event) => update({ fuel: event.target.value as GlobalFilters['fuel'] })}>
              <option value={ANY}>Todos</option>
              {FUEL_TYPES.map((fuel) => (
                <option key={fuel} value={fuel}>
                  {FUEL_LABELS[fuel]}
                </option>
              ))}
            </select>
          </label>
          <label className="global-filters__field">
            <span>Conducción</span>
            <select
              value={filters.behavior}
              onChange={(event) => update({ behavior: event.target.value as GlobalFilters['behavior'] })}
            >
              <option value={ANY}>Toda</option>
              {options.behaviors.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="global-filters__field">
            <span>Unidad</span>
            <select value={filters.unitId} onChange={(event) => update({ unitId: event.target.value })}>
              <option value={ANY}>Todas · {units.length}</option>
              {units.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </label>
          <label className="global-filters__field">
            <span>Conductor</span>
            <select value={filters.driverId} onChange={(event) => update({ driverId: event.target.value })}>
              <option value={ANY}>Todos · {drivers.length}</option>
              <option value={NO_DRIVER}>Sin conductor asignado</option>
              {drivers.map((driver) => (
                <option key={driver.value} value={driver.value}>
                  {driver.label}
                  {driver.licenseExpired ? ' · licencia vencida' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="global-filters__status">
        {chips.length > 0 ? (
          <ul className="global-filters__chips" aria-label={`${activeCount(filters)} filtros activos`}>
            {chips.map((chip) => (
              <li key={chip.dimension} className="global-filters__chip">
                <span className="global-filters__chip-name">{chip.name}</span>
                {chipText(chip)}
                <button type="button" onClick={() => clearDimension(chip.dimension)} aria-label={`Quitar filtro de ${chip.name}`}>
                  <CloseIcon width={12} height={12} />
                </button>
              </li>
            ))}
            <li>
              <button type="button" className="global-filters__clear" onClick={clearAll}>
                Limpiar filtros
              </button>
            </li>
          </ul>
        ) : (
          <span>Sin filtros: toda la flota.</span>
        )}
        <span className="global-filters__note">{scopeNote}</span>
      </div>
      {storageError && <p className="global-filters__warning">{storageError}</p>}
    </section>
  );
}
