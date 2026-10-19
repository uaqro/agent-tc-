import type { ReactNode } from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Draws its own dashed surface, for sections that have no card around them. */
  card?: boolean;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, actions, card = false, compact = false }: EmptyStateProps) {
  const className = ['empty-state', card && 'empty-state--card', compact && 'empty-state--compact']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      {icon && <span className="empty-state__icon">{icon}</span>}
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__description">{description}</p>}
      {actions && <div className="empty-state__actions">{actions}</div>}
    </div>
  );
}
