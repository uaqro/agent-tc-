import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { QuickTopUp } from '../QuickTopUp';

describe('QuickTopUp', () => {
  it('keeps the combobox contract and custom amount constraints with Flow Input', () => {
    const vehicle = {
      id: 'vehicle-test',
      plate: 'ABC-123',
      device: 'device-test',
      driver: 'Conductor de prueba',
      group: 'Grupo de prueba',
      balanceMXN: 500,
      avgWeeklySpendMXN: 1_000,
    };
    const html = renderToStaticMarkup(
      createElement(QuickTopUp, {
        vehicles: [vehicle],
        availableMXN: 5_000,
        initialVehicle: vehicle,
        initialAmount: 1,
        onSend: () => {
          throw new Error('onSend must not run during render');
        },
        onViewReceipt: () => undefined,
      }),
    );

    expect(html).toContain('data-control-shell=""');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-autocomplete="list"');
    expect(html).toContain('type="number"');
    expect(html).toContain('min="1"');
    expect(html).toContain('step="50"');
    expect(html).toContain('placeholder="0"');
  });
});
