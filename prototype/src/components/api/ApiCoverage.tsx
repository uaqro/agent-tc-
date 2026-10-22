import { useId, useRef, useState } from 'react';
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
import { Accordion, Badge, Popover, Switch } from '@er-mobility-mx/design-system';
import './ApiCoverage.css';

/** Coverage aids only exist in dev mode; `showCoverage` switches the markers on the pages. */
const useCoverage = () => {
  const { devMode, showCoverage, update } = useDevMode();
  return { visible: devMode, enabled: devMode && showCoverage, setEnabled: (value: boolean) => update({ showCoverage: value }) };
};

const STATUS_SHORT: Record<ApiStatus, string> = {
  available: 'API',
  partial: 'API parcial',
  unavailable: 'Sin API',
};

const STATUS_TONE: Record<ApiStatus, 'success' | 'warning' | 'danger'> = {
  available: 'success',
  partial: 'warning',
  unavailable: 'danger',
};

/** Inline marker next to a feature; hidden unless the highlight switch is on. */
export function ApiTag({ id }: { id: string }) {
  const { enabled } = useCoverage();
  const capability = capabilityById(id);
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (!enabled || !capability) return null;

  return (
    <span className="api-tag">
      <button
        ref={triggerRef}
        type="button"
        className="api-tag__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Badge tone={STATUS_TONE[capability.status]} live style={{ border: '1px dashed currentColor', fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>
          {STATUS_SHORT[capability.status]}
        </Badge>
        <span className="visually-hidden">: {capability.label}. Ver detalle de la integración</span>
      </button>
      <Popover
        placement="bottom-start"
        anchorRef={triggerRef}
        returnFocusRef={triggerRef}
        surface="none"
        open={open}
        onOpenChange={setOpen}
      >
        <div className="api-tag__popover" id={popoverId} role="dialog" aria-label={`Integración: ${capability.label}`}>
          <Badge tone={STATUS_TONE[capability.status]}>{API_STATUS_LABEL[capability.status]}</Badge>
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
        </div>
      </Popover>
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

/** Keeps column-level API markers accessible when a table renderer requires text-only headers. */
export function ApiTagGroup({ items }: { items: { id: string; label: string }[] }) {
  const { enabled } = useCoverage();
  if (!enabled) return null;
  return (
    <div className="api-tag-group" aria-label="Cobertura de las columnas">
      {items.map(({ id, label }) => (
        <span className="api-tag-group__item" key={id}>
          <span>{label}</span>
          <ApiTag id={id} />
        </span>
      ))}
    </div>
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
  const capabilities = capabilitiesFor(page);
  const opportunities = apiOpportunities[page];

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
                <li key={status}>
                  <Badge tone={status === 'available' ? 'success' : status === 'partial' ? 'warning' : 'danger'}>
                    {count}
                  </Badge>
                  {count === 1 ? COUNT_LABEL[status][0] : COUNT_LABEL[status][1]}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="api-banner__actions">
          <div className="api-banner__switch">
            <Switch checked={enabled} label="Marcar en la página" onChange={setEnabled} />
          </div>
        </div>
      </div>

      <div className="api-banner__accordion">
        <Accordion
          items={[
            {
              id: 'coverage-detail',
              title: 'Detalle de cobertura',
              content: (
                <div className="api-banner__detail">
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
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}
