import { Avatar, IconButton } from '@er-mobility-mx/design-system';
import './PageUtilities.css';

interface PageUtilitiesProps {
  userName: string;
  onAction: (actionId: 'help' | 'notifications' | 'profile') => void;
}

export function PageUtilities({ userName, onAction }: PageUtilitiesProps) {
  return (
    <nav className="page-utilities" aria-label="Acciones de usuario">
      <IconButton icon="help" ariaLabel="Ayuda" onClick={() => onAction('help')} />
      <IconButton icon="notifications" ariaLabel="Notificaciones" badge onClick={() => onAction('notifications')} />
      <button
        type="button"
        className="page-utilities__profile"
        aria-label={`Perfil de ${userName}`}
        onClick={() => onAction('profile')}
      >
        <Avatar name={userName} size="sm" />
      </button>
    </nav>
  );
}
