import { useMemo, useState } from 'react';
import { Button, Card, Input, Select, StatusPill, Table, type GridColumn } from '@er-mobility-mx/design-system';
import { PlusIcon } from '../../components/icons/Icons';
import { TollAssignDialog } from '../../components/toll/TollAssignDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { fleetVehicles as vehicles } from '../../data/dispersion';
import {
  TOLL_CATEGORY_LABEL,
  TOLL_TAG_STATUS_LABEL,
  TOLL_TAG_TYPE_LABEL,
  tollPolicies,
  tollTags as seedTags,
} from '../../data/toll';
import { fleetAssignableGroups as assignableGroups } from '../../data/limits';
import type { TollCategory, TollTag, TollTagStatus, TollTagType } from '../../types/toll';
import { formatDateTime, formatMoney } from '../../utils/format';
import { ReadOnlyNotice } from '../../components/ui/ReadOnlyNotice';
import '../TablePage.css';
import './toll.css';

interface TollMediaPageProps {
  onNotice: (message: string) => void;
  /** The role sees TAGs, their balance and use, but can't request, block or reassign them (ADR-TCP-001). */
  readOnly?: boolean;
}

const STATUS_TONE: Record<TollTagStatus, 'success' | 'danger' | 'neutral' | 'warning'> = {
  active: 'success',
  blocked: 'danger',
  unassigned: 'neutral',
  replacement: 'warning',
};

