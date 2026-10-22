import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConsolidatedReportPanel } from '../ConsolidatedReportPanel';

describe('ConsolidatedReportPanel', () => {
  it('renders report selectors as accessible Flow controls', () => {
    const html = renderToStaticMarkup(createElement(ConsolidatedReportPanel));

    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-labelledby="consolidated-report-type-label"');
    expect(html).toContain('aria-labelledby="consolidated-report-scope-label"');
    expect(html).toContain('aria-labelledby="consolidated-report-period-label"');
    expect(html).toContain('aria-describedby="consolidated-report-type-description"');
    expect(html).toContain('aria-labelledby="consolidated-report-from-label"');
    expect(html).toContain('aria-labelledby="consolidated-report-to-label"');
    expect(html).toContain('Rango de fechas');
    expect(html).not.toContain('<select');
    expect(html).not.toContain('type="date"');
    expect(html).toContain('Desde');
    expect(html).toContain('Hasta');
  });
});
