import { useState } from 'react';
import { Select } from '@er-mobility-mx/design-system';
import { DRIVING_BEHAVIORS, FUEL_LABELS, FUEL_PRODUCTS, FUEL_PRODUCT_LABELS, FUEL_TYPES } from '../../domain/dashboard/types';
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
import { groupLabel, scopeLabel } from '../../data/client';
import { useSession } from '../session/Session';
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

interface GlobalFilterSelectProps {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

function GlobalFilterSelect({ id, label, options, value, onChange }: GlobalFilterSelectProps) {
  const labelId = `${id}-label`;
  return (
    <div className="global-filters__field">
      <span id={labelId}>{label}</span>
      <Select
        id={id}
        aria-labelledby={labelId}
        options={options}
        value={value}
        onChange={onChange}
        style={{ width: '100%', maxWidth: 240 }}
      />
    </div>
  );
}

function hasOption<T extends string>(values: readonly T[], value: string): value is T {
  return values.some((candidate) => candidate === value);
}

export function GlobalFilterBar({ scopeNote }: GlobalFilterBarProps) {
  const { filters, options, chips, update, clearDimension, clearAll, storageError } = useGlobalFilters();
  const { principal } = useSession();
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

        <GlobalFilterSelect
          id="global-filter-org"
          label="Organigrama"
          options={[
            { value: ANY, label: principal.scopeNodeId === null ? 'Toda la empresa' : `Todo ${scopeLabel(principal.scopeNodeId)}` },
            ...options.orgNodes
              .filter((node) => node.level > 0)
              .map((node) => ({
                value: node.value,
                label: `${'  '.repeat(node.level - 1)}${node.label}`,
              })),
          ]}
          value={filters.orgNodeId}
          onChange={(value) => {
            if (value === ANY || options.orgNodes.some((node) => node.value === value && node.level > 0)) {
              update({ orgNodeId: value });
            }
          }}
        />

        <GlobalFilterSelect
          id="global-filter-product"
          label="Producto"
          options={[
            { value: ANY, label: 'Todos' },
            ...FUEL_PRODUCTS.map((product) => ({ value: product, label: FUEL_PRODUCT_LABELS[product] })),
          ]}
          value={filters.product}
          onChange={(value) => {
            if (value === ANY || hasOption(FUEL_PRODUCTS, value)) update({ product: value });
          }}
        />

        <GlobalFilterSelect
          id="global-filter-group"
          label="Grupo"
          options={[
            { value: ANY, label: 'Todos' },
            ...options.groups.map((group) => ({ value: group.value, label: groupLabel(group.label) })),
          ]}
          value={filters.group}
          onChange={(value) => {
            if (value === ANY || options.groups.some((group) => group.value === value)) update({ group: value });
          }}
        />

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
          <GlobalFilterSelect
            id="global-filter-cost-center"
            label="Centro de costo"
            options={[
              { value: ANY, label: 'Todos' },
              ...options.costCenters.map((option) => ({ value: option.value, label: option.label })),
            ]}
            value={filters.costCenter}
            onChange={(value) => {
              if (value === ANY || options.costCenters.some((option) => option.value === value)) update({ costCenter: value });
            }}
          />
          <GlobalFilterSelect
            id="global-filter-route"
            label="Ruta"
            options={[
              { value: ANY, label: 'Todas' },
              ...options.routes.map((option) => ({ value: option.value, label: option.label })),
            ]}
            value={filters.routeId}
            onChange={(value) => {
              if (value === ANY || options.routes.some((option) => option.value === value)) update({ routeId: value });
            }}
          />
          <GlobalFilterSelect
            id="global-filter-fuel"
            label="Combustible"
            options={[
              { value: ANY, label: 'Todos' },
              ...FUEL_TYPES.map((fuel) => ({ value: fuel, label: FUEL_LABELS[fuel] })),
            ]}
            value={filters.fuel}
            onChange={(value) => {
              if (value === ANY || hasOption(FUEL_TYPES, value)) update({ fuel: value });
            }}
          />
          <GlobalFilterSelect
            id="global-filter-behavior"
            label="Conducción"
            options={[
              { value: ANY, label: 'Toda' },
              ...options.behaviors.map((option) => ({ value: option.value, label: option.label })),
            ]}
            value={filters.behavior}
            onChange={(value) => {
              if (value === ANY || hasOption(DRIVING_BEHAVIORS, value)) update({ behavior: value });
            }}
          />
          <GlobalFilterSelect
            id="global-filter-unit"
            label="Unidad"
            options={[
              { value: ANY, label: `Todas · ${units.length}` },
              ...units.map((unit) => ({ value: unit.value, label: unit.label })),
            ]}
            value={filters.unitId}
            onChange={(value) => {
              if (value === ANY || units.some((unit) => unit.value === value)) update({ unitId: value });
            }}
          />
          <GlobalFilterSelect
            id="global-filter-driver"
            label="Conductor"
            options={[
              { value: ANY, label: `Todos · ${drivers.length}` },
              { value: NO_DRIVER, label: 'Sin conductor asignado' },
              ...drivers.map((driver) => ({
                value: driver.value,
                label: `${driver.label}${driver.licenseExpired ? ' · licencia vencida' : ''}`,
              })),
            ]}
            value={filters.driverId}
            onChange={(value) => {
              if (value === ANY || value === NO_DRIVER || drivers.some((driver) => driver.value === value)) {
                update({ driverId: value });
              }
            }}
          />
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
