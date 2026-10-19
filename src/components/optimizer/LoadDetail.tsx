import { useMemo, useState, useSyncExternalStore } from 'react';
import { cardHolder } from '../../data/optimizer';
import { RECOMMENDATION_DISCLAIMER, recommendationLog, subscribeRecommendations, type RecommendationInput } from '../../data/recommendations';
import { dayLabel } from '../../domain/optimizer/dataset';
import { maskedCardOf, stationName } from '../../domain/optimizer/labels';
import { isRedirectable, notRedirectableReason, REASON_LABELS, savingIn } from '../../domain/optimizer/rules';
import type { Assumptions, Load, SavingMode } from '../../domain/optimizer/types';
import type { StationRecommendationRequest } from '../../types/limits';
import { formatDateTime, formatMoney } from '../../utils/format';
import { ApiTag } from '../api/ApiCoverage';
import { Pagination, usePagination } from '../ui/Pagination';
import '../../pages/TablePage.css';

interface LoadDetailProps {
  loads: Load[];
  assumptions: Assumptions;
  mode: SavingMode;
  canSend: boolean;
  canApply: boolean;
  onSend: (recommendation: RecommendationInput) => void;
  onApplyInLimits: (request: StationRecommendationRequest) => void;
}

const price = (value: number | null) => (value === null ? '—' : `$${value.toFixed(2)}`);

/** Load by load, with the two manual actions on redirectable loads and the log of every send. */
export function LoadDetail({ loads, assumptions, mode, canSend, canApply, onSend, onApplyInLimits }: LoadDetailProps) {
  const [onlyRedirectable, setOnlyRedirectable] = useState(true);
  const log = useSyncExternalStore(subscribeRecommendations, recommendationLog);
  const rows = useMemo(
    () =>
      (onlyRedirectable ? loads.filter(isRedirectable) : loads)
        .slice()
        .sort((a, b) => b.savingCents - a.savingCents || b.at - a.at),
    [loads, onlyRedirectable],
  );
  const pagination = usePagination(rows);
  const sentCards = useMemo(() => new Set(log.map((entry) => entry.cardId)), [log]);

  const recommendationOf = (load: Load): RecommendationInput | null => {
    const holder = cardHolder(load.cardId);
    if (!holder || load.recommendedStationId === null) return null;
    return {
      cardId: load.cardId,
      maskedCard: maskedCardOf(load.cardId),
      unitId: holder.unit.id,
      plate: holder.unit.plate,
      driverName: holder.driverName,
      fromStation: stationName(load.stationId),
      toStation: stationName(load.recommendedStationId),
    };
  };

  const cardSaving = (cardId: string, stationId: string) =>
    loads
      .filter((load) => load.cardId === cardId && load.recommendedStationId === stationId)
      .reduce((sum, load) => sum + savingIn(load, 'bruto', assumptions), 0);

  return (
    <div className="optimizer-detail">
      <section className="table-page__card" aria-labelledby="optimizer-loads-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="optimizer-loads-title">
            Detalle carga por carga
          </h2>
          <div className="table-page__filters">
            <label className="optimizer-detail__toggle">
              <input type="checkbox" checked={onlyRedirectable} onChange={(event) => setOnlyRedirectable(event.target.checked)} />
              Solo cargas redirigibles
            </label>
          </div>
        </header>
        <p className="optimizer-detail__disclaimer">
          {RECOMMENDATION_DISCLAIMER}. «Enviar al conductor» es manual y por tarjeta; «Aplicar en Límites» abre Límites con la
          unidad y la estación precargadas, y nada cambia hasta que lo confirmas allí.
        </p>

        <div className="table-page__scroll">
          <table className="table-page__table">
            <thead>
              <tr>
                <th scope="col">Carga</th>
                <th scope="col">Tarjeta y unidad</th>
                <th scope="col">Estación habitual → recomendada</th>
                <th scope="col">$/L pagado → recomendado</th>
                <th scope="col">Desvío</th>
                <th scope="col">Ahorro {mode === 'bruto' ? 'bruto' : 'neto'}</th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageRows.map((load) => {
                const holder = cardHolder(load.cardId);
                const recommendation = recommendationOf(load);
                const redirectable = isRedirectable(load);
                const reason = notRedirectableReason(load);
                return (
                  <tr key={load.id}>
                    <td>
                      <span className="table-page__main">{dayLabel(load.day)}</span>
                      <span className="table-page__sub">{load.liters.toFixed(0)} L</span>
                    </td>
                    <td>
                      <span className="table-page__main">{maskedCardOf(load.cardId)}</span>
                      <span className="table-page__sub">
                        {holder ? `${holder.unit.plate} · ${holder.driverName}` : 'Sin unidad en el padrón'}
                      </span>
                    </td>
                    <td>
                      {stationName(load.stationId)}
                      <span className="table-page__sub">
                        {load.recommendedStationId ? `→ ${stationName(load.recommendedStationId)}` : 'Sin recomendación'}
                      </span>
                    </td>
                    <td className="table-page__nowrap">
                      {price(load.pricePaid)} → {price(load.priceRecommended)}
                    </td>
                    <td className="table-page__nowrap">{redirectable ? `${(load.detourM / 1000).toFixed(1)} km` : '—'}</td>
                    <td className="table-page__nowrap">
                      {redirectable ? formatMoney(savingIn(load, mode, assumptions), true) : <span className="table-page__sub">{reason ? REASON_LABELS[reason] : '—'}</span>}
                    </td>
                    <td className="table-page__action">
                      {redirectable && recommendation && (
                        <>
                          {canSend && (
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onSend(recommendation)}>
                              {sentCards.has(load.cardId) ? 'Reenviar al conductor' : 'Enviar al conductor'}
                            </button>
                          )}
                          {canApply && holder && (
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() =>
                                onApplyInLimits({
                                  vehicleId: holder.unit.id,
                                  cardLabel: `tarjeta ${recommendation.maskedCard}`,
                                  fromStation: recommendation.fromStation,
                                  toStation: recommendation.toStation,
                                  estimatedSavingMXN: Math.round(cardSaving(load.cardId, load.recommendedStationId!)),
                                })
                              }
                            >
                              Aplicar en Límites
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination {...pagination} noun="cargas" onPage={pagination.setPage} />
      </section>

      <section className="table-page__card" aria-labelledby="optimizer-log-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="optimizer-log-title">
            Envíos al conductor
            <ApiTag id="opt-send-driver" />
          </h2>
          <span className="table-page__sub">Canal simulado · {log.length} enviados en esta sesión</span>
        </header>
        {log.length === 0 ? (
          <p className="optimizer-detail__empty">Aún no se ha enviado ninguna recomendación.</p>
        ) : (
          <div className="table-page__scroll">
            <table className="table-page__table">
              <thead>
                <tr>
                  <th scope="col">Cuándo</th>
                  <th scope="col">Quién</th>
                  <th scope="col">A qué conductor</th>
                  <th scope="col">Recomendación</th>
                </tr>
              </thead>
              <tbody>
                {log.map((entry) => (
                  <tr key={entry.id}>
                    <td className="table-page__nowrap">{formatDateTime(new Date(entry.at))}</td>
                    <td>
                      {entry.sentBy}
                      <span className="table-page__sub">{entry.sentByRole}</span>
                    </td>
                    <td>
                      {entry.driverName}
                      <span className="table-page__sub">
                        {entry.plate} · {entry.maskedCard}
                      </span>
                    </td>
                    <td>
                      {entry.fromStation} → {entry.toStation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
