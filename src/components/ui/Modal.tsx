import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@er-mobility-mx/design-system';
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
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="modal__head">
          <div>
            <h2 className="modal__title" id="modal-title">
              {title}
            </h2>
            {subtitle && <p className="modal__subtitle">{subtitle}</p>}
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
    </div>
  );
}
