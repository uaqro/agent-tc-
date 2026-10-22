import { useMemo, useState } from 'react';
import { Badge, Button, Input, SectionHeader, Select, Stack, StatusPill, Table, type GridColumn } from '@er-mobility-mx/design-system';
import type { Vehicle } from '../../types/dispersion';
import type { LimitPolicy, UnitAssignment } from '../../types/limits';
import { PERIOD_META, assignableGroups, effectiveLimit, formatMeasure, usedInMeasure } from '../../data/limits';
import { EmptyState } from '../ui/EmptyState';
import { formatDateLong, formatLiters } from '../../utils/format';
import { ApiTag, ApiTagGroup } from '../api/ApiCoverage';
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

interface AssignmentTableRow {
  id: string;
  vehicle: Vehicle;
  assignment: UnitAssignment;
  policy: LimitPolicy | null;
  enforced: boolean;
  limit: number;
  used: number;
  ratio: number;
}

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

  const tableRows = useMemo(
    () =>
      rows.flatMap((vehicle): AssignmentTableRow[] => {
        const assignment = assignments.find((candidate) => candidate.vehicleId === vehicle.id);
        if (!assignment) return [];

        const policy = policies.find((candidate) => candidate.id === assignment.policyId) ?? null;
        const limit = policy ? effectiveLimit(assignment, policy) : 0;
        const used = policy ? usedInMeasure(assignment, policy) : 0;
        return [
          {
            id: vehicle.id,
            vehicle,
            assignment,
            policy,
            enforced: policy !== null && policy.status === 'active',
            limit,
            used,
            ratio: limit > 0 ? used / limit : 0,
          },
        ];
      }),
    [rows, assignments, policies],
  );

  const columns: GridColumn<AssignmentTableRow>[] = [
    {
      key: 'unit',
      label: 'Unidad',
      render: ({ vehicle }) => (
        <>
          <strong id={`assignment-vehicle-${vehicle.id}`} className="assignments__plate">
            {vehicle.plate}
          </strong>
          <span className="assignments__sub">{vehicle.driver}</span>
        </>
      ),
    },
    { key: 'group', label: 'Grupo', render: ({ vehicle }) => vehicle.group },
    {
      key: 'policy',
      label: 'Política asignada',
      render: ({ vehicle, assignment, policy, enforced }) => (
        <Stack gap={2} wrap align="center">
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
          {assignment.individual && <Badge>Individual</Badge>}
          {!policy && <StatusPill label="Sin candados" tone="danger" />}
          {policy && !enforced && <StatusPill label="Pausada" tone="neutral" />}
        </Stack>
      ),
    },
    {
      key: 'usage',
      label: 'Uso del periodo',
      render: ({ assignment, policy, limit, used, ratio }) =>
        policy && policy.periodLimit > 0 ? (
          <>
            <div
              className={`assignments__bar assignments__bar--${usageTone(ratio)}`}
              role="img"
              aria-label={`${Math.round(ratio * 100)}% del límite usado`}
            >
              <span style={{ width: `${Math.min(100, ratio * 100)}%` }} />
            </div>
            <span className="assignments__sub">
              {formatMeasure(used, policy.measure)} de {formatMeasure(limit, policy.measure)} · {PERIOD_META[policy.period].noun}
            </span>
            {assignment.override && (
              <span className="assignments__override">
                +{formatMeasure(assignment.override.extra, policy.measure)} hasta el {formatDateLong(assignment.override.until)} ·{' '}
                {assignment.override.reason}
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
          <span className="assignments__sub">
            {formatLiters(assignment.usedLiters)} cargados · {policy ? 'sin límite acumulado de monto o volumen' : 'sin política'}
          </span>
        ),
    },
    {
      key: 'rejections',
      label: 'Rechazos 7 días',
      align: 'right',
      render: ({ assignment }) => (
        <span className={assignment.rejections7d > 0 ? 'assignments__rejections' : undefined}>{assignment.rejections7d}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Excepción',
      align: 'right',
      render: ({ vehicle, assignment, policy }) =>
        assignment.override ? (
          <Button variant="ghost" size="sm" onClick={() => onRemoveOverride(vehicle.id)}>
            Quitar excepción
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled={!policy || policy.periodLimit <= 0}
            onClick={() => onOverride(vehicle.id)}
          >
            Excepción temporal
          </Button>
        ),
    },
  ];

  return (
    <section className="assignments" aria-labelledby="assignments-title">
      <header className="assignments__head">
        <SectionHeader
          size="sm"
          level={2}
          style={{ width: '100%' }}
          trailing={
            <Stack gap={2} wrap>
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
            </Stack>
          }
        >
          <span id="assignments-title">
            Asignación por unidad
            <ApiTag id="lim-assignments" />
          </span>
        </SectionHeader>
      </header>

      {rows.length === 0 ? (
        vehicles.length === 0 ? (
          <EmptyState
            compact
            title="Aún no hay unidades en la flota"
            description="Cuando se den de alta unidades aparecerán aquí con su política, el uso del periodo y las cargas rechazadas."
          />
        ) : (
          <EmptyState
            compact
            icon="search"
            title="Ninguna unidad coincide con los filtros"
            description="Revisa la placa, el dispositivo o el conductor, o cambia el grupo seleccionado."
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setGroup('');
                }}
              >
                Limpiar filtros
              </Button>
            }
          />
        )
      ) : (
        <Table caption="Asignación por unidad" columns={columns} rows={tableRows} rowKey="id" surface="none" sortable={false} />
      )}
      <ApiTagGroup items={[{ id: 'lim-override', label: 'Excepción' }]} />
    </section>
  );
}
