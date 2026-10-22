import { useState } from 'react';
import { Modal } from '../ui/Modal';
import {
  DELIVERY_CHANNELS,
  NOTIFICATION_TYPES,
  notificationUnitSelectionEnabled,
  type AlertContact,
  type AlertUnitOption,
  type DeliveryChannel,
  type NotificationGroupConfig,
} from '../../data/operationalAlerts';

interface NotificationGroupDialogProps {
  group?: NotificationGroupConfig;
  contacts: AlertContact[];
  units: AlertUnitOption[];
  onClose: () => void;
  onSave: (group: NotificationGroupConfig) => void;
}

export function NotificationGroupDialog({ group, contacts, units, onClose, onSave }: NotificationGroupDialogProps) {
  const [form, setForm] = useState<NotificationGroupConfig>(() => group ?? {
    id: `notification-${Date.now()}`,
    name: '',
    typeId: NOTIFICATION_TYPES[0]!.id,
    channels: ['email'],
    allUnits: false,
    unitIds: [],
    allDrivers: false,
    contactIds: contacts[0] ? [contacts[0].id] : [],
    active: true,
  });
  const [error, setError] = useState('');
  const unitsAllowed = notificationUnitSelectionEnabled(form.typeId);
  const phoneChannelsSelected = form.channels.some((channel) => channel === 'whatsapp' || channel === 'sms');
  const hasPhoneGap = phoneChannelsSelected && contacts.some((contact) => form.contactIds.includes(contact.id) && !contact.phone);
  const valid = form.name.trim().length > 0 && form.channels.length > 0 && form.contactIds.length > 0 &&
    (!unitsAllowed || form.allUnits || form.unitIds.length > 0);

  const save = () => {
    if (!valid) {
      setError('Captura un nombre, selecciona al menos un medio y un contacto, y define el alcance de unidades.');
      return;
    }
    onSave(form);
  };

  const toggleChannel = (channel: DeliveryChannel) => setForm((current) => ({
    ...current,
    channels: current.channels.includes(channel) ? current.channels.filter((item) => item !== channel) : [...current.channels, channel],
  }));
  const toggleContact = (id: string) => setForm((current) => ({
    ...current,
    contactIds: current.contactIds.includes(id) ? current.contactIds.filter((item) => item !== id) : [...current.contactIds, id],
  }));
  const toggleUnit = (id: string) => setForm((current) => ({
    ...current,
    unitIds: current.unitIds.includes(id) ? current.unitIds.filter((item) => item !== id) : [...current.unitIds, id],
  }));

  return (
    <Modal
      open
      title={group ? 'Editar grupo de notificación' : 'Nuevo grupo de notificación'}
      subtitle="Define el evento, sus medios de envío y las personas destinatarias."
      size="lg"
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn--primary" disabled={!valid} onClick={save}>Guardar grupo</button>
        </>
      )}
    >
      <div className="alerts-dialog__panel">
        <label className="alerts-dialog__field alerts-dialog__field--wide">
          <span>Tipo de notificación</span>
          <select value={form.typeId} onChange={(event) => {
            const typeId = event.target.value;
            const canSelectUnits = notificationUnitSelectionEnabled(typeId);
            setForm((current) => ({ ...current, typeId, allUnits: canSelectUnits ? current.allUnits : false, unitIds: canSelectUnits ? current.unitIds : [] }));
          }}>
            {NOTIFICATION_TYPES.map((type) => <option value={type.id} key={type.id}>{type.label}</option>)}
          </select>
        </label>
        <label className="alerts-dialog__field alerts-dialog__field--wide">
          <span>Nombre del grupo</span>
          <input value={form.name} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setError(''); }} placeholder="Ej. Operación regional" />
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
        <fieldset className="alerts-dialog__scope alerts-dialog__field--wide">
          <legend>Alcance</legend>
          <label className="alerts-dialog__check">
            <input type="checkbox" checked={form.allUnits} disabled={!unitsAllowed} onChange={(event) => setForm((current) => ({ ...current, allUnits: event.target.checked, unitIds: event.target.checked ? [] : current.unitIds }))} />
            Todas las unidades
            {!unitsAllowed && <small> No aplica para este tipo de notificación</small>}
          </label>
          {unitsAllowed && !form.allUnits && (
            <div className="alerts-dialog__options">
              {units.map((unit) => (
                <label className="alerts-dialog__check" key={unit.id}>
                  <input type="checkbox" checked={form.unitIds.includes(unit.id)} onChange={() => toggleUnit(unit.id)} />
                  {unit.label}
                </label>
              ))}
            </div>
          )}
          <label className="alerts-dialog__check alerts-dialog__locked">
            <input type="checkbox" checked={false} disabled />
            Todos los conductores
            <small>No aplica a estos tipos</small>
          </label>
        </fieldset>
        <fieldset className="alerts-dialog__scope alerts-dialog__field--wide">
          <legend>Contactos</legend>
          <div className="alerts-dialog__options">
            {contacts.map((contact) => (
              <label className="alerts-dialog__contact" key={contact.id}>
                <input type="checkbox" checked={form.contactIds.includes(contact.id)} onChange={() => toggleContact(contact.id)} />
                <span><strong>{contact.name}</strong><small>{contact.email}</small></span>
                <small>{contact.phone ?? 'Teléfono pendiente'}</small>
              </label>
            ))}
          </div>
        </fieldset>
        {hasPhoneGap && <p className="alerts-dialog__help alerts-dialog__field--wide">WhatsApp y SMS requieren un teléfono registrado en el contacto. El prototipo no envía mensajes.</p>}
        {error && <p className="alerts-dialog__error alerts-dialog__field--wide" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}