/**
 * What the Combustible, Flota and Empresa · Parámetros pages can do today against the headless fuel API:
 * TicketCarServices (SOAP 1.2, contract `ITicketCarFacadeServices`, document v1.8 · 26/12/2023).
 * Source: `src/assets/ZERO_Servicios_Externos_API.md`.
 */

export type ApiStatus = 'available' | 'partial' | 'unavailable';

export type FuelPage =
  | 'dashboard'
  | 'dispersion'
  | 'limits'
  | 'payment-media'
  | 'vehicles'
  | 'drivers'
  | 'parameters'
  | 'optimizer';

export interface ApiCapability {
  id: string;
  page: FuelPage;
  label: string;
  status: ApiStatus;
  methods: string[];
  note: string;
}

export const API_NAME = 'TicketCarServices';
export const API_VERSION = 'SOAP 1.2 · v1.8';

export const PAGE_LABEL: Record<FuelPage, string> = {
  dashboard: 'Combustible · Resumen',
  dispersion: 'Combustible · Saldos',
  limits: 'Combustible · Políticas de uso',
  'payment-media': 'Flota · Medios de pago · Combustible',
  vehicles: 'Flota · Vehículos',
  drivers: 'Flota · Conductores',
  parameters: 'Empresa · Parámetros',
  optimizer: 'Inteligencia · Optimizador',
};

export const API_STATUS_LABEL: Record<ApiStatus, string> = {
  available: 'Disponible',
  partial: 'Parcial',
  unavailable: 'No disponible',
};

export const API_STATUS_HINT: Record<ApiStatus, string> = {
  available: 'La API lo resuelve directamente.',
  partial: 'La API da los datos o la ejecución, pero falta lógica propia o tiene limitaciones.',
  unavailable: 'La API no lo expone; requiere backend propio u otra integración.',
};

