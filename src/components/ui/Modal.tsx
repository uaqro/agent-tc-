import { useId, type ReactNode } from 'react';
import { Button, OverlayShell } from '@er-mobility-mx/design-system';
import './Modal.css';

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: 'md' | 'lg';
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function Modal({ open, title, subtitle, size = 'md', onClose, footer, children }: ModalProps) {
  const titleId = useId();
  const subtitleId = useId();

  return (
    <OverlayShell
      open={open}
      onClose={onClose}
      alignment="top"
      labelledBy={titleId}
    >
      <div
        className={`modal modal--${size}`}
        aria-describedby={subtitle ? subtitleId : undefined}
      >
        <header className="modal__head">
          <div>
            <h2 className="modal__title" id={titleId}>
              {title}
            </h2>
            {subtitle && (
              <p className="modal__subtitle" id={subtitleId}>
                {subtitle}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon="close"
            ariaLabel="Cerrar"
            onClick={onClose}
            style={{ width: 32, height: 32, padding: 0, flexShrink: 0 }}
          />
        </header>

        <div className="modal__body">{children}</div>

        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </OverlayShell>
  );
}
