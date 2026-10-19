/**
 * "Enviar al conductor": a station recommendation sent from the optimizer to the driver of one card.
 *
 * Rules from the integration decision:
 * - Always manual and one at a time, for one unit or driver. There is no bulk send and no rule that sends on its
 *   own: this module only exposes `sendStationRecommendation`, which takes a single card.
 * - It is a recommendation. It does not change the card's restrictions; `RECOMMENDATION_DISCLAIMER` says so wherever
 *   the action is offered.
 * - Every send is logged (who, to which driver, when) and the log is visible in the optimizer detail.
 * - The channel is simulated: there is no method in the fuel API to notify a driver. Dev mode marks it as a mock in
 *   the API coverage (`opt-send-driver`).
 */
import { businessNow } from '../domain/demo/clock';
import { sessionRoleName } from '../domain/rbac/portal-roles';
import { sessionPrincipal } from './session';

export const RECOMMENDATION_DISCLAIMER = 'Recomendación de estación — no modifica las restricciones de la tarjeta';

export interface RecommendationSent {
  id: string;
  at: number;
  /** Who sent it: the session user and role. */
  sentBy: string;
  sentByRole: string;
  cardId: string;
  maskedCard: string;
  unitId: string;
  plate: string;
  driverName: string;
  fromStation: string;
  toStation: string;
}

export type RecommendationInput = Omit<RecommendationSent, 'id' | 'at' | 'sentBy' | 'sentByRole'>;

let log: RecommendationSent[] = [];
const listeners = new Set<() => void>();

/** Sends one recommendation to one driver through the simulated channel and logs it. */
export function sendStationRecommendation(input: RecommendationInput): RecommendationSent {
  const principal = sessionPrincipal();
  const entry: RecommendationSent = {
    ...input,
    id: `rec-${log.length + 1}`,
    at: businessNow(),
    sentBy: principal.name,
    sentByRole: sessionRoleName(principal.role),
  };
  log = [entry, ...log];
  for (const listener of listeners) listener();
  return entry;
}

/** Newest first. */
export const recommendationLog = (): readonly RecommendationSent[] => log;

export function subscribeRecommendations(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Only for tests. */
export function resetRecommendations(): void {
  log = [];
}
