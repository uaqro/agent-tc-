import { CHART_WIDTH, PADDING } from './geometry';

interface TooltipRow {
  color: string;
  label: string;
  value: string;
}

interface ChartTooltipProps {
  x: number;
  y: number;
  title: string;
  rows: TooltipRow[];
}

const CHAR_WIDTH = 6.1;
const ROW_HEIGHT = 16;

export function ChartTooltip({ x, y, title, rows }: ChartTooltipProps) {
  const longest = Math.max(title.length, ...rows.map((row) => row.label.length + row.value.length + 3));
  const width = Math.max(96, longest * CHAR_WIDTH + 34);
  const height = 24 + rows.length * ROW_HEIGHT;
  const flip = x + width + 16 > CHART_WIDTH - PADDING.right;
  const boxX = flip ? x - width - 12 : x + 12;

  return (
    <g pointerEvents="none">
      <rect className="chart__tooltip-box" x={boxX} y={y} width={width} height={height} />
      <text className="chart__tooltip-text chart__tooltip-text--title" x={boxX + 10} y={y + 16}>
        {title}
      </text>
      {rows.map((row, index) => (
        <g key={row.label}>
          <circle cx={boxX + 14} cy={y + 28 + index * ROW_HEIGHT} r={3.5} fill={row.color} />
          <text className="chart__tooltip-text" x={boxX + 24} y={y + 32 + index * ROW_HEIGHT}>
            {row.label}: {row.value}
          </text>
        </g>
      ))}
    </g>
  );
}
