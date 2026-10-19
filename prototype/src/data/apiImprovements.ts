/**
 * Improvements the headless fuel API (ZERO · TicketCarServices v1.8) would need so the mockup
 * works end to end. Each one points to the coverage entries in `apiCoverage.ts` it would unlock.
 */

export type ImprovementKind = 'new-method' | 'extend-method' | 'platform' | 'docs';
export type ImprovementPriority = 'high' | 'medium' | 'low';

export interface ApiImprovement {
  id: string;
  title: string;
  kind: ImprovementKind;
  priority: ImprovementPriority;
  /** Why it is needed, in product terms. */
  problem: string;
  /** What we would ask the API team for. */
  proposal: string;
  /** Contract sketch; method and field names follow the existing SOAP naming. */
  contract?: string;
  /** Coverage entries it unlocks (`apiCoverage.ts` ids). */
  unlocks: string[];
}

export const IMPROVEMENT_KIND_LABEL: Record<ImprovementKind, string> = {
  'new-method': 'Método nuevo',
  'extend-method': 'Ampliar método',
  platform: 'Plataforma',
  docs: 'Documentación',
};

export const IMPROVEMENT_PRIORITY_LABEL: Record<ImprovementPriority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export const apiImprovements: ApiImprovement[] = [
  // Alta
  {
    id: 'imp-account-balance',
    title: 'Consultar el saldo de la cuenta',
    kind: 'new-method',
    priority: 'high',
    problem: 'El saldo disponible solo llega en la respuesta de una dispersión; la página de Saldos no puede mostrarlo al abrir.',
    proposal: 'Método de lectura del saldo de la cuenta base del cliente, con saldo disponible y saldo en tránsito.',
    contract: 'AccountGetItem(AccountDTORequest) → AccountItemDTOResponse\n  Item.AvailableBaseAccountBalance: decimal\n  Item.PendingDistributionAmount: decimal\n  Item.LastUpdate: DateTime',
    unlocks: ['disp-account'],
  },
  {
    id: 'imp-card-limits',
    title: 'Leer y escribir candados de carga',
    kind: 'new-method',
    priority: 'high',
    problem: 'Políticas de uso depende de controles y configuraciones que hoy no se pueden leer ni escribir: placa, conductor, kilometraje, horómetro, límites de consumo, horarios, estaciones y opciones de experiencia de transacción.',
    proposal: 'CRUD de políticas de restricción reutilizables, asignables a un grupo de tarjetas o a una tarjeta en lo individual.',
    contract:
      'RestrictionPolicyGetFilteredList / RestrictionPolicyExecute (Create | Update | Pause | Delete)\n  Measure: Liters | Amount · Period: Day | Week | Fortnight | Month · PeriodLimit\n  MaxQuantityPerFill · MaxFillsPerDay · MinHoursBetweenFills · TankCapacityLock\n  MerchandiseList · UsageRestrictionList (días/horario) · AcceptanceRestrictionIdentification\n  OdometerRequired · MinPerformance\nCardRestrictionAssign(CardNumber | CardGroupIdentification, PolicyIdentification)',
    unlocks: ['lim-policies', 'lim-assignments'],
  },
  {
    id: 'imp-exceptions',
    title: 'Crear y cancelar autorizaciones por excepción',
    kind: 'new-method',
    priority: 'high',
    problem: 'ExceptionAuthorizationList ya existe en la tarjeta, pero solo se lee; no se puede ampliar el límite de una unidad por unas horas.',
    proposal: 'Alta y cancelación de una excepción temporal con monto o litros extra, vigencia y motivo.',
    contract: 'ExceptionAuthorizationExecute(Card.Number, OperationClass: Create | Cancel,\n  ExtraQuantity, BeginExpirationDate, EndExpirationDate, Reason)',
    unlocks: ['lim-override'],
  },
  {
    id: 'imp-orders-by-account',
    title: 'Listar dispersiones por cuenta, sin número de tarjeta',
    kind: 'extend-method',
    priority: 'high',
    problem: 'OrderGetFilteredList exige CardNumber: para el historial y la gráfica de recargas y recortes hay que consultar tarjeta por tarjeta.',
    proposal: 'Hacer CardNumber opcional y permitir filtrar por cliente, rango de fechas, tipo de orden y estatus, con totales.',
    contract: 'OrderGetFilteredList\n  Item.CardNumber: opcional\n  + Item.OrderTypeIdentificationList, Item.OrderStatusIdentificationList\n  + Response.Totals { DistributedAmount, ReturnedAmount }',
    unlocks: ['disp-history', 'dash-refills'],
  },
  {
    id: 'imp-transactions-fresh',
    title: 'Transacciones completas en tiempo casi real',
    kind: 'extend-method',
    priority: 'high',
    problem: 'El histórico solo trae cargas con más de 3 horas y el modo Online solo datos generales; las alertas, el último uso y las cargas rechazadas llegan tarde.',
    proposal: 'Detalle completo en modo Online (o desfase de minutos), e indicar explícitamente que las rechazadas se incluyen, con su motivo.',
    contract: 'TransactionGetFilteredList\n  InformationType = 1 → TransactionDetailDTO completo\n  + Item.IncludeRejected: bool',
    unlocks: ['disp-attention', 'media-last-use', 'lim-rejections', 'drv-activity'],
  },
  {
    id: 'imp-amounts-before-invoice',
    title: 'Importes antes de facturar',
    kind: 'extend-method',
    priority: 'high',
    problem: 'Amount, IVA e IEPS solo llegan con la transacción facturada, así que el costo por kilómetro del mes en curso no se puede calcular bien.',
    proposal: 'Devolver importe, IVA e IEPS estimados desde la autorización, con una bandera de si ya son definitivos.',
    contract: 'TransactionDTO\n  Amount, VatAmount, SpecialTaxAmount: siempre presentes\n  + IsAmountFinal: bool',
    unlocks: ['dash-cost-km'],
  },
  {
    id: 'imp-summary',
    title: 'Resumen agregado de consumo',
    kind: 'new-method',
    priority: 'high',
    problem: 'Los indicadores y gráficas del Resumen obligan a descargar y sumar todas las transacciones del periodo, de 50 en 50.',
    proposal: 'Endpoint de agregados por periodo, agrupable por vehículo, centro de costo o región.',
    contract: 'TransactionGetSummary(DateStart, DateEnd, GroupBy: Vehicle | CostCenter | Region | Month)\n  → Liters, Amount, TravelDistance, Performance, Transactions',
    unlocks: ['dash-kpis', 'dash-performance', 'dash-org'],
  },
  {
    id: 'imp-rest-gateway',
    title: 'Gateway REST/JSON con OAuth 2.0',
    kind: 'platform',
    priority: 'high',
    problem: 'SOAP 1.2 con WS-Security y X.509 obliga a un backend intermedio, y a guardar UserToken por gestor y CardToken por tarjeta.',
    proposal: 'Exponer los mismos métodos como REST/JSON con OAuth 2.0 (client credentials + token por usuario del SSO) y sin CardToken para operar.',
    unlocks: [],
  },

  // Media
  {
    id: 'imp-scheduled',
    title: 'Dispersiones programadas',
    kind: 'extend-method',
    priority: 'medium',
    problem: 'La API no agenda: los pagos programados, el monto comprometido y las automatizaciones dependen de un motor propio.',
    proposal: 'Aceptar fecha de ejecución en la dispersión y poder listar, cambiar o cancelar las agendadas. El estatus "Agendado" ya existe en el catálogo.',
    contract: 'CreditDistributionOrderDTO\n  + ScheduleDate: DateTime\n  + RecurrenceRule (opcional)\nOrderGetFilteredList(OrderStatusIdentification = 1 · Agendado)',
    unlocks: ['disp-scheduled', 'disp-rules'],
  },
  {
    id: 'imp-withdraw',
    title: 'Recorte de saldo explícito',
    kind: 'extend-method',
    priority: 'medium',
    problem: 'Recortar se tiene que resolver como Devolución o como dispersión relativa, y los valores de absoluto/relativo se contradicen.',
    proposal: 'Operación de retiro que regrese un monto concreto de la tarjeta a la cuenta, con comprobante.',
    contract: 'CardRequisitionCreditDistribution\n  OrderTypeIdentification = Withdraw\n  ExpensesBudgetAmount = monto a retirar',
    unlocks: ['disp-cut'],
  },
  {
    id: 'imp-webhooks',
    title: 'Eventos (webhooks)',
    kind: 'platform',
    priority: 'medium',
    problem: 'Sin eventos hay que consultar periódicamente para detectar saldo en cero, cargas rechazadas o disparar automatizaciones por umbral.',
    proposal: 'Suscripción a eventos: transacción autorizada o rechazada, saldo bajo un umbral, tarjeta bloqueada y dispersión finalizada.',
    contract: 'POST {callback}\n  transaction.authorized | transaction.rejected | card.balance_below | card.status_changed | order.finished',
    unlocks: ['disp-attention', 'disp-rules'],
  },
  {
    id: 'imp-card-assign',
    title: 'Ligar una tarjeta a un vehículo',
    kind: 'new-method',
    priority: 'medium',
    problem: 'La relación tarjeta–vehículo solo se lee; "Asignar" en Medios de pago no se puede ejecutar.',
    proposal: 'Asignar o liberar una tarjeta o Tag NFC de un vehículo.',
    contract: 'CardExecute\n  + CardOperation 20 · AssignVehicle (VehicleIdentification)\n  + CardOperation 21 · UnassignVehicle',
    unlocks: ['media-assign'],
  },
  {
    id: 'imp-card-request',
    title: 'Solicitar tarjetas, tags y reposiciones',
    kind: 'new-method',
    priority: 'medium',
    problem: 'Solicitar medios de pago no tiene método; la reposición solo aparece como dato de lectura.',
    proposal: 'Pedido de plásticos, tags y tarjetas virtuales, y reposición por robo o extravío, con seguimiento.',
    contract: 'CardRequisitionCreate(Type: Chip | Tag | Virtual, Quantity, DeliveringUnitIdentification)\nCardReissue(Card.Number, ReissuingReasonCodeIdentification)',
    unlocks: ['media-request'],
  },
  {
    id: 'imp-vehicles-write',
    title: 'Alta, edición y estatus de vehículos',
    kind: 'new-method',
    priority: 'medium',
    problem: 'Vehículos es de solo lectura, y el estatus solo distingue Activo e Inactivo.',
    proposal: 'Crear y editar vehículos, y agregar el estatus "En taller" para enlazar con Mantenimiento.',
    contract: 'VehicleExecute(Create | Update | SetStatus)\n  StatusIdentification: 1 Activo · 2 Inactivo · + 3 En taller',
    unlocks: ['veh-create', 'veh-status'],
  },
  {
    id: 'imp-vehicle-group',
    title: 'Grupo de flota en el vehículo',
    kind: 'extend-method',
    priority: 'medium',
    problem: 'El vehículo trae grupo de dispersión, grupo de tarjetas y centro de costo, pero ningún "grupo de flota" que coincida con el de la plataforma.',
    proposal: 'Un campo de grupo operativo (o documentar cuál de los existentes usar) y filtrar por él.',
    contract: 'VehicleDetailDTO\n  + FleetGroupIdentification / FleetGroupDescription\nVehicleGetFilteredList + filtro FleetGroupIdentification',
    unlocks: ['veh-group'],
  },
  {
    id: 'imp-drivers',
    title: 'Catálogo de conductores',
    kind: 'new-method',
    priority: 'medium',
    problem: 'Los conductores solo existen como dato del vehículo: sin unidad no aparecen, y no hay número de empleado, licencia ni estatus propio.',
    proposal: 'CRUD de conductores con número de empleado, licencia (tipo y vencimiento), estatus y asignación a vehículo.',
    contract: 'DriverGetFilteredList / DriverExecute (Create | Update | SetStatus | AssignVehicle)\n  DriverNumber, Name, LicenseType, LicenseExpirationDate, StatusIdentification, VehicleIdentification',
    unlocks: ['drv-list', 'drv-license', 'drv-status', 'drv-create'],
  },
  {
    id: 'imp-catalogs',
    title: 'Catálogos de estructura de la empresa',
    kind: 'new-method',
    priority: 'medium',
    problem: 'Regiones, centros de costo y sucursales solo se pueden reconstruir a partir de tarjetas, vehículos y transacciones.',
    proposal: 'Listar y administrar regiones, grupos de región, centros de costo (con su región) y garajes o unidades de entrega.',
    contract: 'RegionGetFilteredList · CostCenterGetFilteredList · GarageGetFilteredList · DeliveringUnitGetFilteredList\n+ …Execute (Create | Update | Deactivate)',
    unlocks: ['par-regions', 'par-cost-centers', 'par-branches', 'par-write'],
  },
  {
    id: 'imp-billing',
    title: 'Datos fiscales de facturación',
    kind: 'new-method',
    priority: 'medium',
    problem: 'Los grupos de facturación necesitan RFC, razón social, uso de CFDI, método de pago y correo, y la API solo expone el nivel corporativo.',
    proposal: 'Listar y editar las cuentas de facturación con sus datos fiscales, y consultar los CFDI emitidos.',
    contract: 'BillingAccountGetFilteredList / BillingAccountExecute\n  Rfc, LegalName, CfdiUse, PaymentMethod, InvoiceEmail\nInvoiceGetFilteredList → Uuid, Folio, Total, PdfUrl, XmlUrl',
    unlocks: ['par-billing'],
  },
  {
    id: 'imp-paging',
    title: 'Paginación más amplia',
    kind: 'platform',
    priority: 'medium',
    problem: 'Con All = true el máximo es 50 registros por petición, demasiado poco para flotas de cientos de unidades.',
    proposal: 'Subir el límite (p. ej. 500) y usar cursores para recorrer listas grandes.',
    contract: 'PagingDTO\n  + Cursor: string · NextCursor: string\n  PageRecords hasta 500',
    unlocks: ['veh-list', 'media-list'],
  },

  // Baja
  {
    id: 'imp-balance-requests',
    title: 'Solicitudes de saldo del conductor',
    kind: 'new-method',
    priority: 'low',
    problem: 'Las solicitudes de saldo dependen de un canal propio; la API no recibe ni lista peticiones.',
    proposal: 'Registrar y listar solicitudes hechas desde la app del conductor, y aprobarlas o rechazarlas.',
    contract: 'BalanceRequestGetFilteredList / BalanceRequestExecute (Approve | Reject)',
    unlocks: ['disp-requests'],
  },
  {
    id: 'imp-dry-run',
    title: 'Validar una dispersión sin ejecutarla',
    kind: 'extend-method',
    priority: 'low',
    problem: 'Para simular una corrida o validar una carga masiva hay que replicar del lado nuestro las validaciones del servicio.',
    proposal: 'Modo de validación que regrese errores y totales sin mover saldo.',
    contract: 'CardRequisitionCreditDistribution\n  + Item.ValidateOnly: bool',
    unlocks: ['disp-bulk', 'disp-rules'],
  },
  {
    id: 'imp-custom-params',
    title: 'Escritura de campos de configuración',
    kind: 'docs',
    priority: 'low',
    problem: 'CustomParameters (vehículo) y CreditDistributionGroupOperationClass (tarjeta) sugieren escritura, pero ningún método la documenta.',
    proposal: 'Confirmar si se pueden escribir y con qué método; servirían para catálogos propios y grupos de dispersión.',
    unlocks: ['par-custom'],
  },

  // Documentación
  {
    id: 'doc-distribution-type',
    title: 'Valores de DistributionTypeIdentification',
    kind: 'docs',
    priority: 'high',
    problem: 'El DTO dice absoluto = 0 y relativo = 1; el catálogo dice absoluto = 1 y relativo = 2. Usar el valor equivocado reemplaza el saldo en vez de sumarlo.',
    proposal: 'Publicar un solo valor válido y confirmarlo contra el WSDL.',
    unlocks: ['disp-quick', 'disp-cut'],
  },
  {
    id: 'doc-nfc-types',
    title: 'Tipos de NfcTagDto',
    kind: 'docs',
    priority: 'medium',
    problem: 'NfcNumericValue y NfcElectronicToll aparecen tipados como DateTime.',
    proposal: 'Corregir los tipos (numérico / string) en el documento.',
    unlocks: [],
  },
  {
    id: 'doc-contracts',
    title: 'Contratos incompletos o contradictorios',
    kind: 'docs',
    priority: 'medium',
    problem: 'VehicleListDTOResponse y TransactionItemDTOResponse no tienen estructura; FilterIdentification no está en ningún DTO; IsInvoiced es bool en un lado y 1/2 en otro; VehicleGetItem dice "por tarjeta" pero pide Identification.',
    proposal: 'Completar estas definiciones y unificar tipos.',
    unlocks: [],
  },
];
