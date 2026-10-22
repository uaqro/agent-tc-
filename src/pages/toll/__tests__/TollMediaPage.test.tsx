import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { tollTags } from '../../../data/toll';
import { TollMediaPage } from '../TollMediaPage';

describe('TollMediaPage Flow table', () => {
  it('preserves TAG rows, status actions, and filter names in the Flow table', () => {
    const html = renderToStaticMarkup(createElement(TollMediaPage, { onNotice: vi.fn() }));
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(table).toContain('<caption data-sr-only="">TAGs de telepeaje</caption>');
    expect(table?.match(/<th\b/g)).toHaveLength(7);
    expect(table?.match(/<tr\b/g)).toHaveLength(tollTags.length + 1);
    expect(table).toContain(tollTags[0].number);
    expect(table).toContain('Bloquear');
    expect(table).toContain('Desbloquear');
    expect(table).toContain('Asignar');
    expect(table).toContain('Reportar robo o daño');
    expect(table).toContain('table-page__data');
    expect(table).not.toContain('data-sortable');
    expect(table).not.toContain('type="checkbox"');
    expect(html).toContain('Filtrar por tipo');
    expect(html).toContain('Filtrar por estado');
    expect(html).not.toContain('<select');
  });

  it('keeps read-only access while hiding TAG mutation actions', () => {
    const html = renderToStaticMarkup(createElement(TollMediaPage, { onNotice: vi.fn(), readOnly: true }));
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(html).toContain('Solo lectura');
    expect(html).not.toContain('Bloquear');
    expect(html).not.toContain('Desbloquear');
    expect(html).not.toContain('Asignar');
    expect(html).not.toContain('Reportar robo o daño');
    expect(html).not.toContain('Solicitar TAGs');
  });
});
