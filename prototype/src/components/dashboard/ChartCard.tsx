import { type ReactNode } from 'react';
import { IconButton, Menu, Tooltip, WidgetFrame } from '@er-mobility-mx/design-system';

interface ChartCardProps {
  title: string;
  info: string;
  subtitle?: string;
  /** Extra marker rendered next to the title. */
  badge?: ReactNode;
  options?: string[];
  onOptionSelect?: (option: string) => void;
  children: ReactNode;
}

const DEFAULT_OPTIONS = ['Actualizar datos', 'Descargar imagen', 'Exportar a Excel', 'Ver reporte completo'];

export function ChartCard({
  title,
  info,
  subtitle,
  badge,
  options = DEFAULT_OPTIONS,
  onOptionSelect,
  children,
}: ChartCardProps) {
  return (
    <WidgetFrame
      title={title}
      description={subtitle}
      actions={
        <>
          {badge}
          <Tooltip content={info} position="bottom">
            <IconButton
              icon="info"
              ariaLabel={`Más información sobre ${title}`}
              variant="ghost"
              size="sm"
            />
          </Tooltip>

          <Menu
            align="right"
            items={options.map((option) => ({
              label: option,
              onClick: () => onOptionSelect?.(option),
            }))}
            trigger={
              <IconButton
                icon="more_vert"
                ariaLabel={`Más opciones de ${title}`}
                variant="ghost"
                size="sm"
              />
            }
          />
        </>
      }
    >
      {children}
    </WidgetFrame>
  );
}
