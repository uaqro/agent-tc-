import { useState, type ReactNode } from 'react';
import { Avatar, IconButton, Input } from '@er-mobility-mx/design-system';
import './TopBar.css';

interface TopBarProps {
  userName: string;
  onAction: (actionId: 'search' | 'help' | 'notifications' | 'profile', detail?: string) => void;
  /** Extra control before the help button, e.g. the dev mode menu. */
  extra?: ReactNode;
}

export function TopBar({ userName, onAction, extra }: TopBarProps) {
  const [query, setQuery] = useState('');

  return (
    <header className="topbar">
      <div className="topbar__leading">
        <a className="topbar__logo" href="#main" aria-label="Edenred One · Ticket Car, ir al contenido principal">
          <img src="/logo-edenred-one.png" alt="" />
          <span className="topbar__product">Ticket Car</span>
        </a>

        <form
          className="topbar__search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim()) onAction('search', query.trim());
          }}
        >
          <Input
            type="search"
            value={query}
            placeholder="Buscar unidades, tarjetas, conductores…"
            ariaLabel="Búsqueda global"
            icon="search"
            onChange={setQuery}
            style={{ width: '100%' }}
          />
        </form>
      </div>

      <nav className="topbar__actions" aria-label="Acciones de usuario">
        {extra}
        <IconButton icon="help" ariaLabel="Ayuda" onClick={() => onAction('help')} />
        <IconButton icon="notifications" ariaLabel="Notificaciones" badge onClick={() => onAction('notifications')} />
        <button type="button" className="topbar__user" onClick={() => onAction('profile')}>
          <span className="topbar__avatar" aria-hidden="true">
            <Avatar name={userName} size="sm" />
          </span>
          <span className="topbar__user-name">{userName}</span>
        </button>
      </nav>
    </header>
  );
}
