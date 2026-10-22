import { createElement } from 'react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { buildSimulation, fundingRules, pastReceipts } from '../../../data/dispersion';
import { networkStations, seedStationNetworks } from '../../../data/stationNetworks';
import { ReceiptDialog } from '../ReceiptDialog';
import { SimulationDialog } from '../SimulationDialog';
import { StationNetworkDialog } from '../../limits/StationNetworkDialog';

vi.mock('@er-mobility-mx/design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@er-mobility-mx/design-system')>();
  return {
    ...actual,
    OverlayShell: ({ children, open }: { children: ReactNode; open: boolean }) => (open ? children : null),
    Accordion: ({ items }: { items: { id: string; title: string; content: ReactNode }[] }) =>
      createElement('div', null, ...items.map(({ content }) => content)),
  };
});

describe('Flow tables in dialogs', () => {
  it('preserves receipt lines and actions in the receipt dialog', () => {
    const html = renderToStaticMarkup(
      createElement(ReceiptDialog, {
        open: true,
        receipt: pastReceipts[1],
        onClose: vi.fn(),
        onShare: vi.fn(),
      }),
    );
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(table).toContain('<caption data-sr-only="">Unidades incluidas en el comprobante</caption>');
    expect(table?.match(/<tr\b/g)).toHaveLength(pastReceipts[1].lines.length + 1);
    expect(table).toContain(pastReceipts[1].lines[0].plate);
    expect(html).toContain('Descargar comprobante');
  });

  it('retains the simulation sample and the count of remaining units', () => {
    const simulation = {
      ...buildSimulation(fundingRules[0]),
      unitsAffected: 8,
      sample: pastReceipts[1].lines,
    };
    const html = renderToStaticMarkup(
      createElement(SimulationDialog, {
        open: true,
        mode: 'review',
        simulation,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
      }),
    );
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(table).toContain('<caption data-sr-only="">Muestra de unidades de la corrida</caption>');
    expect(table?.match(/<tr\b/g)).toHaveLength(simulation.sample.length + 1);
    expect(table).toContain(simulation.sample[0].plate);
    expect(html).toContain(`y ${simulation.unitsAffected - simulation.sample.length} unidades más`);
    expect(html).toContain('Aprobar corrida');
  });

  it('preserves the station editor page size and selected state', () => {
    const html = renderToStaticMarkup(
      createElement(StationNetworkDialog, {
        network: seedStationNetworks[0],
        networks: seedStationNetworks,
        onClose: vi.fn(),
        onSave: vi.fn(() => null),
      }),
    );
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(table).toContain('<caption data-sr-only="">Estaciones disponibles para la red</caption>');
    expect(table?.match(/<tr\b/g)).toHaveLength(11);
    expect(table).toContain(networkStations[0].id);
    expect(table).toContain('checked=""');
    expect(html).toContain('1–10 de 7,500');
    expect(table).toContain('aria-label="Seleccionar ES-00001 · Pemex Álvaro Obregón 01"');
    expect(html).toContain('Seleccionar todas las filtradas');
    expect(html).toContain('aria-label="Seleccionar todas las estaciones filtradas (7500)"');
    expect(html).toContain('Solo seleccionadas');
    expect(html).toContain('aria-labelledby="estaciones-page-size-label"');
    expect(html).toContain('aria-labelledby="station-state-filter-label"');
    expect(html).toContain('aria-labelledby="station-city-filter-label"');
    expect(html).toContain('aria-labelledby="station-brand-filter-label"');
    expect(html).toContain('>Filtrar por estado</span>');
    expect(html).toContain('>Filtrar por ciudad o municipio</span>');
    expect(html).toContain('>Filtrar por marca</span>');
    expect(html).toContain('aria-label="Buscar estaciones"');
    expect(html).toContain('placeholder="Nombre, ID o ubicación"');
    expect(html).toContain('class="table-page__flow-search network-editor__flow-search"');
    expect(html).not.toContain('<select');
    expect(html).toContain('Permitidas');
    expect(html).toContain('No permitidas');
    expect(html.match(/name="network-mode"[^>]*checked=""/g)).toHaveLength(1);
  });
});
