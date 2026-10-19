import { useState } from 'react';
import { CardIcon, CompassIcon, FuelIcon, MapPinIcon, TrendUpIcon } from '../../components/icons/Icons';
import { optimizerSummary, regionOpportunities, stationSwaps, swapSavings } from '../../data/intelligence';
import { formatCount, formatMoney } from '../../utils/format';
import './intelligence.css';
import './GasOptimizerPage.css';

interface GasOptimizerPageProps {
  onNotice: (message: string) => void;
}

const price = (value: number) => `$${value.toFixed(2)}/L`;

export function GasOptimizerPage({ onNotice }: GasOptimizerPageProps) {
  const [tab, setTab] = useState<'summary' | 'cards'>('summary');
  const [sent, setSent] = useState<string[]>([]);

  const totalSavings = regionOpportunities.reduce((sum, region) => sum + region.savingsMXN, 0);
  const regions = [...regionOpportunities].sort((a, b) => b.savingsMXN - a.savingsMXN);
  const swaps = [...stationSwaps].sort((a, b) => swapSavings(b) - swapSavings(a));
  const maxShare = Math.max(...regions.map((region) => region.savingsMXN)) / totalSavings;

  const sendSuggestion = (plate: string, driver: string, station: string) => {
    setSent((current) => [...current, plate]);
    onNotice(`Sugerencia enviada a ${driver} (${plate}): cargar en ${station}.`);
  };

  return (
    <div className="intel optimizer">
      <section className="intel-kpis" aria-label="Indicadores del optimizador">
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--green">
            <TrendUpIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Ahorro potencial</p>
            <p className="intel-kpi__value">{formatMoney(totalSavings)}</p>
            <p className="intel-kpi__hint">Al mes · toda la flota</p>
          </div>
        </article>
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--amber">
            <FuelIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Precio actual prom.</p>
            <p className="intel-kpi__value">{price(optimizerSummary.currentPrice)}</p>
            <p className="intel-kpi__hint">Lo que pagan hoy tus tarjetas</p>
          </div>
        </article>
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--blue">
            <CompassIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Precio recomendado</p>
            <p className="intel-kpi__value">{price(optimizerSummary.recommendedPrice)}</p>
            <p className="intel-kpi__hint">
              Ahorro de ${(optimizerSummary.currentPrice - optimizerSummary.recommendedPrice).toFixed(2)} por litro
            </p>
          </div>
        </article>
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--purple">
            <MapPinIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Estaciones alternativas</p>
            <p className="intel-kpi__value">{optimizerSummary.alternativeStations}</p>
            <p className="intel-kpi__hint">En red, con precio menor al actual</p>
          </div>
        </article>
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--red">
            <CardIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Tarjetas optimizables</p>
            <p className="intel-kpi__value">{optimizerSummary.optimizableCards}</p>
            <p className="intel-kpi__hint">De {optimizerSummary.activeCards} activas · modelo {optimizerSummary.updated}</p>
          </div>
        </article>
      </section>

      <div className="intel-tabs" role="tablist" aria-label="Vista">
        <button type="button" role="tab" aria-selected={tab === 'summary'} className={tab === 'summary' ? 'is-active' : ''} onClick={() => setTab('summary')}>
          Resumen
        </button>
        <button type="button" role="tab" aria-selected={tab === 'cards'} className={tab === 'cards' ? 'is-active' : ''} onClick={() => setTab('cards')}>
          Por tarjeta ({swaps.length})
        </button>
      </div>

      {tab === 'summary' ? (
        <>
          <h2 className="intel-section-title">Oportunidad de ahorro por región</h2>
          <ul className="optimizer__regions">
            {regions.map((region) => (
              <li key={region.id} className="region-card intel-card" style={{ borderTopColor: region.color }}>
                <p className="region-card__name" style={{ color: region.color }}>
                  {region.name}
                </p>
                <p className="region-card__states">{region.states}</p>
                <p className="region-card__savings">{formatMoney(region.savingsMXN)}</p>
                <p className="region-card__hint">ahorro potencial / mes</p>
                <p className="region-card__counts">
                  <span>{region.stations} estaciones</span>
                  <span>{region.cards} tarjetas</span>
                </p>
                <div className="region-card__bar" aria-hidden="true">
                  <span style={{ width: `${region.gapPct * 8}%`, background: region.color }} />
                </div>
                <p className="region-card__gap" style={{ color: region.color }}>
                  {region.gapPct}% bajo el precio actual
                </p>
              </li>
            ))}
          </ul>

          <div className="optimizer__columns">
            <section className="intel-card optimizer__panel" aria-labelledby="top-swaps">
              <h2 className="optimizer__panel-title" id="top-swaps">
                Top 5 cambios de estación
              </h2>
              <ol className="swap-list">
                {swaps.slice(0, 5).map((swap, index) => (
                  <li key={swap.plate} className="swap-row">
                    <span className={`swap-row__rank${index === 0 ? ' swap-row__rank--first' : ''}`}>{index + 1}</span>
                    <div className="swap-row__body">
                      <p className="swap-row__unit">
                        <strong>{swap.plate}</strong> · {swap.driver}
                      </p>
                      <p className="swap-row__route">
                        <span className="swap-row__from">✕ {swap.fromStation}</span>
                        <span aria-hidden="true">→</span>
                        <span className="swap-row__to">✓ {swap.toStation}</span>
                      </p>
                      <p className="swap-row__prices">
                        {price(swap.fromPrice)} → <strong>{price(swap.toPrice)}</strong> · {swap.detourKm} km de desvío
                      </p>
                    </div>
                    <span className="swap-row__savings">
                      {formatMoney(swapSavings(swap))}
                      <small>al mes</small>
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="intel-card optimizer__panel" aria-labelledby="distribution">
              <header className="optimizer__panel-head">
                <div>
                  <h2 className="optimizer__panel-title" id="distribution">
                    Distribución del ahorro
                  </h2>
                  <p className="optimizer__panel-sub">Porcentaje del ahorro potencial total</p>
                </div>
                <p className="optimizer__total">{formatMoney(totalSavings)} / mes</p>
              </header>
              <ul className="distribution">
                {regions.map((region) => {
                  const share = region.savingsMXN / totalSavings;
                  return (
                    <li key={region.id}>
                      <span className="distribution__name" style={{ color: region.color }}>
                        {region.name}
                      </span>
                      <span className="distribution__track">
                        <span style={{ width: `${(share / maxShare) * 100}%`, background: region.color }} />
                      </span>
                      <span className="distribution__pct">{(share * 100).toFixed(1)}%</span>
                      <span className="distribution__amount">{formatMoney(region.savingsMXN)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </>
      ) : (
        <section className="intel-card optimizer__table-card">
          <div className="optimizer__scroll">
            <table className="optimizer__table">
              <thead>
                <tr>
                  <th scope="col">Unidad</th>
                  <th scope="col">Estación actual</th>
                  <th scope="col">Estación recomendada</th>
                  <th scope="col">Desvío</th>
                  <th scope="col">Litros / mes</th>
                  <th scope="col">Ahorro / mes</th>
                  <th scope="col">
                    <span className="visually-hidden">Acción</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {swaps.map((swap) => (
                  <tr key={swap.plate}>
                    <td>
                      <strong className="optimizer__plate">{swap.plate}</strong>
                      <span className="optimizer__sub">
                        {swap.driver} · {swap.group}
                      </span>
                    </td>
                    <td>
                      {swap.fromStation}
                      <span className="optimizer__sub">{price(swap.fromPrice)}</span>
                    </td>
                    <td>
                      {swap.toStation}
                      <span className="optimizer__sub optimizer__sub--good">{price(swap.toPrice)}</span>
                    </td>
                    <td>{swap.detourKm} km</td>
                    <td>{formatCount(swap.monthlyLiters)} L</td>
                    <td className="optimizer__saving">{formatMoney(swapSavings(swap))}</td>
                    <td className="optimizer__action">
                      {sent.includes(swap.plate) ? (
                        <span className="chip chip--active">Sugerencia enviada</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => sendSuggestion(swap.plate, swap.driver, swap.toStation)}
                        >
                          Enviar al conductor
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
