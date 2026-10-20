import { useMemo } from 'react';
import { businessNow, demoDateKey } from '../../domain/demo/clock';
import { buildEvFundings, buildEvLedger, buildEvSessions, evAccountTotals } from '../../data/electromobility';

/** Thirty days of charging and funding, rebuilt when the demo date changes. */
export function useEvHistory() {
  const key = demoDateKey();
  return useMemo(() => {
    const now = businessNow();
    const sessions = buildEvSessions(now);
    const fundings = buildEvFundings(now);
    const ledger = buildEvLedger(sessions, fundings);
    return { now, sessions, fundings, ledger, totals: evAccountTotals(ledger) };
  }, [key]);
}
