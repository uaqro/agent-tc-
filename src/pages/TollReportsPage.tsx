import { TollReportBuilder } from '../components/reports/TollReportBuilder';
import './ReportsPage.css';

export function TollReportsPage() {
  return (
    <div className="reports">
      <section className="reports__panel" aria-labelledby="toll-reports-title">
        <header className="reports__head">
          <div>
            <h2 className="reports__title" id="toll-reports-title">Transaccional dinámico</h2>
            <p className="reports__hint">Cruces, TAGs y movimientos de peaje</p>
          </div>
          <span className="reports__demo">Datos de demostración</span>
        </header>
        <TollReportBuilder />
      </section>
    </div>
  );
}