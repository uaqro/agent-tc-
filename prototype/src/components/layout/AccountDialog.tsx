import { Button, Dialog } from '@er-mobility-mx/design-system';

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  role: string;
  scope: string;
}

export function AccountDialog({ open, onOpenChange, name, role, scope }: AccountDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tu cuenta"
      description="Identidad y alcance de la sesión actual."
      actions={<Button variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button>}
    >
      <dl className="navigation-account-details">
        <div><dt>Nombre</dt><dd>{name}</dd></div>
        <div><dt>Rol</dt><dd>{role}</dd></div>
        <div><dt>Alcance</dt><dd>{scope}</dd></div>
      </dl>
    </Dialog>
  );
}
