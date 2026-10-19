export type ColumnKind = 'text' | 'number' | 'money' | 'date' | 'rate';

export interface ReportColumn {
  id: string;
  label: string;
  kind: ColumnKind;
}

export interface ColumnGroup {
  id: string;
  label: string;
  columns: ReportColumn[];
}

export type ReportType = 'consumo' | 'facturacion';

export type PerformanceUnit = 'km-gl' | 'km-lts' | 'mill-gl' | 'mill-lts';

export type EvaluateBy = 'transaccion' | 'proceso' | 'liquidacion' | 'liquidacion-banco';

export type TransactionState = 'procesadas' | 'transito' | 'liquidadas' | 'liquidadas-banco';

export type FilterOperator =
  | 'igual'
  | 'diferente'
  | 'contiene'
  | 'comienza'
  | 'mayor'
  | 'menor'
  | 'entre';

export interface AdvancedFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
  value2: string;
}

export type ReportRow = Record<string, string | number | null>;
