/**
 * Every "today" in the portal is the business date: the demo date (16 October 2026) by default, never the computer's.
 * The tests put the computer on another day and check that nothing follows it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DEMO_DATE, reloadDemoDateForTests, today } from '../../domain/demo/clock';
import { daysUntil } from '../../utils/format';
import { overrideUntil, periodEnd } from '../limits';
import { emptyDraft, nextRunOf } from '../ruleTypes';

beforeEach(() => {
  vi.useFakeTimers();
  // Wednesday 3 March 2027, 09:30 on the computer.
  vi.setSystemTime(new Date(2027, 2, 3, 9, 30));
  reloadDemoDateForTests();
});

afterEach(() => {
  vi.useRealTimers();
  reloadDemoDateForTests();
});

describe('the portal runs on the demo date', () => {
  it('today is 16 October 2026, with the wall clock time', () => {
    expect(DEFAULT_DEMO_DATE).toBe('2026-10-16');
    const now = today();
    expect([now.getFullYear(), now.getMonth() + 1, now.getDate()]).toEqual([2026, 10, 16]);
    expect([now.getHours(), now.getMinutes()]).toEqual([9, 30]);
  });

  it('Límites exceptions expire from the demo date', () => {
    expect(overrideUntil('24h', 'month')).toBe('2026-10-17');
    expect(overrideUntil('7d', 'month')).toBe('2026-10-23');
    expect(overrideUntil('period', 'week')).toBe('2026-10-18');
    expect(overrideUntil('period', 'fortnight')).toBe('2026-10-31');
    expect(periodEnd('month')).toBe('2026-10-31');
    expect(periodEnd('day')).toBe('2026-10-16');
  });

  it('funding rules schedule their next run from the demo date', () => {
    expect(nextRunOf({ ...emptyDraft, type: 'top-off', cadence: 'weekly' })).toBe('2026-10-19');
    expect(nextRunOf({ ...emptyDraft, type: 'top-off', cadence: 'monthly' })).toBe('2026-11-01');
  });

  it('countdowns count from the demo date', () => {
    expect(daysUntil('2026-10-16')).toBe(0);
    expect(daysUntil('2026-10-31')).toBe(15);
  });
});
