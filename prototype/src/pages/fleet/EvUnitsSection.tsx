import { useDevices } from '../../data/DevicesContext';
import { EV_CARD_STATUS, EV_VEHICLE_STATUS, evCostCenters, evGroups, evVehicles } from '../../data/electromobility';
import '../TablePage.css';
import '../electromobility/ev.css';

interface EvUnitsSectionProps {
  /** The VIN is visible to admin and flota (`inventario.vin`). */
  showVin?: boolean;
}

/** Electric and plug-in hybrid units, listed in Flota · Vehículos next to the combustion fleet. */
export function EvUnitsSection({ showVin = false }: EvUnitsSectionProps) {
  const { evCards } = useDevices();
  const electric = evVehicles.filter((vehicle) => vehicle.type === 'electric').length;

  return (
    <section className="table-page__card" aria-labelledby="ev-units-title">
      <header className="table-page__head">
        <h2 className="table-page__title" id="ev-units-title">
          Unidades eléctricas e híbridas
        </h2>
        <p className="ev__hint">
          {electric} eléctricas y {evVehicles.length - electric} híbridas enchufables. Sin saldo propio: cada recarga descuenta de la cuenta de
          electromovilidad.
        </p>
      </header>
      <div className="table-page__scroll">
        <table className="table-page__table">
          <thead>
            <tr>
              <th scope="col">Unidad</th>
              <th scope="col">Centro de costos · grupo</th>
              <th scope="col">Batería · autonomía</th>
              <th scope="col">Carga</th>
              <th scope="col">Dispositivos</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {evVehicles.map((vehicle) => {
              const cards = evCards.filter((card) => card.vehicleId === vehicle.id);
              return (
                <tr key={vehicle.id}>
                  <td>
                    <span className="table-page__main">{vehicle.plate}</span>
                    <span className="table-page__sub">
                      {vehicle.alias} · {vehicle.brand} {vehicle.model} {vehicle.trim} · {vehicle.year}
                    </span>
                    <span className="table-page__sub">{vehicle.type === 'electric' ? 'Eléctrico' : 'Híbrido enchufable'}</span>
                    {showVin && <span className="table-page__sub table-page__nowrap">VIN {vehicle.vin}</span>}
                  </td>
                  <td>
                    <span className="table-page__main">{evCostCenters.find((center) => center.id === vehicle.costCenterId)?.name}</span>
                    <span className="table-page__sub">{evGroups.find((group) => group.id === vehicle.groupId)?.name}</span>
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
                    {cards.length ? (
                      cards.map((card) => (
                        <span key={card.id}>
                          <span className="table-page__nowrap">{card.masked}</span>
                          <span className="table-page__sub">Electromovilidad · {EV_CARD_STATUS[card.status].label}</span>
                        </span>
                      ))
                    ) : (
                      <span className="table-page__sub">Sin dispositivo</span>
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
  );
}
