import type { CSSProperties, ReactNode } from 'react';
import { EmptyState as FlowEmptyState } from '@er-mobility-mx/design-system';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Draws its own dashed surface, for sections that have no card around them. */
  card?: boolean;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, actions, card = false, compact = false }: EmptyStateProps) {
  const style: CSSProperties = {
    ...(compact && { padding: '22px 18px' }),
    ...(card && {
      background: 'var(--tc-local-surface)',
      border: '1px dashed var(--tc-local-border)',
      borderRadius: 'var(--tc-local-radius-md)',
    }),
  };

  return (
    <FlowEmptyState
      icon={icon}
      title={title}
      description={description}
      action={actions}
      style={style}
    />
  );
}
