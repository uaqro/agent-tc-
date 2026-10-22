import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useSession } from '../session/Session';
import { CloseIcon, PlusIcon, SearchIcon } from '../icons/Icons';
import { EmptyState } from '../ui/EmptyState';
import { defaultReportPeriod, PERIOD_PRESETS, type ReportPeriod } from '../../domain/reporting/periods';
import { ReportDownloadButtons } from './ReportDownloadButtons';
import { ReportPeriodPicker } from './ReportPeriodPicker';
import './DynamicReportBuilder.css';
import './TollReportBuilder.css';
import {
  TOLL_ADVANCED_FILTER_FIELDS,
  TOLL_MOVEMENT_KINDS,
  TOLL_MOVEMENT_KIND_LABEL,
  TOLL_REPORT_COLUMN_GROUPS,
  allTollReportColumns,
  createTollReportRows,
  defaultTollReportColumns,
  filterTollReportRows,
  reorderTollColumns,
  tollReportValue,
  type TollReportFilter,
  type TollReportQuery,
} from '../../data/tollReport';
import type { TollMovementKind } from '../../types/toll';
import './TollReportBuilder.css';

interface SavedTollView {
  id: string;
  name: string;
  columns: string[];
  period: ReportPeriod;
  kinds: TollMovementKind[];
  filters: TollReportFilter[];
}

interface GeneratedTollReport {
  query: TollReportQuery;
  columns: string[];
}

const SAVED_VIEWS_KEY = 'tcplus.reporting.toll-views.v1';
const OPERATORS: TollReportFilter['operator'][] = ['Igual a', 'Contiene'];

function isSavedTollView(value: unknown): value is SavedTollView {
  if (typeof value !== 'object' || value === null) return false;
  const view = value as Partial<SavedTollView>;
  return typeof view.id === 'string' && typeof view.name === 'string' &&
    Array.isArray(view.columns) && view.columns.length > 0 && view.columns.every((column) => typeof column === 'string' && (allTollReportColumns as string[]).includes(column)) &&
    Array.isArray(view.kinds) && view.kinds.length > 0 && view.kinds.every((kind) => TOLL_MOVEMENT_KINDS.includes(kind)) &&
    typeof view.period === 'object' && view.period !== null && typeof view.period.from === 'string' && typeof view.period.to === 'string' &&
    Array.isArray(view.filters) && view.filters.every((filter) => typeof filter.id === 'number' && TOLL_ADVANCED_FILTER_FIELDS.includes(filter.field) && typeof filter.value === 'string');
}

function loadSavedViews(key: string): SavedTollView[] {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(isSavedTollView) : [];
  } catch {
    return [];
  }
}

function defaultGeneratedReport(): GeneratedTollReport {
  const period = defaultReportPeriod();
  return { query: { ...period, kinds: [...TOLL_MOVEMENT_KINDS], filters: [] }, columns: [...defaultTollReportColumns] };
}

/** Flow: montos, TAG, placas, fechas e IDs se leen en tipografía de datos. */
const DATA_COLUMN = /Fecha|Hora|Placa|TAG|Folio|ID\b|Importe|Saldo|Tarjeta|N[úu]mero/i;

function formatCell(column: string, value: string | number): string | number {
  if (column === 'Fecha' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year!, month! - 1, day!, 12).toLocaleDateString('es-MX');
  }
  if (column === 'Importe (MXN)' && typeof value === 'number') {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  }
  if (column === 'Saldo del TAG (MXN)' && typeof value === 'number') {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  }
  return value === '' ? '—' : value;
}

