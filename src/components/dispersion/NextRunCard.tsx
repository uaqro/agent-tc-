import type { FundingRule } from '../../types/dispersion';
import { toLiters } from '../../data/dispersion';
import { CalendarIcon, CheckCircleIcon, EyeIcon, PauseIcon, PlayIcon } from '../icons/Icons';
import { daysUntil, formatCount, formatDateLong, formatLiters, formatMoney } from '../../utils/format';
import './NextRunCard.css';

interface NextRunCardProps {
  rule: FundingRule | null;
  onReview: (rule: FundingRule) => void;
  onRunNow: (rule: FundingRule) => void;
  onPause: (rule: FundingRule) => void;
}

function scheduleText(rule: FundingRule): string {
  if (!rule.nextRun) return 'Se ejecuta de forma automática al detectar el umbral';
  const days = daysUntil(rule.nextRun);
  const when = formatDateLong(rule.nextRun);
  if (days <= 0) return `Se ejecuta hoy, ${when}`;
  if (days === 1) return `Se ejecuta mañana, ${when}`;
  return `Se ejecuta el ${when} · en ${days} días`;
}

export function NextRunCard({ rule, onReview, onRunNow, onPause }: NextRunCardProps) {
  if (!rule) {
    return (
      <section className="next-run next-run--empty">
        <h2 className="next-run__title">No hay dispersiones programadas</h2>
        <p className="next-run__empty-text">
          Todas las reglas están pausadas. Activa una regla para que el fondeo se ejecute solo.
        </p>
      </section>
    );
  }

  return (
    <section className="next-run" aria-labelledby="next-run-title">
      <div className="next-run__main">
        <p className="next-run__eyebrow">
          <CalendarIcon width={15} height={15} />
          Próxima dispersión recurrente
        </p>

        <h2 className="next-run__title" id="next-run-title">
          {scheduleText(rule)}
        </h2>

        <p className="next-run__rule">
          {rule.name} · {rule.summary}
        </p>

        <dl className="next-run__figures">
          <div>
            <dt>Unidades</dt>
            <dd>{formatCount(rule.units - rule.excludedUnits)}</dd>
          </div>
          <div>
            <dt>Monto proyectado</dt>
            <dd>{formatMoney(rule.projectedMXN)}</dd>
          </div>
          <div>
            <dt>Equivalente</dt>
            <dd>{formatLiters(toLiters(rule.projectedMXN))}</dd>
          </div>
        </dl>

        {rule.approved && (
          <p className="next-run__approved">
            <CheckCircleIcon width={16} height={16} />
            Corrida aprobada. Se ejecuta sin intervención adicional.
          </p>
        )}
      </div>

      <div className="next-run__actions">
        <button type="button" className="btn btn--light" onClick={() => onReview(rule)}>
          <EyeIcon width={17} height={17} />
          Revisar antes de que se ejecute
        </button>
        <button type="button" className="btn btn--on-dark" onClick={() => onRunNow(rule)}>
          <PlayIcon width={15} height={15} />
          Ejecutar ahora
        </button>
        <button type="button" className="btn btn--on-dark" onClick={() => onPause(rule)}>
          <PauseIcon width={15} height={15} />
          Pausar
        </button>
      </div>
    </section>
  );
}
