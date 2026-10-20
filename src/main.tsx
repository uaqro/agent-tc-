import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DevModeProvider } from './components/dev/DevMode';
import { GlobalFiltersProvider } from './components/filters/GlobalFilters';
import { SessionProvider, useSession } from './components/session/Session';
import { sessionKey } from './data/session';
import './index.css';
import '@er-mobility-mx/design-system/styles.css';

/** Remounts the filters and every page when the session changes, so they read the newly scoped data. */
function ScopedApp() {
  const { principal } = useSession();
  return (
    <GlobalFiltersProvider key={`${principal.userId}|${sessionKey()}`}>
      <App />
    </GlobalFiltersProvider>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

createRoot(container).render(
  <StrictMode>
    <DevModeProvider>
      <SessionProvider>
        <ScopedApp />
      </SessionProvider>
    </DevModeProvider>
  </StrictMode>,
);
