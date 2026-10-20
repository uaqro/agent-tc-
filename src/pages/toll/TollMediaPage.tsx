import { useMemo, useState } from 'react';
import { Button, Input, Select, StatusPill } from '@er-mobility-mx/design-system';
import { CardIcon, PlusIcon, SearchIcon } from '../../components/icons/Icons';
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

  return (
    <div className="table-page">
      {readOnly && <ReadOnlyNotice what="los TAGs de telepeaje" />}
      <dl className="table-page__summary">
        <div>
          <dt>TAGs activos</dt>
          <dd>{count('active')}</dd>
        </div>
        <div>
          <dt>Bloqueados</dt>
          <dd className={count('blocked') > 0 ? 'is-alert' : undefined}>{count('blocked')}</dd>
        </div>
        <div>
          <dt>Sin asignar</dt>
          <dd>{count('unassigned')}</dd>
        </div>
        <div>
          <dt>En reposición</dt>
          <dd>{count('replacement')}</dd>
        </div>
      </dl>

      <section className="table-page__card" aria-labelledby="toll-media-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="toll-media-title">
            TAGs de telepeaje
          </h2>
          <div className="table-page__filters">
            <label className="table-page__search">
              <SearchIcon width={15} height={15} />
              <Input
                type="search"
                ariaLabel="Buscar TAG"
                value={query}
                placeholder="Número de TAG, placa o conductor"
                onChange={setQuery}
              />
            </label>
            <label>
              <span className="visually-hidden">Filtrar por tipo</span>
              <select value={type} onChange={(event) => setType(event.target.value as TollTagType | '')}>
                <option value="">Todos los tipos</option>
                {(Object.keys(TOLL_TAG_TYPE_LABEL) as TollTagType[]).map((key) => (
                  <option key={key} value={key}>
                    {TOLL_TAG_TYPE_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Filtrar por estado</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as TollTagStatus | '')}>
                <option value="">Todos los estados</option>
                {(Object.keys(TOLL_TAG_STATUS_LABEL) as TollTagStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {TOLL_TAG_STATUS_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            {!readOnly && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNotice('Solicitud de nuevos TAGs de telepeaje abierta.')}
              >
                <PlusIcon width={14} height={14} />
                Solicitar TAGs
              </button>
            )}
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={<CardIcon width={20} height={20} />}
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
          <div className="table-page__scroll">
            <table className="table-page__table">
              <thead>
                <tr>
                  <th scope="col">TAG</th>
                  <th scope="col">Unidad asignada</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Saldo</th>
                  <th scope="col">Último cruce</th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tag) => {
                  const vehicle = vehicleOf(tag.vehicleId);
                  return (
                    <tr key={tag.id}>
                      <td>
                        <span className="table-page__main">{tag.number}</span>
                        <span className="table-page__sub">{TOLL_TAG_TYPE_LABEL[tag.type]}</span>
                      </td>
                      <td>
                        {vehicle ? (
                          <>
                            <span className="table-page__main">{vehicle.plate}</span>
                            <span className="table-page__sub">
                              {vehicle.driver} · {vehicle.group}
                            </span>
                          </>
                        ) : (
                          <span className="table-page__sub">Sin unidad</span>
                        )}
                      </td>
                      <td className="table-page__nowrap">{tag.vehicleId ? TOLL_CATEGORY_LABEL[tag.category] : '—'}</td>
                      <td>
                        <StatusPill label={TOLL_TAG_STATUS_LABEL[tag.status]} tone={STATUS_TONE[tag.status]} />
                      </td>
                      <td>{tag.vehicleId ? formatMoney(tag.balanceMXN, true) : '—'}</td>
                      <td>
                        {tag.lastCrossing ? (
                          <>
                            {formatDateTime(new Date(tag.lastCrossing))}
                            <span className="table-page__sub">{tag.lastPlaza}</span>
                          </>
                        ) : (
                          <span className="table-page__sub">Sin cruces</span>
                        )}
                      </td>
                      <td className="table-page__action">
                        {!readOnly && tag.status === 'active' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => setTagStatus(tag, 'blocked')}>
                              Bloquear
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTagStatus(tag, 'replacement')}
                            >
                              Reportar robo o daño
                            </Button>
                          </>
                        )}
                        {!readOnly && tag.status === 'blocked' && (
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setTagStatus(tag, 'active')}>
                            Desbloquear
                          </Button>
                        )}
                        {!readOnly && tag.status === 'unassigned' && (
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAssigning(tag)}>
                            Asignar
                          </Button>
                        )}
                        {tag.status === 'replacement' && <span className="table-page__sub">Reposición en trámite</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
