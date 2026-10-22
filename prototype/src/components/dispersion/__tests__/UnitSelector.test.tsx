import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { vehicles } from '../../../data/dispersion';
import { UnitSelector } from '../UnitSelector';

describe('UnitSelector', () => {
  it('keeps the initial organization-node prompt and accessible Flow selector', () => {
    const firstVehicle = vehicles[0]!;
    const html = renderToStaticMarkup(
      createElement(UnitSelector, {
        vehicles,
        selected: [],
        onChange: vi.fn(),
      }),
    );

    expect(html).toContain('type="search"');
    expect(html).toContain('aria-label="Buscar unidad"');
    expect(html).toContain('placeholder="Placa, ECO-xxxx o conductor"');
    expect(html).toContain('class="unit-selector__flow-search"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-labelledby="unit-selector-node-label"');
    expect(html).toContain('Nodo del organigrama…');
    expect(html).toContain('Marcar sus 0 unidades');
    expect(html).toContain('class="AxPcdq_input"');
    expect(html).toContain('aria-describedby=');
    expect(html).toContain(firstVehicle.plate);
    expect(html).toContain(`${firstVehicle.id} · ${firstVehicle.driver}`);
    expect(html).not.toContain('<select');
  });
});
