import { useMemo, useState } from 'react';
import { Button, Card, Input, Select, StatusPill, Table, type GridColumn } from '@er-mobility-mx/design-system';
import { PlusIcon } from '../components/icons/Icons';
import { ApiCoverageBanner, ApiTag, ApiTagGroup } from '../components/api/ApiCoverage';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination, usePagination } from '../components/ui/Pagination';
import { drivers, vehicleDetails } from '../data/fleet';
import { assignableGroups } from '../data/limits';
import { daysUntil, formatCount } from '../utils/format';
import './TablePage.css';
import type { SearchDestination } from '../data/globalSearch';
import { useSearchDestination } from '../components/ui/useSearchDestination';

interface DriversPageProps {
  searchDestination?: SearchDestination;
  onNotice: (message: string) => void;
  /**
   * Registering, editing and deregistering drivers: admin and flota (`tc.conductores`, a Ticket Car+ permission with no
   * equivalent in ADR-001). Vehicles stay admin only. Finanzas and consulta read.
   */
  canEdit?: boolean;
}

/** Licences that expire within this many days are flagged. */
const LICENSE_WARNING_DAYS = 60;

const licenseDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

export function DriversPage({ onNotice, canEdit = false, searchDestination }: DriversPageProps) {
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
  const pagination = usePagination(rows);
  const searchRoot = useSearchDestination(searchDestination, rows.map((row) => row.id), pagination.page, pagination.setPage, () => {
    setQuery(''); setGroup('');
  }, onNotice);
  const detailByVehicle = useMemo(() => new Map(vehicleDetails.map((detail) => [detail.vehicleId, detail])), []);
  const groupOptions = [
    { value: '', label: 'Todos los grupos' },
    ...assignableGroups.map((candidate) => ({ value: candidate.label, label: candidate.label })),
  ];

  const expiringSoon = drivers.filter((driver) => daysUntil(driver.licenseExpires) <= LICENSE_WARNING_DAYS).length;
  const columns: GridColumn<(typeof drivers)[number]>[] = [
    {
      key: 'driver',
      label: 'Conductor',
      render: (driver) => (
        <>
          <span className="table-page__main">{driver.name}</span>
          <span className="table-page__sub table-page__data">{driver.employeeNumber}</span>
        </>
      ),
    },
    { key: 'group', label: 'Grupo', render: (driver) => driver.group },
    {
      key: 'vehicle',
      label: 'Unidad',
      render: (driver) => {
        const vehicle = driver.vehicleId ? detailByVehicle.get(driver.vehicleId) : undefined;
        return vehicle ? <span className="table-page__data">{vehicle.plate}</span> : <span className="table-page__sub">Sin unidad</span>;
      },
    },
    {
      key: 'license',
      label: 'Licencia',
      render: (driver) => {
        const days = daysUntil(driver.licenseExpires);
        return (
          <>
            {driver.licenseType}
            <span className={`table-page__sub${days <= LICENSE_WARNING_DAYS ? ' table-page__warn' : ''}`}>
              {days < 0 ? 'Vencida' : `Vence ${licenseDate.format(new Date(`${driver.licenseExpires}T12:00:00`))}`}
              {days >= 0 && days <= LICENSE_WARNING_DAYS && ` · en ${days} días`}
            </span>
          </>
        );
      },
    },
    { key: 'fillsThisMonth', label: 'Cargas · 30 días', mono: true, render: (driver) => driver.fillsThisMonth },
    {
      key: 'efficiency',
      label: 'Rendimiento',
      render: (driver) => {
        const vehicle = driver.vehicleId ? detailByVehicle.get(driver.vehicleId) : undefined;
        const expected = vehicle?.expectedKmPerLiter;
        const below = driver.kmPerLiter !== null && expected !== undefined && driver.kmPerLiter < expected * 0.9;
        return driver.kmPerLiter === null ? (
          <span className="table-page__sub">Sin datos</span>
        ) : (
          <>
            <span className={`table-page__data${below ? ' table-page__warn' : ''}`}>{driver.kmPerLiter} km/L</span>
            {expected !== undefined && <span className="table-page__sub">Esperado <span className="table-page__data">{expected}</span> km/L</span>}
          </>
        );
      },
    },
    {
      key: 'status',
      label: 'Estado',
      render: (driver) => <StatusPill label={driver.active ? 'Activo' : 'Inactivo'} tone={driver.active ? 'success' : 'neutral'} />,
    },
    {
      key: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (driver) => (
        <div className="table-page__row-actions">
          <Button variant="ghost" size="sm" onClick={() => onNotice(`Expediente de ${driver.name} abierto.`)}>
            Ver expediente
          </Button>
          {canEdit && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onNotice(`Edición de ${driver.name} abierta.`)}>
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onNotice(`Baja de ${driver.name} solicitada: pendiente de confirmar.`)}>
                Dar de baja
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="table-page table-page--catalog" ref={searchRoot}>
      <ApiCoverageBanner page="drivers" />

      <dl className="table-page__summary">
        <Card padding="sm" surface="outlined">
          <dt>Conductores</dt>
          <dd>{formatCount(drivers.length)}</dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>Con unidad asignada</dt>
          <dd>{drivers.filter((driver) => driver.vehicleId).length}</dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>Licencias por vencer · {LICENSE_WARNING_DAYS} días</dt>
          <dd className={expiringSoon > 0 ? 'is-alert' : undefined}>{expiringSoon}</dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>Inactivos</dt>
          <dd>{drivers.filter((driver) => !driver.active).length}</dd>
        </Card>
      </dl>

      <section className="table-page__card" aria-labelledby="drivers-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="drivers-title">
            Conductores
            <ApiTag id="drv-list" />
          </h2>
          <div className="table-page__filters">
            <div className="table-page__flow-search">
              <Input
                type="search"
                icon="search"
                ariaLabel="Buscar conductor"
                value={query}
                placeholder="Nombre o número de empleado"
                onChange={setQuery}
              />
            </div>
            <span id="drivers-group-filter-label" className="visually-hidden">Filtrar por grupo</span>
            <Select options={groupOptions} value={group} aria-labelledby="drivers-group-filter-label" onChange={setGroup} />
            {canEdit && (
              <Button size="sm" onClick={() => onNotice('Alta de conductor abierta.')}>
                <PlusIcon width={14} height={14} />
                Alta de conductor
              </Button>
            )}
            <ApiTag id="drv-create" />
          </div>
        </header>

        <ApiTagGroup
          items={[
            { id: 'drv-vehicle', label: 'Unidad' },
            { id: 'drv-license', label: 'Licencia' },
            { id: 'drv-activity', label: 'Cargas · 30 días' },
            { id: 'drv-status', label: 'Estado' },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon="search"
            title="Ningún conductor coincide con los filtros"
            description="Revisa el nombre o el número de empleado, o cambia el grupo seleccionado."
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
        ) : (
          <Table caption="Conductores" columns={columns} rows={pagination.pageRows} rowKey="id" surface="none" sortable={false} />
        )}
        <Pagination {...pagination} noun="conductores" onPage={pagination.setPage} />
      </section>
    </div>
  );
}
