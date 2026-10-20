import { useMemo, useState } from 'react';
import { Button, Input, Select, StatusPill } from '@er-mobility-mx/design-system';
import type { Vehicle } from '../../types/dispersion';
import type { LimitPolicy, UnitAssignment } from '../../types/limits';
import { PERIOD_META, assignableGroups, effectiveLimit, formatMeasure, usedInMeasure } from '../../data/limits';
import { SearchIcon } from '../icons/Icons';
import { EmptyState } from '../ui/EmptyState';
import { formatDateLong, formatLiters } from '../../utils/format';
import { ApiTag } from '../api/ApiCoverage';
import './AssignmentsTable.css';

interface AssignmentsTableProps {
  vehicles: Vehicle[];
  assignments: UnitAssignment[];
  policies: LimitPolicy[];
  onReassign: (vehicleId: string, policyId: string | null) => void;
  onOverride: (vehicleId: string) => void;
  onRemoveOverride: (vehicleId: string) => void;
}

const usageTone = (ratio: number): string => (ratio >= 0.9 ? 'danger' : ratio >= 0.75 ? 'warn' : 'ok');

export function AssignmentsTable({
  vehicles,
  assignments,
  policies,
  onReassign,
  onOverride,
  onRemoveOverride,
}: AssignmentsTableProps) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const groupOptions = [
    { value: '', label: 'Todos los grupos' },
    ...assignableGroups.map((candidate) => ({ value: candidate.label, label: candidate.label })),
  ];
  const policyOptions = [
    { value: '', label: 'Sin política' },
    ...policies.map((candidate) => ({ value: candidate.id, label: candidate.name })),
  ];

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vehicles
      .filter((vehicle) => !group || vehicle.group === group)
      .filter(
        (vehicle) =>
          !needle ||
          [vehicle.plate, vehicle.device, vehicle.driver].some((value) => value.toLowerCase().includes(needle)),
      );
  }, [vehicles, query, group]);

  return (
    <section className="assignments" aria-labelledby="assignments-title">
      <header className="assignments__head">
        <h2 className="assignments__title" id="assignments-title">
          Asignación por unidad
          <ApiTag id="lim-assignments" />
        </h2>
        <div className="assignments__filters">
          <div className="assignments__search">
            <Input
              id="assignments-search"
              type="search"
              icon="search"
              ariaLabel="Buscar unidad"
              value={query}
              placeholder="Placa, dispositivo o conductor"
              onChange={setQuery}
            />
          </div>
          <Select
            id="assignments-group-filter"
            options={groupOptions}
            value={group}
            aria-labelledby="assignments-group-filter-label"
            onChange={(value) => {
              if (groupOptions.some((option) => option.value === value)) setGroup(value);
            }}
          />
          <span id="assignments-group-filter-label" className="visually-hidden">
            Filtrar por grupo
          </span>
        </div>
      </header>

      <div className="assignments__scroll">
        <table className="assignments__table">
          <thead>
            <tr>
              <th scope="col">Unidad</th>
              <th scope="col">Grupo</th>
              <th scope="col">Política asignada</th>
              <th scope="col">Uso del periodo</th>
              <th scope="col">Rechazos 7 días</th>
              <th scope="col">
                <span className="visually-hidden">Excepción</span>
                <ApiTag id="lim-override" />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((vehicle) => {
              const assignment = assignments.find((candidate) => candidate.vehicleId === vehicle.id);
              if (!assignment) return null;

              const policy = policies.find((candidate) => candidate.id === assignment.policyId) ?? null;
              const enforced = policy !== null && policy.status === 'active';
              const limit = policy ? effectiveLimit(assignment, policy) : 0;
              const used = policy ? usedInMeasure(assignment, policy) : 0;
              const ratio = limit > 0 ? used / limit : 0;

              return (
                <tr key={vehicle.id}>
                  <td>
                    <strong id={`assignment-vehicle-${vehicle.id}`} className="assignments__plate">
                      {vehicle.plate}
                    </strong>
                    <span className="assignments__sub">{vehicle.driver}</span>
                  </td>
                  <td>{vehicle.group}</td>
                  <td>
                    <div className="assignments__policy">
                      <Select
                        options={policyOptions}
                        value={assignment.policyId ?? ''}
                        aria-labelledby={`assignment-vehicle-${vehicle.id}`}
                        onChange={(value) => {
                          if (policyOptions.some((option) => option.value === value)) {
                            onReassign(vehicle.id, value || null);
                          }
                        }}
                      />
                      {assignment.individual && <span className="chip chip--info">Individual</span>}
                      {!policy && <StatusPill label="Sin candados" tone="danger" />}
                      {policy && !enforced && <StatusPill label="Pausada" tone="neutral" />}
                    </div>
                  </td>
                  <td>
                    {policy && policy.periodLimit > 0 ? (
                      <>
                        <div
                          className={`assignments__bar assignments__bar--${usageTone(ratio)}`}
                          role="img"
                          aria-label={`${Math.round(ratio * 100)}% del límite usado`}
                        >
                          <span style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                        </div>
                        <span className="assignments__sub">
                          {formatMeasure(used, policy.measure)} de {formatMeasure(limit, policy.measure)} ·{' '}
                          {PERIOD_META[policy.period].noun}
                        </span>
                        {assignment.override && (
                          <span className="assignments__override">
                            +{formatMeasure(assignment.override.extra, policy.measure)} hasta el{' '}
                            {formatDateLong(assignment.override.until)} · {assignment.override.reason}
                          </span>
                        )}
                        {assignment.stationException && (
                          <span className="assignments__override">
                            También puede cargar en {assignment.stationException.station} hasta el{' '}
                            {formatDateLong(assignment.stationException.until)} · {assignment.stationException.source}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="assignments__sub">{formatLiters(assignment.usedLiters)} cargados · {policy ? 'sin límite acumulado de monto o volumen' : 'sin política'}</span>
                    )}
                  </td>
                  <td className={assignment.rejections7d > 0 ? 'assignments__rejections' : undefined}>
                    {assignment.rejections7d}
                  </td>
                  <td className="assignments__action">
                    {assignment.override ? (
                      <Button variant="ghost" size="sm" onClick={() => onRemoveOverride(vehicle.id)}>
                        Quitar excepción
                      </Button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={!policy || policy.periodLimit <= 0}
                        onClick={() => onOverride(vehicle.id)}
                      >
                        Excepción temporal
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 &&
          (vehicles.length === 0 ? (
            <EmptyState
              compact
              title="Aún no hay unidades en la flota"
              description="Cuando se den de alta unidades aparecerán aquí con su política, el uso del periodo y las cargas rechazadas."
            />
          ) : (
            <EmptyState
              compact
              icon={<SearchIcon width={20} height={20} />}
              title="Ninguna unidad coincide con los filtros"
              description="Revisa la placa, el dispositivo o el conductor, o cambia el grupo seleccionado."
              actions={
                <Button variant="secondary" size="sm" onClick={() => {
                    setQuery('');
                    setGroup('');
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          ))}
      </div>
    </section>
  );
}
