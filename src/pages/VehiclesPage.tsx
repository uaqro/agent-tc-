import { useMemo, useState } from 'react';
import { Button, StatusPill } from '@er-mobility-mx/design-system';
import { PlusIcon, SearchIcon } from '../components/icons/Icons';
import { ApiCoverageBanner, ApiTag } from '../components/api/ApiCoverage';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination, usePagination } from '../components/ui/Pagination';
import {
  PAYMENT_TYPE_LABEL,
  REGISTRY_GAP_LABEL,
  VEHICLE_STATUS_LABEL,
  vehicleMedia,
  vehicleDetails,
  type RegistryGap,
  type VehicleDetail,
  type VehicleStatus,
} from '../data/fleet';
import { assignableGroups } from '../data/limits';
import { formatCount } from '../utils/format';
import './TablePage.css';

interface VehiclesPageProps {
  onNotice: (message: string) => void;
  /** Registering and editing units is admin only, as in ADR-001 (`inventario.editar`). */
  canEdit?: boolean;
  /** The VIN equivalence is visible to admin and flota (`inventario.vin`). */
  showVin?: boolean;
}

const STATUS_TONE: Record<VehicleStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  maintenance: 'warning',
  inactive: 'neutral',
};

/** Record filter: every unit, the incomplete ones, or the ones missing one piece. */
type RecordFilter = '' | 'incomplete' | RegistryGap;

