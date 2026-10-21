import { useMemo, useState } from 'react';
import { Badge, Button, Input, StatusPill, Switch, Table, type GridColumn } from '@er-mobility-mx/design-system';
import { ParameterCatalogDialog } from '../../components/company/ParameterCatalogDialog';
import { ParameterRecordDialog } from '../../components/company/ParameterRecordDialog';
import { ApiCoverageBanner, ApiTag } from '../../components/api/ApiCoverage';
import { PlusIcon } from '../../components/icons/Icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { parameterCatalogs, type ParameterCatalog, type ParameterRecord } from '../../data/company';
import '../TablePage.css';
import './ParametersPage.css';
import './AdministrationTables.css';

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
  const columns: GridColumn<ParameterRecord>[] = [
    ...catalog.fields.filter((field) => field.inTable !== false).map((field) => ({
      key: field.key,
      label: field.label,
      render: (record: ParameterRecord) => (
        <span
          className={field.key === catalog.titleField ? 'admin-table__primary' : 'admin-table__value'}
          data-inactive={!record.active || undefined}
        >
          {record.values[field.key] || <span className="admin-table__metadata">—</span>}
        </span>
      ),
    })),
    {
      key: 'status',
      label: 'Estado',
      render: (record) => <StatusPill label={record.active ? 'Activo' : 'Inactivo'} tone={record.active ? 'success' : 'neutral'} />,
    },
    {
      key: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (record) => (
        <div className="admin-table__actions">
          <Button variant="ghost" size="sm" onClick={() => setRecordDialog({ mode: 'edit', record })}>
            Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toggleRecord(record)}>
            {record.active ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      ),
    },
  ];

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
                  <Badge>{candidate.records.filter((record) => record.active).length}</Badge>
                </button>
              </li>
            ))}
          </ul>
          <div className="parameters__new">
            <Button variant="secondary" size="sm" fullWidth onClick={() => setCatalogDialogOpen(true)}>
              <PlusIcon width={14} height={14} />
              Nuevo catálogo
            </Button>
          </div>
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
                <Button variant="ghost" size="sm" onClick={deleteCatalog}>
                  Eliminar catálogo
                </Button>
              )}
              <ApiTag id="par-write" />
              <Button size="sm" onClick={() => setRecordDialog({ mode: 'create' })}>
                <PlusIcon width={14} height={14} />
                Agregar registro
              </Button>
            </div>
          </header>

          {catalog.records.length > 0 && (
            <div className="table-page__head">
              <div className="table-page__flow-search">
                <Input
                  type="search"
                  icon="search"
                  ariaLabel={`Buscar en ${catalog.label}`}
                  value={query}
                  placeholder={`Buscar en ${catalog.label.toLowerCase()}`}
                  onChange={setQuery}
                />
              </div>
              <div className="parameters__toggle">
                <Switch checked={showInactive} label="Mostrar inactivos" onChange={setShowInactive} />
              </div>
            </div>
          )}

          {catalog.records.length === 0 ? (
            <EmptyState
              icon="add"
              title={`${catalog.label} aún no tiene registros`}
              description="Agrega el primero; después podrás usarlo como referencia en otros catálogos."
              actions={
                <Button size="sm" onClick={() => setRecordDialog({ mode: 'create' })}>
                  Agregar registro
                </Button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              compact
              icon="search"
              title="Ningún registro coincide"
              description="Prueba con otro texto o incluye los registros inactivos."
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    setShowInactive(true);
                  }}
                >
                  Limpiar búsqueda
                </Button>
              }
            />
          ) : (
            <Table caption={catalog.label} columns={columns} rows={rows} rowKey="id" surface="none" sortable={false} />
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
