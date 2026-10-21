import { ChartLegend, FlowChart } from '@er-mobility-mx/design-system';
import type { ChartSeries } from '../../types';

interface BarChartProps {
  labels: string[];
  series: ChartSeries[];
  yMin: number;
  yMax: number;
  ariaLabel: string;
}

export function BarChart({ labels, series, yMin, yMax, ariaLabel }: BarChartProps) {
  return (
    <div>
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
          size="sm"
          width="fill"
          marks="fill"
        />
      )}
    </div>
  );
}
