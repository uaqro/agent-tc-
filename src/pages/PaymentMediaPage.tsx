import { useMemo, useState } from 'react';
import { CardIcon, PlusIcon, SearchIcon } from '../components/icons/Icons';
import { EmptyState } from '../components/ui/EmptyState';
import { vehicles } from '../data/dispersion';
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_TYPE_LABEL,
  paymentMedia as seedMedia,
  type PaymentMedium,
  type PaymentMediumStatus,
  type PaymentMediumType,
} from '../data/fleet';
import { formatDateTime, formatMoney } from '../utils/format';
import { ApiCoverageBanner, ApiTag } from '../components/api/ApiCoverage';
import './TablePage.css';

interface PaymentMediaPageProps {
  onNotice: (message: string) => void;
}

const STATUS_CHIP: Record<PaymentMediumStatus, string> = {
  active: 'chip--active',
  blocked: 'chip--danger',
  unassigned: 'chip--paused',
};

export function PaymentMediaPage({ onNotice }: PaymentMediaPageProps) {
  const [media, setMedia] = useState<PaymentMedium[]>(seedMedia);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PaymentMediumStatus | ''>('');
  const [type, setType] = useState<PaymentMediumType | ''>('');

  const vehicleOf = (id: string | null) => vehicles.find((vehicle) => vehicle.id === id);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return media.filter((medium) => {
      const vehicle = vehicles.find((candidate) => candidate.id === medium.vehicleId);
      const haystack = `${medium.number} ${vehicle?.plate ?? ''} ${vehicle?.driver ?? ''}`.toLowerCase();
      return (!status || medium.status === status) && (!type || medium.type === type) && (!needle || haystack.includes(needle));
    });
  }, [media, query, status, type]);

  const count = (key: PaymentMediumStatus) => media.filter((medium) => medium.status === key).length;

  const setMediumStatus = (medium: PaymentMedium, next: PaymentMediumStatus) => {
    setMedia((current) => current.map((candidate) => (candidate.id === medium.id ? { ...candidate, status: next } : candidate)));
    const plate = vehicleOf(medium.vehicleId)?.plate;
    onNotice(next === 'blocked' ? `Medio ${medium.number} bloqueado${plate ? ` · ${plate}` : ''}.` : `Medio ${medium.number} desbloqueado.`);
  };

  return (
    <div className="table-page">
      <ApiCoverageBanner page="payment-media" />

      <dl className="table-page__summary">
        <div>
          <dt>Medios activos</dt>
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
            <label className="table-page__search">
              <SearchIcon width={15} height={15} />
              <span className="visually-hidden">Buscar medio de pago</span>
              <input
                type="search"
                value={query}
                placeholder="Número, placa o conductor"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              <span className="visually-hidden">Filtrar por tipo</span>
              <select value={type} onChange={(event) => setType(event.target.value as PaymentMediumType | '')}>
                <option value="">Todos los tipos</option>
                {(Object.keys(PAYMENT_TYPE_LABEL) as PaymentMediumType[]).map((key) => (
                  <option key={key} value={key}>
                    {PAYMENT_TYPE_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Filtrar por estado</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as PaymentMediumStatus | '')}>
                <option value="">Todos los estados</option>
                {(Object.keys(PAYMENT_STATUS_LABEL) as PaymentMediumStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {PAYMENT_STATUS_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => onNotice('Solicitud de nuevos medios de pago abierta.')}>
              <PlusIcon width={14} height={14} />
              Solicitar medios
            </button>
            <ApiTag id="media-request" />
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={<CardIcon width={20} height={20} />}
            title={media.length === 0 ? 'Aún no tienes medios de pago' : 'Ningún medio de pago coincide con los filtros'}
            description="Revisa el número, la placa o el conductor, o cambia el tipo y el estado seleccionados."
            actions={
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  setQuery('');
                  setStatus('');
                  setType('');
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
                {rows.map((medium) => {
                  const vehicle = vehicleOf(medium.vehicleId);
                  return (
                    <tr key={medium.id}>
                      <td>
                        <span className="table-page__main">{medium.number}</span>
                        <span className="table-page__sub">{PAYMENT_TYPE_LABEL[medium.type]}</span>
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
                      <td>
                        <span className={`chip ${STATUS_CHIP[medium.status]}`}>{PAYMENT_STATUS_LABEL[medium.status]}</span>
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
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMediumStatus(medium, 'blocked')}>
                            Bloquear
                          </button>
                        )}
                        {medium.status === 'blocked' && (
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setMediumStatus(medium, 'active')}>
                            Desbloquear
                          </button>
                        )}
                        {medium.status === 'unassigned' && (
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => onNotice(`Asignando ${medium.number} a una unidad.`)}>
                            Asignar
                          </button>
                        )}
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
