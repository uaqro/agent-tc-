# Functional Specification — Asignación de Límites

Product: Ticket Car — Fuel Management
Page: Asignación de límites (fuelling locks per group and per unit)
Version: 1.1
Language of the user interface: Spanish (Mexico)

## 1. Job to be done

Dispersión decides **how much balance** a unit receives. Asignación de límites decides **how
that balance can be spent** at the station.

| Job | Statement |
| --- | --- |
| Functional | "Every unit must fuel under the locks of its operation without configuring unit by unit." |
| Functional (exception) | "When a route changes, I must extend one unit for a few days and have it return to normal by itself." |
| Emotional | "I must be sure that no unit fuels without locks and that nobody is stranded by a lock that is too tight." |
| Social | "I must show the audit which rule applied to each rejected or approved fill." |

The model is **policy → group → unit**. A policy is a reusable set of locks. A group inherits
one policy. A unit follows the policy of its group unless it is moved (individual assignment)
or receives a temporary exception.

## 2. Locks of a policy

The policy editor separates transaction capture, authorization restrictions and additional
configuration. The requested catalogue supersedes the original public-source catalogue.

| Lock | Parameter | Values |
| --- | --- | --- |
| Period limits | `settings.periods` | Independent optional amount (MXN), volume (L), integer transaction count for day, week, fortnight and month; several can coexist |
| Maximum per fill | `maxLitersPerFill` | Litres per transaction |
| Tank capacity | `tankCapacityLock` | Rejects a fill above the tank registered for the unit |
| Transaction amount | `settings.minTransactionAmount`, `settings.maxTransactionAmount` | Independently optional positive minimum and maximum; minimum must not exceed maximum |
| Interval between fills | `minHoursBetweenFills` | Nonnegative hours; zero disables the interval |
| Fuel type | `fuels` | Magna · Premium · Diésel |
| Days and schedule | `settings.scheduleBlocks` | Optional list of blocks; each block has a set of days (Monday–Sunday) and one or more time ranges (e.g. 09:00–11:00 and 17:00–22:00). A day belongs to one block only; days outside every block do not allow transactions |
| Stations | `stationSubnetId` | Whole network or a required selection from the existing mock sub-network catalogue when enabled |
| Driver | `settings.controls` | Optional driver capture; the driver number is always validated, the PIN is optional |
| Odometer | `settings.controls.odometerRequired` | Optional capture; km/L performance taken from each vehicle's configuration; distance range (km) with minimum (default 1) and maximum (default 1,000,000), minimum ≤ maximum |
| Hourmeter | `settings.controls.hourmeterRequired` | Optional capture; h/L performance taken from each unit's configuration |

An enabled numeric restriction requires a finite positive value; transaction counts must be
integers. Disabling capture clears its dependent validations. Disabling the station restriction
clears the selected network. An enabled schedule requires each block to have at least one day
and one range; each range must start before it ends and ranges of a block must not overlap.
Selecting a day already in another block moves it. Quick selectors (Lun–Vie, Fin de semana,
Todos) fill the days of a block. A window crossing midnight is configured as two ranges on
consecutive days.

Calendar convention inherited from the prototype: weeks close on Sunday; fortnights are
days 1–15 and 16–month end. Confirm these semantics with Jorge Vera before integrating an
authorization service.

Existing policies are adapted on edit without losing their original restrictions. The legacy
`measure`, `period`, `periodLimit` fields project one consumption limit for the existing usage
and exception view, not the complete set of restrictions. The previous projection is retained
while configured; otherwise the first configured limit in day/week/fortnight/month order is
used, preferring litres within a period. Zero means no accumulated amount or volume limit.
The full set is retained in `settings` and displayed in policy cards. Only the projected
consumption limit shows an approximate currency/volume equivalent.

## 3. Page structure

```
Summary: con política · sin política · excepciones vigentes · rechazos 7 días
+--------------------------------------------------------------+
| Políticas de límites (cards)                 [Nueva política] |
+--------------------------------------------------------------+
| Asignación por unidad (search · group filter · table)         |
+--------------------------------------------------------------+
```

## 4. Políticas de límites

- A card shows scope, the projected consumption limit (if any), all configured period limits,
  transaction limits, fuels, schedules, stations and capture controls/validations.
- `Editar` and `Nueva política` open the same dialog. Name and scope precede three main
  sections: transaction controls; authorization restrictions and limits, grouped by type
  (schedule; consumption: amount, volume, transactions; station); additional settings.
  Existing fuel and interval settings remain in the third section. The name and at least one
  fuel are required; accumulated limits and schedules are optional.
- A group follows one policy only. When a group that belongs to another policy is selected,
  the dialog states which policy it leaves.
- `Pausar` keeps the assignment and stops the enforcement. The card and the table state that
  the units fuel without locks.

## 5. Asignación por unidad

- Search by plate, device or driver, and filter by group.
- The policy column is a selector. Moving a unit away from the policy of its group marks it
  `Individual`; moving it back removes the mark. `Sin política` marks it `Sin candados`.
- The usage column shows consumption against the effective limit of the running period. The
  bar turns orange from 75% and red from 90%.
- `Excepción temporal` asks for the extension, the validity (close of the period, 24 hours or
  7 days) and the reason. The limit returns to the policy value when it expires. An exception
  is removed when the unit changes policy, or its policy changes the projected measure or
  period, or removes accumulated consumption limits. Extensions are unavailable for a policy
  without an accumulated amount or volume limit. Usage represents only the projected limit;
  the mock dataset does not supply separate consumption aggregates for every period.

This is a frontend prototype: policies are kept in page state, not persisted across reloads.
No authorization engine or real station service is invoked; the editor configures the rules
but does not execute transaction approval, rejection or capture.

## 6. Implementation map

| Concern | File |
| --- | --- |
| Page orchestration and state | `src/pages/LimitsPage.tsx` |
| Policies | `src/components/limits/PoliciesSection.tsx`, `PolicyDialog.tsx` |
| Units and temporary exceptions | `src/components/limits/AssignmentsTable.tsx`, `OverrideDialog.tsx` |
| Types | `src/types/limits.ts` |
| Mock data and label helpers | `src/data/limits.ts` |

## 7. Sources and open points

The lock catalogue was derived from public material, not from the TC+ product documentation:

- Ticket Car 3.0 launch notes (The Logistics World): tank capacity, fuel type, km/L
  performance, interval between transactions, station sub-network, and limits in litres or
  pesos per day, week, fortnight or month.
- Edenred México press release, 2021: restrictions by day and time, fuel type and selected
  stations.
- Edenred México brochure, 2024: control by amounts, schedules and days.
- Expansión, September 2025: launch of Ticket Car+; the article does not list its limits.

The requested update explicitly includes driver number/PIN and hourmeter controls at policy
level. Still to confirm: backend enforcement contracts, schedule intersection rules and
whether limits can also be set per driver or per card in addition to per unit.
