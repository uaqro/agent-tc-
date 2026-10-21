import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LineChart } from '../LineChart';

const controls = vi.hoisted(() => ({ capture: vi.fn(), expanded: false }));

vi.mock('@er-mobility-mx/design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@er-mobility-mx/design-system')>();
  return {
    ...actual,
    FlowChart: (props: ComponentProps<typeof actual.FlowChart>) => {
      controls.capture(props);
      return createElement('div', { 'data-flow-chart': true });
    },
    Accordion: (props: ComponentProps<typeof actual.Accordion>) =>
      createElement(actual.Accordion, { ...props, defaultExpanded: controls.expanded ? ['data'] : [] }),
  };
});

beforeEach(() => {
  controls.capture.mockClear();
  controls.expanded = false;
});

const series = [
  { name: 'Ticket Car+', color: 'var(--viz-1)', values: [10, 0, 30] },
  { name: 'Autoconsumo', color: 'var(--viz-2)', values: [20, null, 40], gapLabel: 'Sin datos de Autoconsumo' },
];
const props = { labels: ['Ene', 'Feb', 'Mar'], series, yMin: 0, yMax: 50, valueSuffix: ' L', ariaLabel: 'Consumo mensual' };

describe('LineChart Flow adapter', () => {
  it('passes the original observations, gaps, range and straight lines without an option override', () => {
    const html = renderToStaticMarkup(createElement(LineChart, props));
    const chart: ComponentProps<typeof import('@er-mobility-mx/design-system').FlowChart> =
      controls.capture.mock.lastCall![0];
    expect(chart).toMatchObject({
      type: 'line', min: 0, max: 50, smooth: false, gapLabel: 'Sin datos', ariaLabel: 'Consumo mensual',
      series: [
        { label: 'Ticket Car+', color: series[0].color, values: series[0].values },
        { label: 'Autoconsumo', color: series[1].color, values: series[1].values, gapLabel: series[1].gapLabel },
      ],
    });
    expect(chart.series?.[1].values).toBe(series[1].values);
    expect(chart.option).toBeUndefined();
    expect(chart.format?.(0)).toBe('0 L');
    expect(chart.axisFormat?.(2.25)).toBe('2.25');
    expect(html.match(/data-marcado="line"/g)).toHaveLength(2);
    expect(html).toContain('data-size="md"');
    expect(html).toContain('background-color:var(--viz-1)');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('<svg');
  });

  it('exposes exact values and missing-data causes in an expandable Flow table', () => {
    controls.expanded = true;
    const html = renderToStaticMarkup(createElement(LineChart, props));
    expect(html).toMatch(/<caption[^>]*>Consumo mensual<\/caption>/);
    expect(html).toContain('Ticket Car+');
    expect(html).toContain('Autoconsumo');
    expect(html).toContain('10 L');
    expect(html).toContain('0 L');
    expect(html).toContain('40 L');
    expect(html).toContain('Sin datos de Autoconsumo');
    expect(html).not.toContain('null L');
    expect(html.match(/<tr\b/g)).toHaveLength(4);
    expect(html).not.toContain('aria-sort');
    expect(html).not.toContain('thButton');
  });

  it('keeps tooltip and exact data units separate from numeric axis labels', () => {
    controls.expanded = true;
    const html = renderToStaticMarkup(createElement(LineChart, {
      ...props, series: [{ ...series[0], values: [2.25, 0, 3.1] }], valueSuffix: ' MXN/km',
    }));
    const chart = controls.capture.mock.lastCall![0] as ComponentProps<typeof import('@er-mobility-mx/design-system').FlowChart>;
    expect(chart.format?.(2.25)).toBe('2.25 MXN/km');
    expect(chart.axisFormat?.(2.25)).toBe('2.25');
    expect(html).toContain('2.25 MXN/km');
    expect(html).toContain('0 MXN/km');
  });

  it('handles empty and all-gap series without inventing numeric observations', () => {
    controls.expanded = true;
    const html = renderToStaticMarkup(createElement(LineChart, {
      ...props, series: [{ ...series[0], values: [null, null, null] }],
    }));
    expect(html.match(/>Sin datos</g)).toHaveLength(3);
    expect(html).not.toContain('0 L');
    const empty = renderToStaticMarkup(createElement(LineChart, { ...props, labels: [], series: [] }));
    expect(empty).not.toContain('data-marcado');
    expect(empty).not.toContain('undefined L');
  });
});