export function TollReportBuilder() {
  const { principal } = useSession();
  const storageKey = `${SAVED_VIEWS_KEY}.${principal.userId}`;
  const rows = useMemo(() => createTollReportRows(), []);
  const [period, setPeriod] = useState<ReportPeriod>(defaultReportPeriod);
  const [kinds, setKinds] = useState<TollMovementKind[]>(TOLL_MOVEMENT_KINDS);
  const [filters, setFilters] = useState<TollReportFilter[]>([]);
  const [selected, setSelected] = useState<string[]>(defaultTollReportColumns);
  const [columnQuery, setColumnQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const draggedRef = useRef<string | null>(null);
  const [savedViews, setSavedViews] = useState<SavedTollView[]>(() => loadSavedViews(storageKey));
  const [viewName, setViewName] = useState('');
  const [selectedViewId, setSelectedViewId] = useState('');
  const [generated, setGenerated] = useState<GeneratedTollReport>(defaultGeneratedReport);

  const periodValid = period.from !== '' && period.to !== '' && period.from <= period.to;
  const generatedRows = useMemo(() => filterTollReportRows(rows, generated.query), [rows, generated.query]);
  const generatedData = generatedRows.map((row) => generated.columns.map((column) => formatCell(column, tollReportValue(row, column))));
  const totalAmount = generatedRows.reduce((sum, row) => sum + row.amountMXN, 0);
  const activeFilterCount = filters.filter((filter) => filter.value.trim()).length;
  const allSelected = selected.length === allTollReportColumns.length;
  const periodLabel = PERIOD_PRESETS.find((preset) => preset.id === period.preset)?.label ?? 'Personalizado';
  const visibleGroups = TOLL_REPORT_COLUMN_GROUPS.map((group) => ({
    ...group,
    columns: group.columns.filter((column) => column.toLowerCase().includes(columnQuery.trim().toLowerCase())),
  })).filter((group) => group.columns.length > 0);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(savedViews)); } catch { /* Report remains usable without storage. */ }
  }, [savedViews, storageKey]);

  useEffect(() => {
    const finishDrag = () => {
      if (!draggedRef.current) return;
      draggedRef.current = null;
      setDraggedColumn(null);
    };
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
    return () => {
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, []);

  const toggleColumn = (column: string, checked: boolean) => {
    setSelectedViewId('');
    setSelected((current) => checked ? [...current, ...current.includes(column) ? [] : [column]] : current.filter((item) => item !== column));
  };

  const moveColumn = (index: number, delta: -1 | 1) => {
    setSelected((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setSelectedViewId('');
  };

  const enterColumn = (target: string) => {
    const dragged = draggedRef.current;
    if (!dragged || dragged === target) return;
    setSelected((current) => reorderTollColumns(current, dragged, target));
    setSelectedViewId('');
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name || selected.length === 0) return;
    const view: SavedTollView = { id: `toll-view-${Date.now()}`, name, columns: [...selected], period: { ...period }, kinds: [...kinds], filters: filters.map((filter) => ({ ...filter })) };
    setSavedViews((current) => [...current.filter((item) => item.name.toLocaleLowerCase('es-MX') !== name.toLocaleLowerCase('es-MX')), view]);
    setSelectedViewId(view.id);
    setViewName('');
  };

  const loadView = (id: string) => {
    setSelectedViewId(id);
    const view = savedViews.find((item) => item.id === id);
    if (!view) return;
    setSelected([...view.columns]);
    setPeriod({ ...view.period });
    setKinds([...view.kinds]);
    setFilters(view.filters.map((filter) => ({ ...filter })));
  };

  const removeView = () => {
    setSavedViews((current) => current.filter((view) => view.id !== selectedViewId));
    setSelectedViewId('');
  };

  const resetReport = () => {
    const initial = defaultGeneratedReport();
    setPeriod(defaultReportPeriod());
    setKinds([...TOLL_MOVEMENT_KINDS]);
    setFilters([]);
    setSelected([...defaultTollReportColumns]);
    setColumnQuery('');
    setSelectedViewId('');
    setFiltersOpen(false);
    setColumnsOpen(false);
    setGenerated(initial);
  };

  const updateReport = () => {
    if (!periodValid || kinds.length === 0 || selected.length === 0) return;
    setGenerated({ query: { ...period, kinds: [...kinds], filters: filters.map((filter) => ({ ...filter })) }, columns: [...selected] });
  };

  const updateFilter = (id: number, changes: Partial<TollReportFilter>) => {
    setSelectedViewId('');
    setFilters((current) => current.map((filter) => filter.id === id ? { ...filter, ...changes } : filter));
  };

  return (
    <div className="report-builder toll-report-builder">
      <div className="report-builder__toolbar">
        <details className="report-builder__disclosure" open={filtersOpen} onToggle={(event) => setFiltersOpen(event.currentTarget.open)}>
          <summary><span>Filtros</span><small>{periodLabel} · {activeFilterCount} avanzados · {kinds.length} tipos</small></summary>
          <div className="report-builder__disclosure-body">
            <ReportPeriodPicker value={period} onChange={(next) => { setPeriod(next); setSelectedViewId(''); }} />
            <fieldset className="toll-report__types">
              <legend>Tipo de movimiento</legend>
              <div>
                {TOLL_MOVEMENT_KINDS.map((kind) => (
                  <label className="report-builder__check" key={kind}>
                    <input type="checkbox" checked={kinds.includes(kind)} onChange={(event) => {
                      setSelectedViewId('');
                      setKinds((current) => event.target.checked ? [...current, kind] : current.filter((item) => item !== kind));
                    }} />
                    {TOLL_MOVEMENT_KIND_LABEL[kind]}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="toll-report__types">
              <legend>Filtros avanzados</legend>
              {filters.map((filter) => (
                <div className="toll-report__filter" key={filter.id}>
                  <select aria-label="Campo del filtro" value={filter.field} onChange={(event) => updateFilter(filter.id, { field: event.target.value as TollReportFilter['field'], value: '' })}>
                    {TOLL_ADVANCED_FILTER_FIELDS.map((field) => <option key={field}>{field}</option>)}
                  </select>
                  <select aria-label="Operador del filtro" value={filter.operator} onChange={(event) => updateFilter(filter.id, { operator: event.target.value as TollReportFilter['operator'] })}>
                    {OPERATORS.map((operator) => <option key={operator}>{operator}</option>)}
                  </select>
                  <select aria-label={`Valor de ${filter.field}`} value={filter.value} onChange={(event) => updateFilter(filter.id, { value: event.target.value })}>
                    <option value="">Selecciona un valor</option>
                    {[...new Set(rows.map((row) => String(tollReportValue(row, filter.field))))].filter(Boolean).sort().map((value) => <option key={value}>{value}</option>)}
                  </select>
                  <button type="button" className="report-builder__remove" onClick={() => setFilters((current) => current.filter((item) => item.id !== filter.id))} aria-label={`Quitar filtro ${filter.field}`}><CloseIcon width={15} height={15} /></button>
                </div>
              ))}
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setFilters((current) => [...current, { id: Date.now(), field: TOLL_ADVANCED_FILTER_FIELDS[0], operator: 'Igual a', value: '' }])}>
                <PlusIcon width={14} height={14} /> Agregar filtro
              </button>
            </fieldset>
          </div>
        </details>

        <details className="report-builder__disclosure" open={columnsOpen} onToggle={(event) => setColumnsOpen(event.currentTarget.open)}>
          <summary><span>Campos y orden</span><small>{selected.length} seleccionados</small></summary>
          <div className="report-builder__disclosure-body report-builder__column-settings">
            <div className="report-builder__columns-tools">
              <label className="report-builder__search"><SearchIcon width={15} height={15} /><span className="visually-hidden">Buscar campo</span><input type="search" placeholder="Buscar campos" value={columnQuery} onChange={(event) => setColumnQuery(event.target.value)} /></label>
              <label className="report-builder__check"><input type="checkbox" checked={allSelected} onChange={(event) => setSelected(event.target.checked ? [...allTollReportColumns] : [])} /> Seleccionar todos</label>
            </div>
            <section className="report-builder__selected-fields">
              <header><h3>Seleccionados · arrastra para ordenar</h3><span>{selected.length} campos</span></header>
              <ol className="report-builder__order">
                {selected.map((column, index) => (
                  <li key={column} onPointerEnter={() => enterColumn(column)} className={draggedColumn === column ? 'is-dragging' : ''}>
                    <button type="button" className="report-builder__drag-handle" aria-label={`Arrastrar ${column}`} title="Arrastrar para reordenar" onPointerDown={(event: PointerEvent<HTMLButtonElement>) => { event.preventDefault(); draggedRef.current = column; setDraggedColumn(column); }}>⋮⋮</button>
                    <label className="report-builder__check"><input type="checkbox" checked onChange={() => toggleColumn(column, false)} />{column}</label>
                    <div><button type="button" aria-label={`Mover ${column} arriba`} disabled={index === 0} onClick={() => moveColumn(index, -1)}>↑</button><button type="button" aria-label={`Mover ${column} abajo`} disabled={index === selected.length - 1} onClick={() => moveColumn(index, 1)}>↓</button></div>
                  </li>
                ))}
              </ol>
            </section>
            <section className="report-builder__available-fields">
              <h3>Agregar campos disponibles</h3>
              <div className="report-builder__columns">
                {visibleGroups.map((group) => {
                  const available = group.columns.filter((column) => !selected.includes(column));
                  if (available.length === 0) return null;
                  return <section className="report-builder__group" key={group.id}><header><h4>{group.label}</h4><button type="button" onClick={() => setSelected((current) => [...current, ...available])}>Agregar todas</button></header><div className="report-builder__group-grid">{available.map((column) => <label className="report-builder__check" key={column}><input type="checkbox" checked={selected.includes(column)} onChange={(event) => toggleColumn(column, event.target.checked)} />{column}</label>)}</div></section>;
                })}
              </div>
            </section>
            <section className="report-builder__saved-settings" aria-label="Vistas personales">
              <label className="report-builder__saved-select"><span>Vistas personales</span><select aria-label="Cargar vista de peaje" value={selectedViewId} onChange={(event) => loadView(event.target.value)}><option value="">Selecciona una vista</option>{savedViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}</select></label>
              <button type="button" className="btn btn--secondary btn--sm" disabled={!selectedViewId} onClick={removeView}>Eliminar vista</button>
              <input aria-label="Nombre de vista de peaje" placeholder="Nombre de vista" value={viewName} onChange={(event) => setViewName(event.target.value)} />
              <button type="button" className="btn btn--secondary btn--sm" disabled={!viewName.trim() || !selected.length} onClick={saveView}>Guardar vista</button>
            </section>
          </div>
        </details>

        <button type="button" className="btn btn--primary" disabled={!periodValid || !kinds.length || !selected.length} onClick={updateReport}>Actualizar reporte</button>
        <button type="button" className="btn btn--ghost" onClick={resetReport}>Restablecer</button>
      </div>

      <section className="report-builder__result" aria-label="Resultado del reporte de peaje">
        <div className="report-builder__result-head"><div><strong>{generatedRows.length} movimientos</strong><span>Monto neto: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalAmount)}</span></div><ReportDownloadButtons columns={generated.columns} rows={generatedData} fileName={`reporte-peaje-${generated.query.from}-${generated.query.to}`} /></div>
        {generatedRows.length === 0 ? <EmptyState icon="query_stats" title="No hay movimientos que coincidan" description="Ajusta el periodo, los tipos de movimiento o los filtros avanzados." /> : (
          <div className="report-builder__preview"><table><thead><tr>{generated.columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{generatedRows.map((row) => <tr key={row.id}>{generated.columns.map((column) => <td key={`${row.id}-${column}`} data-mono={typeof tollReportValue(row, column) === 'number' || DATA_COLUMN.test(column) ? '' : undefined}>{formatCell(column, tollReportValue(row, column))}</td>)}</tr>)}</tbody></table></div>
        )}
      </section>
    </div>
  );
}