export const apiCapabilities: ApiCapability[] = [
  // Resumen
  {
    id: 'dash-kpis',
    page: 'dashboard',
    label: 'Indicadores de consumo y kilómetros',
    status: 'partial',
    methods: ['TransactionGetFilteredList'],
    note: 'Litros (MerchandiseQuantity) y km (TravelDistance) vienen por transacción; hay que paginar y agregar del lado nuestro. El histórico solo incluye cargas con más de 3 horas.',
  },
  {
    id: 'dash-performance',
    page: 'dashboard',
    label: 'Rendimiento por vehículo',
    status: 'partial',
    methods: ['TransactionGetFilteredList', 'VehicleGetFilteredList'],
    note: 'VehicleRealPerformance por carga y Performance / RealPerformance del vehículo. El promedio mensual por unidad lo calculamos nosotros.',
  },
  {
    id: 'dash-cost-km',
    page: 'dashboard',
    label: 'Costo por kilómetro',
    status: 'partial',
    methods: ['TransactionGetFilteredList'],
    note: 'Amount, IVA e IEPS solo llegan cuando la transacción ya está facturada. Para el mes en curso habría que usar AuthorizedAmount (monto autorizado).',
  },
  {
    id: 'dash-org',
    page: 'dashboard',
    label: 'Consumo por centro de costo',
    status: 'partial',
    methods: ['TransactionGetFilteredList'],
    note: 'Cada transacción trae EntityHierarchy (región, grupo de región y centro de costo); la agrupación es nuestra.',
  },
  {
    id: 'dash-refills',
    page: 'dashboard',
    label: 'Recargas y recortes',
    status: 'partial',
    methods: ['OrderGetFilteredList'],
    note: 'OrderGetFilteredList exige número de tarjeta: para toda la flota hay que consultar tarjeta por tarjeta o usar nuestro propio registro de dispersiones.',
  },

  // Saldos
  {
    id: 'disp-account',
    page: 'dispersion',
    label: 'Saldo disponible de la cuenta',
    status: 'partial',
    methods: ['CardRequisitionCreditDistribution'],
    note: 'No hay método para consultar el saldo de la cuenta; solo llega AvailableBaseAccountBalance en la respuesta de una dispersión.',
  },
  {
    id: 'disp-scheduled',
    page: 'dispersion',
    label: 'Pagos programados y monto comprometido',
    status: 'unavailable',
    methods: [],
    note: 'La API no agenda dispersiones. La programación y el monto comprometido viven en nuestro backend, que llama a la dispersión en la fecha.',
  },
  {
    id: 'disp-history',
    page: 'dispersion',
    label: 'Historial de dispersiones y comprobantes',
    status: 'partial',
    methods: ['OrderGetItem', 'OrderGetFilteredList'],
    note: 'Se consulta una orden por ID o la lista por tarjeta, no por cuenta. Conviene guardar cada OrderIdentification al dispersar para armar el historial y los comprobantes.',
  },
  {
    id: 'disp-quick',
    page: 'dispersion',
    label: 'Dispersión puntual',
    status: 'available',
    methods: ['CardGetFilteredList', 'CardRequisitionCreditDistribution'],
    note: 'Modo saldo (OrderType 2), tipo absoluto: suma al saldo actual. Requiere el CardToken de la tarjeta, que se obtiene con CardGetFilteredList.',
  },
  {
    id: 'disp-requests',
    page: 'dispersion',
    label: 'Solicitudes de saldo de conductores',
    status: 'unavailable',
    methods: [],
    note: 'No hay endpoint para que el conductor pida saldo; el canal de solicitudes es nuestro. Al aprobar sí se ejecuta con CardRequisitionCreditDistribution.',
  },
  {
    id: 'disp-attention',
    page: 'dispersion',
    label: 'Unidades que necesitan atención',
    status: 'partial',
    methods: ['CardGetFilteredList', 'TransactionGetFilteredList'],
    note: 'Saldo en cero sale directo de CurrentBalance. Consumo anómalo y saldo atrapado los detectamos nosotros sobre el histórico de transacciones (con 3 h de desfase).',
  },
  {
    id: 'disp-cut',
    page: 'dispersion',
    label: 'Recorte de saldo',
    status: 'partial',
    methods: ['CardRequisitionCreditDistribution'],
    note: 'Posible como Devolución (OrderType 12) o con dispersión relativa, que reemplaza el saldo. El documento se contradice en los valores de absoluto/relativo; hay que confirmarlo contra el WSDL.',
  },
  {
    id: 'disp-rules',
    page: 'dispersion',
    label: 'Automatización de dispersiones',
    status: 'partial',
    methods: ['CardGetFilteredList', 'TransactionGetFilteredList', 'CardRequisitionCreditDistribution'],
    note: 'La API ejecuta, pero no guarda reglas. Las cuatro automatizaciones (a tope, monto fijo, umbral y consumo), su calendario y la simulación son motor propio.',
  },
  {
    id: 'disp-bulk',
    page: 'dispersion',
    label: 'Carga masiva desde archivo',
    status: 'available',
    methods: ['CardRequisitionCreditDistribution'],
    note: 'Una sola petición acepta una lista de tarjetas; la API valida duplicados, tarjetas bloqueadas y que el total no supere el saldo. Leer el archivo es nuestro.',
  },

  // Reglas y límites
  {
    id: 'lim-policies',
    page: 'limits',
    label: 'Políticas de uso',
    status: 'unavailable',
    methods: [],
    note: 'No hay métodos para crear ni editar candados de la tarjeta (litros por periodo, cargas por día, combustibles, horarios, estaciones, odómetro o rendimiento). Solo las notas vale aceptan restricciones de horario, estaciones y conductores.',
  },
  {
    id: 'lim-assignments',
    page: 'limits',
    label: 'Asignación de política por unidad',
    status: 'unavailable',
    methods: ['VehicleGetFilteredList'],
    note: 'Sin escritura de políticas. Sí se pueden leer la capacidad del tanque (TankCapacity) y el consumo para mostrar la ocupación.',
  },
  {
    id: 'lim-override',
    page: 'limits',
    label: 'Excepciones temporales',
    status: 'unavailable',
    methods: ['CardGetItem'],
    note: 'Las autorizaciones por excepción (ExceptionAuthorizationList) solo se pueden leer, no crear.',
  },
  {
    id: 'lim-rejections',
    page: 'limits',
    label: 'Cargas rechazadas',
    status: 'partial',
    methods: ['TransactionGetFilteredList'],
    note: 'Cada transacción trae IsTransactionApproved y AuthRejectionReason; el conteo de 7 días es agregación nuestra. Falta confirmar que el histórico incluya las rechazadas.',
  },

  // Medios de pago
  {
    id: 'media-list',
    page: 'payment-media',
    label: 'Listado y filtros de tarjetas',
    status: 'available',
    methods: ['CardGetFilteredList', 'CardGetItem'],
    note: 'Filtra por estatus, vehículo, placa, tipo de vehículo o Tag NFC. Con All = true devuelve máximo 50 registros; para más hay que paginar.',
  },
  {
    id: 'media-balance',
    page: 'payment-media',
    label: 'Saldo y vigencia',
    status: 'available',
    methods: ['CardGetFilteredList'],
    note: 'CurrentBalance y ValidDate vienen en cada tarjeta.',
  },
  {
    id: 'media-last-use',
    page: 'payment-media',
    label: 'Último uso y estación',
    status: 'partial',
    methods: ['TransactionGetFilteredList'],
    note: 'Sale de la última transacción de la tarjeta y su afiliado. El histórico tiene 3 h de desfase; en modo Online solo llegan datos generales.',
  },
  {
    id: 'media-block',
    page: 'payment-media',
    label: 'Bloquear, desbloquear, activar o cancelar',
    status: 'available',
    methods: ['CardExecute'],
    note: 'CardOperation 2 / 3 / 13 / 1. Bloqueo, desbloqueo y cancelación exigen un motivo del catálogo (extravío, robo, unidad en taller…), así que la interfaz debe pedirlo.',
  },
  {
    id: 'media-assign',
    page: 'payment-media',
    label: 'Asignar a una unidad',
    status: 'unavailable',
    methods: [],
    note: 'No hay método para ligar una tarjeta a un vehículo; la relación solo se lee.',
  },
  {
    id: 'media-request',
    page: 'payment-media',
    label: 'Solicitar nuevos medios',
    status: 'unavailable',
    methods: [],
    note: 'La API no emite tarjetas ni tags. La reposición solo aparece como dato de lectura (NewCardNumber).',
  },

  // Flota · Vehículos
  {
    id: 'veh-list',
    page: 'vehicles',
    label: 'Listado y búsqueda de vehículos',
    status: 'available',
    methods: ['VehicleGetFilteredList', 'VehicleGetItem'],
    note: 'Filtra por placa, número de identificación, estatus y Tag NFC. Buscar por conductor, marca o modelo no es filtro del servicio: se hace sobre lo ya descargado. Máximo 50 por petición; hay que paginar.',
  },
  {
    id: 'veh-specs',
    page: 'vehicles',
    label: 'Marca, modelo, año, combustible y tanque',
    status: 'available',
    methods: ['VehicleGetItem'],
    note: 'ManufacturerDescription, ModelDescription, ModelYear, TankCapacity y FuelTankList (combustible y capacidad de cada tanque) vienen en la ficha del vehículo.',
  },
  {
    id: 'veh-performance',
    page: 'vehicles',
    label: 'Rendimiento esperado',
    status: 'available',
    methods: ['VehicleGetItem'],
    note: 'Performance y FuelEfficiency, además de rendimiento urbano y en carretera (UrbanEfficiency, RoadEfficiency). RealPerformance da el rendimiento real.',
  },
  {
    id: 'veh-odometer',
    page: 'vehicles',
    label: 'Odómetro',
    status: 'available',
    methods: ['VehicleGetItem'],
    note: 'OdometerValue y Kilometers; se actualiza con el kilometraje que se captura en cada carga. Para maquinaria también hay horómetro.',
  },
  {
    id: 'veh-group',
    page: 'vehicles',
    label: 'Grupo',
    status: 'partial',
    methods: ['VehicleGetItem'],
    note: 'Llegan grupo de dispersión, grupo de tarjetas y centro de costo, pero ninguno se llama "grupo": hay que definir cuál equivale al grupo de la plataforma.',
  },
  {
    id: 'veh-driver',
    page: 'vehicles',
    label: 'Conductor asignado',
    status: 'available',
    methods: ['VehicleGetItem'],
    note: 'Driver / DriverDescription del vehículo. Solo lectura: reasignar un conductor no es posible por API.',
  },
  {
    id: 'veh-media',
    page: 'vehicles',
    label: 'Medio de pago asignado',
    status: 'available',
    methods: ['CardGetFilteredList'],
    note: 'Se consultan las tarjetas filtrando por el vehículo o por su placa.',
  },
  {
    id: 'veh-status',
    page: 'vehicles',
    label: 'Estado (activo, en taller, inactivo)',
    status: 'partial',
    methods: ['VehicleGetFilteredList'],
    note: 'El vehículo solo tiene Activo o Inactivo. "En taller" no existe como estatus: lo daría Mantenimiento o el motivo de bloqueo de la tarjeta (98 · Unidad en taller).',
  },
  {
    id: 'veh-create',
    page: 'vehicles',
    label: 'Alta y edición de vehículos',
    status: 'unavailable',
    methods: [],
    note: 'No hay métodos para crear, editar ni dar de baja vehículos; todo es de lectura.',
  },

  // Flota · Conductores
  {
    id: 'drv-list',
    page: 'drivers',
    label: 'Listado de conductores',
    status: 'partial',
    methods: ['VehicleGetFilteredList'],
    note: 'No hay método de conductores. Solo llegan como dato del vehículo (DriverIdentification, DriverDescription), así que un conductor sin unidad no aparece, y no vienen número de empleado ni grupo propio.',
  },
  {
    id: 'drv-vehicle',
    page: 'drivers',
    label: 'Unidad asignada',
    status: 'available',
    methods: ['VehicleGetFilteredList'],
    note: 'Se obtiene al revés: del vehículo que tiene al conductor asignado. Solo lectura.',
  },
  {
    id: 'drv-license',
    page: 'drivers',
    label: 'Licencia y vencimiento',
    status: 'unavailable',
    methods: [],
    note: 'La API no maneja licencias. Hay que guardarlas en nuestra plataforma o integrarlas con RR. HH.',
  },
  {
    id: 'drv-activity',
    page: 'drivers',
    label: 'Cargas del mes y rendimiento',
    status: 'partial',
    methods: ['TransactionGetFilteredList'],
    note: 'Las transacciones son por tarjeta y vehículo; se atribuyen al conductor asignado. Si el cliente controla por persona, PersonOrVehicleIdentification podría identificarlo, pero hay que confirmarlo. Con 3 h de desfase.',
  },
  {
    id: 'drv-status',
    page: 'drivers',
    label: 'Estado del conductor',
    status: 'partial',
    methods: ['VehicleGetItem'],
    note: 'Solo DriverStateDescription dentro del vehículo; no hay estatus propio del conductor.',
  },
  {
    id: 'drv-create',
    page: 'drivers',
    label: 'Alta y expediente',
    status: 'unavailable',
    methods: [],
    note: 'No se pueden crear, editar ni dar de baja conductores, y no hay expediente. Sería catálogo propio.',
  },

  // Empresa · Parámetros
  {
    id: 'par-billing',
    page: 'parameters',
    label: 'Grupos de facturación',
    status: 'unavailable',
    methods: ['CardGetItem', 'OrderGetItem'],
    note: 'No hay RFC, razón social, uso de CFDI, método de pago ni correo de envío. Solo se leen el nivel corporativo y su tipo de facturación (en la tarjeta) y la cuenta de facturación (en la orden).',
  },
  {
    id: 'par-regions',
    page: 'parameters',
    label: 'Regiones',
    status: 'partial',
    methods: ['TransactionGetFilteredList'],
    note: 'Región y grupo de región llegan solo dentro de cada transacción (EntityHierarchy). No hay catálogo: una región sin cargas no aparece, y no vienen estados ni responsable.',
  },
  {
    id: 'par-cost-centers',
    page: 'parameters',
    label: 'Centros de costo',
    status: 'partial',
    methods: ['CardGetFilteredList', 'VehicleGetFilteredList', 'TransactionGetFilteredList'],
    note: 'Clave y descripción vienen en tarjetas, vehículos y transacciones; se puede armar el catálogo juntándolos. No viene su relación con región ni con grupo de facturación.',
  },
  {
    id: 'par-branches',
    page: 'parameters',
    label: 'Sucursales',
    status: 'partial',
    methods: ['VehicleGetFilteredList', 'CardGetFilteredList'],
    note: 'Lo más parecido son el garaje y la unidad de entrega (con dirección) del vehículo o la tarjeta. Hay que confirmar cuál equivale a sucursal; no traen región.',
  },
  {
    id: 'par-write',
    page: 'parameters',
    label: 'Crear, editar y desactivar registros',
    status: 'unavailable',
    methods: [],
    note: 'Ningún catálogo se puede escribir por API. Lo que se edite aquí vive en nuestra plataforma y no regresa a Ticket Car.',
  },
  {
    id: 'par-custom',
    page: 'parameters',
    label: 'Catálogos personalizados',
    status: 'unavailable',
    methods: [],
    note: 'Son motor propio. El vehículo tiene un campo libre CustomParameters que quizá podría llevar estos valores, pero el documento no dice cómo se escribe; hay que confirmarlo.',
  },

  // Optimizador (eOne)
  {
    id: 'opt-loads',
    page: 'optimizer',
    label: 'Cargas con estación, litros y precio pagado',
    status: 'partial',
    methods: ['TransactionGetFilteredList'],
    note: 'Las cargas se pueden leer. La estación recomendada, su precio y el desvío vienen del motor de la plataforma de datos de eOne: en el prototipo, un dataset sintético de septiembre de 2026.',
  },
  {
    id: 'opt-stations',
    page: 'optimizer',
    label: 'Mapa y precios de estaciones vecinas',
    status: 'unavailable',
    methods: [],
    note: 'La API no expone coordenadas ni precios de estaciones fuera de la carga. El mapa usa teselas de OpenStreetMap y estaciones sintéticas.',
  },
  {
    id: 'opt-send-driver',
    page: 'optimizer',
    label: 'Enviar recomendación al conductor · MOCK',
    status: 'unavailable',
    methods: [],
    note: 'Canal SIMULADO. No hay método para notificar al conductor: el envío solo queda en el registro de la página y no sale a ningún sistema. No modifica las restricciones de la tarjeta.',
  },
  {
    id: 'opt-apply-limits',
    page: 'optimizer',
    label: 'Aplicar recomendación en Límites',
    status: 'unavailable',
    methods: [],
    note: 'Solo abre el flujo de Límites con la unidad y la estación precargadas. Límites no tiene escritura en la API (ver lim-policies y lim-override).',
  },
];

