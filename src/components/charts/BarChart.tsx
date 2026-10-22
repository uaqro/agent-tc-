import { useState } from 'react';
import type { ChartSeries } from '../../types';
import {
  CHART_HEIGHT,
  CHART_WIDTH,
  PADDING,
  PLOT_HEIGHT,
  PLOT_WIDTH,
  bandX,
  buildTicks,
  formatTick,
  scaleY,
} from './geometry';
import { ChartLegend } from './ChartLegend';
import { ChartTooltip } from './ChartTooltip';
import './charts.css';

interface BarChartProps {
  labels: string[];
  series: ChartSeries[];
  yMin: number;
  yMax: number;
  tickCount?: number;
  ariaLabel: string;
}

const BAND_INSET = 0.26;

export function BarChart({ labels, series, yMin, yMax, tickCount = 4, ariaLabel }: BarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const ticks = buildTicks(yMin, yMax, tickCount);
  const band = PLOT_WIDTH / Math.max(labels.length, 1);
  const groupWidth = band * (1 - BAND_INSET * 2);
  const barWidth = groupWidth / Math.max(series.length, 1);
  const baseline = scaleY(yMin, yMin, yMax);

  return (
    <div>
      <svg
        className="chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="chart__grid-line"
              x1={PADDING.left}
              x2={CHART_WIDTH - PADDING.right}
              y1={scaleY(tick, yMin, yMax)}
              y2={scaleY(tick, yMin, yMax)}
            />
            <text
              className="chart__axis-text"
              x={PADDING.left - 10}
              y={scaleY(tick, yMin, yMax)}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatTick(tick)}
            </text>
          </g>
        ))}

        {labels.map((label, index) => (
          <g key={label} onPointerEnter={() => setActiveIndex(index)}>
            <rect
              x={PADDING.left + band * index}
              y={PADDING.top}
              width={band}
              height={PLOT_HEIGHT}
              fill="transparent"
            />
            <text
              className="chart__axis-text"
              x={bandX(index, labels.length)}
              y={PADDING.top + PLOT_HEIGHT + 20}
              textAnchor="middle"
            >
              {label}
            </text>
          </g>
        ))}

        {series.map((item, seriesIndex) =>
          item.values.map((value, index) => {
            const top = scaleY(Math.max(value, yMin), yMin, yMax);
            const x = bandX(index, labels.length) - groupWidth / 2 + barWidth * seriesIndex;
            return (
              <rect
                key={`${item.name}-${index}`}
                className={`chart__bar${activeIndex !== null && activeIndex !== index ? ' chart__bar--dimmed' : ''}`}
                x={x + 2}
                y={top}
                width={Math.max(barWidth - 4, 2)}
                height={Math.max(baseline - top, 0)}
                style={{ fill: item.color }}
                pointerEvents="none"
              />
            );
          }),
        )}

        {activeIndex !== null && (
          <ChartTooltip
            x={bandX(activeIndex, labels.length)}
            y={PADDING.top + 6}
            title={labels[activeIndex]}
            rows={series.map((item) => ({
              color: item.color,
              label: item.name,
              value: String(item.values[activeIndex]),
            }))}
          />
        )}
      </svg>
      <ChartLegend series={series} />
    </div>
  );
}
