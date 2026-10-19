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
import { STATION_ACCOUNT_ID as OPTIMIZER_ACCOUNT_ID } from '../../stations/directory'
import { loads as padronLoads } from './fixture'
import { DEFAULT_OPTIMIZER_FILTERS, facetCounts } from '../filters'
import { optimizerUniverse, optimizerValueLabel } from '../labels'
import { departmentNodeIdOf, optimizerOrg } from '../org'

// El periodo ya no se cruza con un mes de dataset: las cargas son los días
// cerrados del padrón, la misma ventana que el Resumen (`data/optimizer`).

function baseTree(): OrgTree {
  return baseOrgTreeOf(ACCOUNTS.find((a) => a.id === OPTIMIZER_ACCOUNT_ID)!)
}

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

  it('las cargas llevan la división de su unidad y los conteos facetados la siguen', () => {
    const org = optimizerOrg(baseTree())
    const loads = padronLoads.filter((load) => org.divisions.includes(load.division))
    const counts = facetCounts(loads, DEFAULT_OPTIMIZER_FILTERS, 'division', optimizerUniverse('division', org))
    const total = counts.reduce((sum, facet) => sum + facet.count, 0)
    expect(total).toBe(loads.length)
    // La división vacía sigue en la lista, al final y a cero.
    const servicios = counts.find((facet) => org.divisionLabel(facet.value) === 'División Servicios')
    expect(servicios?.count).toBe(0)
    expect(counts[counts.length - 1]).toBe(servicios)
  })
})
