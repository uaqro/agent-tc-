import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconButton } from '@er-mobility-mx/design-system';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <section className="chart-card">
      <header className="chart-card__head">
        <div className="chart-card__heading">
          <h3 className="chart-card__title">
            {title}
            {badge}
          </h3>
          {subtitle && <p className="chart-card__subtitle">{subtitle}</p>}
        </div>

        <div className="chart-card__tools">
          <span className="chart-card__info">
            <IconButton
              icon="info"
              ariaLabel={`Más información sobre ${title}`}
              aria-describedby={`${title}-info`}
              variant="ghost"
              size="sm"
              style={{ width: 30, height: 30 }}
            />
            <span role="tooltip" id={`${title}-info`} className="chart-card__tooltip">
              {info}
            </span>
          </span>

          <div className="chart-card__menu" ref={menuRef}>
            <IconButton
              icon="more_vert"
              ariaLabel={`Más opciones de ${title}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              variant="ghost"
              size="sm"
              style={{ width: 30, height: 30 }}
              onClick={() => setMenuOpen((open) => !open)}
            />

            {menuOpen && (
              <ul className="chart-card__menu-list" role="menu">
                {options.map((option) => (
                  <li key={option} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onOptionSelect?.(option);
                        setMenuOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>

      <div className="chart-card__body">{children}</div>
    </section>
  );
}
