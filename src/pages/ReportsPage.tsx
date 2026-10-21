import { useState } from 'react';
import { Tabs } from '@er-mobility-mx/design-system';
import { ConsolidatedReportPanel } from '../components/reports/ConsolidatedReportPanel';
import { DynamicReportBuilder } from '../components/reports/DynamicReportBuilder';
import './ReportsPage.css';

type ReportView = 'consolidated' | 'dynamic';

const VIEWS: { id: ReportView; label: string; hint: string }[] = [
  {
    id: 'consolidated',
    label: 'Reporte consolidado',
    hint: 'Autoconsumo y TicketCar+ en un mismo documento, con el alcance y el periodo que elijas.',
  },
  {
    id: 'dynamic',
    label: 'Reporte dinámico',
    hint: 'Arma el detalle de transacciones eligiendo columnas, filtros y agrupador.',
  },
];
const REPORT_TABS_ID = 'reports-view-tabs';
const REPORT_TABS = VIEWS.map(({ id, label }) => ({ value: id, label }));

export function ReportsPage() {
  const [view, setView] = useState<ReportView>('consolidated');
  const active = VIEWS.find((candidate) => candidate.id === view) ?? VIEWS[0];

  return (
    <div className="reports">
      <section className="reports__panel" aria-labelledby="reports-title">
        <header className="reports__head">
          <div>
            <h2 className="reports__title" id="reports-title">
              {active.label}
            </h2>
            <p className="reports__hint">{active.hint}</p>
          </div>

          <Tabs
            id={REPORT_TABS_ID}
            items={REPORT_TABS}
            value={view}
            onChange={(nextView) => {
              const next = VIEWS.find((candidate) => candidate.id === nextView);
              if (next) setView(next.id);
            }}
            ariaLabel="Tipo de reporte"
          />
        </header>

        {view === 'consolidated' ? <ConsolidatedReportPanel /> : <DynamicReportBuilder />}
      </section>
    </div>
  );
}
