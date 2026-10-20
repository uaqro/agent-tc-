/** Electromovilidad: the EV Manager model (ER-Mobility-MX/EV-Manager) inside Ticket Car+. */

export type EvConnector = 'CCS2' | 'CHAdeMO' | 'Type2';

export type EvVehicleType = 'electric' | 'hybrid';

export type EvVehicleStatus = 'active' | 'maintenance' | 'inactive';

export interface EvVehicle {
  id: string;
  alias: string;
  brand: string;
  model: string;
  trim: string;
  year: number;
  vin: string;
  plate: string;
  type: EvVehicleType;
  batteryKwh: number;
  rangeKm: number;
  connector: EvConnector;
  maxPowerKw: number;
  costCenterId: string;
  groupId: string;
  status: EvVehicleStatus;
}

export interface EvCostCenter {
  id: string;
  code: string;
  name: string;
}

export interface EvGroup {
  id: string;
  name: string;
}

export type EvCardType = 'rfid' | 'virtual';

export type EvCardStatus = 'unassigned' | 'active' | 'blocked' | 'cancelled' | 'expired';

/** A payment medium is never stored in full (RN-CARD-4): only the mask and the provider token. */
export interface EvCard {
  id: string;
  type: EvCardType;
  masked: string;
  status: EvCardStatus;
  vehicleId: string | null;
  expires: string;
}

export type EvChargeType = 'slow' | 'fast' | 'ultra';

export type EvNetwork = 'public' | 'private';

export interface EvStation {
  id: string;
  name: string;
  operator: string;
  city: string;
  network: EvNetwork;
  chargeType: EvChargeType;
  maxPowerKw: number;
  connectors: EvConnector[];
  /** MXN per kWh before IVA and platform fee. */
  tariffPerKwh: number;
}

export type EvSessionStatus = 'completed' | 'in-progress' | 'denied';

export interface EvSession {
  id: string;
  at: string;
  vehicleId: string;
  cardId: string;
  stationId: string;
  energyKwh: number;
  powerKw: number;
  durationMin: number;
  cost: number;
  tax: number;
  commission: number;
  total: number;
  status: EvSessionStatus;
  denyReason?: string;
}

export type EvLedgerType = 'funding' | 'charge' | 'hold' | 'hold-release' | 'adjustment';

/** Append-only (RN-ACC-4): a correction is a new entry, never an edit. */
export interface EvLedgerEntry {
  id: string;
  at: string;
  type: EvLedgerType;
  /** Signed: credits are positive, debits negative. A hold moves the committed balance, not the book balance. */
  amount: number;
  description: string;
}

export type EvFundingMethod = 'stp' | 'transfer' | 'card';

/** Net: the user names what reaches the account. Gross: the user names what they pay. */
export type EvFundingMode = 'net' | 'gross';

export interface EvFundingQuote {
  credited: number;
  commission: number;
  commissionTax: number;
  processingFee: number;
  processingTax: number;
  totalToPay: number;
}

export type EvFundingStatus = 'pending' | 'confirmed';

export interface EvFunding {
  id: string;
  at: string;
  method: EvFundingMethod;
  reference: string;
  quote: EvFundingQuote;
  status: EvFundingStatus;
}

export type EvPolicyScope = 'company' | 'cost-center' | 'group' | 'vehicle';

export type EvDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface EvPolicyRules {
  schedule?: { from: string; to: string };
  allowedDays?: EvDay[];
  maxSessionsDay?: number;
  maxKwhDay?: number;
  maxAmountDay?: number;
  network?: EvNetwork;
  chargeTypes?: EvChargeType[];
  maxPowerKw?: number;
}

export interface EvPolicy {
  id: string;
  name: string;
  scope: EvPolicyScope;
  /** Null for a company-wide policy. */
  targetId: string | null;
  enabled: boolean;
  rules: EvPolicyRules;
}

export type EvChargerStatus = 'available' | 'in-use' | 'out-of-service';

/** A charger the company owns, at its own sites: the private network. */
export interface EvPrivateCharger {
  id: string;
  stationId: string;
  name: string;
  status: EvChargerStatus;
  powerKw: number;
  connector: EvConnector;
}

export type EvChargerRequestType = 'integrate' | 'install';

export type EvChargerRequestStatus =
  | 'submitted'
  | 'triage'
  | 'needs-info'
  | 'quoted'
  | 'approved'
  | 'scheduled'
  | 'in-implementation'
  | 'integration-test'
  | 'live'
  | 'rejected'
  | 'cancelled';

/** A request does not create an operating charger until it is live. */
export interface EvChargerRequest {
  id: string;
  type: EvChargerRequestType;
  location: string;
  address: string;
  contact: string;
  email: string;
  createdAt: string;
  desiredDate: string | null;
  status: EvChargerRequestStatus;
  units: number;
  powerKw: number;
  connector: EvConnector;
  needsCivilWork: boolean;
  /** Only for `integrate`: the charger already installed. */
  existingBrand?: string;
  protocol?: string;
}
