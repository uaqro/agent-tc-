import { useMemo, useState } from 'react';
import { SearchIcon } from '../../components/icons/Icons';
import { Pagination, usePagination } from '../../components/ui/Pagination';
import {
  EV_CHARGE_TYPE_LABEL,
  EV_NETWORK_LABEL,
  EV_SESSION_STATUS,
  evCards,
  formatKwh,
  stationById,
  vehicleById,
} from '../../data/electromobility';
import type { EvNetwork, EvSessionStatus } from '../../types/electromobility';
import { formatCount, formatDateTime, formatMoney } from '../../utils/format';
import { useEvHistory } from './useEvHistory';
import '../TablePage.css';
import './ev.css';

export function EvChargingPage() {
  const { sessions } = useEvHistory();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<EvSessionStatus | ''>('');
  const [network, setNetwork] = useState<EvNetwork | ''>('');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const vehicle = vehicleById(session.vehicleId)!;
      const station = stationById(session.stationId)!;
      if (status && session.status !== status) return false;
      if (network && station.network !== network) return false;
      if (!needle) return true;
      return [vehicle.alias, vehicle.plate, station.name, station.operator, session.id].some((value) => value.toLowerCase().includes(needle));
    });
  }, [sessions, query, status, network]);

  const { page, pageCount, pageRows, setPage, total, pageSize } = usePagination(rows);
  const charged = rows.filter((session) => session.status !== 'denied');

  return (
    <div className="table-page">
      <dl className="table-page__summary">
        <div>
          <dt>Sesiones</dt>
          <dd>{formatCount(rows.length)}</dd>
        </div>
        <div>
          <dt>Energía</dt>
          <dd>{formatKwh(charged.reduce((sum, session) => sum + session.energyKwh, 0))}</dd>
        </div>
        <div>
          <dt>Total cobrado</dt>
          <dd>{formatMoney(charged.reduce((sum, session) => sum + session.total, 0))}</dd>
        </div>
        <div>
          <dt>Denegadas</dt>
          <dd className={rows.some((session) => session.status === 'denied') ? 'is-alert' : undefined}>
            {formatCount(rows.filter((session) => session.status === 'denied').length)}
          </dd>
        </div>
      </dl>

      <section className="table-page__card" aria-labelledby="ev-sessions-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="ev-sessions-title">
            Sesiones de recarga · 30 días
          </h2>
          <div className="table-page__filters">
            <label className="table-page__search">
              <SearchIcon width={15} height={15} />
              <span className="visually-hidden">Buscar recarga</span>
              <input type="search" value={query} placeholder="Unidad, placa o estación" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label>
              <span className="visually-hidden">Filtrar por estado</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as EvSessionStatus | '')}>
                <option value="">Todos los estados</option>
                {(Object.keys(EV_SESSION_STATUS) as EvSessionStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {EV_SESSION_STATUS[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Filtrar por red</span>
              <select value={network} onChange={(event) => setNetwork(event.target.value as EvNetwork | '')}>
                <option value="">Toda la red</option>
                {(Object.keys(EV_NETWORK_LABEL) as EvNetwork[]).map((key) => (
                  <option key={key} value={key}>
                    {EV_NETWORK_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="table-page__scroll">
          <table className="table-page__table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Unidad</th>
                <th scope="col">Estación</th>
                <th scope="col">Energía</th>
                <th scope="col">Total</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((session) => {
                const vehicle = vehicleById(session.vehicleId)!;
                const station = stationById(session.stationId)!;
                const card = evCards.find((candidate) => candidate.id === session.cardId);
                const meta = EV_SESSION_STATUS[session.status];
                return (
                  <tr key={session.id}>
                    <td className="table-page__nowrap">
                      {formatDateTime(new Date(session.at))}
                      <span className="table-page__sub">{session.id}</span>
                    </td>
                    <td>
                      <span className="table-page__main">{vehicle.alias}</span>
                      <span className="table-page__sub">
                        {vehicle.plate} · tarjeta {card?.masked}
                      </span>
                    </td>
                    <td>
                      <span className="table-page__main">{station.name}</span>
                      <span className="table-page__sub">
                        {EV_NETWORK_LABEL[station.network]} · {EV_CHARGE_TYPE_LABEL[station.chargeType]} · {station.city}
                      </span>
                    </td>
                    <td className="table-page__nowrap">
                      {session.status === 'denied' ? (
                        '—'
                      ) : (
                        <>
                          {formatKwh(session.energyKwh)}
                          <span className="table-page__sub">
                            {session.powerKw} kW · {session.durationMin} min
                          </span>
                        </>
                      )}
                    </td>
                    <td className="table-page__nowrap">
                      {session.status === 'denied' ? (
                        '—'
                      ) : (
                        <>
                          {formatMoney(session.total, true)}
                          <span className="table-page__sub">
                            {formatMoney(session.cost, true)} + IVA {formatMoney(session.tax, true)} + com. {formatMoney(session.commission, true)}
                          </span>
                        </>
                      )}
                    </td>
                    <td>
                      <span className={`chip ${meta.chip}`}>{meta.label}</span>
                      {session.status === 'denied' && <span className="table-page__sub">{session.denyReason}</span>}
                      {session.status === 'in-progress' && <span className="table-page__sub">Saldo comprometido</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} noun="recargas" onPage={setPage} />
      </section>
    </div>
  );
}
