import { Suspense, lazy, useMemo, useState } from 'react';
import { ApiCoverageBanner } from '../../components/api/ApiCoverage';
import { BarChart } from '../../components/charts/BarChart';
import { EmptyChart } from '../../components/charts/EmptyChart';
import { LineChart } from '../../components/charts/LineChart';
import { CompassIcon, FuelIcon, MapPinIcon, TrendUpIcon, TruckIcon } from '../../components/icons/Icons';
import { LoadDetail } from '../../components/optimizer/LoadDetail';
import { SendRecommendationDialog } from '../../components/optimizer/SendRecommendationDialog';
import { useSession } from '../../components/session/Session';
import { EmptyState } from '../../components/ui/EmptyState';
import { can } from '../../data/access';
import { niceMax } from '../../data/dashboardCharts';
import {
  optimizerWindows,
  scopedOptimizerLoads,
  optimizerOrgView,
  regionSummaries,
  stationsById,
} from '../../data/optimizer';
import { sendStationRecommendation, type RecommendationInput } from '../../data/recommendations';
import { scopeLabel } from '../../data/client';
import { dayLabel } from '../../domain/optimizer/loads';
import { DEFAULT_OPTIMIZER_FILTERS, applyOptimizerFilters, periodDays, type OptimizerFilters } from '../../domain/optimizer/filters';
import { maskedCardOf, stationName } from '../../domain/optimizer/labels';
import {
  CV_TRANSITION_LABELS,
  DAILY_METRIC_LABELS,
  computeOptimizerKpis,
  cvSummary,
  dailySeries,
  directionsUrl,
  distanceBands,
  farForTinyLoads,
  stationCategory,
  stationPanelLoads,
  stationStats,
  type CvTransition,
  type DailyMetric,
} from '../../domain/optimizer/metrics';
import { DEFAULT_ASSUMPTIONS, discardRecommendations, losesMoney, sanitizeAssumptions } from '../../domain/optimizer/rules';
import { SAVING_MODE_LABELS, type Assumptions, type SavingMode } from '../../domain/optimizer/types';
import { FUEL_LABELS, FUEL_TYPES, UNIT_CLASS_LABELS, type UnitClass } from '../../domain/dashboard/types';
import type { StationRecommendationRequest } from '../../types/limits';
import { formatCount, formatMoney } from '../../utils/format';
import '../TablePage.css';
import './intelligence.css';
import './GasOptimizerPage.css';

// Leaflet only loads when someone opens the map.
const StationMap = lazy(() => import('../../components/optimizer/StationMap'));

interface GasOptimizerPageProps {
  onNotice: (message: string) => void;
  onApplyInLimits: (request: StationRecommendationRequest) => void;
}

type Tab = 'resumen' | 'regiones' | 'estaciones' | 'detalle' | 'cv';

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'regiones', label: 'Por región' },
  { id: 'estaciones', label: 'Estaciones' },
  { id: 'detalle', label: 'Detalle carga por carga' },
  { id: 'cv', label: 'Control volumétrico' },
];

const CATEGORY_LABEL = { oportunidad: 'Oportunidad', mixta: 'Mixta', optima: 'Óptima' } as const;
const CATEGORY_CHIP = { oportunidad: 'chip--danger', mixta: 'chip--review', optima: 'chip--active' } as const;
const VEHICLE_CLASSES: UnitClass[] = ['pesado', 'mediano', 'ligero', 'van'];

const percent = (ratio: number | null, decimals = 0) => (ratio === null ? '—' : `${(ratio * 100).toFixed(decimals)} %`);
const pricePerLiter = (value: number | null) => (value === null ? '—' : `$${value.toFixed(2)}/L`);

/**
 * Optimizer of fuelling stations: eOne's load optimizer (Sprint 8) with the view by region kept from the previous
 * Ticket Car screen. It is analytical: the per-card station change moved out, to Límites, behind "Aplicar en Límites".
 */
