/** Empresa mock data: modular parameter catalogs, invoices (CFDI) and platform users. */

export type ParameterFieldType = 'text' | 'select' | 'ref';

export interface ParameterField {
  key: string;
  label: string;
  type: ParameterFieldType;
  /** Fixed options for `select`. */
  options?: string[];
  /** Catalog id whose active records feed a `ref` field. */
  ref?: string;
  required?: boolean;
  placeholder?: string;
  /** `false` keeps the field in the editor only, to keep wide catalogs readable. */
  inTable?: boolean;
}

export interface ParameterRecord {
  id: string;
  active: boolean;
  values: Record<string, string>;
}

export interface ParameterCatalog {
  id: string;
  label: string;
  description: string;
  /** Field shown as the record name in lists and references. */
  titleField: string;
  fields: ParameterField[];
  records: ParameterRecord[];
  /** Built-in catalogs can't be deleted; custom ones can. */
  custom?: boolean;
}

export const CFDI_USES = ['G03 · Gastos en general', 'G01 · Adquisición de mercancías', 'I08 · Otra maquinaria y equipo'];
export const PAYMENT_METHODS = ['PUE · Pago en una sola exhibición', 'PPD · Pago en parcialidades o diferido'];

export const parameterCatalogs: ParameterCatalog[] = [
  {
    id: 'billing-groups',
    label: 'Grupos de facturación',
    description: 'Razón social, RFC y datos fiscales con los que se emite cada factura.',
    titleField: 'name',
    fields: [
      { key: 'name', label: 'Nombre del grupo', type: 'text', required: true, placeholder: 'Ej. Operación Norte' },
      { key: 'rfc', label: 'RFC', type: 'text', required: true, placeholder: 'XAXX010101000' },
      { key: 'legalName', label: 'Razón social', type: 'text', required: true },
      { key: 'cfdiUse', label: 'Uso de CFDI', type: 'select', options: CFDI_USES, inTable: false },
      { key: 'paymentMethod', label: 'Método de pago', type: 'select', options: PAYMENT_METHODS },
      { key: 'email', label: 'Correo de envío', type: 'text', placeholder: 'facturas@empresa.mx', inTable: false },
    ],
    records: [
      {
        id: 'bg-1',
        active: true,
        values: {
          name: 'Corporativo',
          rfc: 'EME1203154K2',
          legalName: 'Edenred México 1, S.A. de C.V.',
          cfdiUse: CFDI_USES[0],
          paymentMethod: PAYMENT_METHODS[0],
          email: 'cxp@edenredmexico1.mx',
        },
      },
      {
        id: 'bg-2',
        active: true,
        values: {
          name: 'Operación Norte',
          rfc: 'LNO1508217T9',
          legalName: 'Logística del Norte EM1, S.A. de C.V.',
          cfdiUse: CFDI_USES[0],
          paymentMethod: PAYMENT_METHODS[1],
          email: 'facturas.norte@edenredmexico1.mx',
        },
      },
      {
        id: 'bg-3',
        active: true,
        values: {
          name: 'Operación Sur',
          rfc: 'TSU1709043H1',
          legalName: 'Transportes del Sur EM1, S.A. de C.V.',
          cfdiUse: CFDI_USES[0],
          paymentMethod: PAYMENT_METHODS[0],
          email: 'facturas.sur@edenredmexico1.mx',
        },
      },
      {
        id: 'bg-4',
        active: false,
        values: {
          name: 'Reparto urbano (2024)',
          rfc: 'RUR1902118P4',
          legalName: 'Reparto Urbano EM1, S.A. de C.V.',
          cfdiUse: CFDI_USES[1],
          paymentMethod: PAYMENT_METHODS[0],
          email: 'reparto@edenredmexico1.mx',
        },
      },
    ],
  },
  {
    id: 'regions',
    label: 'Regiones',
    description: 'Zonas operativas que agrupan sucursales, unidades y presupuestos.',
    titleField: 'name',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej. Bajío' },
      { key: 'code', label: 'Clave', type: 'text', required: true, placeholder: 'BAJ' },
      { key: 'states', label: 'Estados', type: 'text', placeholder: 'Guanajuato, Querétaro' },
      { key: 'owner', label: 'Responsable', type: 'text' },
    ],
    records: [
      { id: 'rg-1', active: true, values: { name: 'Norte', code: 'NTE', states: 'Nuevo León, Coahuila, Tamaulipas', owner: 'Mariana Treviño' } },
      { id: 'rg-2', active: true, values: { name: 'Centro', code: 'CTR', states: 'CDMX, Estado de México, Hidalgo', owner: 'Jorge Salinas' } },
      { id: 'rg-3', active: true, values: { name: 'Bajío', code: 'BAJ', states: 'Guanajuato, Querétaro, Aguascalientes', owner: 'Paola Rangel' } },
      { id: 'rg-4', active: true, values: { name: 'Sur', code: 'SUR', states: 'Puebla, Veracruz, Oaxaca', owner: 'Luis Cárdenas' } },
    ],
  },
  {
    id: 'cost-centers',
    label: 'Centros de costo',
    description: 'Imputación contable del gasto; se ligan a una región y a un grupo de facturación.',
    titleField: 'name',
    fields: [
      { key: 'code', label: 'Clave', type: 'text', required: true, placeholder: 'CC-000' },
      { key: 'name', label: 'Nombre', type: 'text', required: true },
      { key: 'region', label: 'Región', type: 'ref', ref: 'regions', required: true },
      { key: 'billingGroup', label: 'Grupo de facturación', type: 'ref', ref: 'billing-groups', required: true },
    ],
    records: [
      { id: 'cc-1', active: true, values: { code: 'CC-110', name: 'Distribución Monterrey', region: 'Norte', billingGroup: 'Operación Norte' } },
      { id: 'cc-2', active: true, values: { code: 'CC-120', name: 'Distribución Saltillo', region: 'Norte', billingGroup: 'Operación Norte' } },
      { id: 'cc-3', active: true, values: { code: 'CC-210', name: 'Ventas CDMX', region: 'Centro', billingGroup: 'Corporativo' } },
      { id: 'cc-4', active: true, values: { code: 'CC-310', name: 'Planta Celaya', region: 'Bajío', billingGroup: 'Corporativo' } },
      { id: 'cc-5', active: true, values: { code: 'CC-410', name: 'Reparto Puebla', region: 'Sur', billingGroup: 'Operación Sur' } },
    ],
  },
  {
    id: 'branches',
    label: 'Sucursales',
    description: 'Bases de operación donde pernoctan las unidades.',
    titleField: 'name',
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', required: true },
      { key: 'region', label: 'Región', type: 'ref', ref: 'regions', required: true },
      { key: 'city', label: 'Ciudad', type: 'text' },
    ],
    records: [
      { id: 'br-1', active: true, values: { name: 'CEDIS Apodaca', region: 'Norte', city: 'Apodaca, N.L.' } },
      { id: 'br-2', active: true, values: { name: 'Base Vallejo', region: 'Centro', city: 'Azcapotzalco, CDMX' } },
      { id: 'br-3', active: true, values: { name: 'Patio Celaya', region: 'Bajío', city: 'Celaya, Gto.' } },
      { id: 'br-4', active: false, values: { name: 'Base Xalapa', region: 'Sur', city: 'Xalapa, Ver.' } },
    ],
  },
];

