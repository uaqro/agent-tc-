export interface ReportColumnGroup {
  id: string;
  label: string;
  columns: string[];
}

/** Every column of the legacy dynamic report, grouped by subject. Labels are unique and work as ids. */
export const reportColumnGroups: ReportColumnGroup[] = [
  {
    id: 'date',
    label: 'Fecha',
    columns: ['Fecha', 'Hora', 'Mes', 'Fecha de Proceso'],
  },
  {
    id: 'organization',
    label: 'Organización',
    columns: ['Global', 'Código', 'Grupo', 'Empresa', 'Área', 'Centro de costos', 'Grupo de facturación'],
  },
  {
    id: 'unit',
    label: 'Unidad y dispositivo',
    columns: [
      'Unidad',
      'Placa / Identificación',
      'Marca',
      'Modelo',
      'VIN',
      'Capacidad de Tanque',
      'Formato de unidad',
      'Dispositivo',
      'Fuente',
      'Monedero',
      'Medio de pago del dispositivo',
      'Disponible',
    ],
  },
  {
    id: 'driver',
    label: 'Conductor',
    columns: ['Número de conductor', 'Conductor', 'Usuario de APP'],
  },
  {
    id: 'transaction',
    label: 'Transacción',
    columns: [
      'Transacción',
      'Producto / Servicio',
      'Código de producto',
      'ID POS',
      'En línea',
      'Transacción manual',
      'Talonario',
      'Cupón',
      'Folio de carga',
      'Comprobante',
      'Autorizado',
      'Certificación',
    ],
  },
  {
    id: 'amounts',
    label: 'Volumen e importes',
    columns: [
      'Galones',
      'Litros',
      'M.N.',
      'M.E.',
      'Neto',
      'Neto sin descuento',
      'Neto unitario Lts',
      'Neto unitario Gls',
    ],
  },
  {
    id: 'prices',
    label: 'Precios',
    columns: [
      'Precio neto',
      'Precio de Descuento',
      'Precio Gls con Descuento',
      'Precio Gls sin Descuento',
      'Precio Lts con Descuento',
      'Precio Lts sin Descuento',
    ],
  },
  {
    id: 'taxes',
    label: 'Impuestos y descuentos',
    columns: [
      'Impuestos',
      'Impuesto unitario Litros',
      'Impuesto unitario Galones',
      'Descuento',
      'IVA',
      'Iva unitario Litros',
      'Iva unitario Galones',
      'discIva',
      'IEPS',
      'Tasa IVA (%)',
    ],
  },
  {
    id: 'station',
    label: 'Estación',
    columns: [
      'Cod. Estación',
      'Estación de servicio',
      'Bandera',
      'Dirección Estación',
      'ID tributario estación',
      'Municipio',
      'Ciudad',
    ],
  },
  {
    id: 'odometer',
    label: 'Odómetro y rendimiento',
    columns: [
      'Odómetro anterior',
      'Último odómetro',
      'KM Recorrido',
      'Rendimiento Km/Lts',
      'Rendimiento teórico Km/Lts',
      'Odómetro Anterior GPS',
      'Odómetro GPS',
      'Recorrido GPS',
      'Rendimiento GPS Km/Lts',
      'Eficiencia(%)',
      'Costo de recorrido (M.N/KM)',
      'Tolerancia (%)',
      'Desviación de tolerancia (%)',
      'Costo de desviación (M.N)',
      'Desviación de rendimiento %',
      'Desviación de rendimiento en $',
    ],
  },
  {
    id: 'hour-meter',
    label: 'Horómetro',
    columns: [
      'Horómetro',
      'Horómetro anterior',
      'Horas',
      'Rendimiento Horómetro',
      'Rendimiento teórico Horómetro',
      'Eficiencia % Horómetro',
      'M.N/HR',
    ],
  },
  {
    id: 'billing',
    label: 'Facturación',
    columns: [
      'No. Fact. Electrónica',
      'RFC',
      'Razón social',
      'Llave Fact. Electrónica',
      'Número de factura',
      'Período de facturación',
      'Fecha de factura',
      'Transacción facturada',
      'Desde',
      'Hasta',
      'Número de facturación',
    ],
  },
  {
    id: 'settlement',
    label: 'Liquidación y banco',
    columns: [
      'Fecha de liquidación',
      'Autorizado de banco',
      'Referencia de banco',
      'Fecha de autorización de banco',
      'Fecha de liquidación de banco',
      'No. liquidación de banco',
    ],
  },
  {
    id: 'extra',
    label: 'Datos adicionales',
    columns: [
      'Datos 1',
      'Datos 2',
      'Datos 3',
      'Datos 4',
      'Datos 5',
      'Parámetro 1',
      'Parámetro 2',
      'Parámetro 3',
      'Parámetro 4',
      'Parámetro 5',
    ],
  },
];

export const allReportColumns = reportColumnGroups.flatMap((group) => group.columns);

export const defaultReportColumns = [
  'Fecha',
  'Hora',
  'Unidad',
  'Placa / Identificación',
  'Conductor',
  'Estación de servicio',
  'Producto / Servicio',
  'Litros',
  'M.N.',
  'Último odómetro',
  'Rendimiento Km/Lts',
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
  'Grupo',
  'Empresa',
  'Área',
  'Unidad',
  'Centro de costos',
  'Estación de servicio',
  'Cod. Estación',
  'Fuente',
  'Monedero',
  'Producto / Servicio',
  'Tipo de transacción',
  'Medio de pago del dispositivo',
  'Litros',
  'Galones',
  'Moneda nacional',
  'Moneda extranjera',
  'Subtotal',
  'Marca',
  'Modelo',
  'Municipio',
  'Ciudad',
  'Control presencial',
  'En línea',
  'Transacción manual',
  'Parámetro 1',
  'Parámetro 2',
  'Parámetro 3',
  'Parámetro 4',
  'Parámetro 5',
];

export const FILTER_OPERATORS = ['Igual a'];

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
