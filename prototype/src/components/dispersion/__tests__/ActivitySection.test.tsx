import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { fundingRules, pastReceipts } from '../../../data/dispersion';
import type { Receipt } from '../../../types/dispersion';
import { ActivitySection } from '../ActivitySection';

const scheduled = fundingRules.filter((rule) => rule.status !== 'paused');

const renderActivity = (activeTab: 'history' | 'scheduled', receipts = pastReceipts) =>
  renderToStaticMarkup(
    createElement(ActivitySection, {
      receipts,
      scheduled,
      activeTab,
      onTabChange: vi.fn(),
      onOpenReceipt: vi.fn(),
      onReviewPayment: vi.fn(),
      onRunPayment: vi.fn(),
    }),
  );

describe('ActivitySection Flow tables', () => {
  it('shows the six most recent receipts and retains the expand control', () => {
    const receipts: Receipt[] = Array.from({ length: 8 }, (_, index) => ({
      ...pastReceipts[index % pastReceipts.length],
      folio: `DIS-2026-10-${String(300 + index)}`,
      issuedAt: `2026-10-${String(20 - index).padStart(2, '0')}T08:00:00`,
      sourceLabel: `Receipt ${index}`,
    }));
    const html = renderActivity('history', receipts);
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(table).toContain('<caption data-sr-only="">Últimas dispersiones</caption>');
    expect(table?.match(/<tr\b/g)).toHaveLength(7);
    expect(table).toContain('Receipt 0');
    expect(table).toContain('Receipt 5');
    expect(table).not.toContain('Receipt 6');
    expect(html).toContain('Ver más dispersiones (8)');
    expect(table).toContain('Comprobante');
    expect(table).not.toContain('data-sortable');
  });

  it('renders the scheduled payment table with existing review and run actions', () => {
    const html = renderActivity('scheduled');
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(table).toContain('<caption data-sr-only="">Pagos programados</caption>');
    expect(table?.match(/<tr\b/g)).toHaveLength(scheduled.length + 1);
    expect(table).toContain(scheduled[0].name);
    expect(table).toContain('Revisar');
    expect(table).toContain('Ejecutar');
    expect(table).not.toContain('data-sortable');
  });

  it('preserves the empty history state instead of rendering an empty table', () => {
    const html = renderActivity('history', []);

    expect(html).toContain('Aún no hay dispersiones');
    expect(html).not.toContain('<table');
  });
});
