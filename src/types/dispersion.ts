export type RuleStatus = 'active' | 'paused' | 'needs-review';

/** The four ways the fleet manager automates a dispersion. */
export type RuleType = 'top-off' | 'schedule-fixed' | 'balance-threshold' | 'consumption';

export interface FundingRule {
  id: string;
  name: string;
  type: RuleType;
  scopeLabel: string;
  units: number;
  /** Rule logic written as one sentence, the way the user reads it. */
  summary: string;
  /** Cadence or event that fires the rule. */
  triggerText: string;
  measure: 'liters' | 'money';
  /** Null when the rule reacts to a threshold instead of a calendar. */
  nextRun: string | null;
  status: RuleStatus;
  statusNote?: string;
  projectedMXN: number;
  newUnits: number;
  excludedUnits: number;
  deltaPct: number;
  previousPeriodLabel: string;
  approved?: boolean;
}

export type AttentionKind = 'balance-request' | 'zero-balance' | 'anomalous-consumption' | 'trapped-balance';

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  vehicleId: string;
  detail: string;
  /** Amount proposed by the system, or requested by the driver. */
  amountMXN: number;
}

export interface Vehicle {
  id: string;
  plate: string;
  device: string;
  driver: string;
  group: string;
  balanceMXN: number;
  avgWeeklySpendMXN: number;
}

export interface VehicleGroup {
  id: string;
  label: string;
  units: number;
}

export interface ReceiptLine {
  plate: string;
  driver: string;
  amountMXN: number;
}

export type ReceiptKind = 'rule' | 'one-off' | 'cut' | 'bulk';

export interface Receipt {
  folio: string;
  kind: ReceiptKind;
  issuedAt: string;
  user: string;
  sourceLabel: string;
  scopeLabel: string;
  units: number;
  totalMXN: number;
  lines: ReceiptLine[];
}

export interface RunSimulation {
  rule: FundingRule;
  unitsAffected: number;
  newUnits: number;
  excludedUnits: number;
  totalMXN: number;
  totalLiters: number;
  availableBeforeMXN: number;
  availableAfterMXN: number;
  budgetMXN: number;
  budgetShare: number;
  deltaPct: number;
  previousPeriodLabel: string;
  flagged: boolean;
  sample: ReceiptLine[];
}

export type BulkRowStatus = 'ok' | 'not-found' | 'invalid';

export interface BulkRow {
  line: number;
  plate: string;
  driver: string;
  amountMXN: number;
  status: BulkRowStatus;
  message?: string;
}
