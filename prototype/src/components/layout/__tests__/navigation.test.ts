import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PageChromeProvider, SidebarProvider } from '@er-mobility-mx/design-system';
import { menuGroups } from '../../../data/dashboard';
import { navigationItems, SideMenu } from '../SideMenu';
import { PageHeader } from '../PageHeader';
import { PageUtilities } from '../PageUtilities';
import { SessionProvider } from '../../session/Session';

describe('Flow navigation adapter', () => {
  it('groups each module in a collapsible section and keeps every destination ID in order', () => {
    const items = navigationItems(menuGroups);
    const destinations = items.flatMap((item) => item.children ?? [item]);
    expect(destinations.map((item) => item.id)).toEqual(menuGroups.flatMap((group) => group.items.map((item) => item.id)));
    expect(destinations.every((item) => !!item.icon && !item.children)).toBe(true);
    expect(items.every((item) => !item.caption && !!item.icon)).toBe(true);
    expect(items.length).toBeLessThan(destinations.length);
  });

  it('turns a single-destination module into a direct link named after the module', () => {
    const items = navigationItems(menuGroups.filter((group) => group.id === 'mantenimiento'));
    expect(items).toEqual([expect.objectContaining({ id: 'mantenimiento-resumen', label: 'Mantenimiento' })]);
    expect(items[0].children).toBeUndefined();
  });

  it('includes only the supplied authorized groups and removes empty groups', () => {
    const authorized = menuGroups.filter((group) => group.id === 'flota');
    const items = navigationItems([...authorized, { id: 'empty', label: 'Vacío', items: [] }]);
    expect(items.map((item) => item.id)).toEqual(['flota']);
    expect(items[0].children?.map((item) => item.id)).toEqual(authorized[0].items.map((item) => item.id));
  });

  it('renders the actual active destination and removes the legacy pin', () => {
    const html = renderToStaticMarkup(createElement(SessionProvider, null, createElement(SideMenu, {
      open: false, onOpenChange: () => {}, groups: menuGroups,
      activeItemId: 'vehiculos', onSelectItem: () => {}, onHome: () => {},
      userName: 'Usuario Admin', userRole: 'Administrador', onAccount: () => {},
    })));
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*>[\s\S]*?Vehículos/);
    expect(html).not.toContain('Buscar una opción del menú');
    expect(html).not.toContain('type="search"');
    expect(html).not.toContain('Buscar en el menú');
    expect(html).toContain('Edenred One');
    expect(html).not.toContain('<span>Ticket Car</span>');
    expect(html).not.toContain('Fijar menú');
    expect(html).not.toContain('Desfijar menú');
    expect(html).toContain('Cuenta de Usuario Admin');
    expect(html).not.toContain('status-online');
  });
});

describe('shared page chrome', () => {
  it('renders one identity and one shared search trigger without a fake notification center', () => {
    const html = renderToStaticMarkup(createElement(SessionProvider, null, createElement(SidebarProvider, { value: () => {} },
      createElement(PageChromeProvider, { value: {
        onSearch: () => {}, searchLabel: 'Búsqueda global',
        notifications: [],
        trailing: createElement(PageUtilities, { onHelp: () => {}, onOpenImprovements: () => {} }),
      } }, createElement(PageHeader, {
        title: 'Vehículos', subtitle: 'Unidades de la flota',
      })),
    )));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html.match(/aria-label="Búsqueda global"/g)).toHaveLength(1);
    expect(html).toContain('Abrir navegación');
    expect(html).not.toContain('Volver al resumen');
    expect(html).not.toContain('aria-label="Breadcrumb"');
    expect(html).not.toContain('Perfil de');
    expect(html).toContain('Dev');
    expect(html).toContain('aria-label="Configuración de desarrollo · Dev OFF"');
    expect(html).not.toContain('dev-menu__trigger');
    expect(html.match(/aria-label="Notificaciones"/g)).toHaveLength(1);
    expect(html).not.toContain('role="dialog"');
  });

  it('keeps the overview filters without breadcrumbs or a return action', () => {
    const html = renderToStaticMarkup(createElement(PageHeader, {
      title: 'Resumen', subtitle: 'Cuenta activa',
      children: createElement('span', null, 'Filtros de flota'),
    }));
    expect(html).toContain('Filtros de flota');
    expect(html).not.toContain('Volver al resumen');
    expect(html).not.toContain('Ticket Car');
    expect(html).not.toContain('aria-label="Breadcrumb"');
  });
});
