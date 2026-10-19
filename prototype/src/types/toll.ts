/** Drive Tag pays fuel (NFC) and toll lanes (RFID) with one sticker; the toll tag only crosses lanes. */
export type TollTagType = 'drive-tag' | 'toll-tag';
export type TollTagStatus = 'active' | 'blocked' | 'unassigned' | 'replacement';

/** Toll category of the vehicle, as charged at the plaza. */
export type TollCategory = 'A' | 'B' | 'C2' | 'C3' | 'C5' | 'T3S2';

export interface TollTag {
  id: string;
  type: TollTagType;
  number: string;
  vehicleId: string | null;
  status: TollTagStatus;
  category: TollCategory;
  balanceMXN: number;
  policyId: string | null;
  spentPeriodMXN: number;
  crossingsToday: number;
  rejections7d: number;
  lastCrossing: string | null;
  lastPlaza: string | null;
}

export type TollPeriod = 'day' | 'week' | 'month';

export interface TollPolicy {
  id: string;
  name: string;
  status: 'active' | 'paused';
  groupIds: string[];
  period: TollPeriod;
  periodLimitMXN: number;
  maxCrossingsPerDay: number;
  /** Empty list means the whole toll network. */
  roadIds: string[];
  allowUrbanHighways: boolean;
  days: number[];
  timeFrom: string;
  timeTo: string;
  /** Rejects a crossing charged with a category different from the one registered for the tag. */
  categoryLock: boolean;
}

export interface TollRoad {
  id: string;
  label: string;
  plazas: number;
}

/** Automatic top-up of the tags of one group. */
export interface TollAutoTopUp {
  groupId: string;
  enabled: boolean;
  thresholdMXN: number;
  targetMXN: number;
}

export type TollMovementKind = 'crossing' | 'top-up' | 'cut' | 'rejected';

export interface TollMovement {
  id: string;
  kind: TollMovementKind;
  tagId: string;
  at: string;
  amountMXN: number;
  detail: string;
}
