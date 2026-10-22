import { Button, Dialog } from '@er-mobility-mx/design-system';
import './HelpDialog.css';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTed?: () => void;
}

export function HelpDialog({ open, onOpenChange, onStartTed }: HelpDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ayuda y atención"
      description="Contacta al equipo de atención o consulta a TED sobre tu flota."
      actions={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button>
          {onStartTed && (
            <Button icon="chat" onClick={() => {
              onOpenChange(false);
              onStartTed();
            }}>Conversar con TED</Button>
          )}
        </>
      }
    >
      <dl className="help-contact">
        <div>
          <dt>Teléfono de atención</dt>
          <dd><a data-link="" href="tel:+12025550147">+1 202 555 0147</a></dd>
        </div>
        <div>
          <dt>Correo de atención</dt>
          <dd><a data-link="" href="mailto:soporte@ticketcar.example">soporte@ticketcar.example</a></dd>
        </div>
      </dl>
      <p className="help-contact__notice">Datos ficticios para la demo. No son canales de atención reales.</p>
    </Dialog>
  );
}