export function GasOptimizerPage({ onNotice, onApplyInLimits }: GasOptimizerPageProps) {
  const { principal } = useSession();
  const [tab, setTab] = useState<Tab>('resumen');
  const windows = useMemo(() => optimizerWindows(), []);
  const [windowId, setWindowId] = useState(windows[0].id);
  const [mode, setMode] = useState<SavingMode>('bruto');
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [facets, setFacets] = useState({ fuel: '', vehicleType: '', zone: '' });
  const [dailyMetric, setDailyMetric] = useState<DailyMetric>('ahorro');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [sending, setSending] = useState<RecommendationInput | null>(null);
  // Recommendations discarded in this visit: their loads stay (they are spend), without the recommendation.
  const [discarded, setDiscarded] = useState<ReadonlySet<string>>(() => new Set());

  const range = windows.find((candidate) => candidate.id === windowId) ?? windows[0];
  const filters = useMemo<OptimizerFilters>(
    () => ({
      ...DEFAULT_OPTIMIZER_FILTERS,
      fromDay: range.fromDay,
      toDay: range.toDay,
      fuel: facets.fuel ? [facets.fuel] : [],
      vehicleType: facets.vehicleType ? [facets.vehicleType] : [],
      zone: facets.zone ? [facets.zone] : [],
    }),
    [range, facets],
  );

  // The page remounts on a session change, so the scoped loads can be read once.
  const optimizerLoads = useMemo(() => scopedOptimizerLoads(), []);
  const filteredLoads = useMemo(() => applyOptimizerFilters(optimizerLoads, filters), [optimizerLoads, filters]);
  const loads = useMemo(() => discardRecommendations(filteredLoads, discarded), [filteredLoads, discarded]);
  const losing = useMemo(() => loads.filter((load) => losesMoney(load, assumptions)).length, [loads, assumptions]);
  const days = periodDays(filters);
  const kpis = useMemo(() => computeOptimizerKpis(loads, assumptions, mode, days), [loads, assumptions, mode, days]);
  const bands = useMemo(() => distanceBands(loads, assumptions, mode), [loads, assumptions, mode]);
  const daily = useMemo(() => dailySeries(loads, filters.fromDay, filters.toDay, assumptions, mode), [loads, filters, assumptions, mode]);
  const stations = useMemo(() => stationStats(loads, stationsById, assumptions), [loads, assumptions]);
  const cv = useMemo(() => cvSummary(loads, stationsById, assumptions, mode), [loads, assumptions, mode]);
  const regions = useMemo(() => regionSummaries(loads, assumptions, mode), [loads, assumptions, mode]);
  const farForTiny = useMemo(() => farForTinyLoads(loads), [loads]);
  const zones = optimizerOrgView.zones.filter((zone) => optimizerLoads.some((load) => load.zone === zone));

  const canSend = can(principal, 'tc.recomendaciones', 'escribir');
  const canApply = can(principal, 'tc.limites', 'escribir');
  const ranking = useMemo(() => [...stations].sort((a, b) => b.grossSaving - a.grossSaving), [stations]);
  const selected = stations.find((stats) => stats.station.id === selectedStationId) ?? null;
  const otherMode: SavingMode = mode === 'bruto' ? 'neto' : 'bruto';

  if (optimizerLoads.length === 0) {
    return (
      <div className="intel optimizer">
        <EmptyState
          card
          icon="explore"
          title="No hay cargas dentro de tu alcance"
          description={`${scopeLabel(principal.scopeNodeId)} no tiene cargas en los últimos 30 días.`}
        />
      </div>
    );
  }

  return (
    <div className="intel optimizer">
      <ApiCoverageBanner page="optimizer" />

      <section className="optimizer__controls" aria-label="Recorte del optimizador">
        <label className="optimizer__control">
          <span>Periodo</span>
          <select value={windowId} onChange={(event) => setWindowId(event.target.value)}>
            {windows.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="optimizer__control">
          <span>Ahorro</span>
          <div className="optimizer__segmented" role="group" aria-label="Modo de ahorro">
            {(['bruto', 'neto'] as SavingMode[]).map((candidate) => (
              <button key={candidate} type="button" className={mode === candidate ? 'is-active' : ''} aria-pressed={mode === candidate} onClick={() => setMode(candidate)}>
                {SAVING_MODE_LABELS[candidate]}
              </button>
            ))}
          </div>
        </div>
        <label className="optimizer__control">
          <span>Combustible</span>
          <select value={facets.fuel} onChange={(event) => setFacets((current) => ({ ...current, fuel: event.target.value }))}>
            <option value="">Todos</option>
            {FUEL_TYPES.map((fuel) => (
              <option key={fuel} value={fuel}>
                {FUEL_LABELS[fuel]}
              </option>
            ))}
          </select>
        </label>
        <label className="optimizer__control">
          <span>Tipo de vehículo</span>
          <select value={facets.vehicleType} onChange={(event) => setFacets((current) => ({ ...current, vehicleType: event.target.value }))}>
            <option value="">Todos</option>
            {VEHICLE_CLASSES.map((vehicleClass) => (
              <option key={vehicleClass} value={vehicleClass}>
                {UNIT_CLASS_LABELS[vehicleClass]}
              </option>
            ))}
          </select>
        </label>
        <label className="optimizer__control">
          <span>Zona</span>
          <select value={facets.zone} onChange={(event) => setFacets((current) => ({ ...current, zone: event.target.value }))}>
            <option value="">Todas</option>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {optimizerOrgView.zoneLabel(zone)}
              </option>
            ))}
          </select>
        </label>
        <label className="optimizer__control optimizer__control--narrow">
          <span>km/L supuesto</span>
          <input
            type="number"
            min={1}
            max={30}
            step={0.5}
            value={assumptions.kmPerLiter}
            onChange={(event) => setAssumptions((current) => sanitizeAssumptions({ ...current, kmPerLiter: Number(event.target.value) }))}
          />
        </label>
        <label className="optimizer__check">
          <input
            type="checkbox"
            checked={assumptions.roundTrip}
            onChange={(event) => setAssumptions((current) => ({ ...current, roundTrip: event.target.checked }))}
          />
          Desvío de ida y vuelta
        </label>
      </section>

      <section className="intel-kpis" aria-label="Indicadores del optimizador">
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--green">
            <TrendUpIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Ahorro {mode === 'bruto' ? 'bruto' : 'neto'}</p>
            <p className="intel-kpi__value">{formatMoney(kpis.saving)}</p>
            <p className="intel-kpi__hint">
              {SAVING_MODE_LABELS[otherMode]}: {formatMoney(otherMode === 'bruto' ? kpis.grossSaving : kpis.netSaving)}
            </p>
            {losing > 0 && (
              <p className="intel-kpi__hint optimizer__losing">
                {formatCount(losing)} recomendaciones no compensan el desvío (neto negativo). Revísalas en «Detalle carga por carga».
              </p>
            )}
          </div>
        </article>
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--blue">
            <CompassIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Proyección a 30 días</p>
            <p className="intel-kpi__value">{kpis.monthlyProjection === null ? '—' : formatMoney(kpis.monthlyProjection)}</p>
            <p className="intel-kpi__hint">Con {days} días de datos</p>
          </div>
        </article>
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--amber">
            <FuelIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Cargas redirigibles</p>
            <p className="intel-kpi__value">
              {formatCount(kpis.redirectableLoads)} <small>de {formatCount(kpis.loads)}</small>
            </p>
            <p className="intel-kpi__hint">{percent(kpis.redirectableLitersShare)} de los litros</p>
          </div>
        </article>
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--purple">
            <MapPinIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Precio pagado → recomendado</p>
            <p className="intel-kpi__value">{pricePerLiter(kpis.avgPriceRecommended)}</p>
            <p className="intel-kpi__hint">
              Hoy {pricePerLiter(kpis.avgPricePaid)} · {percent(kpis.priceVariation, 1)}
            </p>
          </div>
        </article>
        <article className="intel-card intel-kpi">
          <span className="intel-kpi__icon tone--red">
            <TruckIcon width={20} height={20} />
          </span>
          <div>
            <p className="intel-kpi__label">Coste de los desvíos</p>
            <p className="intel-kpi__value">{formatMoney(kpis.detourCost)}</p>
            <p className="intel-kpi__hint">
              {assumptions.kmPerLiter} km/L · {assumptions.roundTrip ? 'ida y vuelta' : 'solo ida'}
            </p>
          </div>
        </article>
      </section>

      <div className="intel-tabs" role="tablist" aria-label="Vista">
        {TABS.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            role="tab"
            aria-selected={tab === candidate.id}
            className={tab === candidate.id ? 'is-active' : ''}
            onClick={() => setTab(candidate.id)}
          >
            {candidate.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="optimizer__columns">
          <section className="intel-card optimizer__panel">
            <h2 className="intel-section-title">Ahorro por distancia de desvío</h2>
            {bands.some((band) => band.loads > 0) ? (
              <BarChart
                labels={bands.map((band) => band.label)}
                series={[{ name: `Ahorro ${mode}`, color: '#007840', values: bands.map((band) => Math.round(band.saving)) }]}
                yMin={0}
                yMax={niceMax(Math.max(0, ...bands.map((band) => band.saving)))}
                ariaLabel="Ahorro por banda de distancia de desvío"
              />
            ) : (
              <EmptyChart hint="No hay cargas redirigibles en el recorte." />
            )}
            {farForTiny.length > 0 && (
              <p className="optimizer__note">
                {formatCount(farForTiny.length)} cargas proponen más de 3 km de desvío para ahorrar menos de $1: el motor las deja
                redirigibles, pero no compensan.
              </p>
            )}
          </section>

          <section className="intel-card optimizer__panel">
            <div className="optimizer__panel-head">
              <h2 className="intel-section-title">Evolución diaria</h2>
              <select value={dailyMetric} onChange={(event) => setDailyMetric(event.target.value as DailyMetric)} aria-label="Métrica">
                {(Object.keys(DAILY_METRIC_LABELS) as DailyMetric[]).map((metric) => (
                  <option key={metric} value={metric}>
                    {DAILY_METRIC_LABELS[metric]}
                  </option>
                ))}
              </select>
            </div>
            <LineChart
              labels={daily.map((point) => dayLabel(point.day))}
              series={[{ name: DAILY_METRIC_LABELS[dailyMetric], color: '#0060df', values: daily.map((point) => Math.round(point[dailyMetric])) }]}
              yMin={0}
              yMax={niceMax(Math.max(0, ...daily.map((point) => point[dailyMetric])))}
              ariaLabel={`${DAILY_METRIC_LABELS[dailyMetric]} por día`}
            />
          </section>

          <section className="intel-card optimizer__panel optimizer__panel--wide">
            <h2 className="intel-section-title">Cómo se calcula</h2>
            <p className="optimizer__note">
              Una carga es redirigible cuando el motor propone otra estación más barata a menos de 5 km de la habitual. El ahorro
              bruto es la diferencia de precio por los litros cargados; el neto descuenta el combustible del desvío con el
              rendimiento supuesto. El optimizador solo analiza: no cambia tarjetas ni límites. Son las mismas cargas que suman el
              Resumen y el reporte consolidado (datos sintéticos); las de Autoconsumo cargan en planta propia y no se redirigen.
            </p>
          </section>
        </div>
      )}

      {tab === 'regiones' && (
        <>
          <h2 className="intel-section-title">Oportunidad de ahorro por región</h2>
          <ul className="optimizer__regions">
            {regions.map((region) => (
              <li key={region.divisionId} className="region-card intel-card">
                <p className="region-card__name">{region.name}</p>
                <p className="region-card__states">{region.zones.join(', ')}</p>
                <p className="region-card__savings">{formatMoney(region.saving)}</p>
                <p className="region-card__hint">ahorro {mode} · {range.label.toLowerCase()}</p>
                <p className="region-card__counts">
                  <span>{formatCount(region.stations)} estaciones</span>
                  <span>{formatCount(region.cards)} tarjetas</span>
                  <span>
                    {formatCount(region.redirectable)} de {formatCount(region.loads)} cargas redirigibles
                  </span>
                </p>
                <p className="region-card__gap">
                  {region.priceGap === null ? 'Sin cargas redirigibles' : `${percent(-region.priceGap, 1)} bajo el precio pagado`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'estaciones' && (
        <div className={`optimizer__stations${selected ? ' optimizer__stations--with-panel' : ''}`}>
          <section className="intel-card optimizer__panel">
            <Suspense fallback={<p className="optimizer__note">Cargando el mapa…</p>}>
              <StationMap stations={stations} stationsById={stationsById} selectedStationId={selectedStationId} onSelect={setSelectedStationId} />
            </Suspense>
          </section>

          {selected && (
            <aside className="intel-card optimizer__panel optimizer__station-panel" aria-label={`Estación ${selected.station.name}`}>
              <div className="optimizer__panel-head">
                <h2 className="intel-section-title">{selected.station.name}</h2>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedStationId(null)}>
                  Cerrar
                </button>
              </div>
              <p className="optimizer__note">
                {formatCount(selected.loads)} cargas · {formatCount(Math.round(selected.liters))} L ·{' '}
                {percent(selected.redirectableShare)} redirigible · ahorro bruto {formatMoney(selected.grossSaving)}
                {selected.station.cv ? ' · con control volumétrico' : ''}
              </p>
              <ol className="optimizer__destinations">
                {selected.destinations.map((destination) => {
                  const target = stationsById.get(destination.stationId);
                  return (
                    <li key={destination.stationId}>
                      {stationName(destination.stationId)} · {formatCount(destination.loads)} cargas
                      {target && (
                        <a href={directionsUrl(selected.station, target)} target="_blank" rel="noreferrer">
                          Cómo llegar
                        </a>
                      )}
                    </li>
                  );
                })}
              </ol>
              <ul className="optimizer__station-loads">
                {stationPanelLoads(loads, selected.station.id, 'redirigibles', 'ahorro')
                  .rows.slice(0, 8)
                  .map((load) => (
                    <li key={load.id}>
                      {dayLabel(load.day)} · {maskedCardOf(load.cardId)} · {load.liters.toFixed(0)} L ·{' '}
                      {formatMoney(load.savingCents / 100, true)}
                    </li>
                  ))}
              </ul>
              <p className="optimizer__note">Las acciones por tarjeta están en «Detalle carga por carga».</p>
            </aside>
          )}

          <section className="table-page__card optimizer__ranking" aria-labelledby="optimizer-ranking-title">
            <header className="table-page__head">
              <h2 className="table-page__title" id="optimizer-ranking-title">
                Ranking de estaciones por ahorro
              </h2>
            </header>
            <div className="table-page__scroll">
              <table className="table-page__table">
                <thead>
                  <tr>
                    <th scope="col">Estación</th>
                    <th scope="col">Cargas</th>
                    <th scope="col">Redirigible</th>
                    <th scope="col">Ahorro bruto</th>
                    <th scope="col">Ahorro neto</th>
                    <th scope="col">Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.slice(0, 15).map((stats) => {
                    const category = stationCategory(stats);
                    return (
                      <tr key={stats.station.id} className={stats.station.id === selectedStationId ? 'is-selected' : undefined}>
                        <td>
                          <button type="button" className="optimizer__link" onClick={() => setSelectedStationId(stats.station.id)}>
                            {stats.station.name}
                          </button>
                          <span className="table-page__sub">
                            {optimizerOrgView.zoneLabel(stats.station.zone)}
                            {stats.station.cv ? ' · CV' : ''}
                          </span>
                        </td>
                        <td>{formatCount(stats.loads)}</td>
                        <td>{percent(stats.redirectableShare)}</td>
                        <td>{formatMoney(stats.grossSaving)}</td>
                        <td>{formatMoney(stats.netSaving)}</td>
                        <td>
                          <span className={`chip ${CATEGORY_CHIP[category]}`}>{CATEGORY_LABEL[category]}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === 'detalle' && (
        <LoadDetail
          loads={loads}
          originals={filteredLoads}
          discarded={discarded}
          onDiscard={(ids) => setDiscarded((current) => new Set([...current, ...ids]))}
          onRestore={(ids) => setDiscarded((current) => new Set([...current].filter((id) => !ids.includes(id))))}
          assumptions={assumptions}
          mode={mode}
          canSend={canSend}
          canApply={canApply}
          onSend={setSending}
          onApplyInLimits={onApplyInLimits}
        />
      )}

      {tab === 'cv' && (
        <div className="optimizer__columns">
          <section className="intel-card optimizer__panel">
            <h2 className="intel-section-title">Ahorro y control volumétrico</h2>
            <dl className="optimizer__facts">
              <div>
                <dt>Termina en estación con CV</dt>
                <dd>{formatMoney(cv.savingToCv)}</dd>
              </div>
              <div>
                <dt>Exige dejar una estación con CV</dt>
                <dd>{formatMoney(cv.savingLosingCv)}</dd>
              </div>
              <div>
                <dt>Fuera del directorio</dt>
                <dd>{formatMoney(cv.savingOutsideDirectory)}</dd>
              </div>
              <div>
                <dt>Estaciones habituales con CV</dt>
                <dd>
                  {formatCount(cv.coverage.currentWithCv)} de {formatCount(cv.coverage.currentStations)}
                </dd>
              </div>
            </dl>
            <p className="optimizer__note">
              El directorio de control volumétrico todavía no tiene fuente ni responsable: una estación sin marca no está en el
              directorio, no es una estación sin control.
            </p>
          </section>
          <section className="intel-card optimizer__panel">
            <h2 className="intel-section-title">Qué pasa con el control al redirigir</h2>
            <table className="table-page__table">
              <thead>
                <tr>
                  <th scope="col">Transición</th>
                  <th scope="col">Cargas</th>
                  <th scope="col">Ahorro</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(CV_TRANSITION_LABELS) as CvTransition[]).map((transition) => (
                  <tr key={transition}>
                    <td>{CV_TRANSITION_LABELS[transition]}</td>
                    <td>
                      {formatCount(cv.matrix[transition].loads)} · {percent(cv.matrix[transition].share)}
                    </td>
                    <td>{formatMoney(cv.matrix[transition].saving)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {sending && (
        <SendRecommendationDialog
          recommendation={sending}
          onClose={() => setSending(null)}
          onSend={() => {
            const entry = sendStationRecommendation(sending);
            setSending(null);
            onNotice(`Recomendación enviada a ${entry.driverName} (${entry.plate}): ${entry.toStation}. Canal simulado.`);
          }}
        />
      )}
    </div>
  );
}
