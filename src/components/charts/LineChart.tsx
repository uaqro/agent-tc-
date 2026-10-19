import { useRef, useState } from 'react';
import type { ChartSeries } from '../../types';
import {
  CHART_HEIGHT,
  CHART_WIDTH,
  PADDING,
  PLOT_HEIGHT,
  buildTicks,
  formatTick,
  scaleX,
  scaleY,
} from './geometry';
import { ChartLegend } from './ChartLegend';
import { ChartTooltip } from './ChartTooltip';
import './charts.css';

interface LineChartProps {
  labels: string[];
  series: ChartSeries[];
  yMin: number;
  yMax: number;
  tickCount?: number;
  valueSuffix?: string;
  ariaLabel: string;
}

export function LineChart({
  labels,
  series,
  yMin,
  yMax,
  tickCount = 5,
  valueSuffix = '',
  ariaLabel,
}: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const ticks = buildTicks(yMin, yMax, tickCount);

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * CHART_WIDTH;
    const step = (CHART_WIDTH - PADDING.left - PADDING.right) / Math.max(labels.length - 1, 1);
    const index = Math.round((x - PADDING.left) / step);
    setActiveIndex(Math.min(Math.max(index, 0), labels.length - 1));
  };

  return (
    <div>
      <svg
        ref={svgRef}
        className="chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={handlePointer}
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
          <text
            key={label}
            className="chart__axis-text"
            x={scaleX(index, labels.length)}
            y={PADDING.top + PLOT_HEIGHT + 20}
            textAnchor="middle"
          >
            {label}
          </text>
        ))}

        {activeIndex !== null && (
          <line
            className="chart__guide"
            x1={scaleX(activeIndex, labels.length)}
            x2={scaleX(activeIndex, labels.length)}
            y1={PADDING.top}
            y2={PADDING.top + PLOT_HEIGHT}
          />
        )}

        {series.map((item) => (
          <polyline
            key={item.name}
            className="chart__line"
            stroke={item.color}
            points={item.values
              .map((value, index) => `${scaleX(index, labels.length)},${scaleY(value, yMin, yMax)}`)
              .join(' ')}
          />
        ))}

        {series.map((item) =>
          item.values.map((value, index) => (
            <circle
              key={`${item.name}-${index}`}
              className="chart__dot"
              cx={scaleX(index, labels.length)}
              cy={scaleY(value, yMin, yMax)}
              r={activeIndex === index ? 5.5 : 3.5}
              fill={item.color}
            />
          )),
        )}

        {activeIndex !== null && (
          <ChartTooltip
            x={scaleX(activeIndex, labels.length)}
            y={PADDING.top + 8}
            title={labels[activeIndex]}
            rows={series.map((item) => ({
              color: item.color,
              label: item.name,
              value: `${item.values[activeIndex]}${valueSuffix}`,
            }))}
          />
        )}
      </svg>
      <ChartLegend series={series} />
    </div>
  );
}
