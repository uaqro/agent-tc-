import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  ADVANCED_FILTER_FIELDS,
  FILTER_OPERATORS,
  allReportColumns,
  defaultReportColumns,
  reportColumnGroups,
} from '../../data/reports';
import {
  createDemoFuelTransactions,
  filterFuelTransactions,
  reorderColumns,
  valuesForFilter,
  type AdvancedTransactionFilter,
  type TransactionQuery,
  type TransactionStatus,
} from '../../domain/reporting/data';
import { defaultReportPeriod, type ReportPeriod } from '../../domain/reporting/periods';
import { PERIOD_PRESETS } from '../../domain/reporting/periods';
import { CloseIcon, NoDataIcon, PlusIcon, SearchIcon } from '../icons/Icons';
import { EmptyState } from '../ui/EmptyState';
import { useSession } from '../session/Session';
import { ReportDownloadButtons } from './ReportDownloadButtons';
import { ReportPeriodPicker } from './ReportPeriodPicker';
import './DynamicReportBuilder.css';

interface SavedColumnView {
  id: string;
  name: string;
  columns: string[];
  period: ReportPeriod;
  statuses: TransactionStatus[];
  filters: AdvancedTransactionFilter[];
}

interface GeneratedReport {
  query: TransactionQuery;
  columns: string[];
}

const STATUS_OPTIONS: TransactionStatus[] = ['Conciliada', 'En tránsito', 'Rechazada'];
const SAVED_VIEWS_KEY = 'tcplus.reporting.transaction-views.v1';

function isSavedView(value: unknown): value is SavedColumnView {
  if (typeof value !== 'object' || value === null) return false;
  const view = value as Partial<SavedColumnView>;
  return typeof view.id === 'string' && typeof view.name === 'string' &&
    Array.isArray(view.columns) && view.columns.length > 0 &&
    view.columns.every((column) => typeof column === 'string' && allReportColumns.includes(column)) &&
    typeof view.period === 'object' && view.period !== null &&
    PERIOD_PRESETS.some((preset) => preset.id === view.period!.preset) &&
    typeof view.period.from === 'string' && typeof view.period.to === 'string' &&
    Array.isArray(view.statuses) && view.statuses.length > 0 &&
    view.statuses.every((status) => STATUS_OPTIONS.includes(status)) &&
    Array.isArray(view.filters) && view.filters.every((filter) =>
      typeof filter.id === 'number' && ADVANCED_FILTER_FIELDS.includes(filter.field) &&
      FILTER_OPERATORS.includes(filter.operator) && typeof filter.value === 'string',
    );
}

function loadSavedViews(storageKey: string): SavedColumnView[] {
  try {
    const value = window.localStorage.getItem(storageKey);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter(isSavedView) : [];
  } catch {
    return [];
  }
}

/** Flow: montos, placas, IDs, fechas y cantidades se leen en tipografía de datos. */
const DATA_COLUMN = /FECHA|HORA|PLACA|DISPOSITIVO|TARJETA|FOLIO|N[ÚU]MERO|NO\.|ID\b|IMPORTE|MONTO|PRECIO|LITROS|SALDO|KM|OD[ÓO]METRO|RENDIMIENTO|IVA|IEPS|TOTAL|CANTIDAD|AUTORIZACI[ÓO]N/i;

function formatCell(column: string, value: string | number): string | number {
  if (column === 'FECHA' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year!, month! - 1, day!, 12).toLocaleDateString('es-MX');
  }
  return value === '' ? '—' : value;
}

function defaultGeneratedReport(): GeneratedReport {
  const period = defaultReportPeriod();
  return { query: { ...period, statuses: [...STATUS_OPTIONS], filters: [] }, columns: [...defaultReportColumns] };
}

