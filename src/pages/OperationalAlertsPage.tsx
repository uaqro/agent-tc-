import { useEffect, useMemo, useState } from 'react';
import { AlertIcon, CloseIcon, PlusIcon } from '../components/icons/Icons';
import { Pagination, usePagination } from '../components/ui/Pagination';
import { AlertRuleDialog } from '../components/alerts/AlertRuleDialog';
import { NotificationGroupDialog } from '../components/alerts/NotificationGroupDialog';
import { useSession } from '../components/session/Session';
import { operatingUnits } from '../data/client';
import { platformUsers } from '../data/company';
import {
  ALERT_RULE_DEFINITIONS,
  DEFAULT_ALERT_RULES,
  DEFAULT_NOTIFICATION_GROUPS,
  DELIVERY_CHANNELS,
  DEMO_ALERT_AUDIT,
  NOTIFICATION_TYPES,
  alertRuleDefinition,
  formatAlertCondition,
  type AlertAuditEntry,
  type AlertContact,
  type AlertRuleConfig,
  type AlertUnitOption,
  type DeliveryChannel,
  type NotificationGroupConfig,
} from '../data/operationalAlerts';
import './OperationalAlertsPage.css';

type AlertSection = 'rules' | 'notifications' | 'history';
type StorageValue = AlertRuleConfig[] | NotificationGroupConfig[];

const RULES_KEY = 'tcplus.operational-alerts.rules.v1';
const GROUPS_KEY = 'tcplus.operational-alerts.notifications.v1';
const CHANNEL_LABEL = Object.fromEntries(DELIVERY_CHANNELS.map((channel) => [channel.id, channel.label])) as Record<DeliveryChannel, string>;

function loadStored<T extends StorageValue>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    const parsed: unknown = value ? JSON.parse(value) : fallback;
    return Array.isArray(parsed) ? parsed as T : fallback;
  } catch {
    return fallback;
  }
}

function channelLabels(channels: DeliveryChannel[]): string {
  return channels.map((channel) => CHANNEL_LABEL[channel]).join(', ') || 'Sin medios';
}

function contactLabels(ids: string[], contacts: AlertContact[]): string {
  const labels = ids.map((id) => contacts.find((contact) => contact.id === id)?.name).filter((name): name is string => Boolean(name));
  return labels.length > 0 ? labels.join(', ') : 'Sin contactos';
}

function typeLabel(typeId: string): string {
  return ALERT_RULE_DEFINITIONS.find((type) => type.id === typeId)?.label ?? typeId;
}

function notificationTypeLabel(typeId: string): string {
  return NOTIFICATION_TYPES.find((type) => type.id === typeId)?.label ?? typeId;
}

