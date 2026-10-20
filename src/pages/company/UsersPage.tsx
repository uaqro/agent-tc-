import { useMemo, useState } from 'react';
import { Button, Input, Select } from '@er-mobility-mx/design-system';
import { InviteUserDialog } from '../../components/company/InviteUserDialog';
import { PlusIcon, SearchIcon } from '../../components/icons/Icons';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  USER_ROLE_LABEL,
  USER_STATUS_LABEL,
  platformUsers,
  type PlatformUser,
  type UserRole,
  type UserStatus,
} from '../../data/company';
import { scopeLabel } from '../../data/client';
import { sessionPrincipal } from '../../data/session';
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

export function UsersPage({ onNotice }: UsersPageProps) {
  const [users, setUsers] = useState<PlatformUser[]>(platformUsers);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const roleKeys = Object.keys(USER_ROLE_LABEL) as UserRole[];
  const statusKeys = Object.keys(USER_STATUS_LABEL) as UserStatus[];
  const roleOptions = [
    { value: '', label: 'Todos los roles' },
    ...roleKeys.map((key) => ({ value: key, label: USER_ROLE_LABEL[key] })),
  ];
  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    ...statusKeys.map((key) => ({ value: key, label: USER_STATUS_LABEL[key] })),
  ];

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
              <Input type="search" ariaLabel="Buscar usuario" value={query} placeholder="Nombre o correo" onChange={setQuery} />
            </label>
            <span id="users-role-filter-label" className="visually-hidden">Filtrar por rol</span>
            <Select
              options={roleOptions}
              value={role}
              aria-labelledby="users-role-filter-label"
              onChange={(value) => {
                const selected = roleKeys.find((key) => key === value);
                if (selected || value === '') setRole(selected ?? '');
              }}
            />
            <span id="users-status-filter-label" className="visually-hidden">Filtrar por estado</span>
            <Select
              options={statusOptions}
              value={status}
              aria-labelledby="users-status-filter-label"
              onChange={(value) => {
                const selected = statusKeys.find((key) => key === value);
                if (selected || value === '') setStatus(selected ?? '');
              }}
            />
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <PlusIcon width={14} height={14} />
              Invitar usuario
            </Button>
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={<SearchIcon width={20} height={20} />}
            title="Ningún usuario coincide con los filtros"
            description="Revisa el nombre o el correo, o cambia el rol y el estado seleccionados."
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setRole('');
                  setStatus('');
                }}
              >
                Limpiar filtros
              </Button>
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
                  const isSelf = user.id === sessionPrincipal().userId;
                  return (
                    <tr key={user.id}>
                      <td>
                        <span className="table-page__main">
                          {user.name} {isSelf && <span className="chip chip--info">Tú</span>}
                        </span>
                        <span className="table-page__sub">{user.email}</span>
                      </td>
                      <td>{USER_ROLE_LABEL[user.role]}</td>
                      <td>{scopeLabel(user.scopeNodeId)}</td>
                      <td className="table-page__nowrap">
                        {user.lastAccess ? formatDateTime(new Date(user.lastAccess)) : <span className="table-page__sub">Nunca</span>}
                      </td>
                      <td>
                        <span className={`chip ${STATUS_CHIP[user.status]}`}>{USER_STATUS_LABEL[user.status]}</span>
                      </td>
                      <td className="table-page__action">
                        {user.status === 'invited' && (
                          <Button variant="ghost" size="sm" onClick={() => onNotice(`Invitación reenviada a ${user.email}.`)}>
                            Reenviar invitación
                          </Button>
                        )}
                        {user.status === 'active' && !isSelf && (
                          <Button variant="ghost" size="sm" onClick={() => setUserStatus(user, 'suspended')}>
                            Suspender
                          </Button>
                        )}
                        {user.status === 'suspended' && (
                          <Button variant="ghost" size="sm" onClick={() => setUserStatus(user, 'active')}>
                            Reactivar
                          </Button>
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
