import { useMemo, useState } from 'react';
import { PlusIcon, SearchIcon } from '../components/icons/Icons';
import { ApiCoverageBanner, ApiTag } from '../components/api/ApiCoverage';
import { EmptyState } from '../components/ui/EmptyState';
import { vehicles } from '../data/dispersion';
import { PAYMENT_TYPE_LABEL, VEHICLE_STATUS_LABEL, paymentMedia, vehicleDetails, type VehicleStatus } from '../data/fleet';
import { assignableGroups } from '../data/limits';
import { formatCount } from '../utils/format';
import './TablePage.css';

interface VehiclesPageProps {
  onNotice: (message: string) => void;
}

const STATUS_CHIP: Record<VehicleStatus, string> = {
  active: 'chip--active',
  maintenance: 'chip--review',
  inactive: 'chip--paused',
};

export function VehiclesPage({ onNotice }: VehiclesPageProps) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState<VehicleStatus | ''>('');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vehicles
      .map((vehicle) => ({ vehicle, detail: vehicleDetails.find((detail) => detail.vehicleId === vehicle.id) }))
      .filter(({ vehicle, detail }) => {
        const haystack = `${vehicle.plate} ${vehicle.driver} ${detail?.brand ?? ''} ${detail?.model ?? ''}`.toLowerCase();
        return (!group || vehicle.group === group) && (!status || detail?.status === status) && (!needle || haystack.includes(needle));
      });
  }, [query, group, status]);

  const count = (key: VehicleStatus) => vehicleDetails.filter((detail) => detail.status === key).length;

  return (
    <div className="table-page">
      <ApiCoverageBanner page="vehicles" />

      <dl className="table-page__summary">
        <div>
          <dt>Vehículos registrados</dt>
          <dd>{vehicles.length}</dd>
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
              <input type="search" value={query} placeholder="Placa, marca, modelo o conductor" onChange={(event) => setQuery(event.target.value)} />
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
            <button type="button" className="btn btn--primary btn--sm" onClick={() => onNotice('Alta de vehículo abierta.')}>
              <PlusIcon width={14} height={14} />
              Alta de vehículo
            </button>
            <ApiTag id="veh-create" />
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={<SearchIcon width={20} height={20} />}
            title="Ningún vehículo coincide con los filtros"
            description="Revisa la placa, la marca o el conductor, o cambia el grupo y el estado seleccionados."
            actions={
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  setQuery('');
                  setGroup('');
                  setStatus('');
                }}
              >
                Limpiar filtros
              </button>
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
                {rows.map(({ vehicle, detail }) => {
                  const medium = paymentMedia.find((candidate) => candidate.vehicleId === vehicle.id);
                  return (
                    <tr key={vehicle.id}>
                      <td>
                        <span className="table-page__main">{vehicle.plate}</span>
                        <span className="table-page__sub">{detail ? `${detail.brand} ${detail.model} · ${detail.year}` : '—'}</span>
                      </td>
                      <td>{vehicle.group}</td>
                      <td>
                        {detail?.fuel ?? '—'}
                        {detail && <span className="table-page__sub table-page__nowrap">Tanque de {detail.tankLiters} L</span>}
                      </td>
                      <td>{detail ? `${detail.expectedKmPerLiter} km/L` : '—'}</td>
                      <td>{detail ? `${formatCount(detail.odometerKm)} km` : '—'}</td>
                      <td>{vehicle.driver}</td>
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
                      <td>{detail && <span className={`chip ${STATUS_CHIP[detail.status]}`}>{VEHICLE_STATUS_LABEL[detail.status]}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