export type InvoiceProduct = 'fuel' | 'toll' | 'maintenance' | 'fee';
export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';

export interface Invoice {
  uuid: string;
  folio: string;
  issued: string;
  due: string;
  billingGroup: string;
  product: InvoiceProduct;
  subtotalMXN: number;
  status: InvoiceStatus;
}

export const IVA_RATE = 0.16;

export const INVOICE_PRODUCT_LABEL: Record<InvoiceProduct, string> = {
  fuel: 'Combustible',
  toll: 'Peaje',
  maintenance: 'Mantenimiento',
  fee: 'Comisión de servicio',
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: 'Pagada',
  pending: 'Pendiente de pago',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
};

export const invoices: Invoice[] = [
  { uuid: '6F3A1C2E-90B4', folio: 'TC-A 58214', issued: '2026-10-15', due: '2026-10-30', billingGroup: 'Operación Norte', product: 'fuel', subtotalMXN: 342_180, status: 'pending' },
  { uuid: '1D77E0B9-4A21', folio: 'TC-A 58213', issued: '2026-10-15', due: '2026-10-30', billingGroup: 'Corporativo', product: 'fuel', subtotalMXN: 218_940, status: 'pending' },
  { uuid: 'B2C8F5D1-77E0', folio: 'TC-P 10472', issued: '2026-10-08', due: '2026-10-23', billingGroup: 'Operación Norte', product: 'toll', subtotalMXN: 48_320, status: 'pending' },
  { uuid: '9E04A6C3-12F8', folio: 'TC-M 02231', issued: '2026-10-05', due: '2026-10-20', billingGroup: 'Corporativo', product: 'maintenance', subtotalMXN: 16_450, status: 'paid' },
  { uuid: 'C4D19B70-E5A2', folio: 'TC-A 58090', issued: '2026-10-01', due: '2026-10-16', billingGroup: 'Operación Sur', product: 'fuel', subtotalMXN: 154_760, status: 'paid' },
  { uuid: '7A2F3E81-0C56', folio: 'TC-S 00918', issued: '2026-10-01', due: '2026-10-16', billingGroup: 'Corporativo', product: 'fee', subtotalMXN: 12_400, status: 'paid' },
  { uuid: '50E8D2A4-B913', folio: 'TC-A 57871', issued: '2026-09-15', due: '2026-09-30', billingGroup: 'Operación Sur', product: 'fuel', subtotalMXN: 149_230, status: 'overdue' },
  { uuid: 'E1B6C077-3D4F', folio: 'TC-P 10388', issued: '2026-09-08', due: '2026-09-23', billingGroup: 'Operación Sur', product: 'toll', subtotalMXN: 21_870, status: 'overdue' },
  { uuid: '3C95F1A8-66B0', folio: 'TC-A 57702', issued: '2026-09-01', due: '2026-09-16', billingGroup: 'Corporativo', product: 'fuel', subtotalMXN: 205_310, status: 'paid' },
  { uuid: 'A8F04D2C-91E7', folio: 'TC-A 57699', issued: '2026-09-01', due: '2026-09-16', billingGroup: 'Operación Norte', product: 'fuel', subtotalMXN: 18_600, status: 'cancelled' },
];

