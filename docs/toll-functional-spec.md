# Functional Specification — Peaje

Product: Ticket Car — Fleet Management
Section: Peaje (Saldos · Reglas y límites · Medios de pago)
Version: 1.0
Language of the user interface: Spanish (Mexico)

## 1. Purpose

The Peaje section mirrors the Combustible section for toll roads. The payment medium is a
telepeaje TAG: either a toll-only TAG or a **Drive Tag**, the dual sticker by Edenred and
TeleVía that pays fuel with NFC and crosses toll lanes with RFID. Toll balance lives in its own
pool (`bolsa de peaje`) and is distributed to the TAGs.

No predictive features are included in this version.

## 2. Saldos

| Block | Content |
| --- | --- |
| Summary | Bolsa de peaje disponible · saldo en TAGs · gasto en casetas del mes against the budget · TAGs under the threshold of their group |
| Saldo por TAG | Assigned TAGs with balance, automatic top-up setting, last crossing. `Recargar` moves money from the pool to the TAG; `Recortar` returns it. Both show the TAG and pool balance before and after, and are blocked when the amount exceeds the source. Only active TAGs can be topped up. |
| Recarga automática por grupo | One row per group: on/off, threshold and target balance. The target must be above the threshold. |
| Últimos movimientos | Crossings, top-ups, cuts and rejected crossings. |

## 3. Reglas y límites

The model is the same as in Combustible: **policy → group → TAG**. A group follows one toll
policy; a TAG can be moved to another policy from the assignment table.

| Lock | Parameter |
| --- | --- |
| Spending limit | `period` (day, week, month) and `periodLimitMXN` |
| Crossings per day | `maxCrossingsPerDay` |
| Authorised highways | `roadIds`; an empty list means the whole network |
| Urban toll roads | `allowUrbanHighways` (segundos pisos and urban toll roads) |
| Days and schedule | `days`, `timeFrom`, `timeTo` |
| Vehicle category | `categoryLock`: rejects a crossing charged with a category different from the TAG's |

The assignment table shows, per TAG: category, policy selector, spending of the period against
the limit (orange from 75%, red from 90%), crossings today against the daily cap, and rejected
crossings in 7 days.

## 4. Medios de pago

- Summary: active, blocked, unassigned and in replacement.
- Search by TAG number, plate or driver; filter by type and status.
- Actions: `Bloquear` / `Desbloquear`; `Reportar robo o daño` sets the TAG in replacement;
  `Asignar` links a spare TAG to a unit without a working TAG, asks for the vehicle category,
  and gives the TAG the toll policy of the unit's group.
- `Solicitar TAGs` opens the request flow.

## 5. Implementation map

| Concern | File |
| --- | --- |
| Pages | `src/pages/toll/TollBalancesPage.tsx`, `TollRulesPage.tsx`, `TollMediaPage.tsx` |
| Dialogs | `src/components/toll/TollAmountDialog.tsx`, `TollPolicyDialog.tsx`, `TollAssignDialog.tsx` |
| Types | `src/types/toll.ts` |
| Mock data and label helpers | `src/data/toll.ts` |
| Styles | `src/pages/toll/toll.css`, plus `TablePage.css` and the policy styles of `components/limits` |

## 6. Sources and open points

- Edenred and TeleVía launch of Drive Tag (September 2021): dual NFC/RFID sticker, crossings
  and fuel consolidated in Ticket Car, balance dispersion from the app.
- CAPUFE "Cero Efectivo" programme (2025): plazas accept TAG only.

To confirm with the product team: whether TC+ keeps a separate toll pool or shares the fuel
balance, which TAG issuers are supported besides TeleVía, and whether highway restrictions are
enforced at the lane or only reported afterwards.
