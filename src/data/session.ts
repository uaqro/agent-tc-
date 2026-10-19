/**
 * Session of the portal and the data scope it implies (ADR-TCP-001).
 *
 * The scope rules live in `domain/rbac/scope`; this module only knows who is signed in and tells the data modules
 * when that changes. Each data module keeps its full list private and exports a scoped `let` binding that it
 * recomputes in `onSessionChange`. ES modules export live bindings, so pages keep importing `vehicles` or
 * `paymentMedia` as before and never apply the scope themselves. The shell remounts the pages on a session change
 * (`sessionKey`), so they read the new bindings.
 */
import { scopeSnapshot, inOrgScope, type PortalPrincipal } from '../domain/rbac/scope';
import type { ActivitySnapshot } from '../domain/dashboard/types';
import { CLIENT_ACCOUNT_ID, clientSnapshot, orgPathOf } from './client';

export const DEFAULT_PRINCIPAL: PortalPrincipal = {
  userId: 'u-1',
  name: 'U. Aquino',
  role: 'admin',
  accountId: CLIENT_ACCOUNT_ID,
  scopeNodeId: null,
};

let principal: PortalPrincipal = DEFAULT_PRINCIPAL;
const listeners = new Set<() => void>();

export const sessionPrincipal = (): PortalPrincipal => principal;

/** Identity of the session, for keys: changes when the user, the role or the scope changes. */
export const sessionKey = (): string => `${principal.userId}|${principal.role}|${principal.scopeNodeId ?? 'cuenta'}`;

/** Registers a data module's scoped bindings and applies them for the current session right away. */
export function onSessionChange(apply: () => void): void {
  listeners.add(apply);
  apply();
}

export function setSessionPrincipal(next: PortalPrincipal): void {
  principal = next;
  for (const apply of listeners) apply();
}

/** True when the unit is inside the scope of the session. */
export const unitInScope = (unitId: string): boolean => inOrgScope(principal, orgPathOf(unitId));

/** Activity of the client account as the session may see it. */
export const scopedSnapshot = (periodDays: number, at?: number): ActivitySnapshot =>
  scopeSnapshot(clientSnapshot(periodDays, at), principal);
