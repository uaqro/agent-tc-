import { useMemo, useState } from 'react';
import {
  ADVANCED_FILTER_FIELDS,
  DEFAULT_YIELD_UNIT,
  EVALUATE_BY,
  FILTER_OPERATORS,
  REPORT_GROUPERS,
  REPORT_TYPES,
  TRANSACTION_STATES,
  YIELD_UNITS,
  allReportColumns,
  defaultReportColumns,
  reportColumnGroups,
} from '../../data/reports';
import { today as businessToday } from '../../domain/demo/clock';
import { formatDateLong } from '../../utils/format';
import { CloseIcon, NoDataIcon, PlusIcon, RuleIcon, SearchIcon } from '../icons/Icons';
import { EmptyState } from '../ui/EmptyState';
import './DynamicReportBuilder.css';

interface AdvancedFilter {
  id: number;
  field: string;
  operator: string;
  value: string;
}

interface GeneratedReport {
  type: string;
  from: string;
  to: string;
  grouper: string;
  columns: string[];
}

const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Month to date of the business date (the demo date by default). */
function defaultRange(today = businessToday()) {
  return { from: toISODate(new Date(today.getFullYear(), today.getMonth(), 1)), to: toISODate(today) };
}

let filterSequence = 0;

export function DynamicReportBuilder() {
  const [type, setType] = useState(REPORT_TYPES[0]);
  const [yieldUnit, setYieldUnit] = useState(DEFAULT_YIELD_UNIT);
  const [grouper, setGrouper] = useState(REPORT_GROUPERS[0]);
  const [from, setFrom] = useState(() => defaultRange().from);
  const [to, setTo] = useState(() => defaultRange().to);
  const [evaluateBy, setEvaluateBy] = useState(EVALUATE_BY[0]);
  const [state, setState] = useState(TRANSACTION_STATES[0]);
  const [filters, setFilters] = useState<AdvancedFilter[]>([]);
  const [selected, setSelected] = useState<string[]>(defaultReportColumns);
  const [columnQuery, setColumnQuery] = useState('');
  const [generated, setGenerated] = useState<GeneratedReport | null>(null);

  const visibleGroups = useMemo(() => {
    const needle = columnQuery.trim().toLowerCase();
    if (!needle) return reportColumnGroups;
    return reportColumnGroups
      .map((group) => ({ ...group, columns: group.columns.filter((column) => column.toLowerCase().includes(needle)) }))
      .filter((group) => group.columns.length > 0);
  }, [columnQuery]);

  const periodValid = from !== '' && to !== '' && from <= to;
  const allSelected = selected.length === allReportColumns.length;

  const setColumns = (columns: string[], checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      columns.forEach((column) => (checked ? next.add(column) : next.delete(column)));
      // Keeps the catalogue order, which is the order of the columns in the report.
      return allReportColumns.filter((column) => next.has(column));
    });

  const patchFilter = (id: number, changes: Partial<AdvancedFilter>) =>
    setFilters((current) => current.map((filter) => (filter.id === id ? { ...filter, ...changes } : filter)));

  const reset = () => {
    setType(REPORT_TYPES[0]);
    setYieldUnit(DEFAULT_YIELD_UNIT);
    setGrouper(REPORT_GROUPERS[0]);
    const range = defaultRange();
    setFrom(range.from);
    setTo(range.to);
    setEvaluateBy(EVALUATE_BY[0]);
    setState(TRANSACTION_STATES[0]);
    setFilters([]);
    setSelected(defaultReportColumns);
    setColumnQuery('');
    setGenerated(null);
  };

  return (
    <div className="report-builder">
      <div className="report-builder__form">
        <fieldset className="report-builder__block">
          <legend>Reporte</legend>
          <div className="report-builder__fields">
            <label className="report-builder__field">
              <span>Tipo de reporte</span>
              <select value={type} onChange={(event) => setType(event.target.value)}>
                {REPORT_TYPES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="report-builder__field">
              <span>Rendimiento</span>
              <select value={yieldUnit} onChange={(event) => setYieldUnit(event.target.value)}>
                {YIELD_UNITS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="report-builder__field">
              <span>Agrupar por</span>
              <select value={grouper} onChange={(event) => setGrouper(event.target.value)}>
                {REPORT_GROUPERS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="report-builder__block">
          <legend>Filtros básicos</legend>
          <div className="report-builder__fields report-builder__fields--four">
            <label className="report-builder__field">
              <span>Período · desde</span>
              <input type="date" required value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label className="report-builder__field">
              <span>Período · hasta</span>
              <input type="date" required value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
            </label>
            <label className="report-builder__field">
              <span>Evaluar por</span>
              <select value={evaluateBy} onChange={(event) => setEvaluateBy(event.target.value)}>
                {EVALUATE_BY.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="report-builder__field">
              <span>Estado de la transacción</span>
              <select value={state} onChange={(event) => setState(event.target.value)}>
                {TRANSACTION_STATES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          {!periodValid && (
            <p className="report-builder__error" role="alert">
              Indica un período válido: la fecha inicial no puede ser posterior a la final.
            </p>
          )}
        </fieldset>

        <fieldset className="report-builder__block">
          <legend>Filtros avanzados</legend>

          {filters.length === 0 ? (
            <p className="report-builder__note">
              Sin filtros avanzados: el reporte incluye todas las transacciones del período.
            </p>
          ) : (
            <ul className="report-builder__filters">
              {filters.map((filter) => (
                <li key={filter.id}>
                  <select
                    aria-label="Filtro"
                    value={filter.field}
                    onChange={(event) => patchFilter(filter.id, { field: event.target.value })}
                  >
                    {ADVANCED_FILTER_FIELDS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Operador"
                    value={filter.operator}
                    onChange={(event) => patchFilter(filter.id, { operator: event.target.value })}
                  >
                    {FILTER_OPERATORS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    aria-label={`Valor de ${filter.field}`}
                    placeholder="Valor"
                    value={filter.value}
                    onChange={(event) => patchFilter(filter.id, { value: event.target.value })}
                  />
                  <button
                    type="button"
                    className="report-builder__remove"
                    onClick={() => setFilters((current) => current.filter((candidate) => candidate.id !== filter.id))}
                  >
                    <CloseIcon width={15} height={15} />
                    <span className="visually-hidden">Quitar filtro de {filter.field}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() =>
              setFilters((current) => [
                ...current,
                { id: ++filterSequence, field: ADVANCED_FILTER_FIELDS[0], operator: FILTER_OPERATORS[0], value: '' },
              ])
            }
          >
            <PlusIcon width={14} height={14} />
            Agregar filtro
          </button>
        </fieldset>

        <fieldset className="report-builder__block">
          <legend>
            Columnas a mostrar · {selected.length} de {allReportColumns.length}
          </legend>

          <div className="report-builder__columns-tools">
            <label className="report-builder__search">
              <SearchIcon width={15} height={15} />
              <span className="visually-hidden">Buscar columna</span>
              <input
                type="search"
                placeholder="Buscar columna"
                value={columnQuery}
                onChange={(event) => setColumnQuery(event.target.value)}
              />
            </label>
            <label className="report-builder__check">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => setColumns(allReportColumns, event.target.checked)}
              />
              Seleccionar todo
            </label>
          </div>

          <div className="report-builder__columns">
            {visibleGroups.map((group) => {
              const groupSelected = group.columns.every((column) => selected.includes(column));
              return (
                <section className="report-builder__group" key={group.id}>
                  <header>
                    <h3>{group.label}</h3>
                    <button type="button" onClick={() => setColumns(group.columns, !groupSelected)}>
                      {groupSelected ? 'Quitar todas' : 'Marcar todas'}
                    </button>
                  </header>
                  <div className="report-builder__group-grid">
                    {group.columns.map((column) => (
                      <label className="report-builder__check" key={column}>
                        <input
                          type="checkbox"
                          checked={selected.includes(column)}
                          onChange={(event) => setColumns([column], event.target.checked)}
                        />
                        {column}
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}

            {visibleGroups.length === 0 && (
              <EmptyState
                compact
                icon={<SearchIcon width={20} height={20} />}
                title={`Ninguna columna coincide con “${columnQuery.trim()}”`}
                actions={
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => setColumnQuery('')}>
                    Limpiar búsqueda
                  </button>
                }
              />
            )}
          </div>

          {selected.length === 0 && (
            <p className="report-builder__error" role="alert">
              Elige al menos una columna para generar el reporte.
            </p>
          )}
        </fieldset>

        <div className="report-builder__actions">
          <button type="button" className="btn btn--ghost" onClick={reset}>
            Restablecer
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!periodValid || selected.length === 0}
            onClick={() => setGenerated({ type, from, to, grouper, columns: selected })}
          >
            Generar reporte
          </button>
        </div>
      </div>

      <section className="report-builder__result" aria-live="polite" aria-label="Resultado del reporte">
        {generated ? (
          <>
            <div className="report-builder__preview">
              <table>
                <thead>
                  <tr>
                    {generated.columns.map((column) => (
                      <th scope="col" key={column}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>
            <EmptyState
              icon={<NoDataIcon width={24} height={24} />}
              title="No hay transacciones que coincidan"
              description={`${generated.type} del ${formatDateLong(generated.from)} al ${formatDateLong(generated.to)}, agrupado por ${generated.grouper}. Amplía el período, cambia el estado de la transacción o quita filtros avanzados.`}
            />
          </>
        ) : (
          <EmptyState
            icon={<RuleIcon width={22} height={22} />}
            title="Aún no has generado el reporte"
            description="Define el período, los filtros, el agrupador y las columnas; al generar, las transacciones aparecen aquí."
          />
        )}
      </section>
    </div>
  );
}
