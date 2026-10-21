import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { invoices, IVA_RATE } from '../../../data/company';
import { formatMoney } from '../../../utils/format';
import { InvoicesPage } from '../InvoicesPage';

describe('Invoices Flow table pilot', () => {
  it('keeps all invoice data and selection without sorting or row download actions', () => {
    const html = renderToStaticMarkup(createElement(InvoicesPage, { onNotice: () => {} }));
    expect(html).toContain('Facturas emitidas</caption>');
    expect(html.match(/<th\b/g)).toHaveLength(7);
    expect(html.match(/<tr\b/g)).toHaveLength(invoices.length + 1);
    expect(html).not.toContain('data-sortable');
    expect(html).not.toContain('Descargar todas');
    expect(html.match(/type="checkbox"/g)).toHaveLength(invoices.length + 1);
    expect(html).toContain('class="invoices-page__search"');
    expect(html).not.toContain('table-page__');
    expect(html.match(/type="search"/g)).toHaveLength(1);
    expect(html.match(/data-size="md"/g)).toHaveLength(4);
    expect(html).not.toContain('data-size="sm"');
    expect(html).not.toContain('aria-label="Limpiar"');
    expect(html).toContain('aria-label="Filtros de facturas"');
    expect(html.indexOf('aria-label="Filtros de facturas"')).toBeLessThan(
      html.indexOf('aria-label="Listado de facturas"'),
    );
    expect(html).not.toContain('Descargas</th>');
    expect(html).not.toContain('>PDF</button>');
    expect(html).not.toContain('>XML</button>');
    for (const invoice of invoices) {
      expect(html).toContain(invoice.folio);
      expect(html).toContain(invoice.uuid);
      const total = Math.round(invoice.subtotalMXN * (1 + IVA_RATE) * 100) / 100;
      expect(html).toContain(formatMoney(total, true));
    }
  });

  it('preserves the complete-account summary and due dates independently of the table', () => {
    const html = renderToStaticMarkup(createElement(InvoicesPage, { onNotice: () => {} }));
    const total = (subtotal: number) => Math.round(subtotal * (1 + IVA_RATE) * 100) / 100;
    const month = invoices
      .filter((invoice) => invoice.issued.startsWith('2026-10') && invoice.status !== 'cancelled')
      .reduce((sum, invoice) => sum + total(invoice.subtotalMXN), 0);
    const sumByStatus = (status: string) => invoices
      .filter((invoice) => invoice.status === status)
      .reduce((sum, invoice) => sum + total(invoice.subtotalMXN), 0);
    const summary = html.match(/<dl\b[^>]*>([\s\S]*?)<\/dl>/)?.[1];

    expect(summary).toBeDefined();
    expect(summary?.match(/<dt>/g)).toHaveLength(4);
    expect(summary?.match(/<dd\b/g)).toHaveLength(4);
    expect(summary).toContain(formatMoney(month));
    expect(summary).toContain(formatMoney(sumByStatus('pending')));
    expect(summary).toContain(formatMoney(sumByStatus('overdue')));
    expect(summary).toContain(`<dd>${invoices.length}</dd>`);
    for (const invoice of invoices) {
      expect(html).toContain(`dateTime="${invoice.issued}"`);
      if (invoice.status !== 'cancelled' && invoice.status !== 'paid') {
        expect(html).toContain(`dateTime="${invoice.due}"`);
      }
    }
  });

  it('separates identifiers and amounts from text metadata without losing subtotal or IVA', () => {
    const html = renderToStaticMarkup(createElement(InvoicesPage, { onNotice: () => {} }));
    expect(html.match(/class="invoices-page__identifier"/g)).toHaveLength(invoices.length);
    expect(html.match(/class="invoices-page__amount"/g)).toHaveLength(invoices.length);
    for (const invoice of invoices) {
      expect(html).toContain(`<span class="invoices-page__identifier">${invoice.folio}</span>`);
      expect(html).toContain(`<span class="invoices-page__data-detail">${invoice.uuid}…</span>`);
      expect(html).toContain(`<span class="invoices-page__data-detail">${formatMoney(invoice.subtotalMXN, true)}</span>`);
      const iva = Math.round(invoice.subtotalMXN * IVA_RATE * 100) / 100;
      expect(html).toContain(`<span class="invoices-page__data-detail">${formatMoney(iva, true)}</span>`);
    }
    expect(html).toContain('overflow-x:auto');
  });
});
