import type { NotificationItem } from '@er-mobility-mx/design-system';
import type { FleetAlert, Severity } from './intelligence';

export interface AlertState {
  readIds: string[];
  dismissedIds: string[];
}

export type AlertAction =
  | { type: 'read'; ids: string[] }
  | { type: 'dismiss'; id: string };

export const INITIAL_ALERT_STATE: AlertState = { readIds: [], dismissedIds: [] };

export function alertReducer(state: AlertState, action: AlertAction): AlertState {
  if (action.type === 'read') {
    return { ...state, readIds: [...new Set([...state.readIds, ...action.ids])] };
  }
  return { ...state, dismissedIds: [...new Set([...state.dismissedIds, action.id])] };
}

const TONES: Record<Severity, NotificationItem['tone']> = {
  critical: 'danger', warning: 'warning', info: 'info', success: 'success',
};

export function activeAlerts(alerts: FleetAlert[], state: AlertState): FleetAlert[] {
  return alerts.filter((alert) => !state.dismissedIds.includes(alert.id));
}

export function alertNotifications(alerts: FleetAlert[], state: AlertState): NotificationItem[] {
  return activeAlerts(alerts, state).map((alert) => ({
    id: alert.id, title: alert.title, desc: alert.detail, time: alert.when,
    tone: TONES[alert.severity], read: state.readIds.includes(alert.id),
  }));
}
