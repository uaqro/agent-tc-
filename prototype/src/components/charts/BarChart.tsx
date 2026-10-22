import { ChartLegend, FlowChart, Stack } from '@er-mobility-mx/design-system';
import type { ChartSeries } from '../../types';
import { ChartDataTable } from './ChartDataTable';

interface BarChartProps {
  labels: string[];
  series: ChartSeries[];
  yMin: number;
  yMax: number;
  ariaLabel: string;
  categoryLabel?: string;
}

export function BarChart({ labels, series, yMin, yMax, ariaLabel, categoryLabel = 'Categoría' }: BarChartProps) {
  return (
    <Stack direction="column" gap="stack">
      <FlowChart
        type="bar"
        height={240}
        min={yMin}
        max={yMax}
        labels={labels}
        series={series.map(({ name, values, color }) => ({ label: name, values, color }))}
        ariaLabel={ariaLabel}
      />
      {series.length > 1 && (
        <ChartLegend
          items={series.map(({ name, color }) => ({ label: name, color }))}
          size="md"
          width="fill"
          marks="fill"
        />
      )}
      <ChartDataTable labels={labels} series={series} caption={ariaLabel} categoryLabel={categoryLabel} />
    </Stack>
  );
}
