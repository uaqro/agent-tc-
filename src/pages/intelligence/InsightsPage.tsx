import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Badge, Button, Chip, ChipGroup, TabPanel, Tabs } from '@er-mobility-mx/design-system';
import { AlertIcon, CheckCircleIcon, InfoIcon, SparklesIcon } from '../../components/icons/Icons';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  SEVERITY_META,
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
  alerts: FleetAlert[];
  onDismiss: (id: string) => void;
  destination?: { id: string; requestId: number };
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

const SEVERITY_TONE: Record<Severity, 'danger' | 'warning' | 'info' | 'success'> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
  success: 'success',
};

const SEVERITY_CHIP_STYLE: Record<Severity, CSSProperties> = {
  critical: { color: 'var(--sev-critical)', backgroundColor: 'var(--sev-critical-bg)', borderColor: 'var(--sev-critical)' },
  warning: { color: 'var(--sev-warning)', backgroundColor: 'var(--sev-warning-bg)', borderColor: 'var(--sev-warning-line)' },
  info: { color: 'var(--sev-info)', backgroundColor: 'var(--sev-info-bg)', borderColor: 'var(--sev-info)' },
  success: { color: 'var(--sev-success)', backgroundColor: 'var(--sev-success-bg)', borderColor: 'var(--sev-success)' },
};

const INSIGHTS_TABS_ID = 'insights-view-tabs';

export function InsightsPage({ onNotice, onNavigate, alerts, onDismiss, destination }: InsightsPageProps) {
  const [tab, setTab] = useState<'alerts' | 'insights'>('alerts');
  const [severity, setSeverity] = useState<Severity | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const handled = useRef<number>();

  useEffect(() => {
    if (!destination || handled.current === destination.requestId) return;
    setTab('alerts');
    setSeverity(null);
  }, [destination]);

  useEffect(() => {
    if (!destination || handled.current === destination.requestId || tab !== 'alerts' || severity !== null) return;
    const card = [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-alert-id]') ?? [])]
      .find((element) => element.dataset.alertId === destination.id);
    if (card) {
      handled.current = destination.requestId;
      card.focus();
      card.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
  }, [destination, tab, severity]);

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
    <div className="intel insights" ref={rootRef}>
      <div className="insights__summary">
        <div role="group" aria-label="Filtrar por severidad">
          <ChipGroup style={{ gap: 8, flexWrap: 'wrap' }}>
            {SEVERITIES.map((key) => (
              <Chip
                key={key}
                label={`${counts[key]} ${counts[key] === 1 ? SEVERITY_META[key].label : SEVERITY_META[key].plural}`}
                size="sm"
                icon="fiber_manual_record"
                selected={severity === key}
                style={SEVERITY_CHIP_STYLE[key]}
                onClick={() => {
                  setTab('alerts');
                  setSeverity((current) => (current === key ? null : key));
                }}
              />
            ))}
          </ChipGroup>
        </div>
        <span className="insights__status">
          <Badge tone="success" live>Motor TED activo · actualizado hoy 11:20</Badge>
        </span>
      </div>

      <Tabs
        id={INSIGHTS_TABS_ID}
        items={[
          { value: 'alerts', label: `Alertas activas (${alerts.length})` },
          { value: 'insights', label: `Insights de optimización (${optimizationInsights.length})` },
        ]}
        value={tab}
        onChange={(value) => {
          if (value === 'alerts' || value === 'insights') setTab(value);
        }}
        ariaLabel="Vista de inteligencia"
      />

      <TabPanel tabsId={INSIGHTS_TABS_ID} value="alerts" active={tab === 'alerts'}>
        {visible.length === 0 ? (
          <EmptyState
            card
            icon="check_circle"
            title={severity ? `Sin alertas de tipo ${SEVERITY_META[severity].label.toLowerCase()}` : 'Sin alertas activas'}
            description="TED revisa las cargas, los saldos y las políticas cada 15 minutos. Las alertas nuevas aparecerán aquí."
            actions={
              severity && (
                <Button variant="secondary" size="sm" onClick={() => setSeverity(null)}>
                  Ver todas las alertas
                </Button>
              )
            }
          />
        ) : (
          <ul className="insights__list">
            {visible.map((alert) => {
              const Icon = SEVERITY_ICON[alert.severity];
              return (
                <li key={alert.id} data-alert-id={alert.id} tabIndex={-1} className={`alert-card intel-card alert-card--${alert.severity}`}>
                  <span className="alert-card__icon">
                    <Icon width={18} height={18} />
                  </span>
                  <div className="alert-card__body">
                    <h2 className="alert-card__title">{alert.title}</h2>
                    <p className="alert-card__detail">{alert.detail}</p>
                    <p className="alert-card__meta">
                      <Badge tone={SEVERITY_TONE[alert.severity]}>{SEVERITY_META[alert.severity].label}</Badge>
                      {alert.meta}
                    </p>
                  </div>
                  <div className="alert-card__side">
                    <span className="alert-card__when">{alert.when}</span>
                    <div className="alert-card__actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onDismiss(alert.id);
                          onNotice(`Alerta descartada: ${alert.title}.`);
                        }}
                      >
                        Descartar
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => run(alert.action)}>
                        {alert.action.label}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </TabPanel>

      <TabPanel tabsId={INSIGHTS_TABS_ID} value="insights" active={tab === 'insights'}>
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
                  <Chip label={`Esfuerzo ${insight.effort.toLowerCase()}`} size="sm" />
                </header>
                <p className="insight-card__detail">{insight.detail}</p>
                <footer className="insight-card__foot">
                  <span className="insight-card__savings">
                    {formatMoney(insight.savingsMXN)}
                    <small>ahorro estimado al mes</small>
                  </span>
                  <Button size="sm" onClick={() => run(insight.action)}>
                    {insight.action.label}
                  </Button>
                </footer>
              </li>
            ))}
          </ul>
        </>
      </TabPanel>
    </div>
  );
}
