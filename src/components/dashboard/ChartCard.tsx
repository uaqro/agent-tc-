import { type ReactNode } from 'react';
import { IconButton, Menu, SectionHeader, Tooltip } from '@er-mobility-mx/design-system';
import './ChartCard.css';

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
    <section className="chart-card">
      <header className="chart-card__head">
        <SectionHeader
          size="sm"
          level={3}
          style={{ width: '100%' }}
          description={subtitle}
          trailing={
            <div className="chart-card__tools">
              {badge}
              <Tooltip content={info} position="bottom">
                <IconButton
                  icon="info"
                  ariaLabel={`Más información sobre ${title}`}
                  variant="ghost"
                  size="sm"
                  style={{ width: 30, height: 30 }}
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
                    style={{ width: 30, height: 30 }}
                  />
                }
              />
            </div>
          }
        >
          {title}
        </SectionHeader>
      </header>

      <div className="chart-card__body">{children}</div>
    </section>
  );
}
