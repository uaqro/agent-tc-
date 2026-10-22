import { useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { assignableGroups } from '../../data/limits';
import './IntelligenceReportsPage.css';

const PERIODS = [
  { id: 'current-month', label: 'Mes actual', inText: 'en el mes actual' },
  { id: 'previous-month', label: 'Mes anterior', inText: 'en el mes anterior' },
  { id: 'last-30', label: 'Últimos 30 días', inText: 'en los últimos 30 días' },
  { id: 'last-90', label: 'Últimos 90 días', inText: 'en los últimos 90 días' },
];

export function IntelligenceReportsPage() {
  const [periodId, setPeriodId] = useState(PERIODS[0]!.id);
  const [group, setGroup] = useState('');
  const period = PERIODS.find((candidate) => candidate.id === periodId) ?? PERIODS[0]!;
  const filtered = periodId !== PERIODS[0]!.id || group !== '';

  return (
    <div className="intelligence-reports">
      <section className="intelligence-reports__panel" aria-labelledby="intelligence-reports-title">
        <header className="intelligence-reports__head">
          <div>
            <h2 id="intelligence-reports-title">Consumo y presupuesto</h2>
            <p>Litros, monto y rendimiento contra el presupuesto asignado.</p>
          </div>
          <div className="intelligence-reports__filters">
            <label>
              <span>Periodo</span>
              <select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
                {PERIODS.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Grupo</span>
              <select value={group} onChange={(event) => setGroup(event.target.value)}>
                <option value="">Todos los grupos</option>
                {assignableGroups.map((candidate) => (
                  <option key={candidate.id} value={candidate.label}>{candidate.label}</option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <EmptyState
          icon="query_stats"
          title={`No hay consumo registrado ${period.inText}${group ? ` para ${group}` : ''}`}
          description="Aquí verás los litros y el monto cargados por unidad, grupo y centro de costo, comparados contra su presupuesto. Los datos aparecen cuando se procesan las cargas de combustible."
          actions={
            filtered && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  setPeriodId(PERIODS[0]!.id);
                  setGroup('');
                }}
              >
                Limpiar filtros
              </button>
            )
          }
        />
      </section>
    </div>
  );
}