import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChartCard } from '../ChartCard';
import { EmptyChart } from '../../charts/EmptyChart';
import { LineChartSkeleton } from '../../charts/LineChart';
import { CHART_HEIGHT, CHART_WIDTH } from '../../charts/geometry';

describe('Flow chart composition', () => {
  it('keeps the chart title, context and named actions in the Flow frame', () => {
    const html = renderToStaticMarkup(createElement(ChartCard, {
      title: 'Costo por kilómetro',
      subtitle: 'Empresa · últimos 30 días',
      info: 'Importe entre kilómetros recorridos.',
      badge: createElement('span', null, 'API'),
      children: createElement('div', null, 'Datos del periodo'),
    }));

    expect(html).toContain('aria-label="Costo por kilómetro"');
    expect(html).toMatch(/<h2[^>]*>Costo por kilómetro<\/h2>/);
    expect(html).toContain('Empresa · últimos 30 días');
    expect(html).toContain('aria-label="Más información sobre Costo por kilómetro"');
    expect(html).toContain('aria-label="Más opciones de Costo por kilómetro"');
    expect(html).toContain('API');
    expect(html).toContain('Datos del periodo');
    expect(html).not.toContain('width:30px');
    expect(html).not.toContain('chart-card__');
  });

  it('reserves the line plot aspect ratio without announcing an empty chart', () => {
    const html = renderToStaticMarkup(createElement('div', { 'aria-busy': true },
      createElement(ChartCard, {
        title: 'Consumo mensual',
        info: 'Doce meses completos.',
        children: createElement(LineChartSkeleton),
      }),
    ));

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(`aspect-ratio:${CHART_WIDTH} / ${CHART_HEIGHT}`);
    expect(html).toContain('height:auto');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('Sin datos');
  });

  it('keeps the business reason in the Flow empty state', () => {
    const html = renderToStaticMarkup(createElement(EmptyChart, {
      title: 'Sin datos disponibles',
      hint: 'Monterrey no tiene niveles por debajo: es el último nivel del organigrama.',
    }));

    expect(html).toContain('Sin datos disponibles');
    expect(html).toContain('Monterrey no tiene niveles por debajo: es el último nivel del organigrama.');
    expect(html).toContain('bar_chart');
    expect(html).not.toContain('chart-empty');
  });
});
