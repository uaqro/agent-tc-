import { useState } from 'react';
import type { RunSimulation } from '../../types/dispersion';
import { Modal } from '../ui/Modal';
import { AlertIcon, CheckCircleIcon, ChevronDownIcon } from '../icons/Icons';
import { formatCount, formatDateLong, formatLiters, formatMoney, formatSignedPercent } from '../../utils/format';
import './SimulationDialog.css';

interface SimulationDialogProps {
  open: boolean;
  mode: 'review' | 'run';
  simulation: RunSimulation | null;
  onClose: () => void;
  onConfirm: (simulation: RunSimulation) => void;
}

export function SimulationDialog({ open, mode, simulation, onClose, onConfirm }: SimulationDialogProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  if (!simulation) return null;

  const { rule } = simulation;
  const confirmLabel = mode === 'review' ? 'Aprobar corrida' : 'Confirmar y ejecutar';

  return (
    <Modal
      open={open}
      size="lg"
      title={mode === 'review' ? 'Simulación de la corrida programada' : 'Confirmar corrida'}
      subtitle={`${rule.name} · ${rule.nextRun ? `programada para el ${formatDateLong(rule.nextRun)}` : 'ejecución inmediata'}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onConfirm(simulation)}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="sim__headline">
        Esta corrida afecta <strong>{formatCount(simulation.unitsAffected)} unidades</strong> y dispersa{' '}
        <strong>{formatMoney(simulation.totalMXN)}</strong> ({formatLiters(simulation.totalLiters)}).
      </p>

      <dl className="sim__stats">
        <div>
          <dt>Unidades afectadas</dt>
          <dd>{formatCount(simulation.unitsAffected)}</dd>
        </div>
        <div>
          <dt>Nuevas desde la última corrida</dt>
          <dd>{formatCount(simulation.newUnits)}</dd>
        </div>
        <div>
          <dt>Excluidas por inactividad</dt>
          <dd>{formatCount(simulation.excludedUnits)}</dd>
        </div>
        <div>
          <dt>Monto por unidad (promedio)</dt>
          <dd>{formatMoney(simulation.totalMXN / Math.max(simulation.unitsAffected, 1))}</dd>
        </div>
      </dl>

      <section className="sim__budget">
        <div className="sim__budget-row">
          <span>Disponible antes</span>
          <strong>{formatMoney(simulation.availableBeforeMXN)}</strong>
        </div>
        <div className="sim__budget-row sim__budget-row--negative">
          <span>Esta corrida</span>
          <strong>− {formatMoney(simulation.totalMXN)}</strong>
        </div>
        <div className="sim__budget-row sim__budget-row--total">
          <span>Disponible final</span>
          <strong>{formatMoney(simulation.availableAfterMXN)}</strong>
        </div>

        <div
          className="sim__budget-bar"
          role="img"
          aria-label={`El disponible final representa el ${(simulation.budgetShare * 100).toFixed(0)}% del presupuesto del mes`}
        >
          <span style={{ width: `${Math.min(simulation.budgetShare * 100, 100)}%` }} />
        </div>
        <p className="sim__budget-caption">
          {(simulation.budgetShare * 100).toFixed(0)}% del presupuesto del mes ({formatMoney(simulation.budgetMXN)})
        </p>
      </section>

      <section className={`sim__delta${simulation.flagged ? ' sim__delta--flagged' : ''}`}>
        {simulation.flagged ? <AlertIcon width={20} height={20} /> : <CheckCircleIcon width={20} height={20} />}
        <div>
          <p className="sim__delta-title">
            {formatSignedPercent(simulation.deltaPct)} vs. {simulation.previousPeriodLabel}
          </p>
          <p className="sim__delta-text">
            {simulation.flagged
              ? 'El salto supera el 15% habitual. Revisa el detalle antes de confirmar.'
              : 'La variación está dentro del rango habitual de la flota.'}
          </p>
        </div>
      </section>

      <section className="sim__detail">
        <button
          type="button"
          className="sim__detail-toggle"
          aria-expanded={detailOpen}
          onClick={() => setDetailOpen((value) => !value)}
        >
          <ChevronDownIcon width={16} height={16} className={detailOpen ? 'sim__chevron--open' : undefined} />
          Ver detalle de unidades
        </button>

        {detailOpen && (
          <table className="sim__table">
            <thead>
              <tr>
                <th scope="col">Placa</th>
                <th scope="col">Conductor</th>
                <th scope="col">Monto</th>
              </tr>
            </thead>
            <tbody>
              {simulation.sample.map((line) => (
                <tr key={line.plate}>
                  <td>{line.plate}</td>
                  <td>{line.driver}</td>
                  <td>{formatMoney(line.amountMXN, true)}</td>
                </tr>
              ))}
              <tr className="sim__table-rest">
                <td colSpan={3}>
                  y {formatCount(Math.max(simulation.unitsAffected - simulation.sample.length, 0))} unidades más con la
                  misma lógica de monto.
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    </Modal>
  );
}
