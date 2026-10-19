import { useMemo, useState } from 'react';
import { AlertIcon, CheckCircleIcon, InfoIcon, SparklesIcon } from '../../components/icons/Icons';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  SEVERITY_META,
  fleetAlerts,
  optimizationInsights,
  type FleetAlert,
  type InsightAction,
  type Severity,
} from '../../data/intelligence';
import type { AppRoute } from '../../types';
import { formatMoney } from '../../utils/format';
import './intelligence.css';
import './InsightsPage.css';

interface InsightsPageProps {
  onNotice: (message: string) => void;
  onNavigate: (route: AppRoute) => void;
}

const SEVERITIES: Severity[] = ['critical', 'warning', 'info', 'success'];

const SEVERITY_ICON: Record<Severity, typeof AlertIcon> = {
  critical: AlertIcon,
  warning: AlertIcon,
  info: InfoIcon,
  success: CheckCircleIcon,
};

export function InsightsPage({ onNotice, onNavigate }: InsightsPageProps) {
  const [tab, setTab] = useState<'alerts' | 'insights'>('alerts');
  const [alerts, setAlerts] = useState<FleetAlert[]>(fleetAlerts);
  const [severity, setSeverity] = useState<Severity | null>(null);

  const counts = useMemo(
    () => Object.fromEntries(SEVERITIES.map((key) => [key, alerts.filter((alert) => alert.severity === key).length])),
    [alerts],
  ) as Record<Severity, number>;

  const visible = severity ? alerts.filter((alert) => alert.severity === severity) : alerts;
  const totalSavings = optimizationInsights.reduce((sum, insight) => sum + insight.savingsMXN, 0);

  const run = (action: InsightAction) => {
    if (action.route) onNavigate(action.route);
    onNotice(action.notice);
  };

  return (
    <div className="intel insights">
      <div className="insights__summary" role="group" aria-label="Filtrar por severidad">
        {SEVERITIES.map((key) => (
          <button
            type="button"
            key={key}
            className={`insights__pill insights__pill--${key}${severity === key ? ' is-active' : ''}`}
            aria-pressed={severity === key}
            onClick={() => {
              setTab('alerts');
              setSeverity((current) => (current === key ? null : key));
            }}
          >
            <span className="insights__dot" aria-hidden="true" />
            {counts[key]} {counts[key] === 1 ? SEVERITY_META[key].label : SEVERITY_META[key].plural}
          </button>
        ))}
        <span className="insights__status">
          <span className="insights__live" aria-hidden="true" />
          Motor TED activo · actualizado hoy 11:20
        </span>
      </div>

      <div className="intel-tabs" role="tablist" aria-label="Vista">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'alerts'}
          className={tab === 'alerts' ? 'is-active' : ''}
          onClick={() => setTab('alerts')}
        >
          Alertas activas ({alerts.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'insights'}
          className={tab === 'insights' ? 'is-active' : ''}
          onClick={() => setTab('insights')}
        >
          Insights de optimización ({optimizationInsights.length})
        </button>
      </div>

      {tab === 'alerts' &&
        (visible.length === 0 ? (
          <EmptyState
            card
            icon={<CheckCircleIcon width={22} height={22} />}
            title={severity ? `Sin alertas de tipo ${SEVERITY_META[severity].label.toLowerCase()}` : 'Sin alertas activas'}
            description="TED revisa las cargas, los saldos y las políticas cada 15 minutos. Las alertas nuevas aparecerán aquí."
            actions={
              severity && (
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => setSeverity(null)}>
                  Ver todas las alertas
                </button>
              )
            }
          />
        ) : (
          <ul className="insights__list">
            {visible.map((alert) => {
              const Icon = SEVERITY_ICON[alert.severity];
              return (
                <li key={alert.id} className={`alert-card intel-card alert-card--${alert.severity}`}>
                  <span className="alert-card__icon">
                    <Icon width={18} height={18} />
                  </span>
                  <div className="alert-card__body">
                    <h2 className="alert-card__title">{alert.title}</h2>
                    <p className="alert-card__detail">{alert.detail}</p>
                    <p className="alert-card__meta">
                      <span className="alert-card__chip">{SEVERITY_META[alert.severity].label}</span>
                      {alert.meta}
                    </p>
                  </div>
                  <div className="alert-card__side">
                    <span className="alert-card__when">{alert.when}</span>
                    <div className="alert-card__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => {
                          setAlerts((current) => current.filter((candidate) => candidate.id !== alert.id));
                          onNotice(`Alerta descartada: ${alert.title}.`);
                        }}
                      >
                        Descartar
                      </button>
                      <button type="button" className="alert-card__action btn btn--sm" onClick={() => run(alert.action)}>
                        {alert.action.label}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ))}

      {tab === 'insights' && (
        <>
          <section className="insights__savings intel-card">
            <span className="intel-kpi__icon tone--green">
              <SparklesIcon width={20} height={20} />
            </span>
            <div>
              <p className="intel-kpi__label">Ahorro potencial si aplicas todas las recomendaciones</p>
              <p className="intel-kpi__value">{formatMoney(totalSavings)} / mes</p>
            </div>
          </section>

          <ul className="insights__grid">
            {optimizationInsights.map((insight) => (
              <li key={insight.id} className="insight-card intel-card">
                <header className="insight-card__head">
                  <h2 className="insight-card__title">{insight.title}</h2>
                  <span className="chip chip--info">Esfuerzo {insight.effort.toLowerCase()}</span>
                </header>
                <p className="insight-card__detail">{insight.detail}</p>
                <footer className="insight-card__foot">
                  <span className="insight-card__savings">
                    {formatMoney(insight.savingsMXN)}
                    <small>ahorro estimado al mes</small>
                  </span>
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => run(insight.action)}>
                    {insight.action.label}
                  </button>
                </footer>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
