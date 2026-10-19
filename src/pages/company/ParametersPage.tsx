import { useMemo, useState } from 'react';
import { ParameterCatalogDialog } from '../../components/company/ParameterCatalogDialog';
import { ParameterRecordDialog } from '../../components/company/ParameterRecordDialog';
import { ApiCoverageBanner, ApiTag } from '../../components/api/ApiCoverage';
import { PlusIcon, SearchIcon } from '../../components/icons/Icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { parameterCatalogs, type ParameterCatalog, type ParameterRecord } from '../../data/company';
import '../TablePage.css';
import './ParametersPage.css';

interface ParametersPageProps {
  onNotice: (message: string) => void;
}

/** Coverage entry of each built-in catalog; custom catalogs fall back to `par-custom`. */
const CATALOG_API: Record<string, string> = {
  'billing-groups': 'par-billing',
  regions: 'par-regions',
  'cost-centers': 'par-cost-centers',
  branches: 'par-branches',
};

type RecordDialog = { mode: 'create' } | { mode: 'edit'; record: ParameterRecord };

export function ParametersPage({ onNotice }: ParametersPageProps) {
  const [catalogs, setCatalogs] = useState<ParameterCatalog[]>(parameterCatalogs);
  const [selectedId, setSelectedId] = useState(parameterCatalogs[0].id);
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [recordDialog, setRecordDialog] = useState<RecordDialog | null>(null);
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);

  const catalog = catalogs.find((candidate) => candidate.id === selectedId) ?? catalogs[0];

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.records.filter(
      (record) => (showInactive || record.active) && (!needle || Object.values(record.values).join(' ').toLowerCase().includes(needle)),
    );
  }, [catalog, query, showInactive]);

  /** Catalogs whose fields point at the selected one; shown so admins know what an edit affects. */
  const usedBy = catalogs.filter((candidate) => candidate.fields.some((field) => field.ref === catalog.id));

  const selectCatalog = (id: string) => {
    setSelectedId(id);
    setQuery('');
  };

  const saveRecord = (values: Record<string, string>) => {
    if (!recordDialog) return;
    const name = values[catalog.titleField];

    setCatalogs((current) => {
      if (recordDialog.mode === 'create') {
        const record: ParameterRecord = { id: `${catalog.id}-${Date.now().toString(36)}`, active: true, values };
        return current.map((candidate) => (candidate.id === catalog.id ? { ...candidate, records: [...candidate.records, record] } : candidate));
      }

      // A rename travels to every record that references the old name.
      const previous = recordDialog.record.values[catalog.titleField];
      return current.map((candidate) => {
        if (candidate.id === catalog.id) {
          return {
            ...candidate,
            records: candidate.records.map((record) => (record.id === recordDialog.record.id ? { ...record, values } : record)),
          };
        }
        const refKeys = candidate.fields.filter((field) => field.ref === catalog.id).map((field) => field.key);
        if (refKeys.length === 0 || previous === name) return candidate;
        return {
          ...candidate,
          records: candidate.records.map((record) => ({
            ...record,
            values: Object.fromEntries(
              Object.entries(record.values).map(([key, value]) => [key, refKeys.includes(key) && value === previous ? name : value]),
            ),
          })),
        };
      });
    });

    onNotice(recordDialog.mode === 'create' ? `${name} se agregó a ${catalog.label}.` : `${name}: cambios guardados.`);
    setRecordDialog(null);
  };

  const toggleRecord = (record: ParameterRecord) => {
    setCatalogs((current) =>
      current.map((candidate) =>
        candidate.id === catalog.id
          ? { ...candidate, records: candidate.records.map((item) => (item.id === record.id ? { ...item, active: !item.active } : item)) }
          : candidate,
      ),
    );
    const name = record.values[catalog.titleField];
    onNotice(record.active ? `${name} se desactivó; ya no aparece en nuevas asignaciones.` : `${name} se reactivó.`);
  };

  const deleteCatalog = () => {
    setCatalogs((current) => current.filter((candidate) => candidate.id !== catalog.id));
    setSelectedId(catalogs[0].id);
    onNotice(`Catálogo ${catalog.label} eliminado.`);
  };

  const activeCount = catalog.records.filter((record) => record.active).length;
  const columns = catalog.fields.filter((field) => field.inTable !== false);

  return (
    <div className="table-page">
      <ApiCoverageBanner page="parameters" />

      <div className="parameters">
        <nav className="parameters__nav" aria-label="Catálogos de parámetros">
          <p className="parameters__nav-title">Catálogos</p>
          <ul>
            {catalogs.map((candidate) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  className={candidate.id === catalog.id ? 'is-active' : ''}
                  aria-current={candidate.id === catalog.id ? 'true' : undefined}
                  onClick={() => selectCatalog(candidate.id)}
                >
                  <span>
                    {candidate.label}
                    {candidate.custom && <small>Personalizado</small>}
                  </span>
                  <span className="parameters__count">{candidate.records.filter((record) => record.active).length}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--secondary btn--sm parameters__new" onClick={() => setCatalogDialogOpen(true)}>
            <PlusIcon width={14} height={14} />
            Nuevo catálogo
          </button>
          <p className="parameters__api-hint">
            <ApiTag id="par-custom" />
          </p>
        </nav>

        <section className="table-page__card parameters__main" aria-labelledby="parameters-title">
          <header className="parameters__intro">
            <div>
              <h2 className="table-page__title" id="parameters-title">
                {catalog.label}
                <ApiTag id={CATALOG_API[catalog.id] ?? 'par-custom'} />
              </h2>
              <p className="parameters__description">{catalog.description}</p>
              <p className="parameters__meta">
                {activeCount} activos · {catalog.records.length - activeCount} inactivos · {catalog.fields.length} campos
                {usedBy.length > 0 && <> · Se usa en {usedBy.map((candidate) => candidate.label).join(', ')}</>}
              </p>
            </div>
            <div className="parameters__intro-actions">
              {catalog.custom && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={deleteCatalog}>
                  Eliminar catálogo
                </button>
              )}
              <ApiTag id="par-write" />
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setRecordDialog({ mode: 'create' })}>
                <PlusIcon width={14} height={14} />
                Agregar registro
              </button>
            </div>
          </header>

          {catalog.records.length > 0 && (
            <div className="table-page__head">
              <label className="table-page__search">
                <SearchIcon width={15} height={15} />
                <span className="visually-hidden">Buscar en {catalog.label}</span>
                <input type="search" value={query} placeholder={`Buscar en ${catalog.label.toLowerCase()}`} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <label className="parameters__toggle">
                <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
                Mostrar inactivos
              </label>
            </div>
          )}

          {catalog.records.length === 0 ? (
            <EmptyState
              icon={<PlusIcon width={20} height={20} />}
              title={`${catalog.label} aún no tiene registros`}
              description="Agrega el primero; después podrás usarlo como referencia en otros catálogos."
              actions={
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setRecordDialog({ mode: 'create' })}>
                  Agregar registro
                </button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              compact
              icon={<SearchIcon width={20} height={20} />}
              title="Ningún registro coincide"
              description="Prueba con otro texto o incluye los registros inactivos."
              actions={
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => {
                    setQuery('');
                    setShowInactive(true);
                  }}
                >
                  Limpiar búsqueda
                </button>
              }
            />
          ) : (
            <div className="table-page__scroll">
              <table className="table-page__table parameters__table">
                <thead>
                  <tr>
                    {columns.map((field) => (
                      <th key={field.key} scope="col">
                        {field.label}
                      </th>
                    ))}
                    <th scope="col">Estado</th>
                    <th scope="col">
                      <span className="visually-hidden">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((record) => (
                    <tr key={record.id} className={record.active ? '' : 'is-inactive'}>
                      {columns.map((field) => (
                        <td key={field.key}>
                          {field.key === catalog.titleField ? (
                            <span className="table-page__main">{record.values[field.key]}</span>
                          ) : (
                            record.values[field.key] || <span className="table-page__sub">—</span>
                          )}
                        </td>
                      ))}
                      <td>
                        <span className={`chip ${record.active ? 'chip--active' : 'chip--paused'}`}>{record.active ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td className="table-page__action">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRecordDialog({ mode: 'edit', record })}>
                          Editar
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleRecord(record)}>
                          {record.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {recordDialog && (
        <ParameterRecordDialog
          catalog={catalog}
          catalogs={catalogs}
          record={recordDialog.mode === 'edit' ? recordDialog.record : undefined}
          onClose={() => setRecordDialog(null)}
          onSave={saveRecord}
        />
      )}

      {catalogDialogOpen && (
        <ParameterCatalogDialog
          catalogs={catalogs}
          onClose={() => setCatalogDialogOpen(false)}
          onCreate={(created) => {
            setCatalogs((current) => [...current, created]);
            selectCatalog(created.id);
            setCatalogDialogOpen(false);
            onNotice(`Catálogo ${created.label} creado. Agrega sus primeros registros.`);
          }}
        />
      )}
    </div>
  );
}
