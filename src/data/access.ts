import {
  INTERNAL_ROLES,
  canSession,
  type Intent,
  type InternalRoleId,
  type PortalCapabilityId,
  type SessionRoleId,
} from '../domain/rbac/portal-roles';
import type { PortalPrincipal } from '../domain/rbac/scope';
import type { AppRoute } from '../types';
import { CLIENT_ACCOUNT_ID } from './client';
import { platformUsers } from './company';

/** Capability that opens each page of the portal (ADR-TCP-001). A page the role can't see is not in its menu. */
export const ROUTE_CAPABILITY: Record<AppRoute, PortalCapabilityId> = {
  dashboard: 'dashboard.kpis',
  dispersion: 'tc.saldos',
  limits: 'tc.limites',
  'payment-media': 'tc.medios_pago',
  'toll-balances': 'tc.peaje_saldos',
  'toll-rules': 'tc.peaje_reglas',
  'toll-media': 'tc.peaje_medios',
  maintenance: 'tc.mantenimiento',
  reports: 'consumos.drivers',
  insights: 'alertas.panel',
  optimizer: 'consumos.ineficiencias',
  ted: 'tc.asistente',
  vehicles: 'inventario.ver',
  drivers: 'inventario.ver',
  'company-parameters': 'tc.parametros',
  'company-invoices': 'tc.facturas',
  'company-users': 'admin.usuarios',
  // Dev pages are gated by dev mode, not by role.
  'dev-api-improvements': 'auth.sso_login',
};

export const canAccessRoute = (role: SessionRoleId, route: AppRoute): boolean => canSession(role, ROUTE_CAPABILITY[route]);

export const can = (principal: PortalPrincipal, capability: PortalCapabilityId, intent: Intent = 'ver'): boolean =>
  canSession(principal.role, capability, intent);

/** Active portal users, as dev mode can impersonate them. */
export const portalPrincipals: PortalPrincipal[] = platformUsers
  .filter((user) => user.status === 'active')
  .map((user) => ({
    userId: user.id,
    name: user.name,
    role: user.role,
    accountId: CLIENT_ACCOUNT_ID,
    scopeNodeId: user.scopeNodeId,
  }));

/** Edenred internal roles. Never listed in the portal: only dev mode can switch to them, on the active account. */
export const internalPrincipals: PortalPrincipal[] = (Object.keys(INTERNAL_ROLES) as InternalRoleId[]).map((role) => ({
  userId: `interno-${role}`,
  name: `${INTERNAL_ROLES[role].name} (interno)`,
  role,
  accountId: CLIENT_ACCOUNT_ID,
  scopeNodeId: null,
}));
