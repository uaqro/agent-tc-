import { useMemo, useState } from 'react';
import { Badge, Button, Input, Select, StatusPill, Table, type GridColumn } from '@er-mobility-mx/design-system';
import { InviteUserDialog } from '../../components/company/InviteUserDialog';
import { PlusIcon } from '../../components/icons/Icons';
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
import './AdministrationTables.css';

interface UsersPageProps {
  onNotice: (message: string) => void;
}

const STATUS_TONE: Record<UserStatus, 'success' | 'info' | 'neutral'> = {
  active: 'success',
  invited: 'info',
  suspended: 'neutral',
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

  const columns: GridColumn<PlatformUser>[] = [
    {
      key: 'name',
      label: 'Usuario',
      render: (user) => (
        <>
          <span className="admin-table__primary">
            {user.name} {user.id === sessionPrincipal().userId && <Badge>Tú</Badge>}
          </span>
          <span className="admin-table__metadata">{user.email}</span>
        </>
      ),
    },
    { key: 'role', label: 'Rol', render: (user) => USER_ROLE_LABEL[user.role] },
    { key: 'scopeNodeId', label: 'Alcance', render: (user) => scopeLabel(user.scopeNodeId) },
    {
      key: 'lastAccess',
      label: 'Último acceso',
      render: (user) => user.lastAccess
        ? <span className="admin-table__nowrap">{formatDateTime(new Date(user.lastAccess))}</span>
        : <span className="admin-table__metadata">Nunca</span>,
    },
    {
      key: 'status',
      label: 'Estado',
      render: (user) => <StatusPill label={USER_STATUS_LABEL[user.status]} tone={STATUS_TONE[user.status]} />,
    },
    {
      key: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (user) => (
        <div className="admin-table__actions">
          {user.status === 'invited' && (
            <Button variant="ghost" size="sm" onClick={() => onNotice(`Invitación reenviada a ${user.email}.`)}>
              Reenviar invitación
            </Button>
          )}
          {user.status === 'active' && user.id !== sessionPrincipal().userId && (
            <Button variant="ghost" size="sm" onClick={() => setUserStatus(user, 'suspended')}>
              Suspender
            </Button>
          )}
          {user.status === 'suspended' && (
            <Button variant="ghost" size="sm" onClick={() => setUserStatus(user, 'active')}>
              Reactivar
            </Button>
          )}
        </div>
      ),
    },
  ];

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
            <div className="table-page__flow-search">
              <Input type="search" icon="search" ariaLabel="Buscar usuario" value={query} placeholder="Nombre o correo" onChange={setQuery} />
            </div>
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
            icon="search"
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
          <Table caption="Usuarios de la empresa" columns={columns} rows={rows} rowKey="id" surface="none" sortable={false} />
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
