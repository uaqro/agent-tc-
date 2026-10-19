import { useMemo, useState } from 'react';
import { CopyIcon, SearchIcon } from '../../components/icons/Icons';
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
            <label className="table-page__search">
              <SearchIcon width={15} height={15} />
              <span className="visually-hidden">Buscar mejora</span>
              <input type="search" value={query} placeholder="Método, campo o tema" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label>
              <span className="visually-hidden">Filtrar por prioridad</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as ImprovementPriority | '')}>
                <option value="">Todas las prioridades</option>
                {PRIORITIES.map((key) => (
                  <option key={key} value={key}>
                    {IMPROVEMENT_PRIORITY_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Filtrar por tipo</span>
              <select value={kind} onChange={(event) => setKind(event.target.value as ImprovementKind | '')}>
                <option value="">Todos los tipos</option>
                {(Object.keys(IMPROVEMENT_KIND_LABEL) as ImprovementKind[]).map((key) => (
                  <option key={key} value={key}>
                    {IMPROVEMENT_KIND_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Filtrar por página</span>
              <select value={page} onChange={(event) => setPage(event.target.value as FuelPage | '')}>
                <option value="">Todas las páginas</option>
                {(Object.keys(PAGE_LABEL) as FuelPage[]).map((key) => (
                  <option key={key} value={key}>
                    {PAGE_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn--secondary btn--sm" disabled={rows.length === 0} onClick={copyBacklog}>
              <CopyIcon width={14} height={14} />
              Copiar como Markdown
            </button>
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={<SearchIcon width={20} height={20} />}
            title="Ninguna mejora coincide con los filtros"
            description="Prueba con otro método o campo, o cambia la prioridad, el tipo y la página."
            actions={
              <button type="button" className="btn btn--secondary btn--sm" onClick={clearFilters}>
                Limpiar filtros
              </button>
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
