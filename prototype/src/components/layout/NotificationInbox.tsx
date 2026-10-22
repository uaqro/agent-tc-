import { useEffect, useState } from 'react';
import { Badge, Button, Dialog, EmptyState, IconButton, ListRow, NotificationCenter, useBreakpoint, type NotificationItem } from '@er-mobility-mx/design-system';
import './NotificationInbox.css';

interface NotificationInboxProps {
  items: NotificationItem[];
  onSelect: (item: NotificationItem) => void;
  onMarkAllRead: () => void;
}

const SEVERITY_LABELS: Record<NotificationItem['tone'], string> = {
  danger: 'Crítica', warning: 'Advertencia', info: 'Información', success: 'Logro',
};

export function NotificationInbox({ items, onSelect, onMarkAllRead }: NotificationInboxProps) {
  const [open, setOpen] = useState(false);
  const compact = useBreakpoint() === 'compact';
  useEffect(() => {
    if (!compact) setOpen(false);
  }, [compact]);
  const unread = items.filter((item) => !item.read).length;
  const label = `Notificaciones${unread ? `, ${unread} sin leer` : ''}`;

  if (!compact) {
    return <NotificationCenter items={items} onItemClick={onSelect} onMarkAllRead={onMarkAllRead} />;
  }

  return (
    <>
      <IconButton icon="notifications" ariaLabel={label} badge={unread > 0} aria-haspopup="dialog" onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Notificaciones"
        actions={
          <>
            {unread > 0 && <Button variant="ghost" onClick={onMarkAllRead}>Marcar todo como leído</Button>}
            <Button variant="secondary" onClick={() => setOpen(false)}>Cerrar</Button>
          </>
        }
      >
        {items.length === 0 ? (
          <EmptyState icon="notifications_off" title="Sin notificaciones" description="Todo al día." />
        ) : (
          <div className="notification-inbox">
            {items.map((item) => (
              <ListRow
                key={item.id}
                title={<><Badge tone={item.tone}>{SEVERITY_LABELS[item.tone]}</Badge> {item.title}</>}
                ariaLabel={`${item.title} · ${item.read ? 'Leída' : 'Sin leer'} · ${SEVERITY_LABELS[item.tone]}`}
                subtitle={`${item.read ? 'Leída' : 'Sin leer'} · ${item.time}${item.desc ? ` · ${item.desc}` : ''}`}
                onClick={() => {
                  setOpen(false);
                  onSelect(item);
                }}
              />
            ))}
          </div>
        )}
      </Dialog>
    </>
  );
}
