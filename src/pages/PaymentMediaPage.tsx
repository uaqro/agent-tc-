import { useMemo, useState } from 'react';
import { Button, Input, Select, StatusPill } from '@er-mobility-mx/design-system';
import { PlusIcon } from '../components/icons/Icons';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination, usePagination } from '../components/ui/Pagination';
import { DevNote } from '../components/dev/DevNote';
import { autoconsumoUnits, vehicles } from '../data/dispersion';
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_TYPE_LABEL,
  paymentMedia as seedMedia,
  type PaymentMedium,
  type PaymentMediumStatus,
  type PaymentMediumType,
  vehicleDetails,
} from '../data/fleet';
import { formatCount, formatDateTime, formatMoney } from '../utils/format';
import { ApiCoverageBanner, ApiTag } from '../components/api/ApiCoverage';
import './TablePage.css';

interface PaymentMediaPageProps {
  onNotice: (message: string) => void;
}

const STATUS_TONE: Record<PaymentMediumStatus, 'success' | 'danger' | 'neutral'> = {
  active: 'success',
  blocked: 'danger',
  unassigned: 'neutral',
};

export function PaymentMediaPage({ onNotice }: PaymentMediaPageProps) {
  const [media, setMedia] = useState<PaymentMedium[]>(seedMedia);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PaymentMediumStatus | ''>('');
  const [type, setType] = useState<PaymentMediumType | ''>('');
  const typeKeys = Object.keys(PAYMENT_TYPE_LABEL) as PaymentMediumType[];
  const statusKeys = Object.keys(PAYMENT_STATUS_LABEL) as PaymentMediumStatus[];
  const typeOptions = [
    { value: '', label: 'Todos los tipos' },
    ...typeKeys.map((key) => ({ value: key, label: PAYMENT_TYPE_LABEL[key] })),
  ];
  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    ...statusKeys.map((key) => ({ value: key, label: PAYMENT_STATUS_LABEL[key] })),
  ];

  const vehicleById = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), []);
  const detailById = useMemo(() => new Map(vehicleDetails.map((detail) => [detail.vehicleId, detail])), []);
  const vehicleOf = (id: string | null) => (id ? vehicleById.get(id) : undefined);
  const detailOf = (id: string | null) => (id ? detailById.get(id) : undefined);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return media.filter((medium) => {
      const detail = medium.vehicleId ? detailById.get(medium.vehicleId) : undefined;
      const haystack = `${medium.number} ${detail?.vehicleId ?? ''} ${detail?.plate ?? ''} ${detail?.driver ?? ''}`.toLowerCase();
      return (!status || medium.status === status) && (!type || medium.type === type) && (!needle || haystack.includes(needle));
    });
  }, [media, query, status, type, detailById]);
  const pagination = usePagination(rows);

  const count = (key: PaymentMediumStatus) => media.filter((medium) => medium.status === key).length;

  const setMediumStatus = (medium: PaymentMedium, next: PaymentMediumStatus) => {
    setMedia((current) => current.map((candidate) => (candidate.id === medium.id ? { ...candidate, status: next } : candidate)));
    const plate = detailOf(medium.vehicleId)?.plate;
    onNotice(next === 'blocked' ? `Medio ${medium.number} bloqueado${plate ? ` · ${plate}` : ''}.` : `Medio ${medium.number} desbloqueado.`);
  };

  return (
    <div className="table-page">
      <ApiCoverageBanner page="payment-media" />
      <DevNote label="Pregunta de producto">
        ¿Autoconsumo tiene límites propios? Hasta decidirlo, Medios de pago no muestra los tags de las{' '}
        {formatCount(autoconsumoUnits)} unidades de Autoconsumo. Siguen visibles en Flota · Vehículos.
      </DevNote>

      <dl className="table-page__summary">
        <div>
          <dt>Medios activos</dt>
          <dd>{formatCount(count('active'))}</dd>
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
          <dt>Tags y virtuales</dt>
          <dd>{media.filter((medium) => medium.type !== 'chip-card').length}</dd>
        </div>
      </dl>

      <section className="table-page__card" aria-labelledby="media-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="media-title">
            Tarjetas, tags y tarjetas virtuales
            <ApiTag id="media-list" />
          </h2>
          <div className="table-page__filters">
            <div className="table-page__flow-search">
              <Input
                type="search"
                icon="search"
                ariaLabel="Buscar medio de pago"
                value={query}
                placeholder="Número, placa o conductor"
                onChange={setQuery}
              />
            </div>
            <span id="payment-media-type-filter-label" className="visually-hidden">Filtrar por tipo</span>
            <Select
              options={typeOptions}
              value={type}
              aria-labelledby="payment-media-type-filter-label"
              onChange={(value) => {
                const selected = typeKeys.find((key) => key === value);
                if (selected || value === '') setType(selected ?? '');
              }}
            />
            <span id="payment-media-status-filter-label" className="visually-hidden">Filtrar por estado</span>
            <Select
              options={statusOptions}
              value={status}
              aria-labelledby="payment-media-status-filter-label"
              onChange={(value) => {
                const selected = statusKeys.find((key) => key === value);
                if (selected || value === '') setStatus(selected ?? '');
              }}
            />
            <Button size="sm" onClick={() => onNotice('Solicitud de nuevos medios de pago abierta.')}>
              <PlusIcon width={14} height={14} />
              Solicitar medios
            </Button>
            <ApiTag id="media-request" />
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon="credit_card"
            title={media.length === 0 ? 'Aún no tienes medios de pago' : 'Ningún medio de pago coincide con los filtros'}
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
                  <th scope="col">Medio</th>
                  <th scope="col">
                    Unidad asignada
                    <ApiTag id="media-assign" />
                  </th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    Saldo · Vence
                    <ApiTag id="media-balance" />
                  </th>
                  <th scope="col">
                    Último uso
                    <ApiTag id="media-last-use" />
                  </th>
                  <th scope="col" className="table-page__action">
                    <span className="visually-hidden">Acciones</span>
                    <ApiTag id="media-block" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageRows.map((medium) => {
                  const vehicle = vehicleOf(medium.vehicleId);
                  const detail = detailOf(medium.vehicleId);
                  return (
                    <tr key={medium.id}>
                      <td>
                        <span className="table-page__main">{medium.number}</span>
                        <span className="table-page__sub">{PAYMENT_TYPE_LABEL[medium.type]}</span>
                      </td>
                      <td>
                        {detail ? (
                          <>
                            <span className="table-page__main">{detail.plate}</span>
                            <span className="table-page__sub">
                              {detail.driver} · {detail.group}
                            </span>
                          </>
                        ) : (
                          <span className="table-page__sub">Sin unidad</span>
                        )}
                      </td>
                      <td>
                        <StatusPill label={PAYMENT_STATUS_LABEL[medium.status]} tone={STATUS_TONE[medium.status]} />
                      </td>
                      <td>
                        <span className="table-page__nowrap">{vehicle ? formatMoney(vehicle.balanceMXN, true) : '—'}</span>
                        <span className="table-page__sub">Vence {medium.expires.split('-').reverse().join('/')}</span>
                      </td>
                      <td>
                        {medium.lastUse ? (
                          <>
                            {formatDateTime(new Date(medium.lastUse))}
                            <span className="table-page__sub">{medium.lastStation}</span>
                          </>
                        ) : (
                          <span className="table-page__sub">Sin uso</span>
                        )}
                      </td>
                      <td className="table-page__action">
                        {medium.status === 'active' && (
                          <Button variant="ghost" size="sm" onClick={() => setMediumStatus(medium, 'blocked')}>
                            Bloquear
                          </Button>
                        )}
                        {medium.status === 'blocked' && (
                          <Button variant="secondary" size="sm" onClick={() => setMediumStatus(medium, 'active')}>
                            Desbloquear
                          </Button>
                        )}
                        {medium.status === 'unassigned' && (
                          <Button variant="secondary" size="sm" onClick={() => onNotice(`Asignando ${medium.number} a una unidad.`)}>
                            Asignar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pagination} noun="medios" onPage={pagination.setPage} />
      </section>
    </div>
  );
}
