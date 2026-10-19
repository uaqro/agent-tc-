export type LimitMeasure = 'liters' | 'money';
export type LimitPeriod = 'day' | 'week' | 'fortnight' | 'month';
export type FuelType = 'magna' | 'premium' | 'diesel';
export type PolicyStatus = 'active' | 'paused';

export interface TransactionControls {
  plateRequired: boolean;
  driverRequired: boolean;
  /** The driver number is always validated when the driver is requested; the PIN is optional. */
  driverPin: boolean;
  odometerRequired: boolean;
  /** Uses the km/L performance configured on each vehicle. */
  kmPerformance: boolean;
  kmRange: { min: number; max: number } | null;
  hourmeterRequired: boolean;
  /** Uses the h/L performance configured on each vehicle. */
  hourPerformance: boolean;
}

export interface PeriodRestriction {
  amount: number | null;
  volume: number | null;
  transactions: number | null;
}

export interface TimeRange {
  from: string;
  to: string;
}

/** One set of days (Monday = 0) sharing the same time ranges; a day belongs to one block only. */
export interface ScheduleBlock {
  days: number[];
  ranges: TimeRange[];
}

export interface PolicySettings {
  controls: TransactionControls;
  periods: Record<LimitPeriod, PeriodRestriction>;
  /** Days outside every block do not allow transactions. Null when unrestricted. */
  scheduleBlocks: ScheduleBlock[] | null;
  minTransactionAmount: number | null;
  maxTransactionAmount: number | null;
  minTransactionVolume: number | null;
  maxTransactionVolume: number | null;
  showAvailableLiters: boolean;
  showAvailableBalance: boolean;
  showPreviousKm: boolean;
  allowKmChanges: boolean;
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
  settings?: PolicySettings;
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
}
