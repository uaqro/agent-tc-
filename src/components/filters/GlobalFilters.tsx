import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CLIENT_ACCOUNT_ID, clientAccount, clientOrgTree } from '../../data/client';
import { driverIdsInScope } from '../../data/fleet';
import { sessionPrincipal } from '../../data/session';
import { scopeFilterOptions } from '../../domain/rbac/scope';
import { businessNow } from '../../domain/demo/clock';
import { activeChips, type FilterChip } from '../../domain/filters/describe';
import { buildFilterOptions, cascade, reconcile, type FilterOptions } from '../../domain/filters/options';
import { ownerKeyFor, readFilters, writeFilters } from '../../domain/filters/store';
import { ANY, DEFAULT_FILTERS, clearDimensions, type FilterDimension, type GlobalFilters } from '../../domain/filters/types';

/**
 * Global context filters, ported from eOne (US-010): one period and nine dimensions that every page consuming the
 * context cuts by. Kept in `sessionStorage` per user and account, so a reload keeps them and closing the tab clears
 * them. The options only offer what the session scope lets the user see (ADR-TCP-001); the shell remounts this
 * provider when the session changes.
 */
interface GlobalFiltersValue {
  filters: GlobalFilters;
  options: FilterOptions;
  chips: FilterChip[];
  /** Applies a change and drops the earlier choices it made impossible (a unit outside the new group, say). */
  update: (patch: Partial<GlobalFilters>) => void;
  clearDimension: (dimension: FilterDimension) => void;
  /** Clears every dimension and keeps the period. */
  clearAll: () => void;
  /** Problem with the browser storage, to tell the user instead of failing silently. */
  storageError: string | null;
}

const GlobalFiltersContext = createContext<GlobalFiltersValue | null>(null);

function initialFilters(ownerKey: string, options: FilterOptions): { filters: GlobalFilters; error: string | null } {
  const stored = readFilters(ownerKey);
  if (stored.value === null) return { filters: DEFAULT_FILTERS, error: stored.error };
  return { filters: reconcile(stored.value, options).filters, error: stored.error };
}

export function GlobalFiltersProvider({ children }: { children: ReactNode }) {
  const ownerKey = useMemo(() => {
    const principal = sessionPrincipal();
    return ownerKeyFor({ userId: principal.userId, activeAccountId: principal.accountId });
  }, []);
  const options = useMemo(
    () =>
      scopeFilterOptions(
        buildFilterOptions([clientAccount], businessNow(), new Map([[CLIENT_ACCOUNT_ID, clientOrgTree]])),
        sessionPrincipal(),
        clientOrgTree,
        driverIdsInScope(),
      ),
    [],
  );
  const [state, setState] = useState(() => initialFilters(ownerKey, options));

  const commit = useCallback(
    (next: GlobalFilters) => {
      const written = writeFilters(ownerKey, next);
      setState({ filters: next, error: written.error });
    },
    [ownerKey],
  );

  const update = useCallback(
    (patch: Partial<GlobalFilters>) => commit(cascade({ ...state.filters, ...patch }, options)),
    [commit, options, state.filters],
  );

  const value = useMemo<GlobalFiltersValue>(
    () => ({
      filters: state.filters,
      options,
      chips: activeChips(state.filters, options),
      update,
      clearDimension: (dimension) => update({ [dimension]: ANY }),
      clearAll: () => commit(clearDimensions(state.filters)),
      storageError: state.error,
    }),
    [state, options, update, commit],
  );

  return <GlobalFiltersContext.Provider value={value}>{children}</GlobalFiltersContext.Provider>;
}

export function useGlobalFilters(): GlobalFiltersValue {
  const value = useContext(GlobalFiltersContext);
  if (!value) throw new Error('useGlobalFilters must be used inside <GlobalFiltersProvider>');
  return value;
}
