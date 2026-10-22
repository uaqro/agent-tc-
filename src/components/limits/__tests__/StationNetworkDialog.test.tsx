import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { seedStationNetworks } from '../../../data/stationNetworks';
import { StationNetworkDialog } from '../StationNetworkDialog';

vi.mock('../../ui/Modal', () => ({
  Modal: ({ children, footer }: { children: ReactNode; footer?: ReactNode }) =>
    createElement('div', null, children, footer),
}));

describe('StationNetworkDialog', () => {
  it('uses Flow Input for the network name and keeps the character counter', () => {
    const network = seedStationNetworks[0]!;
    const html = renderToStaticMarkup(
      createElement(StationNetworkDialog, {
        network,
        networks: [network],
        onClose: vi.fn(),
        onSave: vi.fn(() => null),
      }),
    );

    expect(html).toContain('<label for="station-network-name">Nombre de la red');
    expect(html).toContain('id="station-network-name"');
    expect(html).toContain('placeholder="Ej. Red de estaciones Bajío"');
    expect(html).toContain(`${network.name.length}/50`);
    expect(html).toContain('class="AxPcdq_input"');
    expect(html).not.toContain('maxlength="50"');
  });
});
