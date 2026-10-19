import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DevModeProvider } from './components/dev/DevMode';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

createRoot(container).render(
  <StrictMode>
    <DevModeProvider>
      <App />
    </DevModeProvider>
  </StrictMode>,
);