export function TollMediaPage({ onNotice, readOnly = false }: TollMediaPageProps) {
  const [tags, setTags] = useState<TollTag[]>(seedTags);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<TollTagStatus | ''>('');
  const [type, setType] = useState<TollTagType | ''>('');
  const [assigning, setAssigning] = useState<TollTag | null>(null);
  const typeKeys = Object.keys(TOLL_TAG_TYPE_LABEL) as TollTagType[];
  const statusKeys = Object.keys(TOLL_TAG_STATUS_LABEL) as TollTagStatus[];
  const typeOptions = [
    { value: '', label: 'Todos los tipos' },
    ...typeKeys.map((key) => ({ value: key, label: TOLL_TAG_TYPE_LABEL[key] })),
  ];
  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    ...statusKeys.map((key) => ({ value: key, label: TOLL_TAG_STATUS_LABEL[key] })),
  ];
  const vehicleOf = (id: string | null) => vehicles.find((vehicle) => vehicle.id === id);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tags.filter((tag) => {
      const vehicle = vehicles.find((candidate) => candidate.id === tag.vehicleId);
      const haystack = `${tag.number} ${vehicle?.plate ?? ''} ${vehicle?.driver ?? ''}`.toLowerCase();
      return (!status || tag.status === status) && (!type || tag.type === type) && (!needle || haystack.includes(needle));
    });
  }, [tags, query, status, type]);

  const count = (key: TollTagStatus) => tags.filter((tag) => tag.status === key).length;

  /** Units that already carry a working toll tag cannot receive a second one. */
  const freeVehicles = vehicles.filter(
    (vehicle) => !tags.some((tag) => tag.vehicleId === vehicle.id && tag.status !== 'replacement'),
  );

  const patchTag = (tag: TollTag, changes: Partial<TollTag>) =>
    setTags((current) => current.map((candidate) => (candidate.id === tag.id ? { ...candidate, ...changes } : candidate)));

  const setTagStatus = (tag: TollTag, next: TollTagStatus) => {
    patchTag(tag, { status: next });
    const plate = vehicleOf(tag.vehicleId)?.plate;
    const suffix = plate ? ` · ${plate}` : '';
    if (next === 'blocked') onNotice(`TAG ${tag.number} bloqueado${suffix}. No podrá cruzar casetas.`);
    if (next === 'active') onNotice(`TAG ${tag.number} desbloqueado${suffix}.`);
    if (next === 'replacement') onNotice(`TAG ${tag.number} reportado${suffix}. Se cancela y se solicita reposición.`);
  };

  const assign = (tag: TollTag, vehicleId: string, category: TollCategory) => {
    const vehicle = vehicleOf(vehicleId);
    const groupId = assignableGroups.find((group) => group.label === vehicle?.group)?.id;
    const policy = tollPolicies.find((candidate) => groupId && candidate.groupIds.includes(groupId));

    patchTag(tag, { vehicleId, category, status: 'active', policyId: policy?.id ?? null });
    setAssigning(null);
    onNotice(
      `TAG ${tag.number} asignado a ${vehicle?.plate}${policy ? ` con la política ${policy.name}` : ' sin política de peaje'}.`,
    );
  };

  const columns: GridColumn<TollTag>[] = [
    {
      key: 'tag',
      label: 'TAG',
      render: (tag) => (
        <>
          <span className="table-page__main table-page__data">{tag.number}</span>
          <span className="table-page__sub">{TOLL_TAG_TYPE_LABEL[tag.type]}</span>
        </>
      ),
    },
    {
      key: 'vehicle',
      label: 'Unidad asignada',
      render: (tag) => {
        const vehicle = vehicleOf(tag.vehicleId);
        return vehicle ? (
          <>
            <span className="table-page__main table-page__data">{vehicle.plate}</span>
            <span className="table-page__sub">
              {vehicle.driver} · {vehicle.group}
            </span>
          </>
        ) : (
          <span className="table-page__sub">Sin unidad</span>
        );
      },
    },
    {
      key: 'category',
      label: 'Categoría',
      render: (tag) => (tag.vehicleId ? TOLL_CATEGORY_LABEL[tag.category] : '—'),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (tag) => <StatusPill label={TOLL_TAG_STATUS_LABEL[tag.status]} tone={STATUS_TONE[tag.status]} />,
    },
    {
      key: 'balance',
      label: 'Saldo',
      align: 'right',
      render: (tag) => (
        <span className="table-page__data">{tag.vehicleId ? formatMoney(tag.balanceMXN, true) : '—'}</span>
      ),
    },
    {
      key: 'lastCrossing',
      label: 'Último cruce',
      render: (tag) =>
        tag.lastCrossing ? (
          <>
            <span className="table-page__data">{formatDateTime(new Date(tag.lastCrossing))}</span>
            <span className="table-page__sub">{tag.lastPlaza}</span>
          </>
        ) : (
          <span className="table-page__sub">Sin cruces</span>
        ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (tag) => (
        <div className="table-page__row-actions">
          {!readOnly && tag.status === 'active' && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setTagStatus(tag, 'blocked')}>
                Bloquear
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setTagStatus(tag, 'replacement')}>
                Reportar robo o daño
              </Button>
            </>
          )}
          {!readOnly && tag.status === 'blocked' && (
            <Button variant="secondary" size="sm" onClick={() => setTagStatus(tag, 'active')}>
              Desbloquear
            </Button>
          )}
          {!readOnly && tag.status === 'unassigned' && (
            <Button variant="secondary" size="sm" onClick={() => setAssigning(tag)}>
              Asignar
            </Button>
          )}
          {tag.status === 'replacement' && <span className="table-page__sub">Reposición en trámite</span>}
        </div>
      ),
    },
  ];

  return (
    <div className="table-page table-page--catalog">
      {readOnly && <ReadOnlyNotice what="los TAGs de telepeaje" />}
      <dl className="table-page__summary">
        <Card padding="sm" surface="outlined">
          <dt>TAGs activos</dt>
          <dd>{count('active')}</dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>Bloqueados</dt>
          <dd className={count('blocked') > 0 ? 'is-alert' : undefined}>{count('blocked')}</dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>Sin asignar</dt>
          <dd>{count('unassigned')}</dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>En reposición</dt>
          <dd>{count('replacement')}</dd>
        </Card>
      </dl>

      <section className="table-page__card" aria-labelledby="toll-media-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="toll-media-title">
            TAGs de telepeaje
          </h2>
          <div className="table-page__filters">
            <div className="table-page__flow-search">
              <Input
                type="search"
                icon="search"
                ariaLabel="Buscar TAG"
                value={query}
                placeholder="Número de TAG, placa o conductor"
                onChange={setQuery}
              />
            </div>
            <span id="toll-media-type-filter-label" className="visually-hidden">Filtrar por tipo</span>
            <Select
              options={typeOptions}
              value={type}
              aria-labelledby="toll-media-type-filter-label"
              onChange={(value) => {
                const selected = typeKeys.find((key) => key === value);
                if (selected || value === '') setType(selected ?? '');
              }}
            />
            <span id="toll-media-status-filter-label" className="visually-hidden">Filtrar por estado</span>
            <Select
              options={statusOptions}
              value={status}
              aria-labelledby="toll-media-status-filter-label"
              onChange={(value) => {
                const selected = statusKeys.find((key) => key === value);
                if (selected || value === '') setStatus(selected ?? '');
              }}
            />
            {!readOnly && (
              <Button size="sm" onClick={() => onNotice('Solicitud de nuevos TAGs de telepeaje abierta.')}>
                <PlusIcon width={14} height={14} />
                Solicitar TAGs
              </Button>
            )}
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon="credit_card"
            title={tags.length === 0 ? 'Aún no tienes TAGs de telepeaje' : 'Ningún TAG coincide con los filtros'}
            description="Revisa el número, la placa o el conductor, o cambia el tipo y el estado seleccionados."
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setStatus('');
                  setType('');
                }}
              >
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <Table caption="TAGs de telepeaje" columns={columns} rows={rows} rowKey="id" surface="none" sortable={false} />
        )}
      </section>

      {assigning && (
        <TollAssignDialog
          tag={assigning}
          vehicles={freeVehicles}
          onClose={() => setAssigning(null)}
          onAssign={(vehicleId, category) => assign(assigning, vehicleId, category)}
        />
      )}
    </div>
  );
}
