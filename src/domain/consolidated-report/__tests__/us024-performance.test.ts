// US-024
/**
 * Rendimiento: el reporte de doce meses de la cuenta más grande, en frío.
 *
 * TODO SLA: el objetivo está pendiente de decisión (≤30 s frente a ≤10 s).
 * Esta prueba usa la cota LAXA de las dos, 30 s, como red contra una regresión
 * grave; no es el SLA. Si se decide 10 s, se baja aquí. Va en su propio
 * fichero para medir sin la caché de fuentes que calientan las otras pruebas.
 */
import { describe, expect, it } from 'vitest'
import { ACCOUNTS } from '../../data/accounts'
import type { ReportPrincipal } from '../build'

/**
 * Principal del portal — ADR-TCP-001. En eOne los tests usaban roles de ADR-001 y un Admin Edenred cruzaba
 * cuentas; en Ticket Car+ la analítica siempre se queda en la cuenta activa, así que el rol ya no cambia la
 * cuenta: la decide `activeAccountId` y, sin ella, la cuenta cliente del portal.
 */
const principalFor = (_role: string, account: { activeAccountId?: string; homeAccountId?: string } = {}): ReportPrincipal => ({
  name: 'Usuario de prueba',
  accountId: account.activeAccountId ?? 'acc_grupo_alimentario',
  scopeNodeId: null,
})
import { fleetUnitsOf } from '../../datasource/active'
import { GENERATION_STEPS, generateReport } from '../pipeline'

const UPPER_BOUND_MS = 30_000

describe('US-024 c · generación del reporte de 12 meses', () => {
  it(`la cuenta más grande, 12 meses, todas las unidades: < ${UPPER_BOUND_MS / 1000} s y con cada paso`, async () => {
    const biggest = ACCOUNTS.filter((a) => a.active).sort((a, b) => fleetUnitsOf(b).length - fleetUnitsOf(a).length)[0]!
    const steps: number[] = []
    const startedAt = performance.now()
    const result = await generateReport(
      { type: 'operativo', period: '12-meses', scope: { accountId: biggest.id, kind: 'cuenta', value: null } },
      principalFor('admin_edenred'),
      Date.now(),
      {},
      (step) => steps.push(step),
    )
    const wall = performance.now() - startedAt
    if ('error' in result) throw new Error(result.error)

    expect(steps).toEqual(GENERATION_STEPS.map((_, i) => i))
    expect(result.report.kpis.dispatches).toBeGreaterThan(50_000)
    expect(result.elapsedMs).toBeLessThan(UPPER_BOUND_MS)
    expect(result.elapsedMs).toBeLessThanOrEqual(wall)
  }, 60_000)
})