export function DynamicReportBuilder() {
  const { principal } = useSession();
  const savedViewsKey = `${SAVED_VIEWS_KEY}.${principal.userId}`;
  const [period, setPeriod] = useState<ReportPeriod>(defaultReportPeriod);
  const [statuses, setStatuses] = useState<TransactionStatus[]>(STATUS_OPTIONS);
  const [filters, setFilters] = useState<AdvancedTransactionFilter[]>([]);
  const [selected, setSelected] = useState<string[]>(defaultReportColumns);
  const [columnQuery, setColumnQuery] = useState('');
  const [savedViews, setSavedViews] = useState<SavedColumnView[]>(() => loadSavedViews(savedViewsKey));
  const [selectedViewId, setSelectedViewId] = useState('');
  const [viewName, setViewName] = useState('');
  const [generated, setGenerated] = useState<GeneratedReport>(defaultGeneratedReport);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const pointerDraggedColumn = useRef<string | null>(null);
  const transactions = useMemo(() => createDemoFuelTransactions(), []);

  const visibleGroups = useMemo(() => {
    const needle = columnQuery.trim().toLowerCase();
    if (!needle) return reportColumnGroups;
    return reportColumnGroups
      .map((group) => ({ ...group, columns: group.columns.filter((column) => column.toLowerCase().includes(needle)) }))
      .filter((group) => group.columns.length > 0);
  }, [columnQuery]);

  const periodValid = period.from !== '' && period.to !== '' && period.from <= period.to;
  const allSelected = selected.length === allReportColumns.length;
  const generatedRows = filterFuelTransactions(transactions, generated.query);
  const totalAmount = generatedRows.reduce((sum, row) => sum + (typeof row['M.N.'] === 'number' ? row['M.N.'] : 0), 0);
  const activeFilterCount = filters.filter((filter) => filter.value.trim()).length;
  const periodLabel = PERIOD_PRESETS.find((preset) => preset.id === period.preset)?.label ?? 'Personalizado';

  useEffect(() => {
    try {
      window.localStorage.setItem(savedViewsKey, JSON.stringify(savedViews));
    } catch {
      // El constructor sigue disponible si el navegador bloquea el almacenamiento local.
    }
  }, [savedViews, savedViewsKey]);

  const setColumns = (columns: string[], checked: boolean) => {
    setSelectedViewId('');
    setSelected((current) => {
      const next = checked ? [...current, ...columns.filter((column) => !current.includes(column))] : current.filter((column) => !columns.includes(column));
      return next;
    });
  };

  const patchFilter = (id: number, changes: Partial<AdvancedTransactionFilter>) => {
    setSelectedViewId('');
    setFilters((current) => current.map((filter) => (filter.id === id ? { ...filter, ...changes } : filter)));
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    setSelectedViewId('');
    setSelected((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const startColumnDrag = (event: PointerEvent<HTMLButtonElement>, column: string) => {
    event.preventDefault();
    pointerDraggedColumn.current = column;
    setDraggedColumn(column);
  };

  const enterColumn = (target: string) => {
    const source = pointerDraggedColumn.current;
    if (source && source !== target) {
      setSelectedViewId('');
      setSelected((current) => reorderColumns(current, source, target));
    }
  };

  useEffect(() => {
    const finishColumnDrag = () => {
      if (pointerDraggedColumn.current === null) return;
      pointerDraggedColumn.current = null;
      setDraggedColumn(null);
    };
    window.addEventListener('pointerup', finishColumnDrag);
    window.addEventListener('pointercancel', finishColumnDrag);
    return () => {
      window.removeEventListener('pointerup', finishColumnDrag);
      window.removeEventListener('pointercancel', finishColumnDrag);
    };
  }, []);

  const reset = () => {
    setPeriod(defaultReportPeriod());
    setStatuses(STATUS_OPTIONS);
    setFilters([]);
    setSelected(defaultReportColumns);
    setColumnQuery('');
    setSelectedViewId('');
    setGenerated(defaultGeneratedReport());
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name || selected.length === 0) return;
    const id = `view-${Date.now()}`;
    setSavedViews((current) => [...current.filter((view) => view.name.toLocaleLowerCase('es-MX') !== name.toLocaleLowerCase('es-MX')), {
      id,
      name,
      columns: [...selected],
      period: { ...period },
      statuses: [...statuses],
      filters: filters.map((filter) => ({ ...filter })),
    }]);
    setSelectedViewId(id);
    setViewName('');
  };

  const loadView = (id: string) => {
    setSelectedViewId(id);
    const view = savedViews.find((candidate) => candidate.id === id);
    if (view) {
      setSelected([...view.columns]);
      setPeriod({ ...view.period });
      setStatuses([...view.statuses]);
      setFilters(view.filters.map((filter) => ({ ...filter })));
    }
  };

  const removeSelectedView = () => {
    setSavedViews((current) => current.filter((view) => view.id !== selectedViewId));
    setSelectedViewId('');
  };

  const generateReport = () => {
    if (!periodValid || statuses.length === 0 || selected.length === 0) return;
    const columns = [...selected];
    if (statuses.includes('Rechazada') && !columns.includes('MOTIVO DE RECHAZO')) columns.push('MOTIVO DE RECHAZO');
    setGenerated({
      query: { ...period, statuses: [...statuses], filters: filters.map((filter) => ({ ...filter })) },
      columns,
    });
  };

  const generatedData = generatedRows.map((row) => generated.columns.map((column) => formatCell(column, row[column] ?? '')));

  return (
    <div className="report-builder">
      <div className="report-builder__toolbar">
        <details className="report-builder__disclosure" open={filtersOpen} onToggle={(event) => setFiltersOpen(event.currentTarget.open)}>
          <summary>
            <span>Filtros</span>
            <small>{periodLabel} · {statuses.length === STATUS_OPTIONS.length ? 'Todos los estados' : `${statuses.length} estados`} · {activeFilterCount} avanzados</small>
          </summary>
          <div className="report-builder__disclosure-body">
            <ReportPeriodPicker value={period} onChange={(nextPeriod) => { setPeriod(nextPeriod); setSelectedViewId(''); }} />
            <fieldset className="report-builder__block">
              <legend>Estatus de conciliación</legend>
              <div className="report-builder__statuses" role="group" aria-label="Estados de conciliación">
                {STATUS_OPTIONS.map((status) => (
                  <label className="report-builder__check" key={status}>
                    <input
                      type="checkbox"
                      checked={statuses.includes(status)}
                      onChange={(event) => {
                        setSelectedViewId('');
                        setStatuses((current) => event.target.checked ? [...current, status] : current.filter((item) => item !== status));
                      }}
                    />
                    {status}
                  </label>
                ))}
              </div>
              {statuses.includes('Rechazada') && <p className="report-builder__note">El motivo de rechazo se incluye en la tabla y las descargas.</p>}
              {statuses.length === 0 && <p className="report-builder__error" role="alert">Selecciona al menos un estado.</p>}
            </fieldset>

            <fieldset className="report-builder__block">
              <legend>Filtros avanzados</legend>
              {filters.length === 0 ? (
                <p className="report-builder__note">Agrega filtros opcionales para acotar la consulta.</p>
              ) : (
                <ul className="report-builder__filters">
                  {filters.map((filter) => (
                    <li key={filter.id}>
                      <select aria-label="Filtro" value={filter.field} onChange={(event) => patchFilter(filter.id, { field: event.target.value as AdvancedTransactionFilter['field'], value: '' })}>
                        {ADVANCED_FILTER_FIELDS.map((option) => <option key={option}>{option}</option>)}
                      </select>
                      <select aria-label="Operador" value={filter.operator} onChange={(event) => patchFilter(filter.id, { operator: event.target.value as AdvancedTransactionFilter['operator'] })}>
                        {FILTER_OPERATORS.map((option) => <option key={option}>{option}</option>)}
                      </select>
                      <select aria-label={`Valor de ${filter.field}`} value={filter.value} onChange={(event) => patchFilter(filter.id, { value: event.target.value })}>
                        <option value="">Selecciona un valor</option>
                        {valuesForFilter(transactions, filter.field).map((value) => <option key={value}>{value}</option>)}
                      </select>
                      <button type="button" className="report-builder__remove" onClick={() => {
                        setSelectedViewId('');
                        setFilters((current) => current.filter((candidate) => candidate.id !== filter.id));
                      }}>
                        <CloseIcon width={15} height={15} />
                        <span className="visually-hidden">Quitar filtro de {filter.field}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => {
                setSelectedViewId('');
                setFilters((current) => [...current, { id: Date.now() + current.length, field: ADVANCED_FILTER_FIELDS[0], operator: FILTER_OPERATORS[0], value: '' }]);
              }}>
                <PlusIcon width={14} height={14} />
                Agregar filtro
              </button>
            </fieldset>
          </div>
        </details>

        <details className="report-builder__disclosure" open={columnsOpen} onToggle={(event) => setColumnsOpen(event.currentTarget.open)}>
          <summary>
            <span>Campos y orden</span>
            <small>{selected.length} seleccionados</small>
          </summary>
          <div className="report-builder__disclosure-body report-builder__column-settings">
            <div className="report-builder__columns-tools">
              <label className="report-builder__search">
                <SearchIcon width={15} height={15} />
                <span className="visually-hidden">Buscar campo disponible</span>
                <input type="search" placeholder="Buscar campos" value={columnQuery} onChange={(event) => setColumnQuery(event.target.value)} />
              </label>
              <label className="report-builder__check">
                <input type="checkbox" checked={allSelected} onChange={(event) => setColumns(allReportColumns, event.target.checked)} />
                Seleccionar todos
              </label>
            </div>

            <section className="report-builder__selected-fields" aria-labelledby="selected-fields-title">
              <header>
                <h3 id="selected-fields-title">Seleccionados · arrastra para ordenar</h3>
                <span>{selected.length} campos</span>
              </header>
              {selected.length === 0 ? (
                <p className="report-builder__note">Marca campos disponibles para agregarlos al reporte.</p>
              ) : (
                <ol className="report-builder__order">
                  {selected.map((column, index) => (
                    <li
                      key={column}
                      className={draggedColumn === column ? 'is-dragging' : ''}
                      onPointerEnter={() => enterColumn(column)}
                    >
                      <button
                        type="button"
                        className="report-builder__drag-handle"
                        title="Arrastrar para reordenar"
                        aria-label={`Arrastrar ${column} para reordenar`}
                        aria-pressed={draggedColumn === column}
                        onPointerDown={(event) => startColumnDrag(event, column)}
                      >
                        ⋮⋮
                      </button>
                      <label className="report-builder__check">
                        <input type="checkbox" checked onChange={() => setColumns([column], false)} />
                        {column}
                      </label>
                      <div>
                        <button type="button" aria-label={`Mover ${column} hacia arriba`} title="Mover hacia arriba" disabled={index === 0} onClick={() => moveColumn(index, -1)}>↑</button>
                        <button type="button" aria-label={`Mover ${column} hacia abajo`} title="Mover hacia abajo" disabled={index === selected.length - 1} onClick={() => moveColumn(index, 1)}>↓</button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="report-builder__available-fields" aria-label="Campos disponibles">
              <h3>Agregar campos disponibles</h3>
              <div className="report-builder__columns">
                {visibleGroups.map((group) => {
                  const available = group.columns.filter((column) => !selected.includes(column));
                  if (available.length === 0) return null;
                  const groupSelected = available.every((column) => selected.includes(column));
                  return (
                    <section className="report-builder__group" key={group.id}>
                      <header>
                        <h4>{group.label}</h4>
                        <button type="button" onClick={() => setColumns(available, !groupSelected)}>{groupSelected ? 'Quitar todas' : 'Agregar todas'}</button>
                      </header>
                      <div className="report-builder__group-grid">
                        {available.map((column) => (
                          <label className="report-builder__check" key={column}>
                            <input type="checkbox" checked={selected.includes(column)} onChange={(event) => setColumns([column], event.target.checked)} />
                            {column}
                          </label>
                        ))}
                      </div>
                    </section>
                  );
                })}
                {visibleGroups.length === 0 && <p className="report-builder__note">No hay campos que coincidan con “{columnQuery.trim()}”.</p>}
              </div>
            </section>

            <section className="report-builder__saved-settings" aria-label="Vistas personales">
              <label className="report-builder__saved-select">
                <span>Vistas personales</span>
                <select aria-label="Cargar vista guardada" value={selectedViewId} onChange={(event) => loadView(event.target.value)}>
                  <option value="">Selecciona una vista</option>
                  {savedViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
                </select>
              </label>
              <button type="button" className="btn btn--secondary btn--sm" disabled={!selectedViewId} onClick={removeSelectedView}>
                <CloseIcon width={14} height={14} />
                Eliminar vista
              </button>
              <input aria-label="Nombre de la vista" placeholder="Nombre de la vista" value={viewName} onChange={(event) => setViewName(event.target.value)} />
              <button type="button" className="btn btn--secondary btn--sm" disabled={!viewName.trim() || selected.length === 0} onClick={saveView}>
                Guardar vista
              </button>
            </section>
          </div>
        </details>

        <button type="button" className="btn btn--primary" disabled={!periodValid || statuses.length === 0 || selected.length === 0} onClick={generateReport}>
          Actualizar reporte
        </button>
        <button type="button" className="btn btn--ghost" onClick={reset}>Restablecer</button>
      </div>

      <section className="report-builder__result" aria-live="polite" aria-label="Resultado del reporte">
        <div className="report-builder__result-head">
          <div>
            <strong>{generatedRows.length} transacciones</strong>
            <span>Importe total: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalAmount)}</span>
          </div>
          <ReportDownloadButtons
            columns={generated.columns}
            rows={generatedData}
            fileName={`reporte-transaccional-${generated.query.from}-${generated.query.to}`}
          />
        </div>
        {generatedRows.length === 0 ? (
          <EmptyState icon={<NoDataIcon width={24} height={24} />} title="No hay transacciones que coincidan" description="Ajusta el período, los estados o los filtros avanzados." />
        ) : (
          <div className="report-builder__preview">
            <table>
              <thead><tr>{generated.columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
              <tbody>
                {generatedRows.map((row) => (
                  <tr key={row.id}>
                    {generated.columns.map((column) => <td key={`${row.id}-${column}`} data-mono={typeof row[column] === 'number' || DATA_COLUMN.test(column) ? '' : undefined}>{formatCell(column, row[column] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
