import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { limitPolicies } from '../../../data/limits';
import { seedStationNetworks } from '../../../data/stationNetworks';
import { FuelPolicyProvider } from '../../../data/FuelPolicyContext';
import { PolicyDialog } from '../PolicyDialog';

vi.mock('../../ui/Modal', () => ({
  Modal: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));

describe('PolicyDialog', () => {
  it('renders the configured station-network selector with an accessible label', () => {
    const policy = { ...limitPolicies[0]!, stationSubnetId: seedStationNetworks[0]!.id };
    const html = renderToStaticMarkup(
      createElement(
        FuelPolicyProvider,
        null,
        createElement(PolicyDialog, {
          policy,
          policies: [policy],
          onClose: () => undefined,
          onSave: () => undefined,
        }),
      ),
    );

    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-labelledby="policy-station-network-label"');
    expect(html).toContain('Red de estaciones configurada');
    expect(html).toContain('Corredor Norte');
    expect(html).not.toContain('<select');
  });
});
