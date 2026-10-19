import { useState } from 'react';
import { USER_ROLE_DESCRIPTION, USER_ROLE_LABEL, type PlatformUser, type UserRole } from '../../data/company';
import { Modal } from '../ui/Modal';
import '../limits/PolicyDialog.css';
import './CompanyDialogs.css';

interface InviteUserDialogProps {
  regions: string[];
  existingEmails: string[];
  onClose: () => void;
  onInvite: (user: PlatformUser) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteUserDialog({ regions, existingEmails, onClose, onInvite }: InviteUserDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('fleet');
  const [allRegions, setAllRegions] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  const normalizedEmail = email.trim().toLowerCase();
  const emailInvalid = normalizedEmail !== '' && !EMAIL_PATTERN.test(normalizedEmail);
  const emailTaken = existingEmails.includes(normalizedEmail);
  const valid = name.trim() !== '' && normalizedEmail !== '' && !emailInvalid && !emailTaken && (allRegions || selected.length > 0);

  return (
    <Modal
      open
      title="Invitar usuario"
      subtitle="Recibirá un correo para crear su contraseña y entrar al portal."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!valid}
            onClick={() =>
              onInvite({
                id: `u-${Date.now().toString(36)}`,
                name: name.trim(),
                email: normalizedEmail,
                role,
                regions: allRegions ? [] : selected,
                lastAccess: null,
                status: 'invited',
              })
            }
          >
            Enviar invitación
          </button>
        </>
      }
    >
      <div className="company-form__grid">
        <label className="policy-form__field">
          <span>Nombre completo *</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="policy-form__field">
          <span>Correo *</span>
          <input type="email" value={email} placeholder="nombre@empresa.mx" onChange={(event) => setEmail(event.target.value)} />
        </label>
      </div>

      <fieldset className="policy-form__block company-form__fields">
        <legend>Rol</legend>
        <div className="company-form__roles">
          {(Object.keys(USER_ROLE_LABEL) as UserRole[]).map((option) => (
            <label key={option} className={`company-form__role${role === option ? ' is-active' : ''}`}>
              <input type="radio" name="role" checked={role === option} onChange={() => setRole(option)} />
              <span>
                <strong>{USER_ROLE_LABEL[option]}</strong>
                <small>{USER_ROLE_DESCRIPTION[option]}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="policy-form__block company-form__fields">
        <legend>Alcance</legend>
        <label className="company-form__check">
          <input type="checkbox" checked={allRegions} onChange={(event) => setAllRegions(event.target.checked)} />
          Todas las regiones
        </label>
        {!allRegions && (
          <div className="policy-form__checks">
            {regions.map((region) => (
              <label key={region}>
                <input
                  type="checkbox"
                  checked={selected.includes(region)}
                  onChange={(event) =>
                    setSelected((current) => (event.target.checked ? [...current, region] : current.filter((item) => item !== region)))
                  }
                />
                {region}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {emailInvalid && (
        <p className="company-form__error" role="alert">
          Escribe un correo válido.
        </p>
      )}
      {emailTaken && (
        <p className="company-form__error" role="alert">
          Ese correo ya tiene un usuario en la empresa.
        </p>
      )}
    </Modal>
  );
}
