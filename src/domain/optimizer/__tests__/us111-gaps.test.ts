// US-111 · US-013 · US-010
/**
 * Cierre de los gaps de US-111: periodo global y dimensiones del organigrama.
 */
import { describe, expect, it } from 'vitest'
import { ACCOUNTS } from '../../data/accounts'
import { COST_CENTER_IDS } from '../../data/fleet-activity'
import { baseOrgTreeOf } from '../../org/structure'
import { renameNode } from '../../org/operations'
import { unassignedNodeId, type OrgTree } from '../../org/types'
import { OPTIMIZER_ACCOUNT_ID, getOptimizerDataset } from '../dataset'
import { DEFAULT_OPTIMIZER_FILTERS, facetCounts } from '../filters'
import { optimizerUniverse, optimizerValueLabel } from '../labels'
import { departmentNodeIdOf, optimizerOrg, withOrgDivision } from '../org'
import { optimizerWindow, periodDaysToCoverDataset } from '../period'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()
const OCT_15 = at(2026, 10, 15)

function baseTree(): OrgTree {
  return baseOrgTreeOf(ACCOUNTS.find((a) => a.id === OPTIMIZER_ACCOUNT_ID)!)
}

describe('US-111 · periodo = periodo global de US-010', () => {
  it('30 días cerrados el 15 de octubre alcanzan del 15 al 30 de septiembre', () => {
    expect(optimizerWindow(30, OCT_15)).toEqual({ fromDay: 15, toDay: 30 })
  })

  it('«Día» el 15 de octubre mira el 14: fuera del dataset', () => {
    expect(optimizerWindow(1, OCT_15)).toBeNull()
    expect(optimizerWindow(7, OCT_15)).toBeNull()
  })

  it('44 días cubren septiembre entero, y es lo que se ofrece para ampliar', () => {
    expect(periodDaysToCoverDataset(OCT_15)).toBe(44)
    expect(optimizerWindow(44, OCT_15)).toEqual({ fromDay: 1, toDay: 30 })
  })

  it('con el reloj dentro de septiembre la ventana termina ayer', () => {
    expect(optimizerWindow(7, at(2026, 9, 10))).toEqual({ fromDay: 3, toDay: 9 })
    expect(periodDaysToCoverDataset(at(2026, 9, 10))).toBeNull()
  })

  it('antes de septiembre no hay solape', () => {
    expect(optimizerWindow(30, at(2026, 8, 20))).toBeNull()
  })
})

describe('US-111 · zona, división y centro de costo del organigrama (US-013)', () => {
  it('las divisiones son los nodos de nivel 1 del árbol, la vacía incluida', () => {
    const org = optimizerOrg(baseTree())
    expect(org.divisions.map(org.divisionLabel)).toEqual([
      'División Noreste',
      'División Noroeste',
      'División Occidente',
      'División Servicios',
    ])
  })

  it('cada zona es su departamento y su división sale del árbol', () => {
    const org = optimizerOrg(baseTree())
    expect(org.zoneLabel('monterrey')).toBe('Departamento Monterrey')
    expect(org.divisionLabel(org.divisionOfZone.monterrey)).toBe('División Noreste')
    expect(org.divisionLabel(org.divisionOfZone.guadalajara)).toBe('División Occidente')
    expect(optimizerValueLabel('zone', 'culiacan', org)).toBe('Departamento Culiacán')
  })

  it('renombrar el departamento en Estructura renombra la zona del filtro', () => {
    const renamed = renameNode(baseTree(), departmentNodeIdOf('saltillo'), 'Departamento Coahuila')
    expect(renamed.ok).toBe(true)
    const org = optimizerOrg(renamed.ok ? renamed.tree : null)
    expect(org.zoneLabel('saltillo')).toBe('Departamento Coahuila')
  })

  it('si el departamento ya no está en el árbol, sus cargas van a «Sin asignar»', () => {
    const tree = baseTree()
    const gone = departmentNodeIdOf('hermosillo')
    // Un árbol guardado sin ese departamento (y sin sus áreas).
    const pruned: OrgTree = { ...tree, nodes: tree.nodes.filter((n) => n.id !== gone && n.parentId !== gone) }
    const org = optimizerOrg(pruned)
    expect(org.divisionOfZone.hermosillo).toBe(unassignedNodeId(OPTIMIZER_ACCOUNT_ID))
    expect(org.divisions).toContain(unassignedNodeId(OPTIMIZER_ACCOUNT_ID))
    expect(org.zoneLabel('hermosillo')).toBe('Hermosillo')
  })

  it('los centros de costo son los de las unidades del árbol de la cuenta', () => {
    const org = optimizerOrg(baseTree())
    expect(org.costCenters.length).toBeGreaterThan(0)
    for (const center of org.costCenters) expect(COST_CENTER_IDS).toContain(center)
    expect(optimizerUniverse('costCenter', org)).toEqual(org.costCenters)
  })

  it('las cargas llevan la división del árbol y los conteos facetados siguen igual', () => {
    const org = optimizerOrg(baseTree())
    const loads = withOrgDivision(getOptimizerDataset().loads, org)
    const counts = facetCounts(loads, DEFAULT_OPTIMIZER_FILTERS, 'division', optimizerUniverse('division', org))
    const total = counts.reduce((sum, facet) => sum + facet.count, 0)
    expect(total).toBe(loads.length)
    // La división vacía sigue en la lista, al final y a cero.
    const servicios = counts.find((facet) => org.divisionLabel(facet.value) === 'División Servicios')
    expect(servicios?.count).toBe(0)
    expect(counts[counts.length - 1]).toBe(servicios)
  })
})
