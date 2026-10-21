import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { parameterCatalogs, platformUsers, USER_ROLE_LABEL, USER_STATUS_LABEL } from '../../../data/company';
import { scopeLabel } from '../../../data/client';
import { sessionPrincipal } from '../../../data/session';
import { formatDateTime } from '../../../utils/format';
import { ParametersPage } from '../ParametersPage';
import { UsersPage } from '../UsersPage';

describe('Administration Flow tables', () => {
  it('keeps users in source order with roles, scopes, access and status', () => {
    const html = renderToStaticMarkup(createElement(UsersPage, { onNotice: vi.fn() }));
    expect(html).toContain('Usuarios de la empresa</caption>');
    expect(html.match(/<tr\b/g)).toHaveLength(platformUsers.length + 1);
    expect(html.match(/<th\b/g)).toHaveLength(6);
    let previousIndex = -1;
    for (const user of platformUsers) {
      const index = html.indexOf(user.email);
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
      expect(html).toContain(user.name);
      expect(html).toContain(USER_ROLE_LABEL[user.role]);
      expect(html).toContain(scopeLabel(user.scopeNodeId));
      expect(html).toContain(USER_STATUS_LABEL[user.status]);
      expect(html).toContain(user.lastAccess ? formatDateTime(new Date(user.lastAccess)) : 'Nunca');
    }
    expect(html).not.toContain('table-page__table');
    expect(html).not.toContain('data-sortable');
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain('aria-selected');
  });

  it('preserves self protection and distinct invited/suspended actions', () => {
    const html = renderToStaticMarkup(createElement(UsersPage, { onNotice: vi.fn() }));
    const rows = html.match(/<tr\b[\s\S]*?<\/tr>/g) ?? [];
    for (const user of platformUsers) {
      const row = rows.find((candidate) => candidate.includes(user.email));
      expect(row).toBeDefined();
      if (user.id === sessionPrincipal().userId) {
        expect(row).toContain('Tú');
        expect(row).not.toContain('Suspender');
      } else if (user.status === 'active') {
        expect(row).toContain('Suspender');
      }
      if (user.status === 'invited') {
        expect(row).toContain('Reenviar invitación');
        expect(row).not.toContain('Suspender');
      }
      if (user.status === 'suspended') {
        expect(row).toContain('Reactivar');
        expect(row).not.toContain('Suspender');
      }
    }
    expect(html).toContain('Buscar usuario');
    expect(html).toContain('Filtrar por rol');
    expect(html).toContain('Filtrar por estado');
    expect(html).toContain('Invitar usuario');
  });

  it('derives parameter columns from the catalog and keeps hidden editor fields out', () => {
    const catalog = parameterCatalogs[0];
    const html = renderToStaticMarkup(createElement(ParametersPage, { onNotice: vi.fn() }));
    expect(html).toContain(`${catalog.label}</caption>`);
    expect(html.match(/<tr\b/g)).toHaveLength(catalog.records.length + 1);
    expect(html.match(/<th\b/g)).toHaveLength(catalog.fields.filter((field) => field.inTable !== false).length + 2);
    for (const field of catalog.fields) {
      if (field.inTable === false) {
        expect(html).not.toContain(field.label);
      } else {
        expect(html).toContain(field.label);
        for (const record of catalog.records) expect(html).toContain(record.values[field.key]);
      }
    }
    expect(html).not.toContain('parameters__table');
    expect(html).not.toContain('table-page__table');
    expect(html).not.toContain('data-sortable');
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];
    expect(table).toBeDefined();
    expect(table).not.toContain('type="checkbox"');
  });

  it('retains inactive state and per-record actions without deleting built-in catalogs', () => {
    const catalog = parameterCatalogs[0];
    const html = renderToStaticMarkup(createElement(ParametersPage, { onNotice: vi.fn() }));
    expect(html.match(/>Editar<\/button>/g)).toHaveLength(catalog.records.length);
    expect(html.match(/>Desactivar<\/button>/g)).toHaveLength(catalog.records.filter((record) => record.active).length);
    expect(html.match(/>Activar<\/button>/g)).toHaveLength(catalog.records.filter((record) => !record.active).length);
    expect(html.match(/data-inactive="true"/g)).toHaveLength(
      catalog.records.filter((record) => !record.active).length * catalog.fields.filter((field) => field.inTable !== false).length,
    );
    expect(html).toContain('Mostrar inactivos');
    expect(html).toContain('Agregar registro');
    expect(html).toContain('Nuevo catálogo');
    expect(html).not.toContain('Eliminar catálogo');
    expect(html).toContain('Se usa en Centros de costo');
  });
});
