/**
 * Bridge between the consolidated report ported from eOne (US-024, `domain/consolidated-report`) and the portal
 * session: who generates it and which scope values the session is allowed to pick.
 */
import { scopeOptions, type ReportPrincipal, type ScopeKind, type ScopeOption } from '../domain/consolidated-report/build';
import { findNode, subtreeOf, unitPathOf } from '../domain/org/types';
import { clientAccount, clientOrgTree, clientUnits } from './client';
import { driverIdsInScope } from './fleet';
import { sessionPrincipal, unitInScope } from './session';

export function reportPrincipal(): ReportPrincipal {
  const principal = sessionPrincipal();
  return { name: principal.name, accountId: principal.accountId, scopeNodeId: principal.scopeNodeId };
}

/** «División Noreste › Departamento Monterrey», or «Sin asignar». */
export function orgPathText(unitId: string): string {
  return (
    unitPathOf(clientOrgTree, unitId)
      .slice(1)
      .map((id) => findNode(clientOrgTree, id)?.name ?? id)
      .join(' › ') || 'Sin asignar'
  );
}

/**
 * Values the session may pick for a scope kind. The domain also intersects the report with the session scope, so
 * this is about not offering what would come back empty, not about enforcing it.
 */
export function reportScopeOptions(kind: ScopeKind): ScopeOption[] {
  const options = scopeOptions(clientAccount, kind, orgPathText, clientOrgTree);
  const scopeNode = sessionPrincipal().scopeNodeId;
  if (scopeNode === null) return options;

  switch (kind) {
    case 'nodo': {
      const visible = new Set(subtreeOf(clientOrgTree, scopeNode).map((node) => node.id));
      return options.filter((option) => visible.has(option.value));
    }
    case 'unidad': {
      const plates = new Set(clientUnits.filter((unit) => unitInScope(unit.id)).map((unit) => unit.plate));
      return options.filter((option) => plates.has(option.value));
    }
    case 'conductor': {
      const drivers = driverIdsInScope();
      return options.filter((option) => drivers.has(option.value));
    }
    default:
      return options;
  }
}