/** Things the API supports that the mockup doesn't show yet. */
export const apiOpportunities: Record<FuelPage, { label: string; methods: string[]; note: string }[]> = {
  dashboard: [
    {
      label: 'Filtro por Tag NFC',
      methods: ['TransactionGetFilteredList'],
      note: 'Las consultas aceptan NfcTagDto, incluidos los tags dúo de combustible + telepeaje.',
    },
  ],
  dispersion: [
    {
      label: 'Notas vale por monto o por litros',
      methods: ['CardRequisitionCreditDistribution', 'OrderGetFilteredList'],
      note: 'OrderType 19, con vigencia, número de usos, estaciones permitidas, conductores, horarios y referencia de viaje. También se pueden cancelar.',
    },
    {
      label: 'Caducidad del saldo dispersado',
      methods: ['CardRequisitionCreditDistribution'],
      note: 'ExpirationDate por línea; debe ser anterior a 2051.',
    },
    {
      label: 'Dispersión con pedido de fondos',
      methods: ['CardRequisitionCreditDistribution'],
      note: 'OrderType 11.',
    },
  ],
  limits: [
    {
      label: 'Restricciones dentro de una nota vale',
      methods: ['CardRequisitionCreditDistribution'],
      note: 'Es lo más cercano a un candado: horarios (UsageRestriction), periodos específicos, red de estaciones y conductores, por nota vale y no por tarjeta.',
    },
  ],
  'payment-media': [
    {
      label: 'Activar y cancelar tarjetas',
      methods: ['CardExecute'],
      note: 'Hoy solo mostramos bloquear y desbloquear.',
    },
  ],
  vehicles: [
    {
      label: 'Seguro, permiso de circulación y garantía',
      methods: ['VehicleGetItem'],
      note: 'Aseguradora, póliza, cobertura y vigencia, permiso de circulación y fin de garantía: útil para alertas de vencimiento.',
    },
    {
      label: 'Intervalo de mantenimiento',
      methods: ['VehicleGetItem'],
      note: 'Maintenance y MaintenanceInterval podrían alimentar los preventivos de Mantenimiento.',
    },
    {
      label: 'Valor y depreciación',
      methods: ['VehicleGetItem'],
      note: 'Valor de adquisición, valor actual y tasa de depreciación anual.',
    },
    {
      label: 'ID externo para ERP y Tag NFC',
      methods: ['VehicleGetItem', 'VehicleGetFilteredList'],
      note: 'ExternalIdentification para conciliar con el ERP del cliente; búsqueda por Tag NFC, incluidos tags dúo.',
    },
  ],
  parameters: [
    {
      label: 'Grupos de dispersión y grupos de tarjetas',
      methods: ['CardGetFilteredList', 'VehicleGetItem'],
      note: 'Vienen con ID y descripción en tarjetas y vehículos; podrían ser catálogos de solo lectura. La tarjeta trae además un campo de operación Insert/Update/Delete sobre el grupo de dispersión, pero ningún método lo usa: hay que preguntar a Edenred.',
    },
    {
      label: 'Jerarquía corporativa',
      methods: ['CardGetItem'],
      note: 'Nivel corporativo (CorporateLevelName) para mostrar la estructura empresa → nivel → centro de costo.',
    },
  ],
  optimizer: [],
  drivers: [
    {
      label: 'Conductores permitidos en notas vale',
      methods: ['CardRequisitionCreditDistribution'],
      note: 'Al emitir una nota vale se puede limitar a ciertos conductores (DriverList); es el único lugar donde la API recibe conductores.',
    },
  ],
};

export const apiGeneralConstraints = [
  'Es SOAP 1.2 con WS-Security y certificado X.509: el navegador no puede llamarla directo; se necesita un backend intermedio.',
  'Cada gestor necesita su UserToken (alta en Edenred Secure SSO v2), y cada tarjeta su CardToken para dispersar.',
  'Las listas con All = true devuelven máximo 50 registros; para más hay que paginar.',
  'El histórico de transacciones solo incluye las que tienen más de 3 horas; en modo Online llegan solo datos generales.',
  'Importes e impuestos solo vienen en transacciones ya facturadas.',
];

export const capabilitiesFor = (page: FuelPage) => apiCapabilities.filter((capability) => capability.page === page);
export const capabilityById = (id: string) => apiCapabilities.find((capability) => capability.id === id);
