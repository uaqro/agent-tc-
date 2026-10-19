export type Trend = 'up' | 'down' | 'flat';

export interface SummaryMetric {
  id: string;
  title: string;
  accent: 'blue' | 'orange' | 'purple' | 'green';
  unit: string;
  currentMonth: number;
  previousMonth: number;
  /** A rise in this metric is reported as positive when true. */
  higherIsBetter: boolean;
}

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
}

export type AppRoute =
  | 'dashboard'
  | 'dispersion'
  | 'limits'
  | 'station-networks'
  | 'reports'
  | 'payment-media'
  | 'maintenance'
  | 'company-parameters'
  | 'company-invoices'
  | 'company-users'
  | 'dev-api-improvements'
  | 'toll-balances'
  | 'toll-rules'
  | 'toll-media'
  | 'vehicles'
  | 'drivers'
  | 'insights'
  | 'optimizer'
  | 'ted';

export type MenuIconName =
  | 'chart'
  | 'gear'
  | 'layout'
  | 'wallet'
  | 'lock'
  | 'trend'
  | 'leaf'
  | 'sparkles'
  | 'compass'
  | 'chat'
  | 'file'
  | 'clock'
  | 'card'
  | 'truck'
  | 'user'
  | 'sliders'
  | 'receipt'
  | 'users'
  | 'code';

export interface MenuItem {
  id: string;
  label: string;
  icon: MenuIconName;
}

export interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}
