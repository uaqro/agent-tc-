import { useState, type ReactNode } from 'react';
import { BellIcon, HelpIcon, SearchIcon } from '../icons/Icons';
import './TopBar.css';

interface TopBarProps {
  userName: string;
  onAction: (actionId: 'search' | 'help' | 'notifications' | 'profile', detail?: string) => void;
  /** Extra control before the help button, e.g. the dev mode menu. */
  extra?: ReactNode;
}

const initialsOf = (name: string) =>
  name
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
          <SearchIcon width={17} height={17} />
          <input
            type="search"
            value={query}
            placeholder="Buscar unidades, tarjetas, conductores…"
            aria-label="Búsqueda global"
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
      </div>

      <nav className="topbar__actions" aria-label="Acciones de usuario">
        {extra}
        <button type="button" className="topbar__icon" title="Ayuda" onClick={() => onAction('help')}>
          <HelpIcon />
          <span className="visually-hidden">Ayuda</span>
        </button>
        <button type="button" className="topbar__icon topbar__icon--dot" title="Notificaciones" onClick={() => onAction('notifications')}>
          <BellIcon />
          <span className="visually-hidden">Notificaciones</span>
        </button>
        <button type="button" className="topbar__user" onClick={() => onAction('profile')}>
          <span className="topbar__avatar" aria-hidden="true">
            {initialsOf(userName)}
          </span>
          <span className="topbar__user-name">{userName}</span>
        </button>
      </nav>
    </header>
  );
}
