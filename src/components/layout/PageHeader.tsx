import type { ReactNode } from 'react';
import { ArrowLeftIcon, MenuIcon } from '../icons/Icons';
import './PageHeader.css';

interface PageHeaderProps {
  section: string;
  title: string;
  /** Last breadcrumb step, when it differs from the title. */
  crumb?: string;
  subtitle: string;
  menuOpen: boolean;
  onBack?: () => void;
  onToggleMenu: () => void;
  /** Page-level controls under the subtitle, such as the global filters. */
  children?: ReactNode;
}

export function PageHeader({ section, title, crumb, subtitle, menuOpen, onBack, onToggleMenu, children }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__bar">
        <button
          type="button"
          className="page-header__button"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          aria-controls="side-menu"
          title={menuOpen ? 'Ocultar menú' : 'Mostrar menú'}
        >
          <MenuIcon width={18} height={18} />
          <span className="visually-hidden">{menuOpen ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}</span>
        </button>
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            icon="arrow_back"
            ariaLabel="Regresar al resumen"
            onClick={onBack}
          />
        )}
        <div className="page-header__breadcrumb">
          <Breadcrumb items={[{ label: 'Ticket Car' }, { label: section }, { label: crumb ?? title }]} />
        </div>
      </div>

      <h1 className="page-header__title">{title}</h1>
      <p className="page-header__subtitle">{subtitle}</p>
      {children}
    </header>
  );
}
