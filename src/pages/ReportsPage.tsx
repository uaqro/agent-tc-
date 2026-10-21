import { useState } from 'react';
import { ConsolidatedReportPanel } from '../components/reports/ConsolidatedReportPanel';
import { DynamicReportBuilder } from '../components/reports/DynamicReportBuilder';
import { AccountStatementReport, PaymentBalanceReport } from '../components/reports/FixedReports';
import './ReportsPage.css';

type ReportView = 'transactional' | 'account' | 'balances' | 'consolidated';

const VIEWS: { id: ReportView; label: string; hint: string }[] = [
  {
    id: 'transactional',
    label: 'Transaccional dinámico',
    hint: 'Combustible',
  },
  {
    id: 'account',
    label: 'Estado de cuenta',
    hint: 'Cuenta corriente',
  },
  {
    id: 'balances',
    label: 'Saldos por medio de pago',
    hint: 'Asignaciones y movimientos',
  },
];

export function ReportsPage() {
  const [view, setView] = useState<ReportView>('transactional');
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
          <span className="reports__demo">Datos de demostración</span>

          <div className="reports__tabs" role="tablist" aria-label="Reportes de combustible">
            {VIEWS.map((candidate) => (
              <button
                type="button"
                role="tab"
                key={candidate.id}
                aria-selected={view === candidate.id}
                className={view === candidate.id ? 'is-active' : ''}
                onClick={() => setView(candidate.id)}
              >
                {candidate.label}
              </button>
            ))}
          </div>
        </header>

        {view === 'transactional' && <DynamicReportBuilder />}
        {view === 'account' && <AccountStatementReport />}
        {view === 'balances' && <PaymentBalanceReport />}
        {view === 'consolidated' && <ConsolidatedReportPanel />}
      </section>
    </div>
  );
}
