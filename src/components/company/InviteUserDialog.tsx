import { useState } from 'react';
import { Button, Field, Input, Radio } from '@er-mobility-mx/design-system';
import { scopeNodeOptions } from '../../data/client';
import { USER_ROLE_DESCRIPTION, USER_ROLE_LABEL, type PlatformUser, type UserRole } from '../../data/company';
import { Modal } from '../ui/Modal';
import '../limits/PolicyDialog.css';
import './CompanyDialogs.css';

interface InviteUserDialogProps {
  existingEmails: string[];
  onClose: () => void;
  onInvite: (user: PlatformUser) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const roleOptions = Object.keys(USER_ROLE_LABEL) as UserRole[];

export function InviteUserDialog({ existingEmails, onClose, onInvite }: InviteUserDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('flota');
  const [scopeNodeId, setScopeNodeId] = useState<string>('');

  const normalizedEmail = email.trim().toLowerCase();
  const emailInvalid = normalizedEmail !== '' && !EMAIL_PATTERN.test(normalizedEmail);
  const emailTaken = normalizedEmail !== '' && existingEmails.includes(normalizedEmail);
  const emailError = emailInvalid
    ? 'Escribe un correo válido.'
    : emailTaken
      ? 'Ese correo ya tiene un usuario en la empresa.'
      : undefined;
  const valid = name.trim() !== '' && normalizedEmail !== '' && !emailInvalid && !emailTaken;

  return (
    <Modal
      open
      title="Invitar usuario"
      subtitle="Recibirá un correo para crear su contraseña y entrar al portal."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!valid}
            onClick={() =>
              onInvite({
                id: `u-${Date.now().toString(36)}`,
                name: name.trim(),
                email: normalizedEmail,
                role,
                scopeNodeId: scopeNodeId === '' ? null : scopeNodeId,
                lastAccess: null,
                status: 'invited',
              })
            }
          >
            Enviar invitación
          </Button>
        </>
      }
    >
      <div className="company-form__grid">
        <Field label="Nombre completo" htmlFor="invite-user-name" required>
          <Input id="invite-user-name" required value={name} onChange={setName} />
        </Field>
        <Field label="Correo" htmlFor="invite-user-email" required error={emailError}>
          <Input
            id="invite-user-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            placeholder="nombre@empresa.mx"
            onChange={setEmail}
          />
        </Field>
      </div>

      <fieldset className="policy-form__block company-form__fields">
        <legend>Rol</legend>
        <div className="company-form__roles">
          {roleOptions.map((option) => (
            <div key={option} className={`company-form__role${role === option ? ' is-active' : ''}`}>
              <Radio
                name="role"
                value={option}
                checked={role === option}
                label={USER_ROLE_LABEL[option]}
                description={USER_ROLE_DESCRIPTION[option]}
                onChange={(value) => {
                  const selectedRole = roleOptions.find((candidate) => candidate === value);
                  if (selectedRole) setRole(selectedRole);
                }}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="policy-form__block company-form__fields">
        <legend>Alcance</legend>
        <label className="policy-form__field">
          <span>Nodo del organigrama</span>
          <select value={scopeNodeId} onChange={(event) => setScopeNodeId(event.target.value)}>
            <option value="">Toda la empresa</option>
            {scopeNodeOptions.map((node) => (
              <option key={node.id} value={node.id}>
                {'  '.repeat(node.level - 1)}
                {node.name}
              </option>
            ))}
          </select>
        </label>
        <p className="policy-form__preview">
          El usuario solo verá las unidades, cargas e indicadores de ese nodo y de lo que cuelga de él.
        </p>
      </fieldset>

    </Modal>
  );
}
