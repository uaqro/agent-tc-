import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { drivers, paymentMedia, vehicleDetails } from '../../data/fleet';
import { PAGE_SIZE } from '../../components/ui/Pagination';
import { DriversPage } from '../DriversPage';
import { FuelMediaPanel } from '../fleet/FuelMediaPanel';
import { DevicesProvider } from '../../data/DevicesContext';
import { VehiclesPage } from '../VehiclesPage';

describe('Paginated catalogue Flow tables', () => {
  it('renders vehicle details in their original order without adding table behavior', () => {
    const html = renderToStaticMarkup(createElement(DevicesProvider, null, createElement(VehiclesPage, { onNotice: vi.fn() })));
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(table).toContain('<caption data-sr-only="">Vehículos</caption>');
    expect(table?.match(/<th\b/g)).toHaveLength(8);
    expect(table?.match(/<tr\b/g)).toHaveLength(Math.min(vehicleDetails.length, PAGE_SIZE) + 1);
    expect(table).toContain(vehicleDetails[0].plate);
    expect(table).toContain(vehicleDetails[0].vehicleId);
    expect(table).toContain('data-mono');
    expect(table).not.toContain('data-sortable');
    expect(table).not.toContain('type="checkbox"');
    expect(html).toContain('Buscar vehículo');
    expect(html).toContain('Filtrar por grupo');
    expect(html).toContain('Filtrar por estado');
    expect(html).toContain('Filtrar por ficha');
    expect(html).not.toContain('<select');
  });

  it('keeps driver actions and access-dependent controls in the Flow table', () => {
    const html = renderToStaticMarkup(createElement(DriversPage, { onNotice: vi.fn(), canEdit: true }));
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(table).toContain('<caption data-sr-only="">Conductores</caption>');
    expect(table?.match(/<th\b/g)).toHaveLength(8);
    expect(table?.match(/<tr\b/g)).toHaveLength(Math.min(drivers.length, PAGE_SIZE) + 1);
    expect(table).toContain(drivers[0].name);
    expect(table).toContain('Ver expediente');
    expect(table).toContain('Editar');
    expect(table).toContain('Dar de baja');
    expect(table).toContain('data-mono');
    expect(table).not.toContain('data-sortable');
    expect(html).toContain('Buscar conductor');
    expect(html).toContain('Filtrar por grupo');
    expect(html).not.toContain('<select');
  });

  it('keeps payment state and row actions while preserving the existing pager', () => {
    const html = renderToStaticMarkup(createElement(DevicesProvider, null, createElement(FuelMediaPanel, { onNotice: vi.fn() })));
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(table).toContain('<caption data-sr-only="">Medios de pago</caption>');
    expect(table?.match(/<th\b/g)).toHaveLength(6);
    expect(table?.match(/<tr\b/g)).toHaveLength(Math.min(paymentMedia.length, PAGE_SIZE) + 1);
    expect(table).toContain(paymentMedia[0].number);
    expect(table).toContain('Bloquear');
    expect(table).toContain('Desbloquear');
    expect(table).toContain('table-page__data');
    expect(table).not.toContain('data-sortable');
    expect(html).toContain('Páginas de medios');
    expect(html).toContain('Buscar medio de pago');
    expect(html).toContain('Filtrar por tipo');
    expect(html).toContain('Filtrar por estado');
  });
});
