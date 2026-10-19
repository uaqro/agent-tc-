/** Pure helpers of the unit selector of the funding rules: search, selection by org node, select visible. */
import { subtreeOf } from '../domain/org/types';
import type { Vehicle } from '../types/dispersion';
import { clientOrgTree, orgPathOf, scopeNodeOptions, type ScopeNodeOption } from './client';
import { sessionPrincipal } from './session';

/** Lower case without accents, so "nájera" finds "Nájera" and "najera" too. */
export const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Units whose plate, economic number (ECO-xxxx) or driver contain the query. */
export function searchUnits(vehicles: Vehicle[], query: string): Vehicle[] {
  const needle = normalize(query.trim());
  if (needle === '') return vehicles;
  return vehicles.filter((vehicle) => normalize(`${vehicle.plate} ${vehicle.id} ${vehicle.driver}`).includes(needle));
}

/** Units under an org node, that node's whole subtree included. */
export function unitsUnderNode(vehicles: Vehicle[], nodeId: string): Vehicle[] {
  return vehicles.filter((vehicle) => orgPathOf(vehicle.id).includes(nodeId));
}

/** Adds ids to a selection, keeping its order and without duplicates. */
export function addToSelection(selected: string[], ids: string[]): string[] {
  const present = new Set(selected);
  return [...selected, ...ids.filter((id) => !present.has(id))];
}

/** Org nodes the session can pick from: its own subtree, or the whole chart without a scope. */
export function selectableNodes(): ScopeNodeOption[] {
  const scopeNode = sessionPrincipal().scopeNodeId;
  if (scopeNode === null) return scopeNodeOptions;
  const visible = new Set(subtreeOf(clientOrgTree, scopeNode).map((node) => node.id));
  return scopeNodeOptions.filter((node) => visible.has(node.id));
}
