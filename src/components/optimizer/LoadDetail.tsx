import { useMemo, useState, useSyncExternalStore } from 'react';
import { unitById } from '../../data/client';
import { driverNameOf } from '../../data/optimizer';
import { RECOMMENDATION_DISCLAIMER, recommendationLog, subscribeRecommendations, type RecommendationInput } from '../../data/recommendations';
import { dayLabel } from '../../domain/optimizer/loads';
import { maskedCardOf, stationName } from '../../domain/optimizer/labels';
import { isRedirectable, losesMoney, netSaving, notRedirectableReason, REASON_LABELS, savingIn } from '../../domain/optimizer/rules';
import type { Assumptions, Load, SavingMode } from '../../domain/optimizer/types';
import type { StationRecommendationRequest } from '../../types/limits';
import { formatDateTime, formatMoney } from '../../utils/format';
import { ApiTag } from '../api/ApiCoverage';
import { Pagination, usePagination } from '../ui/Pagination';
import '../../pages/TablePage.css';

interface LoadDetailProps {
  /** Loads with the discarded recommendations already taken out. */
  loads: Load[];
  /** The same loads before discarding, to show and restore what was discarded. */
  originals: Load[];
  discarded: ReadonlySet<string>;
  onDiscard: (ids: string[]) => void;
  onRestore: (ids: string[]) => void;
  assumptions: Assumptions;
  mode: SavingMode;
  canSend: boolean;
  canApply: boolean;
  onSend: (recommendation: RecommendationInput) => void;
  onApplyInLimits: (request: StationRecommendationRequest) => void;
}

const price = (value: number | null) => (value === null ? '—' : `${value.toFixed(2)}`);

/** Which loads the table lists. */
type View = 'redirigibles' | 'no_compensan' | 'descartadas' | 'todas';

const VIEW_LABELS: Record<View, string> = {
  redirigibles: 'Cargas redirigibles',
  no_compensan: 'No compensan el desvío',
  descartadas: 'Recomendaciones descartadas',
  todas: 'Todas las cargas',
};

/** Load by load, with the two manual actions on redirectable loads and the log of every send. */
export function LoadDetail({
  loads,
  originals,
  discarded,
  onDiscard,
  onRestore,
  assumptions,
  mode,
  canSend,
  canApply,
  onSend,
  onApplyInLimits,
}: LoadDetailProps) {
  const [view, setView] = useState<View>('redirigibles');
  const losing = useMemo(() => loads.filter((load) => losesMoney(load, assumptions)), [loads, assumptions]);
  const log = useSyncExternalStore(subscribeRecommendations, recommendationLog);
  const rows = useMemo(
    () =>
      (view === 'redirigibles'
        ? loads.filter(isRedirectable)
        : view === 'no_compensan'
          ? losing
          : view === 'descartadas'
            ? originals.filter((load) => discarded.has(load.id))
            : loads
      )
        .slice()
        .sort((a, b) => b.savingCents - a.savingCents || b.at - a.at),
    [loads, originals, discarded, losing, view],
  );
  const pagination = usePagination(rows);
  const sentCards = useMemo(() => new Set(log.map((entry) => entry.cardId)), [log]);

  const recommendationOf = (load: Load): RecommendationInput | null => {
    const unit = unitById(load.unitId);
    if (!unit || load.recommendedStationId === null) return null;
    return {
      cardId: load.cardId,
      maskedCard: maskedCardOf(load.cardId),
      unitId: unit.id,
      plate: unit.plate,
      // The driver of that load's day, straight from the padrón.
      driverName: driverNameOf(load.driverId),
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
            <label>
              <span className="visually-hidden">Qué cargas ver</span>
              <select value={view} onChange={(event) => setView(event.target.value as View)}>
                {(Object.keys(VIEW_LABELS) as View[]).map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {VIEW_LABELS[candidate]}
                    {candidate === 'no_compensan' ? ` (${losing.length})` : candidate === 'descartadas' ? ` (${discarded.size})` : ''}
                  </option>
                ))}
              </select>
            </label>
            {losing.length > 0 && (
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => onDiscard(losing.map((load) => load.id))}>
                Descartar las que no compensan ({losing.length})
              </button>
            )}
          </div>
        </header>
        <p className="optimizer-detail__disclaimer">
          {RECOMMENDATION_DISCLAIMER}. «Enviar al conductor» es manual y por tarjeta; «Aplicar en Límites» abre Límites con la
          unidad y la estación precargadas, y nada cambia hasta que lo confirmas allí. Una recomendación «No compensa» cuando el
          desvío cuesta más de lo que ahorra con los supuestos de arriba: se puede descartar y deja de sumar ahorro.
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
                const unit = unitById(load.unitId);
                const recommendation = recommendationOf(load);
                const redirectable = isRedirectable(load);
                const reason = notRedirectableReason(load);
                const isDiscarded = discarded.has(load.id);
                const loses = !isDiscarded && losesMoney(load, assumptions);
                return (
                  <tr key={load.id}>
                    <td>
                      <span className="table-page__main">{dayLabel(load.day)}</span>
                      <span className="table-page__sub">{load.liters.toFixed(0)} L</span>
                    </td>
                    <td>
                      <span className="table-page__main">{maskedCardOf(load.cardId)}</span>
                      <span className="table-page__sub">
                        {unit ? `${unit.plate} · ${driverNameOf(load.driverId)}` : load.unitId}
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
                      {loses && (
                        <span className="chip chip--danger table-page__gap" title="El desvío cuesta más de lo que ahorra en el litro">
                          No compensa · neto {formatMoney(netSaving(load, assumptions), true)}
                        </span>
                      )}
                      {isDiscarded && <span className="chip chip--paused table-page__gap">Descartada</span>}
                    </td>
                    <td className="table-page__action">
                      {loses && (
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDiscard([load.id])}>
                          Descartar
                        </button>
                      )}
                      {isDiscarded && (
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onRestore([load.id])}>
                          Restaurar
                        </button>
                      )}
                      {redirectable && recommendation && !isDiscarded && (
                        <>
                          {canSend && (
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onSend(recommendation)}>
                              {sentCards.has(load.cardId) ? 'Reenviar al conductor' : 'Enviar al conductor'}
                            </button>
                          )}
                          {canApply && unit && (
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() =>
                                onApplyInLimits({
                                  vehicleId: unit.id,
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
