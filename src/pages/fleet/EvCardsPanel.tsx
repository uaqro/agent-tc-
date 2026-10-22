import { useMemo } from 'react';
import { ReadOnlyNotice } from '../../components/ui/ReadOnlyNotice';
import { useDevices } from '../../data/DevicesContext';
import { EV_CARD_STATUS, EV_CARD_TYPE_LABEL, evVehicles, stationById, vehicleById } from '../../data/electromobility';
import type { EvCard } from '../../types/electromobility';
import { formatCount, formatDateTime } from '../../utils/format';
import { useEvHistory } from '../electromobility/useEvHistory';
import '../TablePage.css';
import '../electromobility/ev.css';

interface EvCardsPanelProps {
  onNotice: (message: string) => void;
  /** The role sees the charging cards but can't assign or block them (ADR-TCP-001). */
  readOnly?: boolean;
}

/** RFID and virtual charging cards, as Flota · Medios de pago shows them under Electromovilidad. */
export function EvCardsPanel({ onNotice, readOnly = false }: EvCardsPanelProps) {
  const { evCards: cards, setEvCards: setCards } = useDevices();
  const { sessions } = useEvHistory();

  /** Sessions come newest first, so the first one per card is its last charge. */
  const lastSession = useMemo(() => {
    const last = new Map<string, (typeof sessions)[number]>();
    for (const session of sessions) if (session.status !== 'denied' && !last.has(session.cardId)) last.set(session.cardId, session);
    return last;
  }, [sessions]);

  const patch = (id: string, changes: Partial<EvCard>) =>
    setCards((current) => current.map((card) => (card.id === id ? { ...card, ...changes } : card)));

  /** A card serves one vehicle at a time (RN-CARD-2); the assignment history lives in the platform. */
  const assign = (card: EvCard, vehicleId: string) => {
    const vehicle = vehicleById(vehicleId);
    patch(card.id, { vehicleId: vehicleId || null, status: vehicleId ? 'active' : 'unassigned' });
    onNotice(vehicle ? `Tarjeta ${card.masked} asignada a ${vehicle.alias}.` : `Tarjeta ${card.masked} desasignada.`);
  };

  const count = (status: EvCard['status']) => cards.filter((card) => card.status === status).length;

  return (
    <>
      {readOnly && <ReadOnlyNotice what="las tarjetas de recarga" />}
      <dl className="table-page__summary">
        <div>
          <dt>Tarjetas activas</dt>
          <dd>{formatCount(count('active'))}</dd>
        </div>
        <div>
          <dt>Bloqueadas</dt>
          <dd className={count('blocked') > 0 ? 'is-alert' : undefined}>{count('blocked')}</dd>
        </div>
        <div>
          <dt>Sin asignar</dt>
          <dd>{count('unassigned')}</dd>
        </div>
        <div>
          <dt>Virtuales</dt>
          <dd>{cards.filter((card) => card.type === 'virtual').length}</dd>
        </div>
      </dl>

      <section className="table-page__card" aria-labelledby="ev-cards-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="ev-cards-title">
            Tarjetas de recarga
          </h2>
          <p className="ev__hint">Una tarjeta activa sirve a una sola unidad a la vez. Solo se guarda la máscara y el token del emisor.</p>
        </header>
        <div className="table-page__scroll">
          <table className="table-page__table">
            <thead>
              <tr>
                <th scope="col">Tarjeta</th>
                <th scope="col">Unidad asignada</th>
                <th scope="col">Estado</th>
                <th scope="col">Vigencia</th>
                <th scope="col">Última recarga</th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => {
                const meta = EV_CARD_STATUS[card.status];
                const assignable = card.status === 'active' || card.status === 'unassigned';
                const vehicle = vehicleById(card.vehicleId ?? '');
                const session = lastSession.get(card.id);
                return (
                  <tr key={card.id}>
                    <td>
                      <span className="table-page__main">{card.masked}</span>
                      <span className="table-page__sub">{EV_CARD_TYPE_LABEL[card.type]}</span>
                    </td>
                    <td>
                      {readOnly || !assignable ? (
                        vehicle ? (
                          <>
                            <span className="table-page__main">{vehicle.alias}</span>
                            <span className="table-page__sub">{vehicle.plate}</span>
                          </>
                        ) : (
                          <span className="table-page__sub">Sin unidad</span>
                        )
                      ) : (
                        <label>
                          <span className="visually-hidden">Unidad de la tarjeta {card.masked}</span>
                          <select className="ev-inline-select" value={card.vehicleId ?? ''} onChange={(event) => assign(card, event.target.value)}>
                            <option value="">Sin asignar</option>
                            {evVehicles
                              .filter((candidate) => candidate.status !== 'inactive')
                              .map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.alias} · {candidate.plate}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                    </td>
                    <td>
                      <span className={`chip ${meta.chip}`}>{meta.label}</span>
                    </td>
                    <td className="table-page__nowrap">{card.expires.slice(0, 7).split('-').reverse().join('/')}</td>
                    <td>
                      {session ? (
                        <>
                          {formatDateTime(new Date(session.at))}
                          <span className="table-page__sub">{stationById(session.stationId)?.name}</span>
                        </>
                      ) : (
                        <span className="table-page__sub">Sin recargas</span>
                      )}
                    </td>
                    <td className="table-page__action">
                      {!readOnly && card.status === 'active' && (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            patch(card.id, { status: 'blocked' });
                            onNotice(`Tarjeta ${card.masked} bloqueada: ya no autoriza recargas.`);
                          }}
                        >
                          Bloquear
                        </button>
                      )}
                      {!readOnly && card.status === 'blocked' && vehicle && vehicle.status !== 'inactive' && (
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => {
                            patch(card.id, { status: 'active' });
                            onNotice(`Tarjeta ${card.masked} desbloqueada.`);
                          }}
                        >
                          Desbloquear
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
