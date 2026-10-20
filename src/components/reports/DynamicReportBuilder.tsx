import { useMemo, useState } from 'react';
import { Button, Checkbox, DatePicker, Field, Input, Select } from '@er-mobility-mx/design-system';
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
import { NoDataIcon, RuleIcon, SearchIcon } from '../icons/Icons';
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
  const periodError = !from || !to ? 'Selecciona las fechas inicial y final del período.' : undefined;
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
            <Field label="Tipo de reporte" htmlFor={REPORT_FIELD_IDS.type}>
              <Select id={REPORT_FIELD_IDS.type} options={REPORT_TYPES} value={type} onChange={setType} />
            </Field>
            <Field label="Rendimiento" htmlFor={REPORT_FIELD_IDS.yieldUnit}>
              <Select id={REPORT_FIELD_IDS.yieldUnit} options={YIELD_UNITS} value={yieldUnit} onChange={setYieldUnit} />
            </Field>
            <Field label="Agrupar por" htmlFor={REPORT_FIELD_IDS.grouper}>
              <Select id={REPORT_FIELD_IDS.grouper} options={REPORT_GROUPERS} value={grouper} onChange={setGrouper} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="report-builder__block">
          <legend>Filtros básicos</legend>
          <div className="report-builder__fields report-builder__fields--four">
            <div className="report-builder__period">
              <Field label="Período" htmlFor={REPORT_FIELD_IDS.period} required error={periodError}>
                <DatePicker
                  id={REPORT_FIELD_IDS.period}
                  mode="range"
                  value={from && to ? `${from}|${to}` : ''}
                  onChange={(value) => {
                    if (!value) {
                      setFrom('');
                      setTo('');
                      return;
                    }
                    const [rangeStart, rangeEnd] = value.split('|');
                    setFrom(rangeStart ?? '');
                    setTo(rangeEnd ?? '');
                  }}
                />
              </Field>
            </div>
            <Field label="Evaluar por" htmlFor={REPORT_FIELD_IDS.evaluateBy}>
              <Select id={REPORT_FIELD_IDS.evaluateBy} options={EVALUATE_BY} value={evaluateBy} onChange={setEvaluateBy} />
            </Field>
            <Field label="Estado de la transacción" htmlFor={REPORT_FIELD_IDS.state}>
              <Select id={REPORT_FIELD_IDS.state} options={TRANSACTION_STATES} value={state} onChange={setState} />
            </Field>
          </div>
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
                  <Field label="Filtro" htmlFor={`report-filter-field-${filter.id}`}>
                    <Select
                      id={`report-filter-field-${filter.id}`}
                      options={ADVANCED_FILTER_FIELDS}
                      value={filter.field}
                      onChange={(value) => patchFilter(filter.id, { field: value })}
                    />
                  </Field>
                  <Field label="Operador" htmlFor={`report-filter-operator-${filter.id}`}>
                    <Select
                      id={`report-filter-operator-${filter.id}`}
                      options={FILTER_OPERATORS}
                      value={filter.operator}
                      onChange={(value) => patchFilter(filter.id, { operator: value })}
                    />
                  </Field>
                  <Field label={`Valor de ${filter.field}`} htmlFor={`report-filter-value-${filter.id}`}>
                    <Input
                      id={`report-filter-value-${filter.id}`}
                      type="text"
                      placeholder="Valor"
                      value={filter.value}
                      onChange={(value) => patchFilter(filter.id, { value })}
                    />
                  </Field>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="close"
                    ariaLabel={`Quitar filtro de ${filter.field}`}
                    onClick={() => setFilters((current) => current.filter((candidate) => candidate.id !== filter.id))}
                  >
                    Quitar
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon="add"
            ariaLabel="Agregar filtro"
            onClick={() =>
              setFilters((current) => [
                ...current,
                { id: ++filterSequence, field: ADVANCED_FILTER_FIELDS[0], operator: FILTER_OPERATORS[0], value: '' },
              ])
            }
          >
            Agregar filtro
          </Button>
        </fieldset>

        <fieldset className="report-builder__block">
          <legend>
            Columnas a mostrar · {selected.length} de {allReportColumns.length}
          </legend>

          <div className="report-builder__columns-tools">
            <div className="report-builder__search">
              <Input
                type="search"
                icon="search"
                ariaLabel="Buscar columna"
                placeholder="Buscar columna"
                value={columnQuery}
                onChange={setColumnQuery}
                style={{ width: '100%' }}
              />
            </div>
            <div className="report-builder__check">
              <Checkbox
                checked={allSelected}
                label="Seleccionar todo"
                onChange={(checked) => setColumns(allReportColumns, checked)}
              />
            </div>
          </div>

          <div className="report-builder__columns">
            {visibleGroups.map((group) => {
              const groupSelected = group.columns.every((column) => selected.includes(column));
              return (
                <section className="report-builder__group" key={group.id}>
                  <header>
                    <h3>{group.label}</h3>
                    <Button variant="link" size="sm" onClick={() => setColumns(group.columns, !groupSelected)}>
                      {groupSelected ? 'Quitar todas' : 'Marcar todas'}
                    </Button>
                  </header>
                  <div className="report-builder__group-grid">
                    {group.columns.map((column) => (
                      <div className="report-builder__check" key={column}>
                        <Checkbox
                          checked={selected.includes(column)}
                          label={column}
                          onChange={(checked) => setColumns([column], checked)}
                        />
                      </div>
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
                  <Button variant="secondary" size="sm" onClick={() => setColumnQuery('')}>
                    Limpiar búsqueda
                  </Button>
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
          <Button variant="ghost" onClick={reset}>
            Restablecer
          </Button>
          <Button
            variant="primary"
            disabled={!periodValid || selected.length === 0}
            onClick={() => setGenerated({ type, from, to, grouper, columns: selected })}
          >
            Generar reporte
          </Button>
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
