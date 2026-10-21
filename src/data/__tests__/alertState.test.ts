import { describe, expect, it } from 'vitest';
import { activeAlerts, alertNotifications, alertReducer, INITIAL_ALERT_STATE } from '../alertState';
import { fleetAlerts } from '../intelligence';

describe('shared alert and notification state', () => {
  it('maps the active source to notifications with stable identities and severity', () => {
    const items = alertNotifications(fleetAlerts, INITIAL_ALERT_STATE);
    expect(items.map((item) => item.id)).toEqual(fleetAlerts.map((alert) => alert.id));
    expect(items.every((item) => !item.read)).toBe(true);
    expect(items[0]).toMatchObject({ tone: 'danger', title: fleetAlerts[0].title, desc: fleetAlerts[0].detail });
  });

  it('reading one or all alerts never dismisses them', () => {
    const one = alertReducer(INITIAL_ALERT_STATE, { type: 'read', ids: ['a-1'] });
    expect(alertNotifications(fleetAlerts, one).filter((item) => item.read).map((item) => item.id)).toEqual(['a-1']);
    const all = alertReducer(one, { type: 'read', ids: fleetAlerts.map((alert) => alert.id) });
    expect(activeAlerts(fleetAlerts, all)).toHaveLength(fleetAlerts.length);
    expect(alertNotifications(fleetAlerts, all).every((item) => item.read)).toBe(true);
    expect(all.dismissedIds).toEqual([]);
  });

  it('dismissal removes the same entity from both surfaces without marking others read', () => {
    const state = alertReducer(INITIAL_ALERT_STATE, { type: 'dismiss', id: 'a-1' });
    expect(activeAlerts(fleetAlerts, state).some((alert) => alert.id === 'a-1')).toBe(false);
    expect(alertNotifications(fleetAlerts, state).some((item) => item.id === 'a-1')).toBe(false);
    expect(state.readIds).toEqual([]);
    expect(alertNotifications(fleetAlerts, state).every((item) => !item.read)).toBe(true);
  });

  it('deduplicates repeated transitions and does not mutate the initial state', () => {
    const read = alertReducer(INITIAL_ALERT_STATE, { type: 'read', ids: ['a-1', 'a-1'] });
    const dismissed = alertReducer(alertReducer(read, { type: 'dismiss', id: 'a-2' }), { type: 'dismiss', id: 'a-2' });
    expect(dismissed).toEqual({ readIds: ['a-1'], dismissedIds: ['a-2'] });
    expect(INITIAL_ALERT_STATE).toEqual({ readIds: [], dismissedIds: [] });
  });
});
