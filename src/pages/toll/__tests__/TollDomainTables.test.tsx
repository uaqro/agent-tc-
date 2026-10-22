import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { serviceOrders } from '../../../data/maintenance';
import { tollMovements, tollTags } from '../../../data/toll';
import { MaintenancePage } from '../../MaintenancePage';
import { TollBalancesPage } from '../TollBalancesPage';
import { TollRulesPage } from '../TollRulesPage';

const openOrders = serviceOrders.filter((order) => ['scheduled', 'in-shop', 'waiting-parts'].includes(order.status));
const assignedTags = tollTags.filter((tag) => tag.vehicleId !== null);

describe('Flow tables in toll and maintenance domains', () => {
  it('preserves assigned tag balances and the ten most recent movements', () => {
    const html = renderToStaticMarkup(createElement(TollBalancesPage, { onNotice: vi.fn() }));
    const tables = [...html.matchAll(/<table\b[\s\S]*?<\/table>/g)].map(([table]) => table);

    expect(tables).toHaveLength(2);
    expect(tables[0]).toContain('<caption data-sr-only="">Saldo por TAG</caption>');
    expect(tables[0].match(/<tr\b/g)).toHaveLength(assignedTags.length + 1);
    expect(tables[0]).toContain(tollTags.find((tag) => tag.vehicleId !== null)?.number);
    expect(tables[0]).toContain('Recargar');
    expect(tables[0]).toContain('Recortar');
    expect(html).toContain('data-control-shell=""');
    expect(html).toContain('min="0"');
    expect(html).toContain('step="100"');
    expect(html).toContain('data-disabled="true"');
    expect(tables[0]).not.toContain('data-sortable');
    expect(tables[1]).toContain('<caption data-sr-only="">Últimos movimientos</caption>');
    expect(tables[1].match(/<tr\b/g)).toHaveLength(Math.min(tollMovements.length, 10) + 1);
  });

  it('preserves policy assignment controls and usage data in the Flow table', () => {
    const html = renderToStaticMarkup(createElement(TollRulesPage, { onNotice: vi.fn() }));
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(table).toContain('<caption data-sr-only="">Asignación por TAG</caption>');
    expect(table?.match(/<tr\b/g)).toHaveLength(assignedTags.length + 1);
    const firstAssignedTag = assignedTags[0];
    const firstDataRow = table?.match(/<tbody\b[^>]*>[\s\S]*?<tr\b[^>]*>([\s\S]*?)<\/tr>/)?.[1];
    expect(firstDataRow).toMatch(
      new RegExp(`<td\\b[^>]*>[\\s\\S]*?id="toll-policy-${firstAssignedTag.id}-label"[\\s\\S]*?<\\/td>`),
    );
    expect(firstDataRow).toContain(`aria-labelledby="toll-policy-${firstAssignedTag.id}-label"`);
    expect(table).toContain('del límite usado');
    expect(table).not.toContain('data-sortable');
    expect(html).toContain('Nueva política');
    expect(html).toContain('Pausar');
  });

  it('keeps the open-order details and statuses in the Flow table', () => {
    const html = renderToStaticMarkup(createElement(MaintenancePage, { onNotice: vi.fn() }));
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(table).toContain('<caption data-sr-only="">Órdenes abiertas</caption>');
    expect(table?.match(/<tr\b/g)).toHaveLength(openOrders.length + 1);
    expect(table).toContain(openOrders[0].folio);
    expect(table).toContain(openOrders[0].workshop);
    expect(table).toContain('maintenance__data');
    expect(table).not.toContain('data-sortable');
    expect(html).toContain('Crear orden de servicio');
  });
});
