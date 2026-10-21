import { IconButton, Sidebar, useBreakpoint, type SidebarItem } from '@er-mobility-mx/design-system';
import type { MenuGroup, MenuIconName } from '../../types';
import { DevModeMenu } from '../dev/DevMode';
import './SideMenu.css';

const ICONS: Record<MenuIconName, string> = {
  chart: 'bar_chart',
  gear: 'build',
  layout: 'dashboard',
  wallet: 'account_balance_wallet',
  lock: 'lock',
  trend: 'trending_up',
  leaf: 'eco',
  sparkles: 'auto_awesome',
  compass: 'explore',
  chat: 'chat',
  file: 'description',
  clock: 'schedule',
  card: 'credit_card',
  truck: 'local_shipping',
  user: 'person',
  sliders: 'tune',
  receipt: 'receipt_long',
  users: 'group',
  code: 'code',
};

export function navigationItems(groups: MenuGroup[]): SidebarItem[] {
  return groups.flatMap<SidebarItem>((group) => {
    const children = group.items
      .map((item) => ({ id: item.id, label: item.label, icon: ICONS[item.icon] }));
    if (!children.length) return [];
    return group.label ? [{ id: group.id, label: group.label, caption: true, children }] : children;
  });
}

interface SideMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: MenuGroup[];
  activeItemId: string;
  onSelectItem: (itemId: string) => void;
  onHome: () => void;
  onOpenImprovements: () => void;
}

export function SideMenu({ open, onOpenChange, groups, activeItemId, onSelectItem, onHome, onOpenImprovements }: SideMenuProps) {
  const rail = useBreakpoint() === 'medium';
  const items = navigationItems(groups);

  return (
    <Sidebar
      responsive
      open={open}
      onOpenChange={onOpenChange}
      items={items}
      activeId={activeItemId}
      onNavigate={onSelectItem}
      footerActions={<DevModeMenu compact={rail} onOpenImprovements={onOpenImprovements} />}
      headerContent={
        <div className="navigation-header">
          {rail ? (
            <IconButton icon="home" ariaLabel="Ticket Car · Ir al resumen" onClick={onHome} />
          ) : (
            <button type="button" className="navigation-brand" onClick={onHome} aria-label="Edenred One · Ticket Car, ir al resumen">
              <img src="/logo-edenred-one.png" alt="Edenred One" />
              <span>Ticket Car</span>
            </button>
          )}
        </div>
      }
    />
  );
}
