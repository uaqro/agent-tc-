import type { SummaryMetric } from '../../types';
import { FuelIcon, TrendDownIcon, TrendUpIcon } from '../icons/Icons';
import './SummaryCard.css';

const numberFormat = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

function formatDelta(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function SummaryCard({ metric }: { metric: SummaryMetric }) {
  const delta = formatDelta(metric.currentMonth, metric.previousMonth);
  const rising = delta >= 0;
  const favourable = metric.higherIsBetter ? rising : !rising;
  const TrendIcon = rising ? TrendUpIcon : TrendDownIcon;
  const hasCurrent = metric.currentMonth !== 0;
  const hasPrevious = metric.previousMonth !== 0;

  return (
    <article className={`summary-card summary-card--${metric.accent}`}>
      <header className="summary-card__head">
        <h3 className="summary-card__title">{metric.title}</h3>
        <FuelIcon width={18} height={18} />
      </header>

      <p className="summary-card__value">
        {numberFormat.format(metric.currentMonth)}
        <span className="summary-card__unit">{metric.unit}</span>
      </p>
      <p className="summary-card__caption">{hasCurrent ? 'Mes actual' : 'Sin registros este mes'}</p>

      <footer className="summary-card__footer">
        <span className="summary-card__previous">
          Mes anterior{' '}
          <strong>{hasPrevious ? `${numberFormat.format(metric.previousMonth)} ${metric.unit}` : 'sin registros'}</strong>
        </span>
        {hasPrevious ? (
          <span className={`summary-card__delta${favourable ? '' : ' summary-card__delta--warn'}`}>
            <TrendIcon width={14} height={14} />
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : (
          <span className="summary-card__delta">Sin comparativo</span>
        )}
      </footer>
    </article>
  );
}
