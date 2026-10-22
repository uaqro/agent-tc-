import { Accordion, Button, DetailRow, Table, type GridColumn } from '@er-mobility-mx/design-system';
import type { CSSProperties } from 'react';
import type { RunSimulation } from '../../types/dispersion';
import { Modal } from '../ui/Modal';
import { AlertIcon, CheckCircleIcon } from '../icons/Icons';
import { formatCount, formatDateLong, formatLiters, formatMoney, formatSignedPercent } from '../../utils/format';
import './SimulationDialog.css';

const budgetRowStyle: CSSProperties = {
  alignItems: 'center',
  padding: '3px 0',
};

interface SimulationDialogProps {
  open: boolean;
  mode: 'review' | 'run';
  simulation: RunSimulation | null;
  onClose: () => void;
  onConfirm: (simulation: RunSimulation) => void;
}

export function SimulationDialog({ open, mode, simulation, onClose, onConfirm }: SimulationDialogProps) {
  if (!simulation) return null;

  const { rule } = simulation;
  const confirmLabel = mode === 'review' ? 'Aprobar corrida' : 'Confirmar y ejecutar';
  const sampleColumns: GridColumn<(typeof simulation.sample)[number]>[] = [
    { key: 'plate', label: 'Placa' },
    { key: 'driver', label: 'Conductor' },
    { key: 'amount', label: 'Monto', align: 'right', render: (line) => formatMoney(line.amountMXN, true) },
  ];

  return (
    <Modal
      open={open}
      size="lg"
      title={mode === 'review' ? 'Simulación de la corrida programada' : 'Confirmar corrida'}
      subtitle={`${rule.name} · ${rule.nextRun ? `programada para el ${formatDateLong(rule.nextRun)}` : 'ejecución inmediata'}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(simulation)}>
            {confirmLabel}
          </Button>
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
        <DetailRow
          label="Disponible antes"
          value={<strong>{formatMoney(simulation.availableBeforeMXN)}</strong>}
          style={budgetRowStyle}
        />
        <DetailRow
          label="Esta corrida"
          value={<strong style={{ color: '#b4001a' }}>− {formatMoney(simulation.totalMXN)}</strong>}
          style={budgetRowStyle}
        />
        <DetailRow
          label="Disponible final"
          value={<strong style={{ fontSize: 15 }}>{formatMoney(simulation.availableAfterMXN)}</strong>}
          style={{
            ...budgetRowStyle,
            marginTop: 6,
            paddingTop: 8,
            borderTop: '1px solid var(--tc-local-border-subtle)',
          }}
        />

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
        <Accordion
          items={[
            {
              id: 'unit-details',
              title: 'Ver detalle de unidades',
              content: (
                <div className="sim__table">
                  <Table
                    caption="Muestra de unidades de la corrida"
                    columns={sampleColumns}
                    rows={simulation.sample}
                    rowKey="plate"
                    surface="none"
                    sortable={false}
                    density="compact"
                  />
                  <p className="sim__table-rest">
                    y {formatCount(Math.max(simulation.unitsAffected - simulation.sample.length, 0))} unidades más con la
                    misma lógica de monto.
                  </p>
                </div>
              ),
            },
          ]}
        />
      </section>
    </Modal>
  );
}
