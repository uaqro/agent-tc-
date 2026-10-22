import { useState } from 'react';
import { Modal } from '../ui/Modal';
import {
  ALERT_OPERATORS,
  ALERT_RULE_DEFINITIONS,
  DELIVERY_CHANNELS,
  alertRuleDefinition,
  alertValueError,
  type AlertContact,
  type AlertOperator,
  type AlertRuleConfig,
  type AlertUnitOption,
  type DeliveryChannel,
} from '../../data/operationalAlerts';

type DialogTab = 'rule' | 'units' | 'contacts';

interface AlertRuleDialogProps {
  rule?: AlertRuleConfig;
  contacts: AlertContact[];
  units: AlertUnitOption[];
  onClose: () => void;
  onSave: (rule: AlertRuleConfig) => void;
}

export function AlertRuleDialog({ rule, contacts, units, onClose, onSave }: AlertRuleDialogProps) {
  const [tab, setTab] = useState<DialogTab>('rule');
  const [form, setForm] = useState<AlertRuleConfig>(() => rule ?? {
    id: `alert-${Date.now()}`,
    typeId: ALERT_RULE_DEFINITIONS[0]!.id,
    operator: ALERT_RULE_DEFINITIONS[0]!.operators[0]!,
    value: '',
    channels: ['email'],
    allUnits: true,
    unitIds: [],
    contactIds: contacts[0] ? [contacts[0].id] : [],
    active: true,
  });
  const [error, setError] = useState('');
  const definition = alertRuleDefinition(form.typeId) ?? ALERT_RULE_DEFINITIONS[0]!;
  const selectedContacts = contacts.filter((contact) => form.contactIds.includes(contact.id));
  const phoneChannelsSelected = form.channels.some((channel) => channel === 'whatsapp' || channel === 'sms');
  const hasPhoneGap = phoneChannelsSelected && selectedContacts.some((contact) => !contact.phone);
  const valid = !alertValueError(definition, form.value) && form.channels.length > 0 && form.contactIds.length > 0 && (form.allUnits || form.unitIds.length > 0);

  const toggleChannel = (channel: DeliveryChannel) => {
    setForm((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel],
    }));
  };

  const toggleContact = (id: string) => {
    setForm((current) => ({
      ...current,
      contactIds: current.contactIds.includes(id)
        ? current.contactIds.filter((item) => item !== id)
        : [...current.contactIds, id],
    }));
  };

  const toggleUnit = (id: string) => {
    setForm((current) => ({
      ...current,
      unitIds: current.unitIds.includes(id)
        ? current.unitIds.filter((item) => item !== id)
        : [...current.unitIds, id],
    }));
  };

  const save = () => {
    const valueError = alertValueError(definition, form.value);
    if (valueError) {
      setTab('rule');
      setError(valueError);
      return;
    }
    if (form.channels.length === 0 || form.contactIds.length === 0 || (!form.allUnits && form.unitIds.length === 0)) {
      setError('Selecciona al menos un medio, una unidad o todos los dispositivos, y un contacto.');
      return;
    }
    onSave(form);
  };

  return (
    <Modal
      open
      title={rule ? 'Editar alerta' : 'Nueva alerta'}
      subtitle="Configura la condición, las unidades y los contactos destinatarios."
      size="lg"
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn--primary" disabled={!valid} onClick={save}>Guardar alerta</button>
        </>
      )}
    >
      <div className="alerts-dialog">
        <div className="alerts-dialog__tabs" role="tablist" aria-label="Configuración de alerta">
          {([['rule', 'Alerta'], ['units', 'Unidad'], ['contacts', 'Contactos']] as const).map(([id, label]) => (
            <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} key={id} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === 'rule' && (
          <div className="alerts-dialog__panel">
            <label className="alerts-dialog__field alerts-dialog__field--wide">
              <span>Tipo de alerta</span>
              <select value={form.typeId} onChange={(event) => {
                const next = alertRuleDefinition(event.target.value)!;
                setForm((current) => ({ ...current, typeId: next.id, operator: next.operators[0]!, value: '' }));
                setError('');
              }}>
                {ALERT_RULE_DEFINITIONS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="alerts-dialog__field">
              <span>Operador</span>
              <select value={form.operator} onChange={(event) => setForm((current) => ({ ...current, operator: event.target.value as AlertOperator }))}>
                {definition.operators.map((operator) => <option value={operator} key={operator}>{ALERT_OPERATORS[operator]}</option>)}
              </select>
            </label>
            <label className="alerts-dialog__field">
              <span>Valor {definition.unit ? `(${definition.unit})` : ''}</span>
              <input
                type="number"
                step={definition.decimals === 2 ? '0.01' : '1'}
                min={definition.minimum}
                max={definition.maximum}
                value={form.value}
                onChange={(event) => { setForm((current) => ({ ...current, value: event.target.value })); setError(''); }}
                placeholder={definition.decimals === 2 ? '0.00' : '0'}
              />
            </label>
            <fieldset className="alerts-dialog__channels alerts-dialog__field--wide">
              <legend>Medios de notificación</legend>
              <div>
                {DELIVERY_CHANNELS.map((channel) => (
                  <label className="alerts-dialog__check" key={channel.id}>
                    <input type="checkbox" checked={form.channels.includes(channel.id)} onChange={() => toggleChannel(channel.id)} />
                    {channel.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {definition.id === 'negative-offline-balance' && <p className="alerts-dialog__help">Captura el umbral con signo negativo y dos decimales.</p>}
            {error && <p className="alerts-dialog__error" role="alert">{error}</p>}
          </div>
        )}

        {tab === 'units' && (
          <div className="alerts-dialog__panel">
            <label className="alerts-dialog__check alerts-dialog__all">
              <input type="checkbox" checked={form.allUnits} onChange={(event) => setForm((current) => ({ ...current, allUnits: event.target.checked, unitIds: event.target.checked ? [] : current.unitIds }))} />
              Todas las unidades
            </label>
            {!form.allUnits && (
              <div className="alerts-dialog__options" aria-label="Unidades disponibles">
                {units.map((unit) => (
                  <label className="alerts-dialog__check" key={unit.id}>
                    <input type="checkbox" checked={form.unitIds.includes(unit.id)} onChange={() => toggleUnit(unit.id)} />
                    {unit.label}
                  </label>
                ))}
              </div>
            )}
            <p className="alerts-dialog__help">La regla solo se evaluará para las unidades seleccionadas.</p>
            {error && <p className="alerts-dialog__error" role="alert">{error}</p>}
          </div>
        )}

        {tab === 'contacts' && (
          <div className="alerts-dialog__panel">
            <div className="alerts-dialog__options" aria-label="Contactos disponibles">
              {contacts.map((contact) => (
                <label className="alerts-dialog__contact" key={contact.id}>
                  <input type="checkbox" checked={form.contactIds.includes(contact.id)} onChange={() => toggleContact(contact.id)} />
                  <span><strong>{contact.name}</strong><small>{contact.email}</small></span>
                  <small>{contact.phone ?? 'Teléfono pendiente'}</small>
                </label>
              ))}
            </div>
            {error && <p className="alerts-dialog__error" role="alert">{error}</p>}
          </div>
        )}

        {hasPhoneGap && <p className="alerts-dialog__help">WhatsApp y SMS requieren un teléfono registrado en el contacto. El prototipo no envía mensajes.</p>}
      </div>
    </Modal>
  );
}