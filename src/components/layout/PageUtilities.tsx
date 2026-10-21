import { IconButton } from '@er-mobility-mx/design-system';
import { DevModeMenu } from '../dev/DevMode';
import './PageUtilities.css';

interface PageUtilitiesProps {
  onHelp: () => void;
  onOpenImprovements: () => void;
  notifications?: ReactNode;
}

export function PageUtilities({ onHelp, onOpenImprovements, notifications }: PageUtilitiesProps) {
  return (
    <nav className="page-utilities" aria-label="Acciones de usuario">
      <DevModeMenu onOpenImprovements={onOpenImprovements} />
      <IconButton icon="help" ariaLabel="Ayuda" aria-haspopup="dialog" onClick={onHelp} />
      {notifications}
    </nav>
  );
}
import type { ReactNode } from 'react';
