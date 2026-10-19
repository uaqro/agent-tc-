/**
 * The eOne load optimizer (Sprint 8, `domain/optimizer`) as Ticket Car shows it: its dataset scoped to the session,
 * the view by region kept from the previous Ticket Car optimizer, and the link from each card to a padrón unit.
 *
 * The optimizer is analytical: nothing here changes a card or a limit. "Aplicar en Límites" only opens the Límites
 * flow with the unit and station preloaded, and "Enviar al conductor" only sends a recommendation (`recommendations`).
 */
import type { FleetUnit } from '../domain/dashboard/types';
import { DATASET_DAYS, ZONES, getOptimizerDataset } from '../domain/optimizer/dataset';
import { departmentNodeIdOf, optimizerOrg, withOrgDivision } from '../domain/optimizer/org';
import { isRedirectable, savingIn } from '../domain/optimizer/rules';
import { loadsInScope } from '../domain/optimizer/session-scope';
import type { Assumptions, Load, SavingMode, Station, ZoneId } from '../domain/optimizer/types';
import { assignedDriverName, clientOrgTree, operatingUnits, orgPathOf } from './client';
import { onSessionChange, sessionPrincipal } from './session';

export const optimizerDataset = getOptimizerDataset();
export const stationsById = new Map<string, Station>(optimizerDataset.stations.map((station) => [station.id, station]));
export const optimizerOrgView = optimizerOrg(clientOrgTree);

const allLoads: Load[] = withOrgDivision(optimizerDataset.loads, optimizerOrgView);
const zoneIds: ZoneId[] = ZONES.map((zone) => zone.id);

/** Loads of the zones inside the session scope (ADR-TCP-001). */
export let optimizerLoads: Load[] = allLoads;

onSessionChange(() => {
  optimizerLoads = loadsInScope(allLoads, sessionPrincipal().scopeNodeId, clientOrgTree, zoneIds);
});

// ── Period ──────────────────────────────────────────────────────────────

export interface OptimizerWindowOption {
  id: string;
  label: string;
  fromDay: number;
  toDay: number;
}

/** The dataset is September 2026, the last closed month on the business date. */
export const OPTIMIZER_WINDOWS: OptimizerWindowOption[] = [
  { id: 'mes', label: 'Septiembre 2026 completo', fromDay: 1, toDay: DATASET_DAYS },
  { id: 'quincena', label: 'Segunda quincena de septiembre', fromDay: 16, toDay: DATASET_DAYS },
  { id: 'semana', label: 'Última semana de septiembre', fromDay: DATASET_DAYS - 6, toDay: DATASET_DAYS },
];

// ── Cards and padrón units ──────────────────────────────────────────────

/**
 * Each synthetic card of the dataset is assigned, deterministically, to a TicketCar+ unit of the department its
 * zone belongs to. That is what lets "Aplicar en Límites" open the unit and "Enviar al conductor" name a driver.
 */
const cardUnits = (() => {
  const firstZone = new Map<string, ZoneId>();
  for (const load of allLoads) if (!firstZone.has(load.cardId)) firstZone.set(load.cardId, load.zone);

  const unitsByZone = new Map<ZoneId, FleetUnit[]>(
    zoneIds.map((zone) => [
      zone,
      operatingUnits
        .filter((unit) => unit.product === 'ticketcar_plus' && orgPathOf(unit.id).includes(departmentNodeIdOf(zone)))
        .sort((a, b) => a.id.localeCompare(b.id)),
    ]),
  );

  const assigned = new Map<string, FleetUnit>();
  const seen = new Map<ZoneId, number>();
  for (const cardId of [...firstZone.keys()].sort()) {
    const zone = firstZone.get(cardId)!;
    const units = unitsByZone.get(zone) ?? [];
    if (units.length === 0) continue;
    const index = seen.get(zone) ?? 0;
    assigned.set(cardId, units[index % units.length]);
    seen.set(zone, index + 1);
  }
  return assigned;
})();

export interface CardHolder {
  unit: FleetUnit;
  driverName: string;
}

export function cardHolder(cardId: string): CardHolder | null {
  const unit = cardUnits.get(cardId);
  return unit ? { unit, driverName: assignedDriverName(unit) } : null;
}

// ── View by region (kept from the previous Ticket Car optimizer) ────────

export interface RegionSummary {
  divisionId: string;
  name: string;
  zones: string[];
  saving: number;
  loads: number;
  redirectable: number;
  stations: number;
  cards: number;
  /** Recommended against paid $/L on redirectable loads, negative = cheaper. Null without them. */
  priceGap: number | null;
}

export function regionSummaries(loads: Load[], assumptions: Assumptions, mode: SavingMode): RegionSummary[] {
  return optimizerOrgView.divisions
    .map((divisionId) => {
      const own = loads.filter((load) => load.division === divisionId);
      const redirectable = own.filter(isRedirectable);
      const liters = redirectable.reduce((sum, load) => sum + load.liters, 0);
      const paid = redirectable.reduce((sum, load) => sum + load.pricePaid * load.liters, 0);
      const recommended = redirectable.reduce((sum, load) => sum + (load.priceRecommended ?? load.pricePaid) * load.liters, 0);
      return {
        divisionId,
        name: optimizerOrgView.divisionLabel(divisionId),
        zones: [...new Set(own.map((load) => optimizerOrgView.zoneLabel(load.zone)))],
        saving: own.reduce((sum, load) => sum + savingIn(load, mode, assumptions), 0),
        loads: own.length,
        redirectable: redirectable.length,
        stations: new Set(own.map((load) => load.stationId)).size,
        cards: new Set(own.map((load) => load.cardId)).size,
        priceGap: liters > 0 && paid > 0 ? (recommended - paid) / paid : null,
      };
    })
    .filter((region) => region.loads > 0)
    .sort((a, b) => b.saving - a.saving);
}
