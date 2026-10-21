import { useMemo, useState } from 'react';
import { Button, Card, Input, Select, StatusPill, Table, type GridColumn } from '@er-mobility-mx/design-system';
import { PlusIcon } from '../components/icons/Icons';
import { ApiCoverageBanner, ApiTag, ApiTagGroup } from '../components/api/ApiCoverage';
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
import type { SearchDestination } from '../data/globalSearch';
import { useSearchDestination } from '../components/ui/useSearchDestination';

interface VehiclesPageProps {
  searchDestination?: SearchDestination;
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

export function VehiclesPage({ onNotice, canEdit = false, showVin = false, searchDestination }: VehiclesPageProps) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [status, setStatus] = useState<VehicleStatus | ''>('');
  const [record, setRecord] = useState<RecordFilter>('');
  // A role without access to the VIN equivalence does not learn which VINs are missing either (ADR-TCP-001).
  const gapsOf = (detail: VehicleDetail): RegistryGap[] => detail.gaps.filter((gap) => gap !== 'vin' || showVin);
  const gapKinds = (Object.keys(REGISTRY_GAP_LABEL) as RegistryGap[]).filter((gap) => gap !== 'vin' || showVin);
  const vehicleStatuses = Object.keys(VEHICLE_STATUS_LABEL) as VehicleStatus[];
  const groupOptions = [
    { value: '', label: 'Todos los grupos' },
    ...assignableGroups.map((candidate) => ({ value: candidate.label, label: candidate.label })),
  ];
  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    ...vehicleStatuses.map((key) => ({ value: key, label: VEHICLE_STATUS_LABEL[key] })),
  ];
  const recordOptions: { value: RecordFilter; label: string }[] = [
    { value: '', label: 'Toda la ficha' },
    { value: 'incomplete', label: 'Ficha incompleta' },
    ...gapKinds.map((gap) => ({ value: gap, label: REGISTRY_GAP_LABEL[gap] })),
  ];

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
  const searchRoot = useSearchDestination(searchDestination, rows.map((row) => row.vehicleId), pagination.page, pagination.setPage, () => {
    setQuery(''); setGroup(''); setStatus(''); setRecord('');
  }, onNotice);
  const mediumByVehicle = useMemo(() => new Map(vehicleMedia.map((medium) => [medium.vehicleId, medium])), []);

  const count = (key: VehicleStatus) => vehicleDetails.filter((detail) => detail.status === key).length;
  const columns: GridColumn<VehicleDetail>[] = [
    {
      key: 'vehicle',
      label: 'Unidad',
      render: (detail) => (
        <>
          <span className="table-page__main table-page__data">{detail.plate}</span>
          <span className="table-page__sub">
            <span className="table-page__data">{detail.vehicleId}</span> · {detail.brand} {detail.model} · {detail.year}
          </span>
          {showVin && (
            <span className="table-page__sub table-page__nowrap">
              {detail.vin === '' ? 'VIN pendiente' : <>VIN <span className="table-page__data">{detail.vin}</span></>}
            </span>
          )}
          {gapsOf(detail).length > 0 && (
            <span
              className="chip chip--review table-page__gap"
              title={`Ficha incompleta: ${gapsOf(detail).map((gap) => REGISTRY_GAP_LABEL[gap]).join(', ')}`}
            >
              {gapsOf(detail).map((gap) => REGISTRY_GAP_LABEL[gap]).join(' · ')}
            </span>
          )}
        </>
      ),
    },
    { key: 'group', label: 'Grupo', render: (detail) => detail.group },
    {
      key: 'fuel',
      label: 'Combustible',
      render: (detail) => (
        <>
          {detail.fuel}
          <span className="table-page__sub table-page__nowrap">Tanque de <span className="table-page__data">{detail.tankLiters}</span> L</span>
        </>
      ),
    },
    { key: 'expectedKmPerLiter', label: 'Rendimiento esperado', mono: true, render: (detail) => `${detail.expectedKmPerLiter} km/L` },
    {
      key: 'odometerKm',
      label: 'Odómetro',
      mono: true,
      render: (detail) =>
        detail.odometerKm === null ? <span className="table-page__sub">Sin lectura</span> : `${formatCount(detail.odometerKm)} km`,
    },
    { key: 'driver', label: 'Conductor', render: (detail) => detail.driver },
    {
      key: 'paymentMedium',
      label: 'Medio de pago',
      render: (detail) => {
        const medium = mediumByVehicle.get(detail.vehicleId);
        return medium ? (
          <>
            <span className="table-page__nowrap table-page__data">{medium.number}</span>
            <span className="table-page__sub">{PAYMENT_TYPE_LABEL[medium.type]}</span>
          </>
        ) : (
          <span className="table-page__sub">Sin medio</span>
        );
      },
    },
    {
      key: 'status',
      label: 'Estado',
      render: (detail) => <StatusPill tone={STATUS_TONE[detail.status]} label={VEHICLE_STATUS_LABEL[detail.status]} />,
    },
  ];

  return (
    <div className="table-page table-page--catalog" ref={searchRoot}>
      <ApiCoverageBanner page="vehicles" />

      <dl className="table-page__summary">
        <Card padding="sm" surface="outlined">
          <dt>Vehículos registrados</dt>
          <dd>{formatCount(vehicleDetails.length)}</dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>Activos</dt>
          <dd>{count('active')}</dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>En taller</dt>
          <dd>{count('maintenance')}</dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>Inactivos</dt>
          <dd>{count('inactive')}</dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>Ficha incompleta</dt>
          <dd>{vehicleDetails.filter((detail) => gapsOf(detail).length > 0).length}</dd>
        </Card>
      </dl>

      <section className="table-page__card" aria-labelledby="vehicles-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="vehicles-title">
            Vehículos
            <ApiTag id="veh-list" />
          </h2>
          <div className="table-page__filters">
            <div className="table-page__flow-search">
              <Input
                type="search"
                icon="search"
                ariaLabel="Buscar vehículo"
                value={query}
                placeholder="Unidad, placa, marca o conductor"
                onChange={setQuery}
              />
            </div>
            <span id="vehicles-group-filter-label" className="visually-hidden">Filtrar por grupo</span>
            <Select options={groupOptions} value={group} aria-labelledby="vehicles-group-filter-label" onChange={setGroup} />
            <span id="vehicles-status-filter-label" className="visually-hidden">Filtrar por estado</span>
            <Select
              options={statusOptions}
              value={status}
              aria-labelledby="vehicles-status-filter-label"
              onChange={(value) => {
                const selected = vehicleStatuses.find((key) => key === value);
                if (selected || value === '') setStatus(selected ?? '');
              }}
            />
            <span id="vehicles-record-filter-label" className="visually-hidden">Filtrar por ficha</span>
            <Select
              options={recordOptions}
              value={record}
              aria-labelledby="vehicles-record-filter-label"
              onChange={(value) => {
                const selected = recordOptions.find((option) => option.value === value);
                if (selected) setRecord(selected.value);
              }}
            />
            {canEdit && (
              <Button size="sm" onClick={() => onNotice('Alta de vehículo abierta.')}>
                <PlusIcon width={14} height={14} />
                Alta de vehículo
              </Button>
            )}
            <ApiTag id="veh-create" />
          </div>
        </header>

        <ApiTagGroup
          items={[
            { id: 'veh-specs', label: 'Unidad' },
            { id: 'veh-group', label: 'Grupo' },
            { id: 'veh-performance', label: 'Rendimiento esperado' },
            { id: 'veh-odometer', label: 'Odómetro' },
            { id: 'veh-driver', label: 'Conductor' },
            { id: 'veh-media', label: 'Medio de pago' },
            { id: 'veh-status', label: 'Estado' },
          ]}
        />

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
          <Table caption="Vehículos" columns={columns} rows={pagination.pageRows} rowKey="vehicleId" surface="none" sortable={false} />
        )}
        <Pagination {...pagination} noun="vehículos" onPage={pagination.setPage} />
      </section>
    </div>
  );
}
