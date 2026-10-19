/**
 * The eOne load optimizer as Ticket Car shows it, on the same fuelling the Resumen and the consolidated report read.
 *
 * Loads are the padrón's dispatches of the last closed days (`domain/optimizer/loads`): each one carries its unit,
 * its card, the driver of the day, its station and its org path, so the session scope works down to area level and
 * the total spend matches the other two screens.
 *
 * The optimizer is analytical: nothing here changes a card or a limit. "Aplicar en Límites" only opens the Límites
 * flow with the unit and station preloaded, and "Enviar al conductor" only sends a recommendation (`recommendations`).
 */
import { businessNow } from '../domain/demo/clock';
import { isRedirectable, savingIn } from '../domain/optimizer/rules';
import { loadsFromEvents } from '../domain/optimizer/loads';
import { optimizerOrg } from '../domain/optimizer/org';
import { loadsInScope } from '../domain/optimizer/session-scope';
import type { Assumptions, Load, SavingMode, Station } from '../domain/optimizer/types';
import { dayIndexOf, stations } from '../domain/stations/directory';
import { clientAccount, clientOrgTree, clientSnapshot, driverById } from './client';
import { sessionPrincipal } from './session';

/** Longest window the optimizer offers, in closed days. */
export const OPTIMIZER_MAX_DAYS = 30;

export const stationsById = new Map<string, Station>(stations().map((station) => [station.id, station]));
export const optimizerOrgView = optimizerOrg(clientOrgTree);

/** Loads of the account for the last closed days, unscoped. Rebuilt only when the business date changes. */
let accountLoads: { key: string; loads: Load[] } | null = null;

function loadsOfAccount(at = businessNow()): Load[] {
  const key = new Date(at).toDateString();
  if (accountLoads?.key !== key) {
    const closed = clientSnapshot(OPTIMIZER_MAX_DAYS, at).accounts[0].period.filter((point) => !point.partial);
    accountLoads = { key, loads: loadsFromEvents(clientAccount, closed.flatMap((point) => point.events)) };
  }
  return accountLoads.loads;
}

/**
 * Loads inside the session scope (ADR-TCP-001), by org path, down to area level.
 *
 * Computed on first use and not at import: the optimizer is one page, and building its loads (a recommendation per
 * dispatch) should not delay the first render of the portal.
 */
export function scopedOptimizerLoads(at = businessNow()): Load[] {
  return loadsInScope(loadsOfAccount(at), sessionPrincipal().scopeNodeId);
}

// ── Period ──────────────────────────────────────────────────────────────

export interface OptimizerWindowOption {
  id: string;
  label: string;
  fromDay: number;
  toDay: number;
}

/** Last closed days before the business date: the same windows the Resumen uses. */
export function optimizerWindows(at = businessNow()): OptimizerWindowOption[] {
  const today = dayIndexOf(at);
  return [30, 15, 7].map((days) => ({ id: String(days), label: `Últimos ${days} días`, fromDay: today - days, toDay: today - 1 }));
}

// ── Drivers ─────────────────────────────────────────────────────────────

export const NO_DRIVER_NAME = 'Sin conductor registrado';

/** Driver of the load's day, from the padrón. */
export function driverNameOf(driverId: string | null): string {
  return driverId === null ? NO_DRIVER_NAME : (driverById(driverId)?.name ?? driverId);
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

/** One card per division (level 1 of the org path) that has loads in the cut. */
export function regionSummaries(loads: Load[], assumptions: Assumptions, mode: SavingMode): RegionSummary[] {
  return [...new Set(loads.map((load) => load.division))]
    .map((divisionId) => {
      const own = loads.filter((load) => load.division === divisionId);
      const redirectable = own.filter(isRedirectable);
      const paid = redirectable.reduce((sum, load) => sum + load.pricePaid * load.liters, 0);
      const recommended = redirectable.reduce((sum, load) => sum + (load.priceRecommended ?? load.pricePaid) * load.liters, 0);
      return {
        divisionId,
        name: optimizerOrgView.divisionLabel(divisionId),
        zones: [...new Set(own.map((load) => optimizerOrgView.zoneLabel(load.zone)))],
        saving: own.reduce((sum, load) => sum + savingIn(load, mode, assumptions), 0),
        loads: own.filter((load) => !load.refund).length,
        redirectable: redirectable.length,
        stations: new Set(own.map((load) => load.stationId)).size,
        cards: new Set(own.map((load) => load.cardId)).size,
        priceGap: paid > 0 ? (recommended - paid) / paid : null,
      };
    })
    .sort((a, b) => b.saving - a.saving);
}