export function VehiclesPage({ onNotice, canEdit = false, showVin = false }: VehiclesPageProps) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState<VehicleStatus | ''>('');
  const [record, setRecord] = useState<RecordFilter>('');
  // A role without access to the VIN equivalence does not learn which VINs are missing either (ADR-TCP-001).
  const gapsOf = (detail: VehicleDetail): RegistryGap[] => detail.gaps.filter((gap) => gap !== 'vin' || showVin);
  const gapKinds = (Object.keys(REGISTRY_GAP_LABEL) as RegistryGap[]).filter((gap) => gap !== 'vin' || showVin);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vehicleDetails.filter((detail) => {
      const haystack = `${detail.vehicleId} ${detail.plate} ${detail.driver} ${detail.brand} ${detail.model}`.toLowerCase();
      const gaps = gapsOf(detail);
      const recordOk = !record || (record === 'incomplete' ? gaps.length > 0 : gaps.includes(record));
      return (!group || detail.group === group) && (!status || detail.status === status) && recordOk && (!needle || haystack.includes(needle));
    });
  }, [query, group, status, record, showVin]);
  const pagination = usePagination(rows);
  const mediumByVehicle = useMemo(() => new Map(vehicleMedia.map((medium) => [medium.vehicleId, medium])), []);

  const count = (key: VehicleStatus) => vehicleDetails.filter((detail) => detail.status === key).length;

  return (
    <div className="table-page">
      <ApiCoverageBanner page="vehicles" />

      <dl className="table-page__summary">
        <div>
          <dt>Vehículos registrados</dt>
          <dd>{formatCount(vehicleDetails.length)}</dd>
        </div>
        <div>
          <dt>Activos</dt>
          <dd>{count('active')}</dd>
        </div>
        <div>
          <dt>En taller</dt>
          <dd>{count('maintenance')}</dd>
        </div>
        <div>
          <dt>Inactivos</dt>
          <dd>{count('inactive')}</dd>
        </div>
        <div>
          <dt>Ficha incompleta</dt>
          <dd>{vehicleDetails.filter((detail) => gapsOf(detail).length > 0).length}</dd>
        </div>
      </dl>

      <section className="table-page__card" aria-labelledby="vehicles-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="vehicles-title">
            Vehículos
            <ApiTag id="veh-list" />
          </h2>
          <div className="table-page__filters">
            <label className="table-page__search">
              <SearchIcon width={15} height={15} />
              <span className="visually-hidden">Buscar vehículo</span>
              <input type="search" value={query} placeholder="Unidad, placa, marca o conductor" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label>
              <span className="visually-hidden">Filtrar por grupo</span>
              <select value={group} onChange={(event) => setGroup(event.target.value)}>
                <option value="">Todos los grupos</option>
                {assignableGroups.map((candidate) => (
                  <option key={candidate.id} value={candidate.label}>
                    {candidate.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Filtrar por estado</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as VehicleStatus | '')}>
                <option value="">Todos los estados</option>
                {(Object.keys(VEHICLE_STATUS_LABEL) as VehicleStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {VEHICLE_STATUS_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Filtrar por ficha</span>
              <select value={record} onChange={(event) => setRecord(event.target.value as RecordFilter)}>
                <option value="">Toda la ficha</option>
                <option value="incomplete">Ficha incompleta</option>
                {gapKinds.map((gap) => (
                  <option key={gap} value={gap}>
                    {REGISTRY_GAP_LABEL[gap]}
                  </option>
                ))}
              </select>
            </label>
            {canEdit && (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => onNotice('Alta de vehículo abierta.')}>
                <PlusIcon width={14} height={14} />
                Alta de vehículo
              </button>
            )}
            <ApiTag id="veh-create" />
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon="search"
            title="Ningún vehículo coincide con los filtros"
            description="Revisa la placa, la marca o el conductor, o cambia el grupo y el estado seleccionados."
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setGroup('');
                  setStatus('');
                  setRecord('');
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
                  <th scope="col">
                    Unidad
                    <ApiTag id="veh-specs" />
                  </th>
                  <th scope="col">
                    Grupo
                    <ApiTag id="veh-group" />
                  </th>
                  <th scope="col">Combustible</th>
                  <th scope="col">
                    Rendimiento esperado
                    <ApiTag id="veh-performance" />
                  </th>
                  <th scope="col">
                    Odómetro
                    <ApiTag id="veh-odometer" />
                  </th>
                  <th scope="col">
                    Conductor
                    <ApiTag id="veh-driver" />
                  </th>
                  <th scope="col">
                    Medio de pago
                    <ApiTag id="veh-media" />
                  </th>
                  <th scope="col">
                    Estado
                    <ApiTag id="veh-status" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageRows.map((detail) => {
                  const medium = mediumByVehicle.get(detail.vehicleId);
                  const gaps = gapsOf(detail);
                  return (
                    <tr key={detail.vehicleId}>
                      <td>
                        <span className="table-page__main">{detail.plate}</span>
                        <span className="table-page__sub">
                          {detail.vehicleId} · {detail.brand} {detail.model} · {detail.year}
                        </span>
                        {showVin && (
                          <span className="table-page__sub table-page__nowrap">
                            {detail.vin === '' ? 'VIN pendiente' : `VIN ${detail.vin}`}
                          </span>
                        )}
                        {gaps.length > 0 && (
                          <span className="chip chip--review table-page__gap" title={`Ficha incompleta: ${gaps.map((gap) => REGISTRY_GAP_LABEL[gap]).join(', ')}`}>
                            {gaps.map((gap) => REGISTRY_GAP_LABEL[gap]).join(' · ')}
                          </span>
                        )}
                      </td>
                      <td>{detail.group}</td>
                      <td>
                        {detail.fuel}
                        <span className="table-page__sub table-page__nowrap">Tanque de {detail.tankLiters} L</span>
                      </td>
                      <td>{detail.expectedKmPerLiter} km/L</td>
                      <td>
                        {detail.odometerKm === null ? (
                          <span className="table-page__sub">Sin lectura</span>
                        ) : (
                          `${formatCount(detail.odometerKm)} km`
                        )}
                      </td>
                      <td>{detail.driver}</td>
                      <td>
                        {medium ? (
                          <>
                            <span className="table-page__nowrap">{medium.number}</span>
                            <span className="table-page__sub">{PAYMENT_TYPE_LABEL[medium.type]}</span>
                          </>
                        ) : (
                          <span className="table-page__sub">Sin medio</span>
                        )}
                      </td>
                      <td>
                        <StatusPill tone={STATUS_TONE[detail.status]} label={VEHICLE_STATUS_LABEL[detail.status]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pagination} noun="vehículos" onPage={pagination.setPage} />
      </section>
    </div>
  );
}
