# Functional Specification — Dispersión y Recortes

Product: Ticket Car — Fuel Management
Page: Dispersión y recortes (funding control tower)
Version: 2.0 — redesigned from the Jobs To Be Done, not from the form fields

## 1. Job to be done

The user is a fleet administrator who funds between 20 and 2,000 units every week or month,
under pressure from operations (no truck without diesel) and from finance (no over-funding).

| Job | Statement |
| --- | --- |
| Functional | "When the funding cycle arrives, the correct balance must reach each unit without reconfiguring everything from zero." |
| Functional (exception) | "When a driver runs out of balance mid-week, I must send money in seconds, from anywhere." |
| Emotional | "I must be sure that I did not over-fund, did not fund the wrong vehicle, and that I can revert." |
| Social | "I must show finance, in one click, that every dispersed peso has a reason and a trace." |

The mental model is **running a payroll**, not filling in a form. The system already knows what
is due; the user reviews, resolves exceptions, and confirms.

## 2. Page structure

```
Account bar: cuenta · disponible (MXN + L) · presupuesto del mes
+--------------------------------------------------------------+
| Próxima dispersión  (state, not a blank form)                 |
|   fecha · regla · unidades · monto · equivalente en litros    |
|   [Revisar antes de que se ejecute] [Ejecutar ahora] [Pausar] |
+----------------------------------+---------------------------+
| N unidades necesitan atención    | Dispersión puntual        |
|   exception rows + 1-tap action  |   omnibox + montos        |
+----------------------------------+---------------------------+
| Reglas de fondeo (cards)                                      |
+--------------------------------------------------------------+
| Últimas corridas y comprobantes                               |
+--------------------------------------------------------------+
```

## 3. Próxima dispersión

- The card shows the next scheduled run of the earliest active rule: date, days remaining,
  rule name, rule logic, units after exclusions, projected amount in money and in litres.
- `Revisar antes de que se ejecute` opens the simulation in review mode. The approval marks
  the run as approved and the card shows the confirmation.
- `Ejecutar ahora` opens the same simulation in run mode and ends in a receipt.
- `Pausar` stops the rule. When every rule is paused the card shows an empty state.

## 4. Unidades que necesitan atención

Only the cases that require a human decision appear here. Each row carries one primary action
that resolves the case in one tap, and a `Posponer` action.

| Case | Primary action | Effect |
| --- | --- | --- |
| Saldo en cero | `Fondear $N` | Funds the unit, discounts the account, issues a one-off receipt. |
| Consumo anómalo | `Excluir de la corrida` | Removes the unit from the next run for review. |
| Saldo atrapado | `Recortar $N` | Returns the balance to the account and issues a cut receipt. |

## 5. Dispersión puntual (urgent shortcut)

- One field: search by plate, device, driver or group, with keyboard navigation
  (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).
- After the unit is selected the panel shows the current balance in money and litres, three
  suggested amounts derived from the historic spend of that unit, and `Otro monto`.
- The account balance after the send is always visible next to `Enviar ahora`. The button is
  blocked when the amount exceeds the available balance.
- The success state gives the folio and opens the receipt. No wizard, no steps.

## 6. Reglas de fondeo

A rule is configured once and runs by itself. The three dimensions of the legacy wizard are
parameters of the rule, not repeated steps:

| Dimension | Where it lives now |
| --- | --- |
| Unidad / Grupo | `Alcance` of the rule, or free search in the urgent shortcut. |
| Recurrente / Puntual | Inferred from the object: a rule is always recurrent, the shortcut is always one-off. |
| Litros / Dinero | `Unidad de medida` of the rule, with the conversion always shown in parallel. |

Supported logics: `top-off` (reponer a tope), `consumption` (promedio de 30 días + colchón),
`threshold` (por debajo de X, fondear a Y) and `fixed`. Status: Activa · Pausada ·
Necesita revisión.

## 7. Simulación y comprobante

Before any mass run the user sees an impact view, not an editable table:

- Units affected, units new since the last run, units excluded for inactivity, average amount.
- Available before → this run → available after, with the share of the monthly budget.
- Variation against the previous period. A variation above 15% is flagged for review.
- `Ver detalle de unidades` expands a read-only sample of the run.

After the run the receipt records folio, timestamp, user, rule, scope, units and amounts, and
exports to CSV for finance. Every run and every one-off send appears in
`Últimas corridas y comprobantes`.

## 8. Expected impact

| Metric | Legacy wizard | Control tower |
| --- | --- | --- |
| Monthly funding of 230 units | 15–20 min of reconfiguration | ~1 min to review and confirm |
| Urgent top-up | 2–3 min across 3 steps | ~15 s: search, suggested amount, send |
| Over-funding risk | Manual review | Simulation plus automatic flags |
| Traceability for finance | Separate manual report | Automatic receipt per run |

## 9. Implementation map

| Concern | File |
| --- | --- |
| Page orchestration and state | `src/pages/DispersionPage.tsx` |
| Next run card | `src/components/dispersion/NextRunCard.tsx` |
| Exceptions | `src/components/dispersion/AttentionList.tsx` |
| Urgent shortcut | `src/components/dispersion/QuickTopUp.tsx` |
| Rules | `src/components/dispersion/RulesSection.tsx` |
| Simulation and receipt | `src/components/dispersion/SimulationDialog.tsx`, `ReceiptDialog.tsx` |
| Data and simulation maths | `src/data/dispersion.ts` |
| CSV export | `src/utils/receipt.ts` |