export type UserRole = 'admin' | 'fleet' | 'finance' | 'viewer';
export type UserStatus = 'active' | 'invited' | 'suspended';

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Region names; empty means every region. */
  regions: string[];
  lastAccess: string | null;
  status: UserStatus;
}

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  fleet: 'Operador de flota',
  finance: 'Finanzas',
  viewer: 'Consulta',
};

export const USER_ROLE_DESCRIPTION: Record<UserRole, string> = {
  admin: 'Todo, incluidos usuarios y parámetros de la empresa',
  fleet: 'Saldos, reglas, medios de pago, flota y mantenimiento',
  finance: 'Facturas, saldos y reportes; sin cambios en reglas',
  viewer: 'Solo lectura de resúmenes y reportes',
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Activo',
  invited: 'Invitación enviada',
  suspended: 'Suspendido',
};

export const platformUsers: PlatformUser[] = [
  { id: 'u-1', name: 'U. Aquino', email: 'u.aquino@edenredmexico1.mx', role: 'admin', regions: [], lastAccess: '2026-10-16T09:12:00', status: 'active' },
  { id: 'u-2', name: 'Mariana Treviño', email: 'm.trevino@edenredmexico1.mx', role: 'fleet', regions: ['Norte'], lastAccess: '2026-10-15T18:40:00', status: 'active' },
  { id: 'u-3', name: 'Jorge Salinas', email: 'j.salinas@edenredmexico1.mx', role: 'fleet', regions: ['Centro'], lastAccess: '2026-10-14T11:05:00', status: 'active' },
  { id: 'u-4', name: 'Ana Lucía Ortega', email: 'a.ortega@edenredmexico1.mx', role: 'finance', regions: [], lastAccess: '2026-10-15T13:22:00', status: 'active' },
  { id: 'u-5', name: 'Paola Rangel', email: 'p.rangel@edenredmexico1.mx', role: 'fleet', regions: ['Bajío'], lastAccess: null, status: 'invited' },
  { id: 'u-6', name: 'Héctor Villalobos', email: 'h.villalobos@edenredmexico1.mx', role: 'viewer', regions: ['Norte', 'Centro'], lastAccess: '2026-09-02T08:47:00', status: 'suspended' },
  { id: 'u-7', name: 'Luis Cárdenas', email: 'l.cardenas@edenredmexico1.mx', role: 'viewer', regions: ['Sur'], lastAccess: '2026-10-10T16:30:00', status: 'active' },
];
