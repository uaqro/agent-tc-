import { useMemo } from 'react';
import {
  EV_CHARGER_STATUS,
  EV_NETWORK_LABEL,
  EV_RATES,
  evPrivateChargers,
  formatKwh,
  stationById,
  vehicleById,
} from '../../data/electromobility';
import type { EvChargerStatus, EvNetwork } from '../../types/electromobility';
import { formatCount, formatMoney } from '../../utils/format';
import { useEvHistory } from './useEvHistory';
import '../TablePage.css';
import './ev.css';

/** All-in price of a kWh at a station: tariff, IVA and platform fee. */
const pricePerKwh = (stationId: string) => stationById(stationId)!.tariffPerKwh * (1 + EV_RATES.iva + EV_RATES.platformFee);

const shortDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

export function EvSummaryPage() {
  const { now, sessions, totals } = useEvHistory();

  const stats = useMemo(() => {
    const charged = sessions.filter((session) => session.status !== 'denied');
    const end = new Date(now);
    const days = Array.from({ length: 30 }, (_, index) => new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29 + index));
    const daily = days.map((day) =>
      charged
        .filter((session) => new Date(session.at).toDateString() === day.toDateString())
        .reduce((sum, session) => sum + session.energyKwh, 0),
    );

    const byNetwork: Record<EvNetwork, { kwh: number; total: number }> = { public: { kwh: 0, total: 0 }, private: { kwh: 0, total: 0 } };
    const byVehicle = new Map<string, { kwh: number; total: number; count: number }>();
    for (const session of charged) {
      const network = stationById(session.stationId)!.network;
      byNetwork[network].kwh += session.energyKwh;
      byNetwork[network].total += session.total;
      const current = byVehicle.get(session.vehicleId) ?? { kwh: 0, total: 0, count: 0 };
      byVehicle.set(session.vehicleId, { kwh: current.kwh + session.energyKwh, total: current.total + session.total, count: current.count + 1 });
    }

    const kwh = charged.reduce((sum, session) => sum + session.energyKwh, 0);
    const spend = charged.reduce((sum, session) => sum + session.total, 0);
    const top = [...byVehicle.entries()].sort((a, b) => b[1].kwh - a[1].kwh).slice(0, 5);

    return {
      days,
      daily,
      byNetwork,
      top,
      kwh,
      spend,
      completed: sessions.filter((session) => session.status === 'completed').length,
      denied: sessions.filter((session) => session.status === 'denied').length,
    };
  }, [sessions, now]);

  const peak = Math.max(1, ...stats.daily);
  const publicShare = stats.kwh ? stats.byNetwork.public.kwh / stats.kwh : 0;
  const chargerCounts = evPrivateChargers.reduce<Record<EvChargerStatus, number>>(
    (counts, charger) => ({ ...counts, [charger.status]: counts[charger.status] + 1 }),
    { available: 0, 'in-use': 0, 'out-of-service': 0 },
  );
  const topKwh = stats.top[0]?.[1].kwh ?? 1;

  return (
    <div className="table-page">
      <ul className="ev-concepts" aria-label="Cómo funciona Electromovilidad">
        <li>
          <strong>Una sola cuenta</strong>
          La cuenta corporativa fondea todas las recargas. Las unidades no tienen saldo propio: cada recarga descuenta de ella.
        </li>
        <li>
          <strong>Reglas, no saldos</strong>
          Se controla el consumo con restricciones de horario, días, kWh, monto, red y potencia, por empresa, centro de costos, grupo o unidad.
        </li>
        <li>
          <strong>Autorizar y liquidar</strong>
          Al autorizar se compromete el estimado de la recarga; al terminar se cobra lo real y se libera el resto.
        </li>
      </ul>

      <dl className="table-page__summary">
        <div>
          <dt>Saldo disponible</dt>
          <dd>
            {formatMoney(totals.available)}
            <span className="ev__dd-sub">{formatMoney(totals.committed, true)} comprometidos</span>
          </dd>
        </div>
        <div>
          <dt>Energía · 30 días</dt>
          <dd>{formatKwh(stats.kwh)}</dd>
        </div>
        <div>
          <dt>Consumo · 30 días</dt>
          <dd>
            {formatMoney(stats.spend)}
            <span className="ev__dd-sub">{formatMoney(stats.kwh ? stats.spend / stats.kwh : 0, true)} por kWh</span>
          </dd>
        </div>
        <div>
          <dt>Recargas completadas</dt>
          <dd>
            {formatCount(stats.completed)}
            <span className="ev__dd-sub">{formatCount(stats.denied)} denegadas por restricciones</span>
          </dd>
        </div>
      </dl>

      <div className="ev-grid">
        <section className="table-page__card" aria-labelledby="ev-daily-title">
          <header className="table-page__head">
            <h2 className="table-page__title" id="ev-daily-title">
              Energía diaria (kWh)
            </h2>
          </header>
          <div className="ev__body">
            <div className="ev-bars" role="img" aria-label={`Energía diaria de los últimos 30 días; máximo ${formatKwh(peak)}`}>
              {stats.daily.map((value, index) => (
                <span
                  key={stats.days[index]!.toISOString()}
                  className="ev-bars__bar"
                  style={{ height: `${Math.max(2, (value / peak) * 100)}%` }}
                  title={`${shortDate.format(stats.days[index]!)}: ${formatKwh(value)}`}
                />
              ))}
            </div>
            <div className="ev-bars__axis">
              <span>{shortDate.format(stats.days[0]!)}</span>
              <span>{shortDate.format(stats.days[stats.days.length - 1]!)}</span>
            </div>
          </div>
        </section>

        <section className="table-page__card" aria-labelledby="ev-network-title">
          <header className="table-page__head">
            <h2 className="table-page__title" id="ev-network-title">
              Energía por tipo de red
            </h2>
          </header>
          <div className="ev__body">
            <div className="ev-split" role="img" aria-label={`${Math.round(publicShare * 100)}% en red pública`}>
              <span style={{ width: `${publicShare * 100}%` }} />
              <span style={{ width: `${(1 - publicShare) * 100}%` }} />
            </div>
            <ul className="ev-legend">
              {(['public', 'private'] as EvNetwork[]).map((network) => (
                <li key={network}>
                  <span>
                    <i style={{ background: network === 'public' ? 'var(--accent-blue)' : 'var(--accent-green)' }} />
                    {EV_NETWORK_LABEL[network]}
                  </span>
                  <span>
                    {formatKwh(stats.byNetwork[network].kwh)} · {formatMoney(stats.byNetwork[network].total)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="ev__hint" style={{ marginTop: 12 }}>
              La red privada (cargadores propios) cuesta {formatMoney(pricePerKwh('st-vallejo'), true)} por kWh contra{' '}
              {formatMoney(pricePerKwh('st-reforma'), true)} en una estación pública rápida.
            </p>
          </div>
        </section>
      </div>

      <div className="ev-grid ev-grid--even">
        <section className="table-page__card" aria-labelledby="ev-top-title">
          <header className="table-page__head">
            <h2 className="table-page__title" id="ev-top-title">
              Unidades con más energía · 30 días
            </h2>
          </header>
          <div className="ev__body">
            <ol className="ev-rank">
              {stats.top.map(([vehicleId, usage]) => {
                const vehicle = vehicleById(vehicleId)!;
                return (
                  <li key={vehicleId}>
                    <span>
                      <span className="table-page__main">{vehicle.alias}</span>
                      <span className="table-page__sub">
                        {vehicle.brand} {vehicle.model} · {usage.count} recargas
                      </span>
                    </span>
                    <span>
                      {formatKwh(usage.kwh)}
                      <span className="table-page__sub">{formatMoney(usage.total)}</span>
                    </span>
                    <span className="ev-rank__track">
                      <span style={{ width: `${(usage.kwh / topKwh) * 100}%` }} />
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="table-page__card" aria-labelledby="ev-chargers-title">
          <header className="table-page__head">
            <h2 className="table-page__title" id="ev-chargers-title">
              Estatus de los cargadores propios
            </h2>
          </header>
          <div className="ev__body">
            <ul className="ev-legend" style={{ marginTop: 0 }}>
              {(Object.keys(EV_CHARGER_STATUS) as EvChargerStatus[]).map((status) => (
                <li key={status}>
                  <span className={`chip ${EV_CHARGER_STATUS[status].chip}`}>{EV_CHARGER_STATUS[status].label}</span>
                  <strong>{chargerCounts[status]}</strong>
                </li>
              ))}
            </ul>
            <p className="ev__hint" style={{ marginTop: 12 }}>
              {evPrivateChargers.length} cargadores en {new Set(evPrivateChargers.map((charger) => charger.stationId)).size} sitios. Detalle y
              solicitudes de instalación en Electromovilidad · Cargadores.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