function dateTime(value: string): string {
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

interface OperationalAlertsPageProps {
  canConfigure: boolean;
}

export function OperationalAlertsPage({ canConfigure }: OperationalAlertsPageProps) {
  const { principal } = useSession();
  const rulesKey = `${RULES_KEY}.${principal.userId}`;
  const groupsKey = `${GROUPS_KEY}.${principal.userId}`;
  const [section, setSection] = useState<AlertSection>('rules');
  const [rules, setRules] = useState<AlertRuleConfig[]>(() => loadStored(rulesKey, DEFAULT_ALERT_RULES));
  const [groups, setGroups] = useState<NotificationGroupConfig[]>(() => loadStored(groupsKey, DEFAULT_NOTIFICATION_GROUPS));
  const [ruleDialog, setRuleDialog] = useState<AlertRuleConfig | null | undefined>(undefined);
  const [groupDialog, setGroupDialog] = useState<NotificationGroupConfig | null | undefined>(undefined);
  const pageSize = 10;
  const contacts = useMemo<AlertContact[]>(() => platformUsers
    .filter((user) => user.status === 'active')
    .map((user) => ({ id: user.id, name: user.name, email: user.email, phone: null })), []);
  const units = useMemo<AlertUnitOption[]>(() => operatingUnits.slice(0, 50).map((unit) => ({ id: unit.id, label: unit.id })), []);
  const rulePagination = usePagination(rules, pageSize);

  useEffect(() => {
    try { window.localStorage.setItem(rulesKey, JSON.stringify(rules)); } catch { /* Local demo remains usable without storage. */ }
  }, [rules, rulesKey]);

  useEffect(() => {
    try { window.localStorage.setItem(groupsKey, JSON.stringify(groups)); } catch { /* Local demo remains usable without storage. */ }
  }, [groups, groupsKey]);

  const activeRules = rules.filter((rule) => rule.active).length;
  const activeGroups = groups.filter((group) => group.active).length;
  const enabledChannels = new Set([...rules, ...groups].filter((item) => item.active).flatMap((item) => item.channels)).size;

  const saveRule = (next: AlertRuleConfig) => {
    setRules((current) => current.some((rule) => rule.id === next.id)
      ? current.map((rule) => rule.id === next.id ? next : rule)
      : [next, ...current]);
    setRuleDialog(undefined);
  };

  const saveGroup = (next: NotificationGroupConfig) => {
    setGroups((current) => current.some((group) => group.id === next.id)
      ? current.map((group) => group.id === next.id ? next : group)
      : [next, ...current]);
    setGroupDialog(undefined);
  };

  const toggleRule = (id: string) => setRules((current) => current.map((rule) => rule.id === id ? { ...rule, active: !rule.active } : rule));
  const toggleGroup = (id: string) => setGroups((current) => current.map((group) => group.id === id ? { ...group, active: !group.active } : group));
  const deleteRule = (id: string) => setRules((current) => current.filter((rule) => rule.id !== id));
  const deleteGroup = (id: string) => setGroups((current) => current.filter((group) => group.id !== id));

  return (
    <div className="operational-alerts table-page">
      <div className="operational-alerts__notice" role="note">
        <AlertIcon width={17} height={17} />
        <span>Configuración de demostración: guarda cambios en este navegador, pero no envía comunicaciones reales.</span>
      </div>

      <dl className="table-page__summary operational-alerts__summary">
        <div><dt>Reglas activas</dt><dd>{activeRules}</dd></div>
        <div><dt>Grupos de notificación</dt><dd>{activeGroups}</dd></div>
        <div><dt>Medios configurados</dt><dd>{enabledChannels}</dd></div>
      </dl>

      <section className="table-page__card">
        <header className="table-page__head operational-alerts__head">
          <div className="operational-alerts__tabs" role="tablist" aria-label="Configuración de alertas">
            {([
              ['rules', `Reglas de alerta (${rules.length})`],
              ['notifications', `Notificaciones (${groups.length})`],
              ['history', 'Historial'],
            ] as const).map(([id, label]) => (
              <button type="button" role="tab" aria-selected={section === id} className={section === id ? 'is-active' : ''} key={id} onClick={() => setSection(id)}>{label}</button>
            ))}
          </div>
          {canConfigure && section === 'rules' && (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setRuleDialog(null)}><PlusIcon width={14} height={14} /> Nueva alerta</button>
          )}
          {canConfigure && section === 'notifications' && (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setGroupDialog(null)}><PlusIcon width={14} height={14} /> Nuevo grupo</button>
          )}
        </header>

        {section === 'rules' && (
          <>
            {rules.length === 0 ? (
              <div className="operational-alerts__empty"><p>No hay reglas configuradas.</p>{canConfigure && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setRuleDialog(null)}>Crear primera alerta</button>}</div>
            ) : (
              <div className="table-page__scroll">
                <table className="table-page__table operational-alerts__table">
                  <thead><tr><th>Tipo de alerta</th><th>Condición</th><th>Unidades</th><th>Medios</th><th>Contactos</th><th>Estado</th>{canConfigure && <th>Acciones</th>}</tr></thead>
                  <tbody>
                    {rulePagination.pageRows.map((rule) => {
                      const definition = alertRuleDefinition(rule.typeId);
                      return (
                        <tr key={rule.id}>
                          <td><span className="table-page__main">{typeLabel(rule.typeId)}</span></td>
                          <td>{definition ? formatAlertCondition(rule.operator, rule.value, definition.unit) : '—'}</td>
                          <td>{rule.allUnits ? 'Todas las unidades' : `${rule.unitIds.length} unidades`}</td>
                          <td>{channelLabels(rule.channels)}</td>
                          <td>{contactLabels(rule.contactIds, contacts)}</td>
                          <td><span className={`chip ${rule.active ? 'chip--active' : 'chip--paused'}`}>{rule.active ? 'Activa' : 'Inactiva'}</span></td>
                          {canConfigure && <td className="operational-alerts__actions">
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRuleDialog(rule)}>Editar</button>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleRule(rule.id)}>{rule.active ? 'Desactivar' : 'Activar'}</button>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => deleteRule(rule.id)} aria-label={`Eliminar ${typeLabel(rule.typeId)}`}><CloseIcon width={14} height={14} /></button>
                          </td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination {...rulePagination} noun="reglas" onPage={rulePagination.setPage} />
          </>
        )}

        {section === 'notifications' && (
          groups.length === 0 ? <div className="operational-alerts__empty"><p>No hay grupos de notificación configurados.</p>{canConfigure && <button type="button" className="btn btn--secondary btn--sm" onClick={() => setGroupDialog(null)}>Crear primer grupo</button>}</div> : (
            <div className="table-page__scroll">
              <table className="table-page__table operational-alerts__table">
                <thead><tr><th>Nombre</th><th>Tipo de notificación</th><th>Medios</th><th>Unidades</th><th>Conductores</th><th>Contactos</th><th>Estado</th>{canConfigure && <th>Acciones</th>}</tr></thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.id}>
                      <td><span className="table-page__main">{group.name}</span></td>
                      <td>{notificationTypeLabel(group.typeId)}</td>
                      <td>{channelLabels(group.channels)}</td>
                      <td>{group.allUnits ? 'Todas' : group.unitIds.length > 0 ? `${group.unitIds.length} seleccionadas` : 'Bloqueado'}</td>
                      <td>Bloqueado</td>
                      <td>{contactLabels(group.contactIds, contacts)}</td>
                      <td><span className={`chip ${group.active ? 'chip--active' : 'chip--paused'}`}>{group.active ? 'Activo' : 'Inactivo'}</span></td>
                      {canConfigure && <td className="operational-alerts__actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setGroupDialog(group)}>Editar</button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleGroup(group.id)}>{group.active ? 'Desactivar' : 'Activar'}</button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => deleteGroup(group.id)} aria-label={`Eliminar ${group.name}`}><CloseIcon width={14} height={14} /></button>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {section === 'history' && (
          <div className="table-page__scroll">
            <table className="table-page__table operational-alerts__table">
              <thead><tr><th>Cliente</th><th>Dispositivo</th><th>Regla / notificación</th><th>Contacto</th><th>Correo</th><th>Teléfono</th><th>Medio</th><th>Fecha y hora</th><th>Resultado</th></tr></thead>
              <tbody>
                {DEMO_ALERT_AUDIT.map((entry: AlertAuditEntry) => (
                  <tr key={entry.id}>
                    <td>{entry.client}</td><td>{entry.device}</td><td>{entry.rule}</td><td>{entry.contactName}</td><td>{entry.contactEmail}</td><td>{entry.contactPhone}</td><td>{CHANNEL_LABELS[entry.channel]}</td><td>{dateTime(entry.sentAt)}</td><td>{entry.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!canConfigure && <p className="operational-alerts__readonly">Tu rol puede consultar esta configuración, pero no modificarla.</p>}

      {ruleDialog !== undefined && canConfigure && <AlertRuleDialog key={ruleDialog?.id ?? 'new-alert'} rule={ruleDialog ?? undefined} contacts={contacts} units={units} onClose={() => setRuleDialog(undefined)} onSave={saveRule} />}
      {groupDialog !== undefined && canConfigure && <NotificationGroupDialog key={groupDialog?.id ?? 'new-group'} group={groupDialog ?? undefined} contacts={contacts} units={units} onClose={() => setGroupDialog(undefined)} onSave={saveGroup} />}
    </div>
  );
}

const CHANNEL_LABELS: Record<DeliveryChannel, string> = { email: 'Correo', whatsapp: 'WhatsApp', sms: 'SMS' };