import { useMemo, useState } from 'react';
import { Input } from '@er-mobility-mx/design-system';
import type { MenuGroup, MenuIconName } from '../../types';
import {
  CardIcon,
  ChartBarIcon,
  ChatIcon,
  ClockIcon,
  CompassIcon,
  FileTextIcon,
  GearIcon,
  LayoutIcon,
  LeafIcon,
  LockIcon,
  PinIcon,
  SparklesIcon,
  TrendUpIcon,
  TruckIcon,
  UserIcon,
  UsersIcon,
  CodeIcon,
  SlidersIcon,
  ReceiptIcon,
  WalletIcon,
} from '../icons/Icons';
import './SideMenu.css';

const ICONS: Record<MenuIconName, typeof ChartBarIcon> = {
  chart: ChartBarIcon,
  gear: GearIcon,
  layout: LayoutIcon,
  wallet: WalletIcon,
  lock: LockIcon,
  trend: TrendUpIcon,
  leaf: LeafIcon,
  sparkles: SparklesIcon,
  compass: CompassIcon,
  chat: ChatIcon,
  file: FileTextIcon,
  clock: ClockIcon,
  card: CardIcon,
  truck: TruckIcon,
  user: UserIcon,
  sliders: SlidersIcon,
  receipt: ReceiptIcon,
  users: UsersIcon,
  code: CodeIcon,
};

interface SideMenuProps {
  open: boolean;
  pinned: boolean;
  groups: MenuGroup[];
  activeItemId: string | null;
  onTogglePin: () => void;
  onSelectItem: (itemId: string) => void;
}

export function SideMenu({ open, pinned, groups, activeItemId, onTogglePin, onSelectItem }: SideMenuProps) {
  const [query, setQuery] = useState('');

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(term)),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  return (
    <aside id="side-menu" className={`side-menu${open ? ' side-menu--open' : ''}`} aria-label="Menú principal">
      <div className="side-menu__head">
        <div className="side-menu__search">
          <Input
            type="search"
            value={query}
            placeholder="Buscar en el menú"
            ariaLabel="Buscar una opción del menú"
            icon="search"
            size="sm"
            style={{ flex: 1, minWidth: 0 }}
            onChange={setQuery}
          />
        </div>
        <button
          type="button"
          className={`side-menu__pin${pinned ? ' side-menu__pin--active' : ''}`}
          onClick={onTogglePin}
          aria-pressed={pinned}
          title={pinned ? 'Desfijar menú' : 'Fijar menú'}
        >
          <PinIcon width={16} height={16} />
          <span className="visually-hidden">{pinned ? 'Desfijar menú' : 'Fijar menú'}</span>
        </button>
      </div>

      <nav className="side-menu__nav">
        {filteredGroups.map((group) => (
          <section className="side-menu__group" key={group.id}>
            {group.label && <h2 className="side-menu__group-title">{group.label}</h2>}
            <ul className="side-menu__list">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = activeItemId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`side-menu__item${active ? ' side-menu__item--active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => onSelectItem(item.id)}
                    >
                      <Icon width={17} height={17} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {filteredGroups.length === 0 && <p className="side-menu__empty">Sin resultados para “{query}”.</p>}
      </nav>
    </aside>
  );
}
