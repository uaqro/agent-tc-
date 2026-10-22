import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { vehicles } from '../../../data/dispersion';
import { StationExceptionDialog } from '../StationExceptionDialog';

vi.mock('../../ui/Modal', () => ({
  Modal: ({ children, footer }: { children: ReactNode; footer?: ReactNode }) =>
    createElement('div', null, children, footer),
}));

describe('StationExceptionDialog', () => {
  it('uses Flow Checkbox for the required confirmation', () => {
    const vehicle = vehicles[0]!;
    const html = renderToStaticMarkup(
      createElement(StationExceptionDialog, {
        request: {
          vehicleId: vehicle.id,
          cardLabel: 'Tarjeta •••• 1234',
          fromStation: 'Estación de origen',
          toStation: 'Estación recomendada',
          estimatedSavingMXN: 125,
        },
        vehicle,
        policy: null,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
      }),
    );

    expect(html).toContain('Confirmo que quiero permitir Estación recomendada');
    expect(html).toContain('El optimizador no aplica este cambio: lo aplico yo desde Límites.');
    expect(html).toContain('disabled=""');
    expect(html).toContain('class="AxPcdq_input"');
  });
});
