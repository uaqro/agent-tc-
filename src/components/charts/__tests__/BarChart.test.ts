import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BarChart } from '../BarChart';

describe('BarChart legend', () => {
  it('keeps series order, semantic colors and non-color fill marks', () => {
    const html = renderToStaticMarkup(createElement(BarChart, {
      labels: ['Octubre'],
      series: [
        { name: 'Actual', color: 'var(--viz-accent)', values: [10] },
        { name: 'Anterior', color: 'var(--viz-neutral)', values: [8] },
      ],
      yMin: 0,
      yMax: 15,
      ariaLabel: 'Consumo actual contra anterior',
    }));
    expect(html).toContain('aria-label="Consumo actual contra anterior"');
    expect(html.match(/data-marcado="fill"/g)).toHaveLength(2);
    expect(html).toContain('background-color:var(--viz-accent)');
    expect(html).toContain('background-color:var(--viz-neutral)');
    expect(html.indexOf('Actual')).toBeLessThan(html.indexOf('Anterior'));
  });
});
