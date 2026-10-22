import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GlobalFilterBar } from '../GlobalFilterBar';
import { GlobalFiltersProvider } from '../GlobalFilters';
import { SessionProvider } from '../../session/Session';

describe('GlobalFilterBar', () => {
  it('renders the primary filters as accessible Flow selectors', () => {
    const html = renderToStaticMarkup(
      createElement(
        SessionProvider,
        null,
        createElement(
          GlobalFiltersProvider,
          null,
          createElement(GlobalFilterBar, {
            scopeNote: 'Los filtros afectan los indicadores y gráficas.',
          }),
        ),
      ),
    );

    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-labelledby="global-filter-org-label"');
    expect(html).toContain('aria-labelledby="global-filter-product-label"');
    expect(html).toContain('aria-labelledby="global-filter-group-label"');
    expect(html).toContain('data-control-shell=""');
    expect(html).toContain('min="1"');
    expect(html).toContain('max="90"');
    expect(html).toContain('Toda la empresa');
    expect(html).not.toContain('<select');
  });
});
