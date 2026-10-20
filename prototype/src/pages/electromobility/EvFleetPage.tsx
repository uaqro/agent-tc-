import { useState } from 'react';
import { ReadOnlyNotice } from '../../components/ui/ReadOnlyNotice';
import {
  EV_CARD_STATUS,
  EV_VEHICLE_STATUS,
  evCards as seedCards,
  evCostCenters,
  evGroups,
  evVehicles,
  vehicleById,
} from '../../data/electromobility';
import type { EvCard } from '../../types/electromobility';
import { formatCount, formatDateLong } from '../../utils/format';
import '../TablePage.css';
import './ev.css';

interface EvFleetPageProps {
  onNotice: (message: string) => void;
  /** The role reads the fleet but can't assign or block cards (ADR-TCP-001). */
  readOnly?: boolean;
}

const CARD_TYPE_LABEL = { rfid: 'Tarjeta RFID', virtual: 'Tarjeta virtual' } as const;

export function EvFleetPage({ onNotice, readOnly = false }: EvFleetPageProps) {
  const [cards, setCards] = useState<EvCard[]>(seedCards);

  const patch = (id: string, changes: Partial<EvCard>) =>
    setCards((current) => current.map((card) => (card.id === id ? { ...card, ...changes } : card)));

  /** A card serves one vehicle at a time (RN-CARD-2); the assignment history lives in the platform. */
  const assign = (card: EvCard, vehicleId: string) => {
    const vehicle = vehicleById(vehicleId);
    patch(card.id, { vehicleId: vehicleId || null, status: vehicleId ? 'active' : 'unassigned' });
    onNotice(vehicle ? `Tarjeta ${card.masked} asignada a ${vehicle.alias}.` : `Tarjeta ${card.masked} desasignada.`);
  };

  const electric = evVehicles.filter((vehicle) => vehicle.type === 'electric').length;
  const activeCards = cards.filter((card) => card.status === 'active').length;
  const unassigned = cards.filter((card) => card.status === 'unassigned').length;

  return (
    <div className="table-page">
      {readOnly && <ReadOnlyNotice what="las unidades y tarjetas de electromovilidad" />}
      <dl className="table-page__summary">
        <div>
          <dt>Unidades eléctricas</dt>
          <dd>{formatCount(electric)}</dd>
        </div>
        <div>
          <dt>Unidades híbridas</dt>
          <dd>{formatCount(evVehicles.length - electric)}</dd>
        </div>
        <div>
          <dt>Tarjetas activas</dt>
          <dd>{formatCount(activeCards)}</dd>
        </div>
        <div>
          <dt>Tarjetas sin asignar</dt>
          <dd>{formatCount(unassigned)}</dd>
        </div>
      </dl>

      <section className="table-page__card" aria-labelledby="ev-vehicles-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="ev-vehicles-title">
            Unidades eléctricas e híbridas
          </h2>
          <p className="ev__hint">Sin saldo propio: cada recarga descuenta de la cuenta de electromovilidad.</p>
        </header>
        <div className="table-page__scroll">
          <table className="table-page__table">
            <thead>
              <tr>
                <th scope="col">Unidad</th>
                <th scope="col">Vehículo</th>
                <th scope="col">Batería · autonomía</th>
                <th scope="col">Carga</th>
                <th scope="col">Centro de costos · grupo</th>
                <th scope="col">Tarjeta</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {evVehicles.map((vehicle) => {
                const vehicleCards = cards.filter((card) => card.vehicleId === vehicle.id);
                return (
                  <tr key={vehicle.id}>
                    <td>
                      <span className="table-page__main">{vehicle.alias}</span>
                      <span className="table-page__sub">{vehicle.plate}</span>
                    </td>
                    <td>
                      <span className="table-page__main">
                        {vehicle.brand} {vehicle.model} {vehicle.trim}
                      </span>
                      <span className="table-page__sub">
                        {vehicle.year} · {vehicle.type === 'electric' ? 'Eléctrico' : 'Híbrido enchufable'} · VIN {vehicle.vin}
                      </span>
                    </td>
                    <td className="table-page__nowrap">
                      {vehicle.batteryKwh} kWh
                      <span className="table-page__sub">{vehicle.rangeKm} km</span>
                    </td>
                    <td className="table-page__nowrap">
                      {vehicle.connector}
                      <span className="table-page__sub">hasta {vehicle.maxPowerKw} kW</span>
                    </td>
                    <td>
                      <span className="table-page__main">{evCostCenters.find((center) => center.id === vehicle.costCenterId)?.name}</span>
                      <span className="table-page__sub">{evGroups.find((group) => group.id === vehicle.groupId)?.name}</span>
                    </td>
                    <td className="table-page__nowrap">
                      {vehicleCards.length ? (
                        vehicleCards.map((card) => (
                          <span key={card.id} className="table-page__main">
                            {card.masked}
                            <span className="table-page__sub">{EV_CARD_STATUS[card.status].label}</span>
                          </span>
                        ))
                      ) : (
                        <span className="table-page__sub">Sin tarjeta</span>
                      )}
                    </td>
                    <td>
                      <span className={`chip ${EV_VEHICLE_STATUS[vehicle.status].chip}`}>{EV_VEHICLE_STATUS[vehicle.status].label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

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
                <th scope="col">Vigencia</th>
                <th scope="col">Unidad</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => {
                const meta = EV_CARD_STATUS[card.status];
                const operable = card.status === 'active' || card.status === 'unassigned' || card.status === 'blocked';
                return (
                  <tr key={card.id}>
                    <td>
                      <span className="table-page__main">{card.masked}</span>
                      <span className="table-page__sub">{CARD_TYPE_LABEL[card.type]}</span>
                    </td>
                    <td className="table-page__nowrap">{formatDateLong(card.expires)} {card.expires.slice(0, 4)}</td>
                    <td>
                      {readOnly || !operable || card.status === 'blocked' ? (
                        (vehicleById(card.vehicleId ?? '')?.alias ?? <span className="table-page__sub">Sin asignar</span>)
                      ) : (
                        <label>
                          <span className="visually-hidden">Unidad de la tarjeta {card.masked}</span>
                          <select className="ev-inline-select" value={card.vehicleId ?? ''} onChange={(event) => assign(card, event.target.value)}>
                            <option value="">Sin asignar</option>
                            {evVehicles
                              .filter((vehicle) => vehicle.status !== 'inactive')
                              .map((vehicle) => (
                                <option key={vehicle.id} value={vehicle.id}>
                                  {vehicle.alias} · {vehicle.plate}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                    </td>
                    <td>
                      <span className={`chip ${meta.chip}`}>{meta.label}</span>
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
                      {!readOnly && card.status === 'blocked' && card.vehicleId && vehicleById(card.vehicleId)?.status !== 'inactive' && (
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
    </div>
  );
}
