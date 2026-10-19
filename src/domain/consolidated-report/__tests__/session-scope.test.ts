/**
 * Reporte consolidado con el alcance de la sesión — ADR-TCP-001.
 * Un usuario acotado a un nodo no puede sacar del reporte nada de fuera de su
 * subárbol, pida el alcance que pida.
 */
import { describe, expect, it } from 'vitest'
import { ACCOUNTS } from '../../data/accounts'
import { fleetUnitsOf } from '../../data/fleet-activity'
import { baseOrgTreeOf, withUnassigned } from '../../org/structure'
import { unitPathOf } from '../../org/types'
import { buildConsolidatedReport, type ReportPrincipal } from '../build'

const GAN = 'acc_grupo_alimentario'
const NORESTE = `org:${GAN}:division-noreste`
const OCCIDENTE = `org:${GAN}:division-occidente`
const NOW = new Date(2026, 9, 16, 12, 0).getTime()
const account = ACCOUNTS.find((a) => a.id === GAN)!
const tree = withUnassigned(baseOrgTreeOf(account), fleetUnitsOf(account).map((u) => u.id))

const whole: ReportPrincipal = { name: 'Admin', accountId: GAN, scopeNodeId: null }
const noreste: ReportPrincipal = { name: 'Flota Noreste', accountId: GAN, scopeNodeId: NORESTE }

const platesUnder = (nodeId: string) =>
  new Set(fleetUnitsOf(account).filter((u) => unitPathOf(tree, u.id).includes(nodeId)).map((u) => u.plate))

const build = (principal: ReportPrincipal, scope: { kind: 'cuenta' | 'nodo'; value: string | null }) => {
  const r = buildConsolidatedReport(
    { type: 'operativo', period: 'sep-2026', scope: { accountId: GAN, ...scope } },
    principal,
    NOW,
    { orgTree: tree },
  )
  if ('error' in r) throw new Error(r.error)
  return r
}

describe('reporte consolidado acotado al nodo de la sesión', () => {
  it('«toda la cuenta» se queda en el subárbol y lo dice en el rótulo', () => {
    const r = build(noreste, { kind: 'cuenta', value: null })
    const allowed = platesUnder(NORESTE)
    expect(r.byUnit.every((row) => allowed.has(row.id))).toBe(true)
    expect(r.scopeLabel).toBe('Alcance de tu usuario: División Noreste')
    expect(r.kpis.amountMxn).toBeLessThan(build(whole, { kind: 'cuenta', value: null }).kpis.amountMxn)
  })

  it('coincide con lo que un admin ve pidiendo ese mismo nodo', () => {
    const scoped = build(noreste, { kind: 'cuenta', value: null })
    const admin = build(whole, { kind: 'nodo', value: NORESTE })
    expect(scoped.kpis.dispatches).toBe(admin.kpis.dispatches)
    expect(scoped.kpis.amountMxn).toBeCloseTo(admin.kpis.amountMxn, 6)
  })

  it('pedir otra división desde el Noreste no devuelve ni una carga', () => {
    const r = build(noreste, { kind: 'nodo', value: OCCIDENTE })
    expect(r.kpis.dispatches).toBe(0)
    expect(r.byUnit).toEqual([])
  })

  it('sin organigrama en la sesión no se genera: no se puede comprobar el alcance', () => {
    const r = buildConsolidatedReport(
      { type: 'operativo', period: 'sep-2026', scope: { accountId: GAN, kind: 'cuenta', value: null } },
      noreste,
      NOW,
    )
    expect('error' in r).toBe(true)
  })
})
