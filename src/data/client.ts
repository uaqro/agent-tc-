/**
 * The client account Ticket Car shows, read from the common fleet data layer ported from eOne (`src/domain`).
 *
 * Every vehicle, driver and group in the portal comes from this padrón, so the catalogue pages, Saldos, Peaje,
 * Mantenimiento and the Resumen indicators talk about the same units. The hand-written scenarios elsewhere in
 * `src/data` (attention items, limit assignments, service orders, toll tags) reference padrón ids such as
 * `ECO-3004`; `src/data/__tests__/client.test.ts` checks that every one of them exists.
 */
import { ACCOUNTS, type Account } from '../domain/data/accounts';
import { UNIT_GROUPS, buildAccountActivity, fleetDriversOf, fleetUnitsOf } from '../domain/data/fleet-activity';
import { registryStatusOf, type ActivitySnapshot, type FleetDriver, type FleetUnit } from '../domain/dashboard/types';
import { businessNow } from '../domain/demo/clock';
import { baseOrgTreeOf, withUnassigned } from '../domain/org/structure';
import { unitPathIndex, type OrgTree } from '../domain/org/types';

/** Grupo Alimentario Norte: the eOne account with the largest fleet, a five-level org chart and the optimizer dataset. */
export const CLIENT_ACCOUNT_ID = 'acc_grupo_alimentario';

export const clientAccount: Account = ACCOUNTS.find((candidate) => candidate.id === CLIENT_ACCOUNT_ID)!;

/** Whole padrón, including deregistered units, which keep their history. */
export const clientUnits: FleetUnit[] = fleetUnitsOf(clientAccount);

/** Units still under contract: the ones that can be funded, assigned or sent to the workshop. */
export const operatingUnits: FleetUnit[] = clientUnits.filter((unit) => registryStatusOf(unit) === 'alta');

export const clientDrivers: FleetDriver[] = fleetDriversOf(clientAccount);

export const clientOrgTree: OrgTree = withUnassigned(
  baseOrgTreeOf(clientAccount),
  clientUnits.map((unit) => unit.id),
);

const unitIndex = new Map(clientUnits.map((unit) => [unit.id, unit]));
const driverIndex = new Map(clientDrivers.map((driver) => [driver.id, driver]));
const orgPaths = unitPathIndex(clientOrgTree);
const NO_PATH: readonly string[] = [];

export const unitById = (id: string): FleetUnit | undefined => unitIndex.get(id);
export const driverById = (id: string): FleetDriver | undefined => driverIndex.get(id);
export const orgPathOf = (unitId: string): readonly string[] => orgPaths.get(unitId) ?? NO_PATH;

/** `GRP-02 · Corredor Norte` → `Corredor Norte`: the code stays in the id, the screen shows the name. */
export function groupLabel(group: string): string {
  const separator = group.indexOf(' · ');
  return separator < 0 ? group : group.slice(separator + 3);
}

/** `GRP-02 · Corredor Norte` → `grp-02`. */
export function groupId(group: string): string {
  const separator = group.indexOf(' · ');
  return (separator < 0 ? group : group.slice(0, separator)).toLowerCase();
}

/** Padrón group behind a short label or id, for the pages that store one of those. */
export function padronGroup(labelOrId: string): string | undefined {
  return UNIT_GROUPS.find((group) => groupLabel(group) === labelOrId || groupId(group) === labelOrId);
}

export const NO_DRIVER_LABEL = 'Sin conductor asignado';

/** Name of the unit's assigned driver, or the label for units registered without one. */
export function assignedDriverName(unit: FleetUnit): string {
  return driverById(unit.assignedDriverId)?.name ?? NO_DRIVER_LABEL;
}

/** Deterministic number in [0, 1) per key, for the attributes eOne does not model (balances, card numbers). */
export function stableFraction(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

// ── Activity ────────────────────────────────────────────────────────────

const snapshotCache = new Map<string, ActivitySnapshot>();

/**
 * Activity of the client account for the last `periodDays` closed days plus today, and the period before it.
 *
 * Cached per day and period length: the generator is deterministic per day, so a snapshot only goes stale when the
 * business date changes.
 */
export function clientSnapshot(periodDays: number, at = businessNow()): ActivitySnapshot {
  const key = `${new Date(at).toDateString()}|${periodDays}`;
  const cached = snapshotCache.get(key);
  if (cached) return cached;

  const started = performance.now();
  const activity = buildAccountActivity(clientAccount, at, { periodDays, orgPathOf, withComparison: true });
  const snapshot: ActivitySnapshot = {
    at,
    accounts: [activity],
    loadMs: performance.now() - started,
    fleetSize: activity.fleetSize,
    periodDays,
  };
  snapshotCache.set(key, snapshot);
  return snapshot;
}

// ── Org chart nodes as user scopes (ADR-TCP-001) ───────────────────────

export interface ScopeNodeOption {
  id: string;
  name: string;
  /** 1 for divisions, 2 for departments… The company itself is "no scope". */
  level: number;
}

/** Nodes a user can be limited to, in tree order. The synthetic "Sin asignar" node is not a place to work in. */
export const scopeNodeOptions: ScopeNodeOption[] = clientOrgTree.nodes
  .filter((node) => node.level > 0 && node.synthetic !== true)
  .map((node) => ({ id: node.id, name: node.name, level: node.level }));

/** Name of the scope of a user: the node, or the whole account. */
export function scopeLabel(nodeId: string | null): string {
  if (nodeId === null) return 'Toda la empresa';
  return clientOrgTree.nodes.find((node) => node.id === nodeId)?.name ?? 'Nodo eliminado';
}
