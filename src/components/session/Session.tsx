import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PRINCIPAL, sessionPrincipal, setSessionPrincipal } from '../../data/session';
import type { PortalPrincipal } from '../../domain/rbac/scope';

interface SessionValue {
  principal: PortalPrincipal;
  /** True when dev mode is showing the portal as someone other than the signed-in user. */
  impersonating: boolean;
  /** Switches the session. The data modules re-scope before React renders the new principal. */
  signInAs: (next: PortalPrincipal) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [principal, setPrincipal] = useState<PortalPrincipal>(sessionPrincipal);

  const signInAs = useCallback((next: PortalPrincipal) => {
    setSessionPrincipal(next);
    setPrincipal(next);
  }, []);

  const value = useMemo(
    () => ({ principal, impersonating: principal.userId !== DEFAULT_PRINCIPAL.userId, signInAs }),
    [principal, signInAs],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
