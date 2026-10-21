import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  ...props,
});

export const SearchIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);

export const HelpIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.3a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4" />
    <path d="M12 17h.01" />
  </svg>
);

export const UserIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 19.5a7 7 0 0 1 14 0" />
  </svg>
);

export const ArrowLeftIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M19 12H5" />
    <path d="m11 18-6-6 6-6" />
  </svg>
);

export const MenuIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </svg>
);

export const PinIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M9 3h6l-.8 5.2 3 2.6v2H6.8v-2l3-2.6L9 3Z" />
    <path d="M12 12.8V21" />
  </svg>
);

export const ChevronIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const InfoIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </svg>
);

export const MoreIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="5" r="1.4" fill="currentColor" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <circle cx="12" cy="19" r="1.4" fill="currentColor" />
  </svg>
);

export const GearIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1Z" />
  </svg>
);

export const ChatIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H9l-4 3v-3.6A7.5 7.5 0 0 1 3 11.5 7.5 7.5 0 0 1 10.5 4h3A7.5 7.5 0 0 1 21 11.5Z" />
  </svg>
);

export const TrendUpIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m4 16 5.5-5.5 3.5 3.5L20 7" />
    <path d="M15 7h5v5" />
  </svg>
);

export const TrendDownIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m4 8 5.5 5.5L13 10l7 7" />
    <path d="M15 17h5v-5" />
  </svg>
);

export const NoDataIcon = (props: IconProps) => (
  <svg {...base({ width: 40, height: 40, ...props })}>
    <path d="M4 19h16" />
    <rect x="6" y="11" width="3.4" height="6" rx="1" />
    <rect x="12" y="7.5" width="3.4" height="9.5" rx="1" opacity="0.5" />
    <path d="M3.5 3.5 20.5 20.5" opacity="0.35" />
  </svg>
);

export const FuelIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 20V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15" />
    <path d="M3 20h11" />
    <path d="M13 9h3a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V9l-2.5-2.5" />
    <path d="M6.5 7.5h4" />
  </svg>
);

export const PlusIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

export const BoltIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5L13 3Z" />
  </svg>
);

export const AlertIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 4.5 2.8 19.5h18.4L12 4.5Z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </svg>
);

export const PlayIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M7 4.8v14.4L19.5 12 7 4.8Z" />
  </svg>
);

export const PauseIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M9 4.5v15" />
    <path d="M15 4.5v15" />
  </svg>
);

export const CalendarIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17" />
    <path d="M8 3.5V7" />
    <path d="M16 3.5V7" />
  </svg>
);

export const CheckCircleIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.3 2.7 2.7L16 9.6" />
  </svg>
);

export const DownloadIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 4v10" />
    <path d="m8 10.5 4 4 4-4" />
    <path d="M4.5 19h15" />
  </svg>
);

export const UploadIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 15V5" />
    <path d="m8 8.5 4-4 4 4" />
    <path d="M4.5 19h15" />
  </svg>
);

export const RequestIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3.5 13h4l1.5 2.5h6L16.5 13h4" />
    <path d="M3.5 13 6 5.5h12L20.5 13v5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-5Z" />
  </svg>
);

export const BellIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" />
    <path d="M13.7 19.5a2 2 0 0 1-3.4 0" />
  </svg>
);

export const CloseIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m6 6 12 12" />
    <path d="M18 6 6 18" />
  </svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ShareIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="17.5" cy="6" r="2.5" />
    <circle cx="6.5" cy="12" r="2.5" />
    <circle cx="17.5" cy="18" r="2.5" />
    <path d="m8.8 10.8 6.4-3.4" />
    <path d="m8.8 13.2 6.4 3.4" />
  </svg>
);

export const ScissorsIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="6.5" cy="6" r="2.5" />
    <path d="M8.6 16.4 19.5 4.5" />
    <path d="M8.6 7.6 19.5 19.5" />
  </svg>
);

export const EyeIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const ClockIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 1.8" />
  </svg>
);

export const RuleIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
    <path d="M7.5 9h9" />
    <path d="M7.5 13h6" />
    <path d="M7.5 16.5h3.5" />
  </svg>
);

export const ChartBarIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 20V11" />
    <path d="M12 20V5" />
    <path d="M19 20v-6" />
  </svg>
);

export const SparklesIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M10 3.5 11.6 8a2 2 0 0 0 1.3 1.3l4.5 1.6-4.5 1.6a2 2 0 0 0-1.3 1.3L10 18.3l-1.6-4.5a2 2 0 0 0-1.3-1.3L2.6 10.9l4.5-1.6A2 2 0 0 0 8.4 8Z" />
    <path d="M18.5 3v4" />
    <path d="M16.5 5h4" />
    <path d="M19 16v3" />
    <path d="M17.5 17.5h3" />
  </svg>
);

export const CompassIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5Z" />
  </svg>
);

export const ShieldIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3 5 5.6v5.6c0 4.4 2.9 8.3 7 9.8 4.1-1.5 7-5.4 7-9.8V5.6Z" />
  </svg>
);

export const FileTextIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </svg>
);

export const LeafIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 19c0-8 5-13 15-14-.5 9.5-6 15-14 14" />
    <path d="M5 19c3-4 6-6.5 9.5-8" />
  </svg>
);

export const LockIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

export const WalletIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
    <rect x="4" y="8" width="16" height="11" rx="2" />
    <path d="M16 13.5h.01" />
  </svg>
);

export const LayoutIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4 9.5h16" />
    <path d="M9.5 9.5V20" />
  </svg>
);

export const SendIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
  </svg>
);

export const MapPinIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

export const PencilIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m14.5 5.5 4 4M4 20l4.2-.9L19.1 8.2a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z" />
  </svg>
);

export const CardIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M3 10h18" />
    <path d="M7 15h3" />
  </svg>
);

export const TruckIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 6.5h11v9H3Z" />
    <path d="M14 9.5h3.5l3 3.2v2.8H14" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </svg>
);

export const SlidersIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </svg>
);

export const ReceiptIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 3.5h12v17l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6L6 20.5Z" />
    <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
  </svg>
);

export const UsersIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19.5c.6-3.1 2.8-5 5.5-5s4.9 1.9 5.5 5" />
    <path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.8c1.6.6 2.7 2.2 3 4.7" />
  </svg>
);

export const CopyIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
);

export const CodeIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15" />
  </svg>
);
