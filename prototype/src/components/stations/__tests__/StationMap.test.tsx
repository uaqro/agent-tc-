import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { StationMap } from '../StationMap';

vi.mock('leaflet', () => ({
  default: { divIcon: vi.fn(() => ({})) },
}));
vi.mock('leaflet-draw', () => ({}));
vi.mock('leaflet.markercluster', () => ({}));

describe('StationMap', () => {
  it('uses accessible Flow checkboxes for map filters', () => {
    const html = renderToStaticMarkup(
      createElement(StationMap, { onCreateNetwork: vi.fn() }),
    );

    expect(html).toContain('class="AxPcdq_input"');
    expect(html).toContain('Estado');
    expect(html).toContain('Ciudad / municipio');
    expect(html).toContain('Marca');
    expect(html).toContain('Combustible');
    expect(html).toContain('Aguascalientes');
  });
});
