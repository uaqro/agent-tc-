export type LimitMeasure = 'liters' | 'money';
export type LimitPeriod = 'day' | 'week' | 'fortnight' | 'month';
export type FuelType = 'magna' | 'premium' | 'diesel';
export type PolicyStatus = 'active' | 'paused';

export interface StationSubnet {
  id: string;
  label: string;
  stations: number;
}

/** A reusable set of fuelling locks. Groups inherit it; a unit can be moved to another one. */
export interface LimitPolicy {
  id: string;
  name: string;
  status: PolicyStatus;
  groupIds: string[];
  measure: LimitMeasure;
  period: LimitPeriod;
  /** Consumption ceiling per period, expressed in `measure`. */
  periodLimit: number;
  maxLitersPerFill: number;
  maxFillsPerDay: number;
  minHoursBetweenFills: number;
  /** Rejects a fill above the tank capacity registered for the unit. */
  tankCapacityLock: boolean;
  fuels: FuelType[];
  /** Allowed days, Monday = 0. */
  days: number[];
  timeFrom: string;
  timeTo: string;
  /** Null when the whole network is allowed. */
  stationSubnetId: string | null;
  odometerRequired: boolean;
  /** Null when the performance lock is off. */
  minKmPerLiter: number | null;
}

export type OverrideDuration = 'period' | '24h' | '7d';

/** Temporary extension of the period limit for one unit. */
export interface LimitOverride {
  /** Extra amount in the measure of the policy. */
  extra: number;
  until: string;
  reason: string;
}

export interface UnitAssignment {
  vehicleId: string;
  /** Null when the unit fuels without any lock. */
  policyId: string | null;
  /** True when the unit was moved away from the policy of its group. */
  individual: boolean;
  tankLiters: number;
  usedLiters: number;
  rejections7d: number;
  override?: LimitOverride;
  /** Station allowed outside the policy's station subnet, applied from an optimizer recommendation. */
  stationException?: StationException;
}

/** One station the unit may fuel at even if its policy limits the network, until a date. */
export interface StationException {
  station: string;
  until: string;
  /** Where it came from, for the audit trail: "Optimizador · tarjeta •••• 1234". */
  source: string;
}

/** What the optimizer hands to Límites. Nothing is applied until the user confirms in Límites. */
export interface StationRecommendationRequest {
  vehicleId: string;
  cardLabel: string;
  fromStation: string;
  toStation: string;
  /** Gross saving of the loads behind the recommendation, in the optimizer period. */
  estimatedSavingMXN: number;
}
