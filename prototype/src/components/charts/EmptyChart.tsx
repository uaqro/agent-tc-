import { EmptyState } from '@er-mobility-mx/design-system';

interface EmptyChartProps {
  title?: string;
  hint: string;
}

export function EmptyChart({ title = 'Sin datos disponibles', hint }: EmptyChartProps) {
  return (
    <EmptyState icon="bar_chart" title={title} description={hint} />
  );
}
