import { NoDataIcon } from '../icons/Icons';
import './charts.css';

interface EmptyChartProps {
  title?: string;
  hint: string;
  axisCaption?: string;
}

export function EmptyChart({ title = 'Sin datos disponibles', hint, axisCaption }: EmptyChartProps) {
  return (
    <div className="chart-empty">
      <NoDataIcon />
      <p className="chart-empty__title">{title}</p>
      <p className="chart-empty__hint">{hint}</p>
      {axisCaption && <p className="chart-empty__axis">{axisCaption}</p>}
    </div>
  );
}
