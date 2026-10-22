import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { limitPolicies } from '../../../data/limits';
import { seedStationNetworks } from '../../../data/stationNetworks';
import { FuelPolicyProvider } from '../../../data/FuelPolicyContext';
import { PolicyDialog } from '../PolicyDialog';
import { ScheduleEditor } from '../ScheduleEditor';

vi.mock('../../ui/Modal', () => ({
  Modal: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));

describe('PolicyDialog', () => {
  it('renders accessible Flow time inputs for schedule ranges', () => {
    const html = renderToStaticMarkup(
      createElement(ScheduleEditor, {
        blocks: [{ days: [1], ranges: [{ from: '08:30', to: '17:45' }] }],
        onChange: () => undefined,
      }),
    );

    expect(html).toContain('type="time"');
    expect(html).toContain('aria-label="Horario 1 · rango 1 desde"');
    expect(html).toContain('aria-label="Horario 1 · rango 1 hasta"');
    expect(html).toContain('value="08:30"');
    expect(html).toContain('value="17:45"');
    expect(html).not.toContain('class="schedule__range"><input');
  });

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

    expect(html).toContain('<label for="policy-name">Nombre de la política</label>');
    expect(html).toContain('id="policy-name"');
    expect(html).toContain('placeholder="Ej. Reparto urbano"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-labelledby="policy-station-network-label"');
    expect(html).toContain('Red de estaciones configurada');
    expect(html).toContain('Corredor Norte');
    expect(html).toContain('class="AxPcdq_input"');
    expect(html).toContain('Solicitar la placa');
    expect(html).toContain('Validar rendimiento (km/L)');
    expect(html).toContain('El rendimiento esperado se toma de la configuración de cada vehículo.');
    expect(html).toContain('Restringir a una red de estaciones personalizada');
    expect(html).toContain('Limitar a la capacidad del tanque registrada en cada vehículo');
    expect(html).not.toContain('<select');
  });
});
