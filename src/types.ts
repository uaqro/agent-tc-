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
  /** Caption of the current value. Defaults to "Mes actual". */
  currentLabel?: string;
  /** Caption of the comparison value. Defaults to "Mes anterior". */
  previousLabel?: string;
}

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
}

/** A line series that can have gaps: `null` is a period without data, drawn as a gap and never interpolated. */
export interface GapSeries {
  name: string;
  color: string;
  values: (number | null)[];
}

export type AppRoute =
  | 'dashboard'
  | 'dispersion'
  | 'limits'
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
