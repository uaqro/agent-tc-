import { createElement } from 'react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { InviteUserDialog } from '../InviteUserDialog';

vi.mock('@er-mobility-mx/design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@er-mobility-mx/design-system')>();
  return {
    ...actual,
    OverlayShell: ({ children, open }: { children: ReactNode; open: boolean }) => (open ? children : null),
  };
});

describe('InviteUserDialog', () => {
  it('preserves the default company scope and exposes the Flow scope selector', () => {
    const html = renderToStaticMarkup(
      createElement(InviteUserDialog, {
        existingEmails: [],
        onClose: vi.fn(),
        onInvite: vi.fn(),
      }),
    );

    expect(html).toContain('for="invite-user-scope"');
    expect(html).toContain('aria-labelledby="invite-user-scope-label"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('Toda la empresa');
    expect(html).toContain('El usuario solo verá las unidades, cargas e indicadores');
    expect(html).not.toContain('<select');
  });
});
