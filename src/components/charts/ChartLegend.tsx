import type { GapSeries } from '../../types';

export function ChartLegend({ series }: { series: Pick<GapSeries, 'name' | 'color'>[] }) {
  if (series.length === 0) return null;

  return (
    <ul className="chart-legend">
      {series.map((item) => (
        <li className="chart-legend__item" key={item.name}>
          <span className="chart-legend__swatch" style={{ background: item.color }} />
          {item.name}
        </li>
      ))}
    </ul>
  );
}
