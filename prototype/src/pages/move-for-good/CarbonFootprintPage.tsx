import { useMemo, useState } from 'react';
import { usePagination } from '../../components/ui/Pagination';
import { DownloadIcon, FuelIcon, LeafIcon, TruckIcon } from '../../components/icons/Icons';
import {
  createDemoCarbonFootprintRows,
  filterCarbonFootprintRows,
  MOVE_FOR_GOOD_DEMO_METRICS,
  summarizeCarbonFootprint,
} from '../../data/carbonFootprint';
import { today } from '../../domain/demo/clock';
import { downloadReport } from '../../domain/reporting/export';
import '../TablePage.css';
import './CarbonFootprintPage.css';

const NUMBER = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function defaultPeriod() {
  const end = today();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  start.setDate(start.getDate() - 29);
  return { from: toISODate(start), to: toISODate(end) };
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year!, month! - 1, day!, 12).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Metric({ label, value, unit, icon, tone }: { label: string; value: number; unit: string; icon: React.ReactNode; tone: 'blue' | 'green' }) {
  return (
    <article className={`carbon-metric carbon-metric--${tone}`}>
      <span className="carbon-metric__icon">{icon}</span>
      <div className="carbon-metric__body">
        <span className="carbon-metric__label">{label}</span>
        <strong>{NUMBER.format(value)} <small>{unit}</small></strong>
      </div>
    </article>
  );
}

export function CarbonFootprintPage() {
  const [period, setPeriod] = useState(defaultPeriod);
  const [pageSize, setPageSize] = useState(10);
  const rows = useMemo(() => createDemoCarbonFootprintRows(), []);
  const filteredRows = useMemo(() => filterCarbonFootprintRows(rows, period), [rows, period]);
  const totals = useMemo(() => summarizeCarbonFootprint(filteredRows), [filteredRows]);
  const pagination = usePagination(filteredRows, pageSize);

  const downloadCertificates = () => {
    const columns = ['UNIDAD', 'PERÍODO', 'COMBUSTIBLE (LTS)', 'DISTANCIA (KM)', 'EMISIONES GENERADAS (KG)', 'EMISIONES COMPENSADAS (KG)'];
    const data = filteredRows.map((row) => [row.unit, `${period.from} - ${period.to}`, row.fuelLiters, row.distanceKm, row.emissionsGeneratedKg, row.emissionsCompensatedKg]);
    downloadReport([columns, ...data], 'csv', 'huella-de-carbono-move-for-good-demo');
  };

  return (
    <div className="table-page carbon-page">
      <div className="carbon-page__controls">
        <div className="carbon-page__period">
          <label>
            <span>Desde</span>
            <input type="date" value={period.from} max={period.to} onChange={(event) => setPeriod((current) => ({ ...current, from: event.target.value }))} />
          </label>
          <label>
            <span>Hasta</span>
            <input type="date" value={period.to} min={period.from} onChange={(event) => setPeriod((current) => ({ ...current, to: event.target.value }))} />
          </label>
        </div>
        <button type="button" className="btn btn--secondary btn--sm carbon-page__download" onClick={downloadCertificates} disabled={filteredRows.length === 0}>
          <DownloadIcon width={14} height={14} />
          Descargar reporte
        </button>
      </div>
      <p className="carbon-page__demo">Datos de demostración</p>

      <div className="carbon-page__summary">
        <section className="carbon-summary carbon-summary--fleet" aria-labelledby="carbon-fleet-title">
          <h2 id="carbon-fleet-title">Consumos de tu flota</h2>
          <div className="carbon-summary__metrics">
            <Metric label="Combustible consumido" value={totals.fuelLiters} unit="Lts" icon={<FuelIcon width={21} height={21} />} tone="blue" />
            <Metric label="Distancia recorrida" value={totals.distanceKm} unit="Km" icon={<TruckIcon width={21} height={21} />} tone="blue" />
            <Metric label="Emisiones generadas" value={totals.emissionsGeneratedKg} unit="Kg CO₂" icon={<span aria-hidden="true">CO₂</span>} tone="blue" />
          </div>
        </section>

        <section className="carbon-summary carbon-summary--good" aria-labelledby="carbon-good-title">
          <h2 id="carbon-good-title">Move for Good</h2>
          <div className="carbon-summary__metrics">
            <Metric label="Emisiones compensadas" value={totals.emissionsCompensatedKg} unit="Kg CO₂" icon={<LeafIcon width={21} height={21} />} tone="green" />
            <Metric label="Bolsas de basura recicladas" value={MOVE_FOR_GOOD_DEMO_METRICS.recycledWasteBags} unit="" icon={<span aria-hidden="true">♻</span>} tone="green" />
            <Metric label="Celulares cargados" value={MOVE_FOR_GOOD_DEMO_METRICS.mobilePhonesCharged} unit="" icon={<span aria-hidden="true">▯</span>} tone="green" />
          </div>
        </section>
      </div>

      <section className="table-page__card carbon-report" aria-label="Reporte de huella de carbono">
        <header className="table-page__head carbon-report__heading">
          <div>
            <h2 className="table-page__title">Detalle de huella de carbono</h2>
            <span>Periodo del {formatDate(period.from)} al {formatDate(period.to)}</span>
          </div>
          <span className="carbon-report__unit-count">{filteredRows.length} unidades</span>
        </header>

        <div className="table-page__scroll carbon-report__table-wrap">
          <table className="table-page__table carbon-report__table">
            <thead>
              <tr>
                <th scope="col">Unidad</th>
                <th scope="col">Tipo</th>
                <th scope="col">Marca</th>
                <th scope="col">Modelo</th>
                <th scope="col">Año</th>
                <th scope="col">Combustible consumido (Lts)</th>
                <th scope="col">Distancia recorrida (Km)</th>
                <th scope="col">Emisiones generadas (Kg)</th>
                <th scope="col">Emisiones compensadas (Kg)</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageRows.map((row) => (
                <tr key={row.id}>
                  <td data-mono="">{row.unit}</td>
                  <td>{row.type}</td>
                  <td>{row.brand}</td>
                  <td>{row.model}</td>
                  <td data-mono="">{row.year}</td>
                  <td data-mono="">{NUMBER.format(row.fuelLiters)}</td>
                  <td data-mono="">{NUMBER.format(row.distanceKm)}</td>
                  <td data-mono="">{NUMBER.format(row.emissionsGeneratedKg)}</td>
                  <td className="carbon-report__compensated" data-mono="">{NUMBER.format(row.emissionsCompensatedKg)}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr><td className="carbon-report__empty" colSpan={9}>No hay registros para el periodo seleccionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="carbon-report__footer">
          <label>
            Mostrar
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              {[10, 25, 50].map((size) => <option value={size} key={size}>{size}</option>)}
            </select>
            por página
          </label>
          <span>{filteredRows.length === 0 ? '0 registros' : `${pagination.page * pageSize + 1}–${Math.min(filteredRows.length, (pagination.page + 1) * pageSize)} de ${filteredRows.length} registros`}</span>
          <nav aria-label="Paginación del reporte">
            <button type="button" aria-label="Página anterior" disabled={pagination.page === 0} onClick={() => pagination.setPage(pagination.page - 1)}>‹</button>
            <span>{pagination.page + 1} / {pagination.pageCount}</span>
            <button type="button" aria-label="Página siguiente" disabled={pagination.page >= pagination.pageCount - 1} onClick={() => pagination.setPage(pagination.page + 1)}>›</button>
          </nav>
        </footer>
      </section>
    </div>
  );
}