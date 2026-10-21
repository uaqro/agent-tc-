import { useMemo, useState } from 'react';
import { Button, Input, Select } from '@er-mobility-mx/design-system';
import { CopyIcon } from '../../components/icons/Icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { API_STATUS_LABEL, PAGE_LABEL, apiCapabilities, capabilityById, type FuelPage } from '../../data/apiCoverage';
import {
  IMPROVEMENT_KIND_LABEL,
  IMPROVEMENT_PRIORITY_LABEL,
  apiImprovements,
  type ApiImprovement,
  type ImprovementKind,
  type ImprovementPriority,
} from '../../data/apiImprovements';
import '../TablePage.css';
import './ApiImprovementsPage.css';

interface ApiImprovementsPageProps {
  onNotice: (message: string) => void;
}

const PRIORITIES: ImprovementPriority[] = ['high', 'medium', 'low'];

const pagesOf = (improvement: ApiImprovement) =>
  [...new Set(improvement.unlocks.map((id) => capabilityById(id)?.page).filter((page): page is FuelPage => Boolean(page)))];

const toMarkdown = (items: ApiImprovement[]) =>
  [
    '# Mejoras para API ZERO (TicketCarServices v1.8)',
    '',
    ...items.flatMap((item) => [
      `## [${IMPROVEMENT_PRIORITY_LABEL[item.priority]}] ${item.title} · ${IMPROVEMENT_KIND_LABEL[item.kind]}`,
      '',
      `**Problema:** ${item.problem}`,
      '',
      `**Propuesta:** ${item.proposal}`,
      ...(item.contract ? ['', '```', item.contract, '```'] : []),
      ...(item.unlocks.length > 0
        ? ['', `**Desbloquea:** ${item.unlocks.map((id) => capabilityById(id)?.label ?? id).join(', ')}`]
        : []),
      '',
    ]),
  ].join('\n');

