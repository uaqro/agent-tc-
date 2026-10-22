export interface ReportColumnGroup {
  id: string;
  label: string;
  columns: string[];
}

/** Report columns from the transaction export workbook, kept in workbook order. */
export const reportColumnGroups: ReportColumnGroup[] = [
  {
    id: 'date',
    label: 'Fecha y organización',
    columns: [
      'FECHA', 'HORA', 'MES', 'GLOBAL', 'CÓDIGO', 'GRUPO', 'EMPRESA', 'ÁREA', 'UNIDAD', 'PLACA / IDENTIFICACIÓN',
      'MARCA', 'MODELO', 'DISPOSITIVO', 'FUENTE', 'MONEDERO', 'PRODUCTO/SERVICIO', 'ID POS', 'VIN',
      'CAPACIDAD DE TANQUE', 'CÓDIGO DE PRODUCTO', 'TRANSACCIÓN', 'MEDIO DE PAGO', 'EN LÍNEA',
      'NO. FACT. ELECTRÓNICA', 'RFC', 'RAZÓN SOCIAL', 'LLAVE FACT. ELECTRÓNICA',
    ],
  },
  {
    id: 'amounts',
    label: 'Precios, volúmenes e importes',
    columns: [
      'PRECIO NETO', 'PRECIO DE DESCUENTO', 'TRANSACCIÓN MANUAL', 'PRECIO GLS CON DESCUENTO', 'PRECIO GLS SIN DESCUENTO',
      'PRECIO LTS CON DESCUENTO', 'PRECIO LTS SIN DESCUENTO', 'GALONES', 'LITROS', 'M.N.', 'M.E.', 'NETO',
      'NETO SIN DESCUENTO', 'NETO UNITARIO LTS', 'NETO UNITARIO GLS', 'IMPUESTOS', 'IMPUESTO UNITARIO LITROS',
      'IMPUESTO UNITARIO GALONES', 'DESCUENTO', 'IVA', 'IVA UNITARIO LITROS', 'IVA UNITARIO GALONES', 'DISCIVA', 'IEPS',
    ],
  },
  {
    id: 'station',
    label: 'Conductor, estación y rendimiento',
    columns: [
      'NÚMERO DE CONDUCTOR', 'CONDUCTOR', 'CENTRO DE COSTOS', 'COD. ESTACIÓN', 'ESTACIÓN DE SERVICIO', 'BANDERA',
      'DIRECCIÓN ESTACIÓN', 'ID TRIBUTARIO ESTACIÓN', 'MUNICIPIO', 'CIUDAD', 'TALONARIO', 'CUPÓN', 'FOLIO DE CARGA',
      'ODÓMETRO ANTERIOR', 'ÚLTIMO ODÓMETRO', 'KM RECORRIDO', 'RENDIMIENTO KM/LTS', 'RENDIMIENTO TEÓRICO KM/LTS',
      'CERTIFICACIÓN', 'ODÓMETRO ANTERIOR GPS', 'ODÓMETRO GPS', 'RECORRIDO GPS', 'RENDIMIENTO GPS KM/LTS', 'DISPONIBLE',
    ],
  },
  {
    id: 'billing',
    label: 'Facturación y liquidación',
    columns: [
      'NÚMERO DE FACTURA', 'PERIODO', 'FECHA DE FACTURA', 'TAZA IVA (%)', 'TRANSACCIÓN FACTURADA', 'FECHA DE LIQUIDACIÓN',
      'DESDE', 'HASTA', 'NO. LIQUIDACIÓN', 'COMPROBANTE', 'AUTORIZADO',
    ],
  },
  {
    id: 'custom',
    label: 'Datos adicionales',
    columns: [
      'DATOS 1', 'DATOS 2', 'DATOS 3', 'DATOS 4', 'DATOS 5',
      'SOLICITADO · PARÁMETRO 1', 'INGRESADO · PARÁMETRO 1',
      'SOLICITADO · PARÁMETRO 2', 'INGRESADO · PARÁMETRO 2',
      'SOLICITADO · PARÁMETRO 3', 'INGRESADO · PARÁMETRO 3',
      'SOLICITADO · PARÁMETRO 4', 'INGRESADO · PARÁMETRO 4',
      'SOLICITADO · PARÁMETRO 5', 'INGRESADO · PARÁMETRO 5',
    ],
  },
  {
    id: 'settlement',
    label: 'Banco y parámetros',
    columns: [
      'FORMATO DE UNIDAD', 'AUTORIZADO DE BANCO', 'REFERENCIA DE BANCO', 'FECHA DE AUTORIZACIÓN DE BANCO',
      'COSTO DE RECORRIDO (M.N/KM)', 'TOLERANCIA (%)', 'FECHA DE PROCESO', 'HORÓMETRO',
      'FECHA DE LIQUIDACIÓN DE BANCO', 'NO. LIQUIDACIÓN DE BANCO', 'GRUPO DE FACTURACIÓN', 'USUARIO DE APP',
      'HORÓMETRO ANTERIOR', 'HORAS', 'RENDIMIENTO HORÓMETRO', 'RENDIMIENTO TEÓRICO HORÓMETRO',
      'EFICIENCIA (%) HORÓMETRO', 'M.N/HR', 'DESVIACIÓN DE RENDIMIENTO %', 'DESVIACIÓN DE RENDIMIENTO EN $',
    ],
  },
  {
    id: 'conciliation',
    label: 'Estatus de conciliación',
    columns: ['ESTATUS DE CONCILIACIÓN', 'MOTIVO DE RECHAZO'],
  },
];

export const allReportColumns = reportColumnGroups.flatMap((group) => group.columns);

export const defaultReportColumns = [
  'FECHA',
  'HORA',
  'ESTATUS DE CONCILIACIÓN',
  'UNIDAD',
  'PLACA / IDENTIFICACIÓN',
  'DISPOSITIVO',
  'CONDUCTOR',
  'ESTACIÓN DE SERVICIO',
  'PRODUCTO/SERVICIO',
  'TRANSACCIÓN',
  'MEDIO DE PAGO',
  'LITROS',
  'M.N.',
  'NETO',
  'IVA',
  'MOTIVO DE RECHAZO',
];

export const REPORT_TYPES = ['Detalle de consumo', 'Detalle de facturación'];

export const YIELD_UNITS = ['Km/Gl', 'Km/Lts', 'Mill/Gl', 'Mill/Lts'];

export const DEFAULT_YIELD_UNIT = 'Km/Lts';

export const EVALUATE_BY = [
  'Fecha de Transacción',
  'Fecha de Proceso',
  'Fecha de liquidación',
  'Fecha de liquidación de banco',
];

export const TRANSACTION_STATES = [
  'Transacciones procesadas',
  'Transacciones en tránsito',
  'Transacciones Liquidadas',
  'Transacciones liquidadas banco',
];

export const ADVANCED_FILTER_FIELDS = [
  'MEDIO DE PAGO',
  'PRODUCTO/SERVICIO',
  'ESTACIÓN DE SERVICIO',
  'UNIDAD',
  'CONDUCTOR',
];

export const FILTER_OPERATORS = ['Igual a', 'Contiene'] as const;

export const REPORT_GROUPERS = [
  'Estación de servicio',
  'Grupo',
  'Empresa',
  'Área',
  'Unidad',
  'Centro de costos',
  'Fuente',
  'Monedero',
  'Producto / Servicio',
  'Tipo de transacción',
  'Medio de pago del dispositivo',
  'Conductor',
  'Mes',
  'Grupo de facturación',
];
