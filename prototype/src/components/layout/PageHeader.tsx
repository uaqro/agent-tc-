import type { ReactNode } from 'react';
import { PageHeader as FlowPageHeader } from '@er-mobility-mx/design-system';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  /** Page-level controls under the subtitle, such as the global filters. */
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <FlowPageHeader
      title={title}
      description={subtitle}
      filters={children}
    />
  );
}