export function ApiImprovementsPage({ onNotice }: ApiImprovementsPageProps) {
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<ImprovementPriority | ''>('');
  const [kind, setKind] = useState<ImprovementKind | ''>('');
  const [page, setPage] = useState<FuelPage | ''>('');
  const kindKeys = Object.keys(IMPROVEMENT_KIND_LABEL) as ImprovementKind[];
  const pageKeys = Object.keys(PAGE_LABEL) as FuelPage[];
  const priorityOptions = [
    { value: '', label: 'Todas las prioridades' },
    ...PRIORITIES.map((key) => ({ value: key, label: IMPROVEMENT_PRIORITY_LABEL[key] })),
  ];
  const kindOptions = [
    { value: '', label: 'Todos los tipos' },
    ...kindKeys.map((key) => ({ value: key, label: IMPROVEMENT_KIND_LABEL[key] })),
  ];
  const pageOptions = [
    { value: '', label: 'Todas las páginas' },
    ...pageKeys.map((key) => ({ value: key, label: PAGE_LABEL[key] })),
  ];

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return apiImprovements.filter(
      (item) =>
        (!priority || item.priority === priority) &&
        (!kind || item.kind === kind) &&
        (!page || pagesOf(item).includes(page)) &&
        (!needle || `${item.title} ${item.problem} ${item.proposal} ${item.contract ?? ''}`.toLowerCase().includes(needle)),
    );
  }, [query, priority, kind, page]);

  const gaps = apiCapabilities.filter((capability) => capability.status !== 'available');
  const unlocked = new Set(apiImprovements.flatMap((item) => item.unlocks));
  const covered = gaps.filter((capability) => unlocked.has(capability.id));
  const orphans = gaps.filter((capability) => !unlocked.has(capability.id));

  const copyBacklog = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown(rows));
      onNotice(`${rows.length} mejoras copiadas como Markdown.`);
    } catch {
      onNotice('El navegador no permitió copiar al portapapeles.');
    }
  };

  const clearFilters = () => {
    setQuery('');
    setPriority('');
    setKind('');
    setPage('');
  };

  return (
    <div className="table-page">
      <p className="improvements__source">
        Basado en <code>src/assets/ZERO_Servicios_Externos_API.md</code> y en la matriz de cobertura (<code>src/data/apiCoverage.ts</code>).
      </p>

      <dl className="table-page__summary">
        <div>
          <dt>Mejoras propuestas</dt>
          <dd>{apiImprovements.length}</dd>
        </div>
        <div>
          <dt>Prioridad alta</dt>
          <dd className="is-alert">{apiImprovements.filter((item) => item.priority === 'high').length}</dd>
        </div>
        <div>
          <dt>Métodos nuevos</dt>
          <dd>{apiImprovements.filter((item) => item.kind === 'new-method').length}</dd>
        </div>
        <div>
          <dt>Huecos del mockup cubiertos</dt>
          <dd>
            {covered.length} <span className="improvements__of">de {gaps.length}</span>
          </dd>
        </div>
      </dl>

      {orphans.length > 0 && (
        <p className="improvements__warning" role="alert">
          Sin mejora propuesta: {orphans.map((capability) => `${capability.label} (${PAGE_LABEL[capability.page]})`).join(', ')}.
        </p>
      )}

      <section className="table-page__card" aria-labelledby="improvements-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="improvements-title">
            Backlog para el equipo de API ZERO
          </h2>
          <div className="table-page__filters">
            <div className="table-page__flow-search">
              <Input type="search" icon="search" ariaLabel="Buscar mejora" value={query} placeholder="Método, campo o tema" onChange={setQuery} />
            </div>
            <span id="improvements-priority-filter-label" className="visually-hidden">Filtrar por prioridad</span>
            <Select
              options={priorityOptions}
              value={priority}
              aria-labelledby="improvements-priority-filter-label"
              onChange={(value) => {
                const selected = PRIORITIES.find((key) => key === value);
                if (selected || value === '') setPriority(selected ?? '');
              }}
            />
            <span id="improvements-kind-filter-label" className="visually-hidden">Filtrar por tipo</span>
            <Select
              options={kindOptions}
              value={kind}
              aria-labelledby="improvements-kind-filter-label"
              onChange={(value) => {
                const selected = kindKeys.find((key) => key === value);
                if (selected || value === '') setKind(selected ?? '');
              }}
            />
            <span id="improvements-page-filter-label" className="visually-hidden">Filtrar por página</span>
            <Select
              options={pageOptions}
              value={page}
              aria-labelledby="improvements-page-filter-label"
              onChange={(value) => {
                const selected = pageKeys.find((key) => key === value);
                if (selected || value === '') setPage(selected ?? '');
              }}
            />
            <Button variant="secondary" size="sm" disabled={rows.length === 0} onClick={copyBacklog}>
              <CopyIcon width={14} height={14} />
              Copiar como Markdown
            </Button>
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon="search"
            title="Ninguna mejora coincide con los filtros"
            description="Prueba con otro método o campo, o cambia la prioridad, el tipo y la página."
            actions={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <div className="improvements">
            {PRIORITIES.map((level) => {
              const items = rows.filter((item) => item.priority === level);
              if (items.length === 0) return null;
              return (
                <section key={level} className="improvements__group" aria-label={`Prioridad ${IMPROVEMENT_PRIORITY_LABEL[level]}`}>
                  <p className={`improvements__group-title improvements__group-title--${level}`}>
                    Prioridad {IMPROVEMENT_PRIORITY_LABEL[level].toLowerCase()} · {items.length}
                  </p>
                  <ul className="improvements__list">
                    {items.map((item) => (
                      <li key={item.id} className={`improvement improvement--${item.priority}`}>
                        <div className="improvement__head">
                          <h3 className="improvement__title">{item.title}</h3>
                          <span className={`improvement__kind improvement__kind--${item.kind}`}>{IMPROVEMENT_KIND_LABEL[item.kind]}</span>
                        </div>
                        <div className="improvement__body">
                          <div>
                            <p className="improvement__label">Problema</p>
                            <p className="improvement__text">{item.problem}</p>
                            <p className="improvement__label">Propuesta</p>
                            <p className="improvement__text">{item.proposal}</p>
                          </div>
                          {item.contract && (
                            <div>
                              <p className="improvement__label">Contrato sugerido</p>
                              <pre className="improvement__contract">{item.contract}</pre>
                            </div>
                          )}
                        </div>
                        {item.unlocks.length > 0 && (
                          <div className="improvement__unlocks">
                            <span className="improvement__label">Desbloquea</span>
                            {item.unlocks.map((id) => {
                              const capability = capabilityById(id);
                              if (!capability) return null;
                              return (
                                <span
                                  key={id}
                                  className={`improvement__cap improvement__cap--${capability.status}`}
                                  title={`Hoy: ${API_STATUS_LABEL[capability.status]}`}
                                >
                                  {capability.label}
                                  <small>{PAGE_LABEL[capability.page]}</small>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
