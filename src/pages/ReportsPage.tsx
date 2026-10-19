import { useState } from 'react';
import { NoDataIcon } from '../components/icons/Icons';
import { DynamicReportBuilder } from '../components/reports/DynamicReportBuilder';
import { EmptyState } from '../components/ui/EmptyState';
import { assignableGroups } from '../data/limits';
import './ReportsPage.css';

type ReportView = 'consumption' | 'dynamic';

const VIEWS: { id: ReportView; label: string; hint: string }[] = [
  {
    id: 'consumption',
    label: 'Consumo y presupuesto',
    hint: 'Litros, monto y rendimiento contra el presupuesto asignado.',
  },
  {
    id: 'dynamic',
    label: 'Reporte dinámico',
    hint: 'Arma el detalle de transacciones eligiendo columnas, filtros y agrupador.',
  },
];

const PERIODS = [
  { id: 'current-month', label: 'Mes actual', inText: 'en el mes actual' },
  { id: 'previous-month', label: 'Mes anterior', inText: 'en el mes anterior' },
  { id: 'last-30', label: 'Últimos 30 días', inText: 'en los últimos 30 días' },
  { id: 'last-90', label: 'Últimos 90 días', inText: 'en los últimos 90 días' },
];

export function ReportsPage() {
  const [view, setView] = useState<ReportView>('consumption');
  const [periodId, setPeriodId] = useState(PERIODS[0].id);
  const [group, setGroup] = useState('');

  const active = VIEWS.find((candidate) => candidate.id === view) ?? VIEWS[0];
  const period = PERIODS.find((candidate) => candidate.id === periodId) ?? PERIODS[0];
  const filtered = periodId !== PERIODS[0].id || group !== '';

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

          <div className="reports__tabs" role="tablist" aria-label="Tipo de reporte">
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

        {view === 'consumption' ? (
          <>
            <div className="reports__filters">
              <label>
                <span className="visually-hidden">Periodo</span>
                <select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
                  {PERIODS.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="visually-hidden">Grupo</span>
                <select value={group} onChange={(event) => setGroup(event.target.value)}>
                  <option value="">Todos los grupos</option>
                  {assignableGroups.map((candidate) => (
                    <option key={candidate.id} value={candidate.label}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <EmptyState
              icon={<NoDataIcon width={24} height={24} />}
              title={`No hay consumo registrado ${period.inText}${group ? ` para ${group}` : ''}`}
              description="Aquí verás los litros y el monto cargados por unidad, grupo y centro de costo, comparados contra su presupuesto. Los datos aparecen cuando se procesan las cargas de combustible."
              actions={
                filtered && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setPeriodId(PERIODS[0].id);
                      setGroup('');
                    }}
                  >
                    Limpiar filtros
                  </button>
                )
              }
            />
          </>
        ) : (
          <DynamicReportBuilder />
        )}
      </section>
    </div>
  );
}
