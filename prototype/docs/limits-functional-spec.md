# Functional Specification — Asignación de Límites

Product: Ticket Car — Fuel Management
Page: Asignación de límites (fuelling locks per group and per unit)
Version: 1.0
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

The set comes from the controls that Ticket Car publishes for its platform; see section 7.

| Lock | Parameter | Values |
| --- | --- | --- |
| Consumption limit | `measure`, `period`, `periodLimit` | Litres or pesos · per day, week, fortnight or month |
| Maximum per fill | `maxLitersPerFill` | Litres per transaction |
| Tank capacity | `tankCapacityLock` | Rejects a fill above the tank registered for the unit |
| Fills per day | `maxFillsPerDay` | 1 to 4 |
| Interval between fills | `minHoursBetweenFills` | 0 to 24 hours |
| Fuel type | `fuels` | Magna · Premium · Diésel |
| Days and schedule | `days`, `timeFrom`, `timeTo` | Days of the week and a time window |
| Stations | `stationSubnetId` | Whole network or one sub-network |
| Odometer | `odometerRequired` | Capture is mandatory on each fill |
| Performance | `minKmPerLiter` | Alert below a km/L floor, or off |

Every limit shows its equivalent in the other measure (litres ⇄ pesos) with the reference
price of `src/data/dispersion.ts`.

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

- A card shows the scope (groups and units), the period limit with its equivalent, and the
  locks in five lines: per fill, fuel, days and schedule, stations, validations.
- `Editar` and `Nueva política` open the same dialog with five blocks: scope, consumption
  limit, per fill, what/when/where, validations. The policy needs a name, a limit, one fuel
  and one day.
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
  is removed when the unit changes policy or the policy changes its measure.

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

To confirm with the TC+ product team: the exact lock names in TC+, whether NIP or driver
identification is configured at this level, and whether limits can also be set per driver or
per card in addition to per unit.
