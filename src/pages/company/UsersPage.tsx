import { useMemo, useState } from 'react';
import { InviteUserDialog } from '../../components/company/InviteUserDialog';
import { PlusIcon, SearchIcon } from '../../components/icons/Icons';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  USER_ROLE_LABEL,
  USER_STATUS_LABEL,
  parameterCatalogs,
  platformUsers,
  type PlatformUser,
  type UserRole,
  type UserStatus,
} from '../../data/company';
import { account } from '../../data/dispersion';
import { formatDateTime } from '../../utils/format';
import '../TablePage.css';

interface UsersPageProps {
  onNotice: (message: string) => void;
}

const STATUS_CHIP: Record<UserStatus, string> = {
  active: 'chip--active',
  invited: 'chip--info',
  suspended: 'chip--paused',
};

const regions =
  parameterCatalogs.find((catalog) => catalog.id === 'regions')?.records.filter((record) => record.active).map((record) => record.values.name) ?? [];

export function UsersPage({ onNotice }: UsersPageProps) {
  const [users, setUsers] = useState<PlatformUser[]>(platformUsers);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter(
      (user) =>
        (!role || user.role === role) &&
        (!status || user.status === status) &&
        (!needle || `${user.name} ${user.email}`.toLowerCase().includes(needle)),
    );
  }, [users, query, role, status]);

  const count = (key: UserStatus) => users.filter((user) => user.status === key).length;
  const admins = users.filter((user) => user.role === 'admin' && user.status === 'active').length;

  const setUserStatus = (target: PlatformUser, next: UserStatus) => {
    setUsers((current) => current.map((user) => (user.id === target.id ? { ...user, status: next } : user)));
    onNotice(next === 'suspended' ? `${target.name} ya no puede entrar al portal.` : `${target.name} se reactivó.`);
  };

  return (
    <div className="table-page">
      <dl className="table-page__summary">
        <div>
          <dt>Usuarios</dt>
          <dd>{users.length}</dd>
        </div>
        <div>
          <dt>Activos</dt>
          <dd>{count('active')}</dd>
        </div>
        <div>
          <dt>Invitaciones pendientes</dt>
          <dd>{count('invited')}</dd>
        </div>
        <div>
          <dt>Administradores</dt>
          <dd>{admins}</dd>
        </div>
      </dl>

      <section className="table-page__card" aria-labelledby="users-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="users-title">
            Usuarios
          </h2>
          <div className="table-page__filters">
            <label className="table-page__search">
              <SearchIcon width={15} height={15} />
              <span className="visually-hidden">Buscar usuario</span>
              <input type="search" value={query} placeholder="Nombre o correo" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label>
              <span className="visually-hidden">Filtrar por rol</span>
              <select value={role} onChange={(event) => setRole(event.target.value as UserRole | '')}>
                <option value="">Todos los roles</option>
                {(Object.keys(USER_ROLE_LABEL) as UserRole[]).map((key) => (
                  <option key={key} value={key}>
                    {USER_ROLE_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="visually-hidden">Filtrar por estado</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as UserStatus | '')}>
                <option value="">Todos los estados</option>
                {(Object.keys(USER_STATUS_LABEL) as UserStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {USER_STATUS_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setInviteOpen(true)}>
              <PlusIcon width={14} height={14} />
              Invitar usuario
            </button>
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={<SearchIcon width={20} height={20} />}
            title="Ningún usuario coincide con los filtros"
            description="Revisa el nombre o el correo, o cambia el rol y el estado seleccionados."
            actions={
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  setQuery('');
                  setRole('');
                  setStatus('');
                }}
              >
                Limpiar filtros
              </button>
            }
          />
        ) : (
          <div className="table-page__scroll">
            <table className="table-page__table">
              <thead>
                <tr>
                  <th scope="col">Usuario</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Alcance</th>
                  <th scope="col">Último acceso</th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => {
                  const isSelf = user.name === account.user;
                  return (
                    <tr key={user.id}>
                      <td>
                        <span className="table-page__main">
                          {user.name} {isSelf && <span className="chip chip--info">Tú</span>}
                        </span>
                        <span className="table-page__sub">{user.email}</span>
                      </td>
                      <td>{USER_ROLE_LABEL[user.role]}</td>
                      <td>{user.regions.length === 0 ? 'Todas las regiones' : user.regions.join(', ')}</td>
                      <td className="table-page__nowrap">
                        {user.lastAccess ? formatDateTime(new Date(user.lastAccess)) : <span className="table-page__sub">Nunca</span>}
                      </td>
                      <td>
                        <span className={`chip ${STATUS_CHIP[user.status]}`}>{USER_STATUS_LABEL[user.status]}</span>
                      </td>
                      <td className="table-page__action">
                        {user.status === 'invited' && (
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onNotice(`Invitación reenviada a ${user.email}.`)}>
                            Reenviar invitación
                          </button>
                        )}
                        {user.status === 'active' && !isSelf && (
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setUserStatus(user, 'suspended')}>
                            Suspender
                          </button>
                        )}
                        {user.status === 'suspended' && (
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setUserStatus(user, 'active')}>
                            Reactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {inviteOpen && (
        <InviteUserDialog
          regions={regions}
          existingEmails={users.map((user) => user.email)}
          onClose={() => setInviteOpen(false)}
          onInvite={(user) => {
            setUsers((current) => [user, ...current]);
            setInviteOpen(false);
            onNotice(`Invitación enviada a ${user.email}.`);
          }}
        />
      )}
    </div>
  );
}
