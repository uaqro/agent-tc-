import { ChartLegend, FlowChart, Skeleton, Stack } from '@er-mobility-mx/design-system';
import type { GapSeries } from '../../types';
import { CHART_HEIGHT, CHART_WIDTH, formatTick } from './geometry';
import { ChartDataTable } from './ChartDataTable';

interface LineChartProps {
  labels: string[];
  series: GapSeries[];
  yMin: number;
  yMax: number;
  valueSuffix?: string;
  ariaLabel: string;
}

const plotStyle = { height: 'auto', aspectRatio: `${CHART_WIDTH} / ${CHART_HEIGHT}`, minHeight: 240 };

export function LineChartSkeleton() {
  return (
    <Stack direction="column" gap="inline">
      <Skeleton variant="card" height="auto" style={plotStyle} />
      <Skeleton width="40%" />
    </Stack>
  );
}

export function LineChart({
  labels,
  series,
  yMin,
  yMax,
  valueSuffix = '',
  ariaLabel,
}: LineChartProps) {
  const formatValue = (value: number) => `${value}${valueSuffix}`;
  const chartSeries = series.map(({ name, ...item }) => ({ label: name, ...item }));

  return (
    <Stack direction="column" gap="stack">
      <FlowChart
        type="line"
        height={CHART_HEIGHT}
        style={plotStyle}
        labels={labels}
        series={chartSeries}
        min={yMin}
        max={yMax}
        smooth={false}
        format={formatValue}
        axisFormat={formatTick}
        gapLabel="Sin datos"
        ariaLabel={ariaLabel}
      />
      <ChartLegend
        items={chartSeries.map(({ label, color }) => ({ label, color }))}
        size="md"
        width="fill"
        marks="line"
      />
      <ChartDataTable labels={labels} series={series} caption={ariaLabel} categoryLabel="Periodo" valueSuffix={valueSuffix} />
    </Stack>
  );
}
