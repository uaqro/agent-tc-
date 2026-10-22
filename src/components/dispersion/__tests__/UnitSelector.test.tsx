import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { vehicles } from '../../../data/dispersion';
import { UnitSelector } from '../UnitSelector';

describe('UnitSelector', () => {
  it('keeps the initial organization-node prompt and accessible Flow selector', () => {
    const html = renderToStaticMarkup(
      createElement(UnitSelector, {
        vehicles,
        selected: [],
        onChange: vi.fn(),
      }),
    );

    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-labelledby="unit-selector-node-label"');
    expect(html).toContain('Nodo del organigrama…');
    expect(html).toContain('Marcar sus 0 unidades');
    expect(html).not.toContain('<select');
  });
});
