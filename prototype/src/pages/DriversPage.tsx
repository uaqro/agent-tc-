import { useMemo, useState } from 'react';
import { PlusIcon, SearchIcon } from '../components/icons/Icons';
import { ApiCoverageBanner, ApiTag } from '../components/api/ApiCoverage';
import { EmptyState } from '../components/ui/EmptyState';
import { vehicles } from '../data/dispersion';
import { drivers, vehicleDetails } from '../data/fleet';
import { assignableGroups } from '../data/limits';
import { daysUntil } from '../utils/format';
import './TablePage.css';

interface DriversPageProps {
  onNotice: (message: string) => void;
}

/** Licences that expire within this many days are flagged. */
const LICENSE_WARNING_DAYS = 60;

const licenseDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

export function DriversPage({ onNotice }: DriversPageProps) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return drivers.filter(
      (driver) =>
        (!group || driver.group === group) &&
        (!needle || `${driver.name} ${driver.employeeNumber}`.toLowerCase().includes(needle)),
    );
  }, [query, group]);

  const expiringSoon = drivers.filter((driver) => daysUntil(driver.licenseExpires) <= LICENSE_WARNING_DAYS).length;

  return (
    <div className="table-page">
      <ApiCoverageBanner page="drivers" />

      <dl className="table-page__summary">
        <div>
          <dt>Conductores</dt>
          <dd>{drivers.length}</dd>
        </div>
        <div>
          <dt>Con unidad asignada</dt>
          <dd>{drivers.filter((driver) => driver.vehicleId).length}</dd>
        </div>
        <div>
          <dt>Licencias por vencer · {LICENSE_WARNING_DAYS} días</dt>
          <dd className={expiringSoon > 0 ? 'is-alert' : undefined}>{expiringSoon}</dd>
        </div>
        <div>
          <dt>Inactivos</dt>
          <dd>{drivers.filter((driver) => !driver.active).length}</dd>
        </div>
      </dl>

      <section className="table-page__card" aria-labelledby="drivers-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="drivers-title">
            Conductores
            <ApiTag id="drv-list" />
          </h2>
          <div className="table-page__filters">
            <label className="table-page__search">
              <SearchIcon width={15} height={15} />
              <span className="visually-hidden">Buscar conductor</span>
              <input type="search" value={query} placeholder="Nombre o número de empleado" onChange={(event) => setQuery(event.target.value)} />
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
            <button type="button" className="btn btn--primary btn--sm" onClick={() => onNotice('Alta de conductor abierta.')}>
              <PlusIcon width={14} height={14} />
              Alta de conductor
            </button>
            <ApiTag id="drv-create" />
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={<SearchIcon width={20} height={20} />}
            title="Ningún conductor coincide con los filtros"
            description="Revisa el nombre o el número de empleado, o cambia el grupo seleccionado."
            actions={
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  setQuery('');
                  setGroup('');
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
                  <th scope="col">Conductor</th>
                  <th scope="col">Grupo</th>
                  <th scope="col">
                    Unidad
                    <ApiTag id="drv-vehicle" />
                  </th>
                  <th scope="col">
                    Licencia
                    <ApiTag id="drv-license" />
                  </th>
                  <th scope="col">
                    Cargas del mes
                    <ApiTag id="drv-activity" />
                  </th>
                  <th scope="col">Rendimiento</th>
                  <th scope="col">
                    Estado
                    <ApiTag id="drv-status" />
                  </th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((driver) => {
                  const vehicle = vehicles.find((candidate) => candidate.id === driver.vehicleId);
                  const expected = vehicleDetails.find((detail) => detail.vehicleId === driver.vehicleId)?.expectedKmPerLiter;
                  const days = daysUntil(driver.licenseExpires);
                  const below = driver.kmPerLiter !== null && expected !== undefined && driver.kmPerLiter < expected * 0.9;
                  return (
                    <tr key={driver.id}>
                      <td>
                        <span className="table-page__main">{driver.name}</span>
                        <span className="table-page__sub">{driver.employeeNumber}</span>
                      </td>
                      <td>{driver.group}</td>
                      <td>{vehicle ? vehicle.plate : <span className="table-page__sub">Sin unidad</span>}</td>
                      <td>
                        {driver.licenseType}
                        <span className={`table-page__sub${days <= LICENSE_WARNING_DAYS ? ' table-page__warn' : ''}`}>
                          {days < 0 ? 'Vencida' : `Vence ${licenseDate.format(new Date(`${driver.licenseExpires}T12:00:00`))}`}
                          {days >= 0 && days <= LICENSE_WARNING_DAYS && ` · en ${days} días`}
                        </span>
                      </td>
                      <td>{driver.fillsThisMonth}</td>
                      <td>
                        {driver.kmPerLiter === null ? (
                          <span className="table-page__sub">Sin datos</span>
                        ) : (
                          <>
                            <span className={below ? 'table-page__warn' : undefined}>{driver.kmPerLiter} km/L</span>
                            {expected !== undefined && <span className="table-page__sub">Esperado {expected} km/L</span>}
                          </>
                        )}
                      </td>
                      <td>
                        <span className={`chip ${driver.active ? 'chip--active' : 'chip--paused'}`}>{driver.active ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td className="table-page__action">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onNotice(`Expediente de ${driver.name} abierto.`)}>
                          Ver expediente
                        </button>
                      </td>
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
