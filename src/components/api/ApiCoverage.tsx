import { useEffect, useId, useRef, useState } from 'react';
import {
  API_NAME,
  API_STATUS_HINT,
  API_STATUS_LABEL,
  API_VERSION,
  apiGeneralConstraints,
  apiOpportunities,
  capabilitiesFor,
  capabilityById,
  type ApiStatus,
  type FuelPage,
} from '../../data/apiCoverage';
import { useDevMode } from '../dev/DevMode';
import { ChevronDownIcon } from '../icons/Icons';
import { Switch } from '@er-mobility-mx/design-system';
import './ApiCoverage.css';

/** Coverage aids only exist in dev mode; `showCoverage` switches the markers on the pages. */
const useCoverage = () => {
  const { devMode, showCoverage, update } = useDevMode();
  return { visible: devMode, enabled: devMode && showCoverage, setEnabled: (value: boolean) => update({ showCoverage: value }) };
};

const POPOVER_WIDTH = 320;

const STATUS_SHORT: Record<ApiStatus, string> = {
  available: 'API',
  partial: 'API parcial',
  unavailable: 'Sin API',
};

/** Inline marker next to a feature; hidden unless the highlight switch is on. */
export function ApiTag({ id }: { id: string }) {
  const { enabled } = useCoverage();
  const capability = capabilityById(id);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const popoverId = useId();
  const open = position !== null;
  const setOpen = (next: boolean) => {
    const rect = ref.current?.getBoundingClientRect();
    // Fixed so cards and table scrollers with `overflow: hidden` don't clip it.
    setPosition(next && rect ? { top: rect.bottom + 6, left: Math.max(16, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 16)) } : null);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setPosition(null);
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (!enabled || !capability) return null;

  return (
    <span className="api-tag" ref={ref}>
      <button
        type="button"
        className={`api-tag__pill api-tag__pill--${capability.status}`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(!open);
        }}
      >
        <span className="api-tag__dot" aria-hidden="true" />
        {STATUS_SHORT[capability.status]}
        <span className="visually-hidden">: {capability.label}. Ver detalle de la integración</span>
      </button>
      {open && (
        <span
          className="api-tag__popover"
          id={popoverId}
          role="dialog"
          aria-label={`Integración: ${capability.label}`}
          style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
        >
          <span className={`api-tag__status api-tag__status--${capability.status}`}>{API_STATUS_LABEL[capability.status]}</span>
          <strong className="api-tag__title">{capability.label}</strong>
          <span className="api-tag__note">{capability.note}</span>
          {capability.methods.length > 0 ? (
            <span className="api-tag__methods">
              {capability.methods.map((method) => (
                <code key={method}>{method}</code>
              ))}
            </span>
          ) : (
            <span className="api-tag__no-method">Sin método en {API_NAME}</span>
          )}
        </span>
      )}
    </span>
  );
}

/** A caption line holding a tag, for blocks without a title of their own; renders nothing while markers are off. */
export function ApiTagRow({ id, label }: { id: string; label: string }) {
  const { enabled } = useCoverage();
  if (!enabled) return null;
  return (
    <p className="api-tag-row">
      {label}
      <ApiTag id={id} />
    </p>
  );
}

const COUNT_LABEL: Record<ApiStatus, [string, string]> = {
  available: ['disponible', 'disponibles'],
  partial: ['parcial', 'parciales'],
  unavailable: ['no disponible', 'no disponibles'],
};

const ORDER: ApiStatus[] = ['available', 'partial', 'unavailable'];

/** Per-page summary of what the headless fuel API supports, with the switch for the inline markers. */
export function ApiCoverageBanner({ page }: { page: FuelPage }) {
  const { visible, enabled, setEnabled } = useCoverage();
  const [expanded, setExpanded] = useState(false);
  const capabilities = capabilitiesFor(page);
  const opportunities = apiOpportunities[page];
  const detailId = useId();

  if (!visible) return null;

  return (
    <section className="api-banner" aria-label="Cobertura de la integración headless">
      <div className="api-banner__head">
        <div className="api-banner__intro">
          <p className="api-banner__eyebrow">
            Integración headless · {API_NAME} ({API_VERSION})
          </p>
          <p className="api-banner__headline">Qué podemos hacer hoy en esta página</p>
          <ul className="api-banner__counts">
            {ORDER.map((status) => {
              const count = capabilities.filter((capability) => capability.status === status).length;
              return (
                <li key={status} className={`api-banner__count api-banner__count--${status}`}>
                  <strong>{count}</strong> {count === 1 ? COUNT_LABEL[status][0] : COUNT_LABEL[status][1]}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="api-banner__actions">
          <div className="api-banner__switch">
            <Switch checked={enabled} label="Marcar en la página" onChange={setEnabled} />
          </div>
          <button type="button" className="btn btn--secondary btn--sm" aria-expanded={expanded} aria-controls={detailId} onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Ocultar detalle' : 'Ver detalle'}
            <ChevronDownIcon width={14} height={14} className={expanded ? 'api-banner__chevron is-open' : 'api-banner__chevron'} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="api-banner__detail" id={detailId}>
          <div className="api-banner__columns">
            {ORDER.map((status) => {
              const items = capabilities.filter((capability) => capability.status === status);
              return (
                <div key={status} className={`api-banner__column api-banner__column--${status}`}>
                  <p className="api-banner__column-title">{API_STATUS_LABEL[status]}</p>
                  <p className="api-banner__column-hint">{API_STATUS_HINT[status]}</p>
                  {items.length === 0 ? (
                    <p className="api-banner__none">Nada en esta página.</p>
                  ) : (
                    <ul>
                      {items.map((capability) => (
                        <li key={capability.id}>
                          <strong>{capability.label}</strong>
                          <span>{capability.note}</span>
                          {capability.methods.length > 0 && (
                            <span className="api-tag__methods">
                              {capability.methods.map((method) => (
                                <code key={method}>{method}</code>
                              ))}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <div className="api-banner__extras">
            {opportunities.length > 0 && (
              <div>
                <p className="api-banner__column-title">La API lo permite y el mockup aún no lo muestra</p>
                <ul>
                  {opportunities.map((item) => (
                    <li key={item.label}>
                      <strong>{item.label}</strong>
                      <span>{item.note}</span>
                      <span className="api-tag__methods">
                        {item.methods.map((method) => (
                          <code key={method}>{method}</code>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="api-banner__column-title">Restricciones generales</p>
              <ul className="api-banner__constraints">
                {apiGeneralConstraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
