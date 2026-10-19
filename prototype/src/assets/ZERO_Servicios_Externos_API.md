# ZERO, Servicios Externos — TicketCarServices API

> Especificación técnica para **Ticket Car 3** — Clientes de migración CGI → ERMX
> Versión del documento fuente: **1.8** (26/12/2023) · Edenred México

---

## Índice

1. [Descripción general](#1-descripción-general)
2. [Ambientes y endpoints](#2-ambientes-y-endpoints)
3. [Seguridad y autenticación](#3-seguridad-y-autenticación)
4. [Convenciones comunes](#4-convenciones-comunes)
5. [Métodos](#5-métodos)
6. [Tipos complejos (Request / Response)](#6-tipos-complejos-request--response)
7. [Entidades (DTOs)](#7-entidades-dtos)
8. [Catálogos y enumeraciones](#8-catálogos-y-enumeraciones)
9. [Códigos de error](#9-códigos-de-error)
10. [Ejemplo de implementación (.NET C#)](#10-ejemplo-de-implementación-net-c)
11. [Observaciones e inconsistencias del documento fuente](#11-observaciones-e-inconsistencias-del-documento-fuente)
12. [Historial de versiones](#12-historial-de-versiones)

---

## 1. Descripción general

**TicketCarServices** es un servicio seguro que orquesta las peticiones de clientes externos de Edenred (Ticket Car). Las funcionalidades disponibles para cada cliente dependen de lo que tenga contratado.

| Característica | Valor |
|---|---|
| Tipo de servicio | **SOAP 1.2** (WCF) |
| Transporte | HTTPS (SSL) + certificado X.509 en servidor |
| Infraestructura | Internet → WAF → `TicketCarServices.svc` (DMZ) |
| Contrato | `ITicketCarFacadeServices` |

### Capacidades

- Listar transacciones por cliente-gestor o por tarjeta.
- Obtener el detalle de una transacción.
- Dispersar saldo a una o varias tarjetas (modo saldo o modo nota vale), por monto o por litros.
- Obtener una nota vale por ID, o listar notas vale por cliente-gestor o tarjeta.
- Obtener datos de un vehículo o listar vehículos/maquinaria con filtros.
- Listar u obtener tarjetas; cancelar, activar, bloquear o desbloquear tarjetas.
- Listar mercancías.

### Flujo general de una petición

```
Entrada (SecurityHeader: usuario/contraseña + token de usuario + datos)
   │
   ├─► Valida credenciales del cliente
   ├─► Valida credenciales del gestor
   ├─► Obtiene información complementaria del usuario por producto
   ├─► Ejecuta la operación (dispersión / consulta)
   └─► Procesa respuesta → regresa DTO de respuesta
```

---

## 2. Ambientes y endpoints

| Ambiente | URL |
|---|---|
| **Pruebas** | `https://demo.edenred.com.mx/Desarrollo/ExternalTicketCar/TicketCarServicesFacade.svc` |
| **Producción** | `https://servicesfleet.edenred.com.mx/ExternalTicketCar/TicketCarServicesFacade.svc` |
| **WSDL (producción)** | `https://servicesfleet.edenred.com.mx/ExternalTicketCar/TicketCarServicesFacade.svc?wsdl` |

---

## 3. Seguridad y autenticación

La autenticación opera en **dos capas**:

### 3.1 Credenciales en la cabecera del mensaje (WS-Security)

- Modo de seguridad: `TransportWithMessageCredential`
- Tipo de credencial: `UserName` (usuario + contraseña en la cabecera SOAP)
- Firma con certificado **X.509** del lado del servidor.

### 3.2 `SecurityDTO` en el cuerpo de cada petición

Todas las peticiones incluyen un objeto `Security`:

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `CustomerIdentification` | int | NO | ID de cliente del SSO de servicios |
| `Token` | string | **SÍ** | Token encriptado asociado al gestor (*UserToken*) |
| `Ip` | string | **SÍ** | IP del cliente que llama al servicio |

### 3.3 UserToken

- Cadena encriptada (**AES Rijndael**) con la información de autenticación del gestor (usuario).
- Es **único por usuario–cliente**.
- El cliente debe mantener un **repositorio local** que relacione cada usuario con su token, para no enviar credenciales personales en el mensaje.
- Cada usuario que necesite token debe estar dado de alta en **Edenred Secure (SSO v2)**.

### 3.4 CardToken

- Cadena encriptada (**AES Rijndael**) con información complementaria de una tarjeta.
- Se obtiene previamente mediante la consulta de tarjetas (`CardGetFilteredList`) o la ficha técnica del vehículo.
- Es requerido para dispersar (`CardRequisitionCreditDistribution`) y para anular notas vale.

---

## 4. Convenciones comunes

### 4.1 Estructura de las respuestas

Todas las respuestas siguen el mismo patrón:

| Campo | Tipo | Descripción |
|---|---|---|
| `Item` o `List` | DTO / List<DTO> | Datos devueltos |
| `ErrorList` | List<[ErrorDTO](#errordto)> | Errores, presentes cuando `Success = false` |
| `Success` | bool | `true` si no hubo error (aunque no se devuelvan datos); `false` si hubo error |
| `Paging` | [PagingDTO](#pagingdto) | Solo en respuestas de listas |

### 4.2 Paginación — `PagingDTO`

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `All` | bool | **SÍ** | Lista todos los elementos o solo los paginados |
| `PageNumber` | unsignedInt | Cond. | Página a devolver. Requerido si `All = false`. **Comienza en 1** |
| `PageRecords` | unsignedInt | Cond. | Registros por página. Requerido si `All = false` |
| `TotalRecords` | unsignedInt | NO | Total de registros obtenidos (respuesta) |

> ⚠️ Si `All = true`, se devuelve un **máximo de 50 registros por petición**, para limitar el ancho de banda.

### 4.3 Leyenda de obligatoriedad

| Valor | Significado |
|---|---|
| **SÍ** | Obligatorio |
| **OPC / OPT / OP** | Condicional u opcional según la operación (ver descripción) |
| **NO** | No obligatorio (normalmente solo de respuesta) |
| **N/A** | No aplica |

---

## 5. Métodos

| Método | Request | Response | Descripción |
|---|---|---|---|
| [`TransactionGetFilteredList`](#51-transactiongetfilteredlist) | `TransactionDTORequest` | `TransactionListDTOResponse` | Lista transacciones por cliente-gestor o tarjeta |
| [`TransactionGetItem`](#52-transactiongetitem) | `TransactionDTORequest` | `TransactionItemDTOResponse` | Detalle de una transacción |
| [`CardRequisitionCreditDistribution`](#53-cardrequisitioncreditdistribution) | `CardRequisitionCreditDistributionDTORequest` | `CardRequisitionCreditDistributionResponse` | Dispersión (o cancelación) de saldo / nota vale |
| [`OrderGetItem`](#54-ordergetitem) | `OrderDTORequest` | `OrdeItemDTOResponse` | Obtiene una nota vale / orden por ID |
| [`OrderGetFilteredList`](#55-ordergetfilteredlist) | `OrderDTORequest` | `OrderListDTOResponse` | Lista notas vale / órdenes |
| [`CardGetFilteredList`](#56-cardgetfilteredlist) | `CardDTORequest` | `CardListDTOResponse` | Lista tarjetas filtradas |
| [`CardGetItem`](#57-cardgetitem) | `CardDTORequest` | `CardItemDTOResponse` | Información de una tarjeta |
| [`CardExecute`](#58-cardexecute) | `CardDTORequest` | `CardItemDTOResponse` | Cancela, activa, bloquea o desbloquea una tarjeta |
| [`VehicleGetItem`](#59-vehiclegetitem) | `VehicleDTORequest` | `VehicleItemDTOResponse` | Obtiene un vehículo |
| [`VehicleGetFilteredList`](#510-vehiclegetfilteredlist) | `VehicleDTORequest` | `VehicleListDTOResponse` | Lista vehículos / maquinaria |
| [`MerchandiseGetFilteredList`](#511-merchandisegetfilteredlist) | `MerchandiseDTORequest` | `MerchandiseListDTOResponse` | Lista mercancías |

---

### 5.1 `TransactionGetFilteredList`

Devuelve el listado de transacciones por cliente-gestor o número de tarjeta.

- **Request:** [`TransactionDTORequest`](#transactiondtorequest)
- **Response:** [`TransactionListDTOResponse`](#transactionlistdtoresponse)

**Campos relevantes en `Item` (`TransactionDTO`):**

| Campo | Uso |
|---|---|
| `IsInvoiced` | **Requerido** |
| `TransactionDatetimeStart` / `TransactionDatetimeEnd` | Opcional, búsqueda por rango de fechas |
| `InformationType` | `0` = Offline/histórico (default), `1` = Online |
| `Detail.Card.Number` | Requerido si la búsqueda es por tarjeta |
| `Detail.Vehicle.Identification` | Requerido si la búsqueda es por vehículo |
| `Detail.NfcTagDto` | Opcional, filtro por Tag NFC |

> **Notas**
> - `InformationType = 0` consulta el **histórico** (transacciones con más de 3 horas de antigüedad).
> - En modo **Online** solo se devuelven datos generales; para el detalle completo, usa `TransactionGetItem`.
> - `Amount`, `VatAmount`, `VatRate`, `SpecialTax` y `SpecialTaxAmount` solo traen datos cuando la transacción **ya está facturada** (`IsInvoiced = true`).

---

### 5.2 `TransactionGetItem`

Devuelve los detalles de una transacción.

- **Request:** [`TransactionDTORequest`](#transactiondtorequest)
- **Response:** `TransactionItemDTOResponse` (`Item: TransactionDTO`, `ErrorList`, `Success`)

**Campos relevantes:**

| Campo | Uso |
|---|---|
| `Item.Detail.AuthorizationNumber` | **Requerido** — número de autorización |
| `Item.Detail.TransactionOperationClass` | `7` = Obtener elemento por número de autorización |

---

### 5.3 `CardRequisitionCreditDistribution`

Genera una dispersión a una o varias tarjetas, **por monto o por litros**, en **modo saldo** o **modo nota vale**. También permite **cancelar** una dispersión o nota vale.

- **Request:** [`CardRequisitionCreditDistributionDTORequest`](#cardrequisitioncreditdistributiondtorequest)
- **Response:** [`CardRequisitionCreditDistributionResponse`](#cardrequisitioncreditdistributionresponse)

**Validaciones del servicio:**

- El número de tarjeta existe.
- La tarjeta no está bloqueada ni cancelada.
- El monto total de la lista no supera el saldo actual del cliente.
- La tarjeta tiene modalidad de saldo o nota vale.
- No hay números de tarjeta duplicados en la lista.
- Las fechas de vigencia y caducidad son correctas.
- Los montos son mayores a cero.

**Reglas de fechas (`ExpirationDate`):**

- La caducidad del saldo no puede ser anterior al inicio válido de la dispersión.
- La caducidad del saldo debe ser anterior al año **2051**.
- En modo nota vale, la fecha de inicio de vigencia no puede ser anterior a la fecha actual.

#### Escenarios

| Escenario | `OrderOperationClass` | `OrderTypeIdentification` | Campos clave |
|---|---|---|---|
| Dispersión modo saldo | `0` (Assign) | `2` (default) | `DistributionTypeIdentification`, `ExpensesBudgetAmount`, `Card.Number`, `Card.Token` |
| Dispersión con pedido de fondos | `0` | `11` | Igual que modo saldo |
| Devolución | `0` | `12` | Igual que modo saldo |
| Nota vale por monto | `0` | `19` | `Preautorization` con `TypeIdentification = 1` y `RequisitionMerchandiseList` |
| Nota vale por litros | `0` | `19` | `Preautorization` con `TypeIdentification = 2`; cada `MerchandiseDTO` con `Identification`, `UnitPrice`, `Quantity` |
| Cancelación de nota vale | `1` (Cancel) | `19` | `OrderIdentification`, `Card.Number`, `Card.Token`, fechas de vigencia, `Preautorization.Identification` |

> - Si se omite `OrderOperationClass`, el default es **Assign (0)**.
> - Si se omite `OrderTypeIdentification`, el default es **2 (Dispersión modo saldo)**.
> - `DistributionTypeIdentification` solo aplica a tarjetas **modo saldo**, no a nota vale.

---

### 5.4 `OrderGetItem`

Devuelve una nota vale / orden por ID.

- **Request:** [`OrderDTORequest`](#orderdtorequest) — requerido `Item.OrderIdentification`
- **Response:** `OrdeItemDTOResponse` (`Item: OrderDTO`, `ErrorList`, `Success`)

---

### 5.5 `OrderGetFilteredList`

Devuelve un listado de notas vale / órdenes, por cliente-gestor o por tarjeta.

- **Request:** [`OrderDTORequest`](#orderdtorequest) — requeridos `Item.CustomerIdentification`, `Item.CardNumber`, `Item.OrderTypeIdentification`; opcional rango `OrderDateStart` / `OrderDateEnd`
- **Response:** `OrderListDTOResponse` (`List: List<OrderDTO>`, `ErrorList`, `Success`, `Paging`)

---

### 5.6 `CardGetFilteredList`

Devuelve una lista de tarjetas filtradas para un cliente-gestor.

- **Request:** [`CardDTORequest`](#carddtorequest)
- **Response:** `CardListDTOResponse` (`List: List<CardDTO>`, `ErrorList`, `Success`, `Paging`)

**Filtros posibles en `Item` (`CardDTO`):**

| Filtro | Campo |
|---|---|
| Por estatus | `StatusIdentification` |
| Por vehículo | `Details.VehicleIdentification` (FilterIdentification = 2) |
| Por placa | `Details.VehicleTag` (FilterIdentification = 3) |
| Por tipo de vehículo | `Details.VehicleTypeIdentification` (FilterIdentification = 1) |
| Por Tag NFC | `Details.NfcTagDto` |

> El `Token` de cada tarjeta devuelta es el **CardToken** que se usará después para dispersar.

---

### 5.7 `CardGetItem`

Devuelve la información de una tarjeta.

- **Request:** [`CardDTORequest`](#carddtorequest) — identificar la tarjeta por `Number` o `Details.NfcTagDto`
- **Response:** `CardItemDTOResponse` (`Item: CardDTO`, `ErrorList`, `Success`)

---

### 5.8 `CardExecute`

Cambia el estatus de una tarjeta: **cancelar, activar, bloquear o desbloquear**.

- **Request:** [`CardDTORequest`](#carddtorequest)
- **Response:** `CardItemDTOResponse`

**Campos requeridos:**

| Campo | Descripción |
|---|---|
| `Item.Number` (o `Details.NfcTagDto`) | Tarjeta a operar |
| `Item.Details.CardOperationClass` | Operación — ver [CardOperation](#cardoperation) |
| `Item.Details.CardStatusReasonIdentification` | Motivo — requerido para cancelación, bloqueo y desbloqueo. Ver [CardStatusReasonIdentification](#cardstatusreasonidentification) |

---

### 5.9 `VehicleGetItem`

Obtiene un vehículo.

- **Request:** [`VehicleDTORequest`](#vehicledtorequest) — requerido `Item.Identification` (u opcionalmente `VehicleDetail.NfcTagDto`)
- **Response:** `VehicleItemDTOResponse` (`Item: VehicleDTO`, `ErrorList`, `Success`)

> La tabla de métodos del documento indica "por número de tarjeta", pero la definición de `VehicleDTO` indica búsqueda por `Identification` del vehículo.

---

### 5.10 `VehicleGetFilteredList`

Devuelve una lista de vehículos o maquinaria por filtros.

- **Request:** [`VehicleDTORequest`](#vehicledtorequest)
- **Response:** `VehicleListDTOResponse`

**Filtros:** `Plate`, `VehicleDetail.IdentificationNumber`, `VehicleDetail.IdentificationType`, `VehicleDetail.StatusIdentification` (`1` = Activo, `2` = Inactivo), `VehicleDetail.NfcTagDto`.

---

### 5.11 `MerchandiseGetFilteredList`

Devuelve una lista de mercancías por rango o por identificador.

- **Request:** [`MerchandiseDTORequest`](#merchandisedtorequest)
- **Response:** `MerchandiseListDTOResponse` (`List: List<MerchandiseDTO>`, `ErrorList`, `Paging`, `Success`)

---

## 6. Tipos complejos (Request / Response)

### Requests

#### TransactionDTORequest

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `Item` | [TransactionDTO](#transactiondto) | SÍ | Datos y filtros de la transacción |
| `Paging` | [PagingDTO](#pagingdto) | SÍ | Paginación |
| `Security` | [SecurityDTO](#33-securitydto-en-el-cuerpo-de-cada-petición) | SÍ | Usuario y cliente que ejecutan la petición |

#### CardRequisitionCreditDistributionDTORequest

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `Item` | [CreditDistributionOrderDTO](#creditdistributionorderdto) | SÍ | Datos de la dispersión |
| `Security` | SecurityDTO | SÍ | Cliente y usuario |

#### VehicleDTORequest

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `Item` | [VehicleDTO](#vehicledto) | SÍ | Datos del vehículo a consultar |
| `Security` | SecurityDTO | SÍ | Cliente y usuario |

#### OrderDTORequest

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `Item` | [OrderDTO](#orderdto) | SÍ | Orden de dispersión (nota vale o asignación modo saldo) |
| `Paging` | PagingDTO | SÍ | Paginación |
| `Security` | SecurityDTO | SÍ | Cliente y usuario |

#### CardDTORequest

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `Item` | [CardDTO](#carddto) | OPC | Requerido en `CardGetFilteredList` y `CardExecute` |
| `Paging` | PagingDTO | SÍ | Paginación |
| `Security` | SecurityDTO | SÍ | Cliente y usuario |

#### MerchandiseDTORequest

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `Identification` | uint | OPC | Identificador del tipo de mercancía |
| `Paging` | PagingDTO | SÍ | Paginación |
| `Security` | SecurityDTO | SÍ | Cliente y usuario |

### Responses

#### TransactionListDTOResponse

| Campo | Tipo | Req |
|---|---|:-:|
| `List` | List<TransactionDTO> | NO |
| `ErrorList` | List<ErrorDTO> | NO |
| `Paging` | PagingDTO | NO |
| `Success` | bool | NO |

#### CardRequisitionCreditDistributionResponse

| Campo | Tipo | Req |
|---|---|:-:|
| `Item` | CreditDistributionOrderDTO | SÍ |
| `ErrorList` | List<ErrorDTO> | NO |
| `Success` | bool | SÍ |

#### Otras respuestas

| Response | Contenido |
|---|---|
| `TransactionItemDTOResponse` | `Item: TransactionDTO`, `ErrorList`, `Success` |
| `VehicleItemDTOResponse` | `Item: VehicleDTO` (SÍ), `ErrorList`, `Success` (SÍ) |
| `VehicleListDTOResponse` | Lista de vehículos filtrados (estructura no detallada en el documento) |
| `OrdeItemDTOResponse` | `Item: OrderDTO` (SÍ), `ErrorList`, `Success` (SÍ) |
| `OrderListDTOResponse` | `List: List<OrderDTO>` (SÍ), `ErrorList`, `Success` (SÍ), `Paging` (SÍ) |
| `CardListDTOResponse` | `List: List<CardDTO>` (SÍ), `ErrorList`, `Success` (SÍ), `Paging` (SÍ) |
| `CardItemDTOResponse` | `Item: CardDTO` (SÍ), `ErrorList`, `Success` (SÍ) |
| `MerchandiseListDTOResponse` | `List: List<MerchandiseDTO>`, `ErrorList`, `Paging`, `Success` (todos NO) |

---

## 7. Entidades (DTOs)

### CreditDistributionOrderDTO

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `OrderIdentification` | decimal | OP | ID generado en la dispersión. Requerido para **cancelar** nota vale |
| `ExternalOrderIdentification` | int | OP | Referencia de pedido externo. Default `0` |
| `List` | List<[OrderCreditDistributioDetailDTO](#ordercreditdistributiodetaildto)> | SÍ | Detalle de la dispersión (una entrada por tarjeta) |
| `OrderStatusIdentification` | int | SÍ | Estatus de la orden — ver [OrderStatusIdentification](#orderstatusidentification) |
| `OrderOperationClass` | OrderOperationClass | SÍ | `0` = Assign (default), `1` = Cancel |

### OrderCreditDistributioDetailDTO

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `DistributionTypeIdentification` | unsignedInt | SÍ | Tipo de saldo (absoluto / relativo). Solo modo saldo. Ver [catálogo](#distributiontypeidentification) |
| `ExpensesBudgetAmount` | decimal | SÍ | Monto a dispersar |
| `PreAuthorizationExpirationBeginDateTime` | DateTime | OPC | Inicio de vigencia de la nota vale. Requerido para cancelar |
| `PreAuthorizationEnpirationEndDateTime` | DateTime | OPC | Fin de vigencia de la nota vale. Requerido para cancelar |
| `ExpirationDate` | DateTime | NO | Caducidad del saldo dispersado |
| `OrderTypeIdentification` | unsignedInt | SÍ | Tipo de dispersión (default `2`). Ver [catálogo](#ordertypeidentification) |
| `Route` | string | NO | Trayecto |
| `AditionalInformation` | string | NO | Observaciones |
| `Preautorization` | [PreauthorizationDTO](#preauthorizationdto) | OPC | Requerido si es nota vale (`19`) |
| `CreditDistributionQueueList` | [CreditDistributionQueueDTO](#creditdistributionqueuedto) | NO | Dispersiones pendientes. Solo TC2 |
| `AvailableBaseAccountBalance` | decimal | NO | Saldo de la cuenta base |
| `Card` | [CardDTO](#carddto) | SÍ | Tarjeta (`Number` + `Token`) |

### CardDTO

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `Number` | string | OPC | Número de tarjeta. Requerido en `CardExecute`, `CardRequisitionCreditDistribution`, `TransactionGetFilteredList` (si se busca por tarjeta) y en cancelación de nota vale |
| `CustomerIdentification` | uint | NO | ID del cliente |
| `StatusIdentification` | unsignedInt | OPC | Requerido en `CardGetFilteredList` si se busca por estatus |
| `StatusDescription` | string | NO | Estatus de la tarjeta |
| `CurrentBalance` | decimal | NO | Saldo (se actualiza tras la dispersión) |
| `Token` | string | NO* | **CardToken**. Requerido en `CardRequisitionCreditDistribution` y en cancelación de nota vale |
| `Details` | [CardDetailDTO](#carddetaildto) | NO | Detalle de la tarjeta |

### CardDetailDTO

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `AccountIdentification` | uint | NO | ID de la cuenta |
| `ActivatedInd` | string | NO | Bandera de tarjeta activa |
| `AdditionalExpensesBudgetAmount` | decimal | NO | Presupuesto de gastos adicionales |
| `AddressIdentification` | uint | NO | ID de la dirección |
| `AvailableExpensesBudgetAmount` | decimal | NO | Presupuesto disponible |
| `BlockedDate` | DateTime | NO | Fecha de bloqueo |
| `CardEmbossingReasonIdentification` | uint | NO | ID de razón de embozado |
| `CardEmbossingReasonIsPreviousCardCancelingRequired` | bool | NO | En reposición, si se debe cancelar la tarjeta anterior |
| `CardGroupDescription` | string | NO | Descripción del grupo de tarjetas |
| `CardGroupIdentification` | uint | NO | ID del grupo de tarjetas |
| `CardOperationClass` | [CardOperation](#cardoperation) | OPT | Operación sobre la tarjeta (`CardExecute`) |
| `CardStatusReasonIdentification` | uint | NO* | Motivo de cambio de estatus. Requerido para cancelar, bloquear y desbloquear |
| `CardStatusReasonTypeIdentification` | uint | NO | ID del tipo de razón |
| `CardTechnologyTypeDescription` | string | NO | Tecnología de la tarjeta |
| `CardTechnologyTypeIdentification` | uint | NO | ID de tecnología |
| `CardTypeDescription` | string | NO | Tipo de tarjeta |
| `CardTypeIdentification` | uint | NO | ID del tipo de tarjeta |
| `ClosedInd` | string | NO | Indica si fue cancelada |
| `CorporateLevelBillingTypeDescription` | string | NO | Tipo de facturación del nivel corporativo |
| `CorporateLevelName` | string | NO | Nombre del nivel corporativo |
| `CostCenterDescription` | string | NO | Centro de costos |
| `CostCenterIdentification` | uint | NO | ID del centro de costos |
| `CreditDistributionGroupDescription` | string | NO | Grupo de dispersión |
| `CreditDistributionGroupIdentification` | uint | NO | ID del grupo de dispersión |
| `CreditDistributionGroupOperationClass` | uint | NO | `0` = Insert, `1` = Update, `2` = Delete |
| `CreditDistributionTypeIdentification` | uint | NO | Tipo de dispersión (absoluto / relativo) |
| `DeliveredInd` | string | NO | Bandera de tarjeta entregada |
| `DeliveringUnitAddressDescription` | string | NO | Dirección de la unidad de entrega |
| `DeliveringUnitAddressIdentification` | uint | NO | ID de dirección de la unidad de entrega |
| `DeliveringUnitDescription` | string | NO | Unidad de entrega |
| `DeliveringUnitIdentification` | uint | NO | ID de la unidad de entrega |
| `EmbossingName` | string | NO | Nombre grabado |
| `EmbossingReason` | string | NO | Motivo de grabado |
| `EntityIdentificationType` | uint | NO | Tipo de entidad |
| `EntityIdentificationValue` | string | NO | Valor de identificación de entidad |
| `ExceptionAuthorizationList` | List<[ExcepcionAuthorizationDTO](#excepcionauthorizationdto)> | NO | Autorizaciones por excepción |
| `ExpensesBudgetAmount` | decimal | OPT | Monto a asignar. Condicional si `OrderTypeIdentification` ∈ {2, 11, 12} y `OperationClass = 0` |
| `GarageDescription` | string | NO | Garaje |
| `GarageIdentification` | uint | NO | ID del garaje |
| `IdentificationNumber` | string | NO | Número de identificación |
| `IsStockCard` | bool | NO | Indica si es tarjeta de stock |
| `IssueDate` | DateTime | NO | Fecha de emisión |
| `NewCardNumber` | string | NO | Número de tarjeta generado por reemisión |
| `NewExpensesBudgetAmount` | decimal | OPC | Mismo valor que `ExpensesBudgetAmount`. Requerido para cancelar nota vale; condicional si `OrderTypeIdentification` ∈ {2, 11, 12} y `OperationClass = 0` |
| `OperationCardNumber` | string | NO | Uso interno de WATTS |
| `OperationType` | string | NO | Tipo de operación |
| `OperationTypeIdentification` | uint | NO | ID del tipo de operación |
| `OperatorName` | string | NO | Nombre del operador |
| `ReissuingReasonCodeIdentification` | int | NO | ID del motivo de reposición |
| `ReissuingReasonDescription` | string | NO | Motivo de reposición |
| `StatusChip` | string | NO | Estatus del chip |
| `StatusDescription` | string | NO | Estado de la tarjeta |
| `StockCardIdentification` | string | NO | ID de tarjeta de stock |
| `StockCardOperationReasonIdentification` | uint | NO | Razón de operación de tarjeta de stock |
| `ValidDate` | DateTime | NO | Fecha válida |
| `VehicleIdentification` | uint | OPC | Requerido si `FilterIdentification = 2` |
| `VehicleTag` | string | OPC | Placa. Requerido si `FilterIdentification = 3` |
| `VehicleTypeDescription` | string | NO | Tipo de vehículo |
| `VehicleTypeIdentification` | uint | NO | Requerido si `FilterIdentification = 1` |
| `AdditionalInformation` | string | NO | Información adicional |
| `AvailableBalanceExecuted` | decimal | NO | Saldo disponible ejecutado |
| `CreditExpirationDate` | DateTime | NO | Vencimiento del crédito |
| `DistributionValueTypeIdentification` | uint | NO | Tipo de valor de distribución |
| `ExpensesBudgetAmountExecuted` | decimal | NO | Monto de presupuesto ejecutado |
| `NfcTagDto` | [NfcTagDto](#nfctagdto) | OPC | Filtro por Tag NFC en `CardGetFilteredList`, `CardGetItem` y `CardExecute` |

### TransactionDTO

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `Identification` | uint | NO | ID de la transacción |
| `CustomerIdentification` | uint | NO | ID del cliente |
| `TransactionDate` | DateTime | NO | Fecha de la transacción |
| `TypeIdentification` | uint | NO | Tipo de transacción |
| `TypeDescription` | string | NO | Descripción del tipo |
| `TransactionDatetimeStart` | DateTime | OPT | Inicio del rango de búsqueda |
| `TransactionDatetimeEnd` | DateTime | OPT | Fin del rango de búsqueda |
| `IsInvoiced` | bool | OPT | Transacción facturada. **Requerido** en `TransactionGetFilteredList` |
| `Amount` | decimal | NO | Importe antes de impuestos |
| `VatAmount` | decimal | NO | IVA |
| `VatRate` | decimal | NO | Porcentaje de IVA |
| `TotalAmount` | decimal | NO | Importe con impuestos |
| `InformationType` | int | NO | `0` = Offline (default), `1` = Online |
| `Detail` | [TransactionDetailDTO](#transactiondetaildto) | NO | Detalle de la transacción |

### TransactionDetailDTO

<details>
<summary>Ver todos los campos (≈90)</summary>

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `IsInvoiceCharged` | bool | NO | Factura cobrada |
| `InvoiceReference` | string | NO | Número de factura |
| `InvoiceDate` | DateTime | NO | Fecha de facturación |
| `InvoiceChargeDate` | DateTime | NO | Fecha de cobro de factura |
| `Observation` | string | NO | Observaciones |
| `NumberVoucher` | string | NO | Número de comprobante |
| `TransactionState` | string | NO | Estado donde se realizó |
| `TransactionPreviousKm` | uint | NO | Kilometraje anterior |
| `TransactionCurrentKm` | uint | NO | Kilometraje en la transacción |
| `TransactionPreviousBalance` | decimal | NO | Saldo anterior |
| `TransactionCity` | string | NO | Ciudad |
| `TransactionOperationClass` | uint | **SÍ** | Tipo de consulta — ver [catálogo](#transactionoperationclass) |
| `TransactionRequiredInformationList` | List<[TransactionRequiredInformationDTO](#transactionrequiredinformationdto)> | N/A | Información requerida |
| `TerminalIdentification` | uint | NO | ID de terminal |
| `BillingDate` | DateTime | NO | Fecha de facturación |
| `FolioControlNumber` | string | NO | Folio de control |
| `SpecialTax` | decimal | NO | Impuesto especial (IEPS) |
| `SpecialTaxAmount` | decimal | NO | Monto IEPS |
| `MerchandiseQuantity` | decimal | NO | Cantidad de mercancía |
| `Merchandise` | MerchandiseDTO | NO | Mercancía |
| `Card` | CardDTO | NO | Tarjeta |
| `Afiliate` | AfiliateDTO | NO | Afiliado (estación) |
| `Vehicle` | VehicleDTO | NO | Vehículo |
| `EntityHierarchy` | EntityHierarchyDTO | NO | Jerarquía del vehículo |
| `PreAuthorization` | PreauthorizationDTO | NO | Nota vale |
| `AccountIdentification` | long | NO | ID de cuenta |
| `ActionCourseReasonDescription` | string | NO | Motivo de curso de acción financiera |
| `AuthorizationReversalCofirmationDate` | DateTime | NO | Confirmación de cancelación de autorización |
| `AuthorizationTimestamp` | DateTime | NO | Momento de la transacción |
| `AuthorizedAmount` | decimal | NO | Valor autorizado |
| `AuthRejectionReasonIdentification` | uint | NO | Motivo de rechazo |
| `AvailableBalance` | decimal | NO | Saldo disponible |
| `CardAcceptorCountryIdentification` | uint | NO | País de afiliación |
| `CardAcceptorIdentification` | string | NO | Código de afiliación |
| `CardAcceptorTerminalIdentification` | uint | NO | Terminal de afiliación |
| `CardAcceptorTerminalType` | string | NO | Tipo de terminal |
| `CurrencyIdentification` | uint | NO | Moneda |
| `ExpirationDate` | DateTime | NO | Fecha de expiración |
| `IsAuthorizationConfirmed` | bool | NO | Autorización confirmada |
| `IsAuthorizationReturn` | bool | NO | Transacción reversada |
| `IsAuthorizationReversal` | bool | NO | Autorización cancelada |
| `IsTransactionApproved` | bool | NO | Autorización aprobada |
| `MerchantCategoryCodeNumber` | uint | NO | MCC |
| `NonFinancialAuthorizationRequestIdentification` | uint | NO | Requisición de autorización no financiera |
| `OfflineAuthResponseIdentification` | uint | NO | Responsable de autorización offline |
| `OfflineTransactionStatusIdentification` | uint | NO | Estatus de transacción offline |
| `PosEntryModelIdentification` | uint | NO | Modo de entrada en POS |
| `PostingDate` | DateTime | NO | Fecha de publicación |
| `ProcessingDate` | DateTime | NO | Fecha de procesamiento |
| `ProcessingDescription` | string | NO | Descripción de procesamiento |
| `ProcessingIdentification` | uint | NO | Código de procesamiento |
| `ReturnMessage` | string | NO | Mensaje de retorno |
| `StockCardIdentification` | string | NO | Tarjeta stock |
| `HourmeterValue` | decimal | N/A | Horómetro |
| `IsBillable` | bool | N/A | Es facturable |
| `TankLevelIdentification` | uint | N/A | Nivel de tanque |
| `AccessOperationIdentification` | uint | N/A | Operación de acceso |
| `POSIdentification` | string | N/A | Código de POS |
| `CreditLineTypeIdentification` | uint | N/A | Tipo de línea de crédito |
| `PersonOrVehicleIdentification` | string | OPT | Código de vehículo o persona |
| `GarageIdentification` | uint | N/A | Garaje |
| `GarageDescription` | string | N/A | Descripción del garaje |
| `ServiceOrderNumber` | uint | N/A | Orden de servicio |
| `AuthRejectionReason` | string | N/A | Motivo de rechazo |
| `PhoneAuthorizationReasonIdentification` | uint | NO | Motivo de autorización telefónica |
| `PhoneAuthorizationReasonDescription` | string | NO | Descripción del motivo telefónico |
| `ExceptionAuthorizationIdentification` | uint | NO | Autorización por excepción |
| `HourmeterCurrentValue` | uint | NO | Horómetro actual |
| `EntityIdentificationValue` | string | NO | ID de vehículo / persona |
| `TagNFCVehicleIdentification` | uint | NO | Tag NFC del vehículo |
| `TagNFCCardIdentification` | uint | NO | Tag NFC de la tarjeta |
| `CustomerName` | string | NO | Nombre del cliente |
| `ReinbursementDate` | DateTime | NO | Fecha de pago al afiliado |
| `HasVolumetricControl` | bool | NO | Tiene control volumétrico |
| `OdometerPreviousValue` | decimal | NO | Odómetro anterior |
| `TransactionOperation` | TransactionOperation | NO | Operación de la transacción |
| `HourmeterPreviousValue` | decimal | NO | Horómetro anterior |
| `AvailableOldBalance` | decimal | NO | Saldo anterior |
| `AvailableNewBalance` | decimal | NO | Saldo posterior |
| `TravelDistance` | decimal | NO | Km actual − km anterior |
| `VehicleRealPerformance` | decimal | NO | Recorrido / litros consumidos |
| `AuthorizationNumber` | uint | OPC | Número de autorización. **Requerido en `TransactionGetItem`** |
| `ByPhoneAuthReasonDescription` | string | NO | Motivo de autorización telefónica |
| `ExternalOrderNumber` | string | NO | ID externo de la nota vale |
| `NfcTagDto` | NfcTagDto | OPC | Filtro por Tag NFC en `TransactionGetFilteredList` |

</details>

### TransactionRequiredInformationDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `MaxLengthResponse` | uint | Longitud máxima de la respuesta |
| `MinLengthResponse` | uint | Longitud mínima de la respuesta |
| `RequiredInformationDescription` | string | Descripción de la información requerida |
| `RequiredInformationResponseTypeIdentification` | uint | Tipo de respuesta |
| `Value` | string | Valor |
| `ValueType` | string | Tipo de valor |

### OrderDTO

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `OrderNumber` | uint | SÍ | Número de pedido |
| `CustomerIdentification` | uint | NO* | Requerido en `OrderGetFilteredList` |
| `OrderDate` | DateTime | NO | Fecha del pedido |
| `OrderDateStart` / `OrderDateEnd` | DateTime | NO | Rango de fechas |
| `ApprovalDate` | DateTime | NO | Fecha de aprobación |
| `ProcessingDate` | DateTime | NO | Fecha de procesamiento |
| `ScheduleDate` | DateTime | NO | Fecha de agendamiento |
| `AdditionalInformation` | string | NO | Información adicional |
| `RequestingUserIdentification` / `RequestingUserName` | uint / string | NO | Usuario que solicita |
| `ApprovalUserIdentification` / `ApprovalUserName` | uint / string | NO | Usuario que aprueba |
| `OrderIdentification` | string | OPC | Requerido en `OrderGetItem` |
| `CardNumber` | string | OPC | Requerido en `OrderGetFilteredList` |
| `OrderStatusIdentification` / `OrderStatusDescription` | uint / string | NO | Estatus del pedido |
| `OrderTypeIdentification` | uint | OPC | Requerido en `OrderGetFilteredList` |
| `OrderTypeDescription` | string | NO | Tipo de pedido |
| `IsCancelAllowed` | bool | NO | Cancelación permitida |
| `BillingAccountIdentification` | uint | NO | Cuenta de facturación |
| `OrderSource` | string | NO | Origen del pedido |
| `PreAuthorizationDescription` | string | NO | Descripción de la preautorización |
| `PreAuthorizationAvailableBalance` | decimal | NO | Monto disponible |
| `PreAuthorizationAvailableQuantity` | decimal | NO | Litros disponibles |
| `DetailList` | List<[OrderItemDTO](#orderitemdto)> | NO | Detalle de la orden |
| `RequisitionMerchandiseLists` | List<RequisitionMerchandiseDTO> | NO | Mercancías de la nota vale |

### OrderItemDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `Quantity` | uint | Número de ítems |
| `ScheduleDate` | DateTime | Fecha programada |
| `ProcessingDate` | DateTime | Fecha de aplicación |
| `StatusIdentification` / `StatusDescription` | uint / string | Estatus del ítem |
| `CustomerIdentification` | uint | Cliente |
| `DeliveringUnitIdentification` | uint | Unidad de entrega |
| `OrderStatusIdentification` / `OrderStatusDescription` | uint / string | Estatus del pedido |
| `OrderTypeDescription` | string | Tipo de pedido |
| `OrderTypeIndicatorIdentification` | string | Tipo de ítem |
| `PreAuthorizationExpirationBeginDateTime` | DateTime | Inicio de vigencia de la nota vale |
| `PreAuthorizationEnpirationEndDateTime` | DateTime | Fin de vigencia de la nota vale |
| `PreAuthorizationMinimumValueToCancel` | decimal | Valor mínimo para anular |
| `PreAuthorizationMinimumPercentageToCancel` | decimal | Porcentaje mínimo para anular |
| `TripReference` | string | Viaje |
| `Route` | string | Trayecto |
| `AcceptanceRestrictionIdentification` | uint | Red restringida |
| `PreAuthorizationDescription` | string | Comentarios |
| `CardNumber` | string | Tarjeta |
| `VehicleEquipmentTag` | string | Placa del vehículo |
| `PreAuthorizationValue` | decimal | Valor original de la nota vale |
| `PreAuthorizationStatusIdentification` | uint | Estatus — ver [catálogo](#preauthorizationstatusidentification) |
| `PreAuthorizationReasonIdentification` | uint | Razón del estatus |
| `NfcTagDto` | NfcTagDto | Tag NFC (OPC) |

### PreauthorizationDTO

Propiedades de la **nota vale**.

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `Identification` | int | OPC | ID de la nota vale. Requerido si `OperationIdentification ≠ 0` y para cancelar |
| `OrderValue` | string | NO | Monto total (suma de mercancías) |
| `RequisitionMerchandiseList` | List<RequisitionMerchandiseDTO> | OPC | **Requerido en dispersión de nota vale** |
| `AcceptanceRestrictionMerchantList` | List<AcceptanceRestrictionMerchantDTO> | NO | Afiliados permitidos |
| `DriverList` | List<DriverDTO> | NO | Conductores permitidos |
| `MinValueToCancel` | decimal | NO | Valor mínimo para anular |
| `MinPercentageToCancel` | decimal | NO | Porcentaje mínimo para anular |
| `TypeIdentification` | int | NO | `1` = Monto, `2` = Litros |
| `UsageQuantity` | int | NO | Número de usos permitidos |
| `TripReference` | string | NO | Número de viaje |
| `AcceptanceRestrictionIdentification` | unsignedInt | NO | ID de red restringida |
| `UsageRestrictionList` | List<UsageRestrictionDTO> | NO | Restricciones periódicas |
| `SpecificPeriodRestrictionList` | List<SpecificPeriodRestrictionDTO> | NO | Restricciones por periodo específico |
| `OperationIdentification` | int | NO | `0` = Create, `1` = Update, `2` = Cancel |
| `Description` | string | NO | Descripción |

### RequisitionMerchandiseDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `MerchandiseList` | List<MerchandiseDTO> | Mercancías de la nota vale |

### MerchandiseDTO

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `Identification` | unsignedInt | OPC | Tipo de mercancía. Requerido si nota vale por litros |
| `Description` | string | NO | Descripción |
| `UnitPrice` | decimal | OPC | Precio unitario. Requerido si nota vale por litros |
| `Quantity` | decimal | OPC | Litros. Requerido si nota vale por litros |
| `DiscountType` | int | NO | Tipo de descuento |
| `TypeIdentification` / `TypeDescription` | unsignedInt / string | NO | Tipo de mercancía |
| `UnitIdentification` / `UnitDescription` | unsignedInt / string | NO | Unidad |
| `Name` | string | NO | Nombre |

### AcceptanceRestrictionMerchantDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `AcceptanceRestrictionIdentification` | uint | Red restringida |
| `MerchantName` | string | Nombre del afiliado |
| `MerchantIdentification` | uint | ID del afiliado |
| `CityName` | string | Ciudad |
| `StateName` | string | Estado |
| `NeighborhoodName` | string | Colonia |
| `SpecificMerchantIdentification` | uint | Afiliado específico |

### DriverDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `DriverNumber` | uint | Número de conductor |
| `NaturalPersonFirstName` | string | Nombre |
| `NaturalPersonIdentification` | uint | ID del conductor |
| `NaturalPersonLastName` | string | Apellido |
| `AdditionalInformationList` | List<NaturalPersonAdditionalInformationDTO> | Información adicional (`Identification: uint`, `Description: string`) |

### UsageRestrictionDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `ActionCourseIdentification` | uint | Curso de acción |
| `StartTime` / `EndTime` | string | Horario del periodo restringido |
| `PeriodicityIdentification` / `PeriodicityDescription` | uint / string | Periodicidad |
| `PolicyTypeIdentification` | uint | Tipo de política |

### SpecificPeriodRestrictionDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `SpecificPeriodDescription` | string | Descripción del periodo |
| `StartDateTime` / `EndDateTime` | DateTime | Periodo restringido |
| `ActionCourseIdentification` / `ActionCourseDescription` | uint / string | Curso de acción |
| `PrimeCompanyIdentification` | uint | Empresa principal |

### CreditDistributionQueueDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `OrderIdentification` | unsignedInt | ID de la dispersión |
| `ExpensesBudgetAmount` | decimal | Monto |
| `OperationDate` | date | Fecha de la dispersión |
| `ModificationDate` | date | Última actualización |
| `DistributionTypeIdentification` | unsignedInt | Tipo de dispersión |
| `Status` | unsignedInt | Estatus |

### CardDispersionChargebackDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `OrderIdentification` | unsignedInt | ID de la dispersión |
| `AmountDevolution` | decimal | Monto devuelto |
| `OperationDate` | date | Fecha de cambio de estatus |
| `DistributionTypeIdentification` | unsignedInt | Tipo de devolución |
| `Status` | unsignedInt | Estatus de la devolución |

### ExcepcionAuthorizationDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `AuthorizationRequestNumber` | uint | Número de autorización por excepción |
| `BeginExpirationDate` / `EndExpirationDate` | DateTime | Vigencia de la excepción |
| `CancelDate` | DateTime | Fecha de cancelación |
| `CreateDate` | DateTime | Fecha de creación |
| `CreatorUserIdentification` | uint | Usuario creador |
| `ExecutionDate` | DateTime | Fecha de ejecución |
| `Identification` | uint | ID de la excepción |
| `StatusIdentification` / `StatusDescription` | uint / string | Estatus |
| `UserCancelIdentification` | uint | Usuario que canceló |

### VehicleDTO

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `Identification` | uint | OPC | ID del vehículo. Requerido en `VehicleGetItem` y en `TransactionGetFilteredList` si se busca por vehículo |
| `CustomerIdentification` | uint | NO | Cliente |
| `Description` | string | NO | Descripción |
| `Travel` | decimal | NO | Ruta |
| `Performance` | decimal | NO | Rendimiento |
| `RealPerformance` | decimal | NO | Rendimiento real |
| `TankCapacity` | unsignedInt | NO | Capacidad del tanque |
| `CustomParameters` / `ResponseCustomParameters` | string | NO | Parámetros personalizados |
| `Type` | string | NO | Otros, VAN, autobús, moto, tractocamión, vehículo ligero |
| `DriverIdentification` / `DriverDescription` / `DriverStateDescription` | — | NO | Conductor |
| `MotorNumber` | string | NO | Número de motor |
| `SerialNumber` | string | NO | Número de serie |
| `Plate` | string | OPC | Placa. Filtro en `VehicleGetFilteredList` y `CardGetFilteredList` |
| `Driver` | string | NO | Conductor |
| `Kilometers` | unsignedInt | NO | Kilómetros recorridos |
| `VehicleDetail` | [VehicleDetailDTO](#vehicledetaildto) | NO | Detalle |

### VehicleDetailDTO

<details>
<summary>Ver todos los campos (≈130)</summary>

**Adquisición y valor:** `AcquisitionCurrencyDescription`, `AcquisitionDate`, `AcquisitionValue`, `AnnualDepreciationRate`, `CurrentValue`, `CurrencyPurchaseIdentification`.

**Presupuesto y saldo:** `AdditionalExpensesBudgetAmount`, `AvailableBalance`, `AvailableExpensesBudgetAmount`, `ExpensesBudgetAmount`, `OpenedBudgetsCount`, `CreditDistributionGroupIdentification`, `CreditDistributionGroupDescription`, `DistributionValueTypeIdentification`, `DistributionValueTypeDescription`, `ValueTypeIdentification`, `PeriodicityByVehicle`, `OrderPaymentTypeIdentification`.

**Especificaciones técnicas:** `Alternator`, `Battery`, `Cylinders`, `Displacement`, `Doors`, `EngineDescription`, `EngineNumber`, `EnginePerformance`, `EnginePerformanceTolerance`, `HorsePower`, `Torque`, `Transmition`, `VehicleChassis`, `Payload`, `Weight`, `Passengers`, `OilSumpCapacity`, `DischargeVolume`, `FrontBreaks`, `RearBreaks`, `FrontSuspension`, `RearSuspension`, `FrontTires`, `RearTires`, `FrontWheels`, `RearWheels`, `VehicleTechnicalSpecificationIdentification`.

**Eficiencia y combustible:** `FuelEfficiency`, `UrbanEfficiency`, `RoadEfficiency`, `AlternativeEfficiency`, `AlternativeTolerance`, `FuelTankList` (List<[FuelTankDTO](#fueltankdto)>), `MerchandiseIdentification`, `MerchandiseQuantity`.

**Odómetro / horómetro:** `OdometerDigits`, `OdometerValue`, `HourmeterDigits`, `HourmeterValue`.

**Fabricante y modelo:** `ManufacturerDescription`, `VehicleManufacturerIdentification`, `ModelDescription`, `VehicleModelDescription`, `VehicleMod-elIdentification`, `ModelYear`, `ManufactoringYear`, `VersionDescription`, `VehicleVersionIdentification`, `VehicleEngineIdentification`, `VehicleTypeIdentification`, `VehicleTypeDescription`.

**Identificación y registro:** `IdentificationNumber` (filtro), `IdentificationType` (OPC, filtro), `RegistrationDate`, `RegistrationNumber`, `VehicleTag`, `VehicleTagCity`, `VehicleTagState`, `TagNFCIdentification`, `ExternalIdentification` (ID para ERPs), `EntityIdentification`, `EntityTypeIdentitication`.

**Estatus:** `StatusIdentification` (OPC — filtro en `VehicleGetFilteredList`: `1` = Activo, `2` = Inactivo), `StatusDescription`, `StatusCardIdentification`, `StatusCardDescription`, `LifeCicle`, `OperationClass`.

**Tarjeta:** `IsCIUCard`, `IsCardEnabled`, `IsCardIssuing`, `HasCardHolder`, `CardGroupIdentification`, `CardGroupDescription`, `CardTechnologyTypeIdentification`, `EmbossingAdditionalInformation`.

**Organización:** `AdministrativeTypeIdentification`, `ControlTypeIdentification`, `CostCenterIdentification`, `CostCenterDescription`, `CostCenterAbbreviateDescription`, `DeliveringUnitIdentification`, `DeliveringUnitName`, `GarageIdentification`, `GarageDescription`, `GarageAbbreviation`, `Responsable`, `AssignDate`, `POSIdentification`, `AddressDescription`, `Email`, `OwnershipIdentification`, `OwnershipDescription`, `RealtyOwnershipIdentification`.

**Seguros, permisos y garantía:** `InsuranceCompanyIdentification`, `InsuranceCompanyDescription`, `InsuranceCoverageAmount`, `InsuranceCurrencyIdentification`, `InsuranceCurrencyDescription`, `InsuranceEffectiveDate`, `InsuranceExpirationDate`, `InsurancePolicy`, `InsuranceTypeIdentification`, `InsuranceTypeDescription`, `MovementPermit`, `MovementPermitExpirationDate`, `WarrantyExpirationDate`.

**Mantenimiento:** `Maintenance`, `MaintenanceInterval`, `Comments`.

**Transferencias:** `TargetCustomerContractIdentification`, `TargetCorporateLevelIdentification`, `TargetCardGroupIdentification`, `TargetCreditDistributionGroupIdentification`.

**Tag NFC:** `NfcTagDto` (OPC — filtro en `VehicleGetFilteredList` y `VehicleGetItem`).

</details>

### FuelTankDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `VehicleEquipmentIdentification` | uint | Vehículo o equipo |
| `FuelList` | List<FuelDTO> | Combustibles |
| `Capacity` | uint | Capacidad en litros |
| `IsPrimaryTank` | bool | Tanque primario |

### FuelDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `Identification` | uint | Combustible del tanque |
| `Description` | string | Tipo de combustible |
| `FuelUnitIdentification` / `FuelUnitDescription` | uint / string | Unidad de combustible |

### AfiliateDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `Identification` | unsignedInt | ID del afiliado |
| `SocialReason` | string | Razón social |
| `BrandCode` | string | Marca de la estación (actualmente PEMEX) |
| `CertificationCode` | unsignedInt | Certificación (actualmente Cualli) |
| `City` / `State` | string | Ubicación de la transacción |

### EntityHierarchyDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `RegionGroup` / `RegionGroupDescription` | string | Grupo de región |
| `RegionCustomIdentification` / `RegionDescription` | string | Región |
| `CostCenter` / `CostCenterDescription` | string | Centro de costos |

### TransactionFilterDTO

| Campo | Tipo | Req | Descripción |
|---|---|:-:|---|
| `CustomerIdentification` | unsignedInt | NO | Usuario |
| `TransactionTimeStart` | DateTime | SÍ | Inicio del rango |
| `TransactionTimeEnd` | DateTime | SÍ | Fin del rango |
| `IsInvoiced` | unsignedInt | SÍ | Ver [catálogo IsInvoiced](#isinvoiced) |

### NfcTagDto

Identificadores de un Tag NFC (agregado en v1.8).

- Tag **solo combustible:** `NfcNumericValue` + `NfcHexadecimalValue`.
- Tag **dúo (combustible + telepeaje):** además `NfcElectronicToll`.

| Campo | Tipo (según doc) | Req | Descripción |
|---|---|:-:|---|
| `NfcHexadecimalValue` | uint | NO | Identificador hexadecimal del tag de combustible |
| `NfcNumericValue` | DateTime ⚠️ | NO | Identificador numérico del tag de combustible |
| `NfcElectronicToll` | DateTime ⚠️ | NO | Identificador de telepeaje (solo tags dúo) |

> ⚠️ Los tipos `DateTime` son casi con seguridad un error del documento. Verifica los tipos reales en el WSDL.

Se puede usar como filtro en: `CardGetFilteredList`, `CardGetItem`, `CardExecute`, `TransactionGetFilteredList`, `VehicleGetFilteredList`, `VehicleGetItem`.

---

## 8. Catálogos y enumeraciones

### OrderOperationClass

| Valor | Nombre | Uso |
|:-:|---|---|
| 0 | Assign | Dispersión modo saldo / nota vale (default) |
| 1 | Cancel | Cancelación modo saldo / nota vale |

### OrderTypeIdentification

| Valor | Nombre | Descripción |
|:-:|---|---|
| 2 | `Dispersion2` | Dispersión modo saldo (default) |
| 11 | `DispersionWithFundOrders11` | Dispersión con pedido de fondos |
| 12 | `Devolution12` | Devolución |
| 19 | `NoteVoucher19` | Dispersión modo nota vale |

### DistributionTypeIdentification

| Valor | Tipo | Descripción |
|:-:|---|---|
| 1 | Absoluto / Entero | **Incrementa** el saldo actual con el monto enviado |
| 2 | Relativo | **Reemplaza** el saldo con el monto enviado |

> ⚠️ En `OrderCreditDistributioDetailDTO` el documento indica `absoluto = 0`, `relativo = 1`. Ver [observaciones](#11-observaciones-e-inconsistencias-del-documento-fuente).

### OrderStatusIdentification

| Valor | Descripción |
|:-:|---|
| 1 | Agendado |
| 2 | Esperando procesamiento |
| 3 | Procesando |
| 4 | Finalizado con éxito |
| 5 | Anulación pendiente |
| 6 | Anulado |
| 7 | No aceptado |
| 8 | Registrado con éxito |
| 9 | Finalizado parcialmente |

### PreAuthorizationStatusIdentification

| Valor | Descripción |
|:-:|---|
| 11 | Usada |
| 12 | En espera |
| 13 | Anulada |
| 14 | Vencida |
| 19 | No definido |

### PreauthorizationDTO.TypeIdentification

| Valor | Descripción |
|:-:|---|
| 1 | Monto |
| 2 | Litros |

### PreauthorizationDTO.OperationIdentification

| Valor | Descripción |
|:-:|---|
| 0 | Create |
| 1 | Update |
| 2 | Cancel |

### CardOperation

| Valor | Operación |
|:-:|---|
| 1 | Cancelar |
| 2 | Bloquear |
| 3 | Desbloquear |
| 13 | Activar |

### CardStatusReasonIdentification

| Valor | Motivo | Operaciones válidas |
|:-:|---|---|
| 1 | Baja temporal | Cancelación, Bloqueo |
| 2 | Baja del empleado | Cancelación |
| 6 | Solicitud de la empresa | Cancelación |
| 7 | Vacaciones | Bloqueo |
| 8 | Cierre de producción | Bloqueo |
| 9 | Baja del usuario | Bloqueo |
| 10 | Falta de comprobación | Bloqueo |
| 11 | Extravío | Bloqueo |
| 12 | Robo | Bloqueo |
| 13 | Reasignación de usuario | Bloqueo |
| 14 | Baja de auto | Bloqueo |
| 94 | Solicitud del cliente | Bloqueo, Desbloqueo |
| 98 | Unidad en taller | Cancelación, Bloqueo |
| 100 | Venta de unidad | Cancelación |

### CreditDistributionGroupOperationClass

| Valor | Operación |
|:-:|---|
| 0 | Insert |
| 1 | Update |
| 2 | Delete |

### TransactionOperationClass

| Valor | Descripción |
|:-:|---|
| 0 | Valor por defecto |
| 1 | Operación por acceso de vehículo |
| 2 | Actualización de parámetros |
| 3 | Actualización por transacción de acceso |
| 4 | Creación manual |
| 5 | Actualización manual |
| 6 | Actualización de la última transacción por CardHolder |
| 7 | Obtener elemento por número de autorización |
| 8 | Actualización de la última transacción |
| 9 | Obtener histórico |

### TransactionDTO.InformationType

| Valor | Descripción |
|:-:|---|
| 0 | Offline / histórico (default) — transacciones con más de 3 horas |
| 1 | Online — solo datos generales |

### IsInvoiced

| Valor | Descripción |
|:-:|---|
| 1 | Todas las transacciones |
| 2 | Solo transacciones facturadas |

### VehicleDetailDTO.StatusIdentification

| Valor | Descripción |
|:-:|---|
| 1 | Activo |
| 2 | Inactivo |

---

## 9. Códigos de error

### ErrorDTO

| Campo | Tipo | Descripción |
|---|---|---|
| `Code` | unsignedInt | Código del error |
| `Message` | string | Mensaje |
| `TypeError` | unsignedInt | Tipo de error |

### Catálogo

| Código | Mensaje | Descripción |
|:-:|---|---|
| 3001 | External Data is not available for this customer | Los datos del cliente al momento de la contratación no están dados de alta |
| 3002 | No cards were found | No se encontraron tarjetas con los datos enviados |
| 3003 | Invalid Token in card | Los datos adicionales de la tarjeta (CardToken) son inválidos |
| 3004 | Aditional data is not available | No se encontraron los datos adicionales de la tarjeta |
| 3005 | User is denied | El usuario no tiene permisos de acceso |
| 3006 | Access validation is not invalid | Los datos del usuario no coinciden con los registrados |
| 3007 | User is not registered for WATTS | El usuario no existe |
| 3008 | Try Again Later | Excepción no controlada |
| 5001 | No se encontró el TagNFC | El identificador de tag enviado como filtro no existe |
| 5002 | El TagNfc no está ligado a ningún vehículo | El tag está activo pero no asignado |
| 5003 | El TagNfc no está activo | El tag está inactivo o cancelado |

> Además, cada método tiene restricciones específicas por parámetro requerido.

---

## 10. Ejemplo de implementación (.NET C#)

### Configuración (`app.config` / `web.config`)

```xml
<system.serviceModel>
  <bindings>
    <basicHttpBinding>
      <binding name="BasicHttpBinding_ITicketCarFacadeServices" />
      <binding name="BasicHttpsBinding_ITicketCarFacadeServices">
        <security mode="TransportWithMessageCredential">
          <message clientCredentialType="UserName" />
        </security>
      </binding>
    </basicHttpBinding>
  </bindings>
  <client>
    <endpoint
      address="https://servicesfleet.edenred.com.mx/ExternalTicketCar/TicketCarServicesFacade.svc"
      binding="basicHttpBinding"
      bindingConfiguration="BasicHttpsBinding_ITicketCarFacadeServices"
      contract="ITicketCarFacadeServices"
      name="BasicHttpsBinding_ITicketCarFacadeServices" />
  </client>
</system.serviceModel>
```

### Consulta de tarjetas

```csharp
try
{
    var extClient = new TicketCarFacadeServicesClient();
    var request = new CardDTORequest();

    request.Security = new SecurityDTO { Token = PROVIDED_TOKEN, Ip = CLIENT_IP };
    request.Paging   = new PagingDTO  { All = false, PageNumber = 1, PageRecords = 20 };

    extClient.ClientCredentials.UserName.UserName = EXTERNAL_VALID_USER_ID;
    extClient.ClientCredentials.UserName.Password = EXTERNAL_VALID_PASSWORD;

    var resp = extClient.CardGetFilteredList(request);

    if (resp.ErrorList != null && resp.ErrorList.Count > 0)
    {
        // TODO: mostrar o registrar errores
    }
}
catch (SecurityAccessDeniedException ex)
{
    // TODO: credenciales inválidas
}
catch (Exception ex)
{
    // TODO: manejo general
}
```

### Flujo típico de dispersión

```
1. CardGetFilteredList      → obtener Number + Token (CardToken) de cada tarjeta
2. CardRequisitionCreditDistribution
       Item.OrderOperationClass = 0 (Assign)
       Item.List[n].OrderTypeIdentification = 2 (saldo) | 19 (nota vale)
       Item.List[n].Card = { Number, Token }
       Item.List[n].ExpensesBudgetAmount = monto
3. Guardar Item.OrderIdentification de la respuesta
4. OrderGetItem / OrderGetFilteredList → seguimiento del estatus
5. (Opcional) Cancelar nota vale: OrderOperationClass = 1 + OrderIdentification
```

---

## 11. Observaciones e inconsistencias del documento fuente

Conviene validar estos puntos contra el **WSDL** o con el equipo de Edenred antes de integrar:

| # | Tema | Detalle |
|:-:|---|---|
| 1 | `DistributionTypeIdentification` | En `OrderCreditDistributioDetailDTO` aparece absoluto = **0**, relativo = **1**; en el catálogo, absoluto = **1**, relativo = **2**. |
| 2 | `NfcTagDto` | `NfcNumericValue` y `NfcElectronicToll` están tipados como `DateTime`, lo cual es casi seguro un error (deberían ser numérico / string). |
| 3 | `VehicleGetItem` | La tabla de métodos dice "por número de tarjeta"; el DTO indica búsqueda por `Identification` del vehículo. |
| 4 | Endpoint de infraestructura | El diagrama menciona además `https://services.edenred.com.mx/External/TicketCarServices.svc?wsdl` (posiblemente legado). |
| 5 | Ejemplo de configuración | Ambos endpoints del ejemplo usan la misma URL HTTPS; el binding sin seguridad no debería usarse en producción. |
| 6 | `DistributionTypeIdentification` vs `OrderTypeIdentification` | El mismo campo se marca como "SÍ" requerido, pero las notas indican que no aplica a nota vale. |
| 7 | `TransactionDTO.IsInvoiced` | Tipado como `bool` en `TransactionDTO` y como `unsignedInt` (1/2) en `TransactionFilterDTO`. |
| 8 | `VehicleListDTOResponse` / `TransactionItemDTOResponse` | Referenciados, pero su estructura no está detallada. |
| 9 | `FilterIdentification` | Se menciona en `CardDetailDTO` (valores 1, 2, 3) pero no está definido como campo en ningún DTO. |
| 10 | Nombres con erratas | Se conservan tal cual porque son los nombres del contrato: `OrdeItemDTOResponse`, `OrderCreditDistributioDetailDTO`, `PreAuthorizationEnpirationEndDateTime`, `AditionalInformation`, `ExcepcionAuthorizationDTO`, `Transmition`, `VehicleMod-elIdentification`, `EntityTypeIdentitication`, `ReinbursementDate`, `Afiliate`. |
| 11 | Fechas del documento | El encabezado dice 12/02/2016 pero la versión 1.8 es del 26/12/2023. |

---

## 12. Historial de versiones

| Fecha | Versión | Descripción | Autor |
|---|:-:|---|---|
| 20/07/2015 | 1.0 | Creación del archivo | Roberto Iván Meza Trillo |
| 30/07/2015 | 1.1 | Adecuaciones de nomenclatura | Roberto Iván Meza Trillo |
| 03/08/2015 | 1.2 | Observaciones de revisión | Roberto Iván Meza Trillo |
| 20/10/2015 | 1.3 | Más campos detallados; ejemplo de implementación .NET | Roberto Iván Meza Trillo |
| 20/11/2015 | 1.4 | Notas de uso de `TransactionDTO` | Roberto Iván Meza Trillo |
| 15/01/2016 | 1.5 | Catálogos y notas de dispersión de saldo y obtención de orden | Roberto Iván Meza Trillo |
| 22/04/2021 | 1.6 | Método `CardExecute` (cancelación, activación, bloqueo, desbloqueo) | Emiliano Chino Gerónimo |
| 15/06/2022 | 1.7 | Actualización del endpoint productivo | Gustavo Gálvez Velázquez |
| 26/12/2023 | 1.8 | Objeto `NfcTagDto` (Tag NFC combustible y telepeaje) | Luis Urdiales |
