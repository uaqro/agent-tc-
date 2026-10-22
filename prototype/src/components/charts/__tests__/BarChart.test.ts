import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarChart } from '../BarChart';

const controls = vi.hoisted(() => ({ capture: vi.fn(), expanded: false }));

vi.mock('@er-mobility-mx/design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@er-mobility-mx/design-system')>();
  return {
    ...actual,
    FlowChart: (props: ComponentProps<typeof actual.FlowChart>) => {
      controls.capture(props);
      return createElement(actual.FlowChart, props);
    },
    Accordion: (props: ComponentProps<typeof actual.Accordion>) =>
      createElement(actual.Accordion, { ...props, defaultExpanded: controls.expanded ? ['data'] : [] }),
  };
});

beforeEach(() => {
  controls.capture.mockClear();
  controls.expanded = false;
});

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
    expect(html).toContain('data-size="md"');
    expect(html).toContain('background-color:var(--viz-accent)');
    expect(html).toContain('background-color:var(--viz-neutral)');
    expect(html.indexOf('Actual')).toBeLessThan(html.indexOf('Anterior'));
  });

  it('does not add a redundant legend for a single series', () => {
    const html = renderToStaticMarkup(createElement(BarChart, {
      labels: ['0–1 km'],
      series: [{ name: 'Ahorro bruto', color: 'var(--viz-positive)', values: [10] }],
      yMin: 0,
      yMax: 15,
      ariaLabel: 'Ahorro por distancia',
    }));
    expect(html).toContain('aria-label="Ahorro por distancia"');
    expect(html).not.toContain('data-marcado');
    expect(html).toContain('Ver datos de la gráfica');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('<table');
  });

  it('exposes the same observations in source order without sorting or selection', () => {
    controls.expanded = true;
    const series = [
      { name: 'Real', color: 'var(--viz-accent)', values: [1.2, 0, 1.4] },
      { name: 'Esperado', color: 'var(--viz-neutral)', values: [2.8, 2.8, 2.8] },
    ];
    const html = renderToStaticMarkup(createElement(BarChart, {
      labels: ['ZZZ-03', 'AAA-01', 'ZZZ-03'], series,
      yMin: 0, yMax: 5, ariaLabel: 'Rendimiento', categoryLabel: 'Vehículo',
    }));
    const chart = controls.capture.mock.lastCall![0] as ComponentProps<typeof import('@er-mobility-mx/design-system').FlowChart>;
    expect(chart.series?.[0].values).toBe(series[0].values);
    expect(chart.series?.[1].values).toBe(series[1].values);
    expect(chart.min).toBe(0);
    expect(chart.max).toBe(5);
    expect(chart.option).toBeUndefined();
    expect(html).toMatch(/<caption[^>]*>Rendimiento<\/caption>/);
    expect(html).toContain('Vehículo');
    expect(html).toContain('Real');
    expect(html).toContain('Esperado');
    expect(html).toContain('>1.2<');
    expect(html).toContain('>0<');
    expect(html).toContain('>2.8<');
    expect(html.match(/<tr\b/g)).toHaveLength(4);
    expect(html.match(/>ZZZ-03</g)).toHaveLength(2);
    expect(html.indexOf('>ZZZ-03<')).toBeLessThan(html.indexOf('>AAA-01<'));
    expect(html).not.toContain('aria-sort');
    expect(html).not.toContain('thButton');
    expect(html).not.toContain('type="checkbox"');
  });

  it('keeps negative values and a single series without a redundant legend', () => {
    controls.expanded = true;
    const html = renderToStaticMarkup(createElement(BarChart, {
      labels: ['0–1 km', '1–2 km'],
      series: [{ name: 'Ahorro neto', color: 'var(--viz-positive)', values: [-12, 150] }],
      yMin: -20, yMax: 200, ariaLabel: 'Ahorro por distancia', categoryLabel: 'Distancia de desvío',
    }));
    expect(html).toContain('Distancia de desvío');
    expect(html).toContain('>0–1 km<');
    expect(html).toContain('>-12<');
    expect(html).toContain('>150<');
    expect(html).not.toContain('data-marcado');
  });
});
