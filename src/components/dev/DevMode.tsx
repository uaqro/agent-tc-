import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { internalPrincipals, portalPrincipals } from '../../data/access';
import { scopeLabel } from '../../data/client';
import { DEFAULT_PRINCIPAL } from '../../data/session';
import { sessionRoleName } from '../../domain/rbac/portal-roles';
import { useSession } from '../session/Session';
import './DevMode.css';

export interface DevSettings {
  /** Master switch: shows the Dev section and every developer aid. */
  devMode: boolean;
  /** Banners and inline tags with the coverage of the headless API. */
  showCoverage: boolean;
}

interface DevModeState extends DevSettings {
  update: (changes: Partial<DevSettings>) => void;
}

const STORAGE_KEY = 'tc-dev-settings';
const DEFAULTS: DevSettings = { devMode: false, showCoverage: true };

const readSettings = (): DevSettings => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DevSettings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
};

const DevModeContext = createContext<DevModeState>({ ...DEFAULTS, update: () => undefined });

export const useDevMode = () => useContext(DevModeContext);

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DevSettings>(readSettings);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage can be blocked; the settings still work for this visit.
    }
  }, [settings]);

  return (
    <DevModeContext.Provider value={{ ...settings, update: (changes) => setSettings((current) => ({ ...current, ...changes })) }}>
      {children}
    </DevModeContext.Provider>
  );
}

interface DevSwitchProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}

function DevSwitch({ checked, disabled, label, description, onChange }: DevSwitchProps) {
  return (
    <label className={`dev-switch${disabled ? ' is-disabled' : ''}`}>
      <span className="dev-switch__text">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="dev-switch__track" aria-hidden="true" />
    </label>
  );
}

/** Internal roles see only the active account: analytics never compare accounts (ADR-TCP-001). */
const clientCaption = 'cuenta activa';

/** Top bar control: shows whether dev mode is on and opens the dev settings. */
export function DevModeMenu({ onOpenImprovements }: { onOpenImprovements: () => void }) {
  const { devMode, showCoverage, update } = useDevMode();
  const { principal, signInAs } = useSession();
  const [open, setOpen] = useState(false);
  const everyone = [...portalPrincipals, ...internalPrincipals];
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="dev-menu" ref={ref}>
      <button
        type="button"
        className={`dev-menu__trigger${devMode ? ' is-on' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="dev-menu__code" aria-hidden="true">
          {'</>'}
        </span>
        Dev
        <span className="dev-menu__state">{devMode ? 'ON' : 'OFF'}</span>
      </button>

      {open && (
        <div className="dev-menu__panel" role="dialog" aria-label="Configuración de desarrollo">
          <p className="dev-menu__title">Configuración de desarrollo</p>
          <p className="dev-menu__hint">Se guarda en este navegador. No la ven otros usuarios.</p>

          <DevSwitch
            checked={devMode}
            label="Dev mode"
            description="Muestra la sección Dev en el menú y las ayudas para desarrollo."
            onChange={(checked) => update({ devMode: checked })}
          />
          <DevSwitch
            checked={showCoverage}
            disabled={!devMode}
            label="Cobertura de API en las páginas"
            description="Recuadro y etiquetas de qué resuelve la API ZERO en Combustible, Flota y Parámetros."
            onChange={(checked) => update({ showCoverage: checked })}
          />

          <label className={`dev-menu__view-as${devMode ? '' : ' is-disabled'}`}>
            <strong>Ver el portal como</strong>
            <small>Simula el rol y el alcance de otro usuario. Los roles internos de Edenred solo existen aquí.</small>
            <select
              value={principal.userId}
              disabled={!devMode}
              onChange={(event) => signInAs(everyone.find((candidate) => candidate.userId === event.target.value) ?? DEFAULT_PRINCIPAL)}
            >
              <optgroup label="Usuarios del portal">
                {portalPrincipals.map((candidate) => (
                  <option key={candidate.userId} value={candidate.userId}>
                    {candidate.name} · {sessionRoleName(candidate.role)} · {scopeLabel(candidate.scopeNodeId)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Internos de Edenred · solo Dev">
                {internalPrincipals.map((candidate) => (
                  <option key={candidate.userId} value={candidate.userId}>
                    {candidate.name} · {clientCaption}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <button
            type="button"
            className="btn btn--secondary btn--sm dev-menu__link"
            disabled={!devMode}
            onClick={() => {
              setOpen(false);
              onOpenImprovements();
            }}
          >
            Ver mejoras para API ZERO
          </button>
        </div>
      )}
    </div>
  );
}
