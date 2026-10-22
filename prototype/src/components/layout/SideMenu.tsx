import { Avatar, IconButton, Sidebar, useBreakpoint, type SidebarItem } from '@er-mobility-mx/design-system';
import { useEffect, useState } from 'react';
import type { MenuGroup, MenuIconName } from '../../types';
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
  bolt: 'bolt',
  pin: 'location_on',
};

const GROUP_ICONS: Record<string, string> = {
  combustible: 'local_gas_station',
  peaje: 'toll',
  mantenimiento: 'build',
  electromovilidad: 'bolt',
  'move-for-good': 'eco',
  reporteria: 'description',
  inteligencia: 'auto_awesome',
  flota: 'local_shipping',
  empresa: 'business',
};

/** Each module is a collapsible section; a module with a single destination becomes a direct link. */
export function navigationItems(groups: MenuGroup[]): SidebarItem[] {
  return groups.flatMap<SidebarItem>((group) => {
    const children = group.items
      .map((item) => ({ id: item.id, label: item.label, icon: ICONS[item.icon] }));
    if (!children.length) return [];
    if (!group.label) return children;
    const icon = GROUP_ICONS[group.id] ?? children[0]!.icon;
    if (children.length === 1) return [{ ...children[0]!, label: group.label, icon }];
    return [{ id: group.id, label: group.label, icon, children }];
  });
}

interface SideMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: MenuGroup[];
  activeItemId: string;
  onSelectItem: (itemId: string) => void;
  onHome: () => void;
  userName: string;
  userRole: string;
  onAccount: () => void;
}

export function SideMenu({ open, onOpenChange, groups, activeItemId, onSelectItem, onHome, userName, userRole, onAccount }: SideMenuProps) {
  const rail = useBreakpoint() === 'medium';
  const items = navigationItems(groups);
  const activeGroup = groups.find((group) => group.label && group.items.length > 1 && group.items.some((item) => item.id === activeItemId))?.id;
  const [expanded, setExpanded] = useState<string[]>(activeGroup ? [activeGroup] : []);

  useEffect(() => {
    if (activeGroup) setExpanded([activeGroup]);
  }, [activeGroup]);

  return (
    <Sidebar
      responsive
      open={open}
      onOpenChange={onOpenChange}
      items={items}
      activeId={activeItemId}
      expandedKeys={expanded}
      onExpandedChange={(keys) => setExpanded((current) => keys.filter((key) => !current.includes(key)).slice(-1))}
      onNavigate={onSelectItem}
      footerActions={
        <button
          type="button"
          className="navigation-account"
          aria-label={`Cuenta de ${userName} · ${userRole}`}
          aria-haspopup="dialog"
          onClick={onAccount}
        >
          <Avatar name={userName} size="sm" />
          {!rail && <span className="navigation-account__identity"><strong>{userName}</strong><span>{userRole}</span></span>}
        </button>
      }
      headerContent={
        <div className="navigation-header">
          {rail ? (
            <IconButton icon="home" ariaLabel="Ticket Car · Ir al resumen" onClick={onHome} />
          ) : (
            <button type="button" className="navigation-brand" onClick={onHome} aria-label="Edenred One · Ticket Car, ir al resumen">
              <img src="/logo-edenred-one.png" alt="Edenred One" />
            </button>
          )}
        </div>
      }
    />
  );
}
