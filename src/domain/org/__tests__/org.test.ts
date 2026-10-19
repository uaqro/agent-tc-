/**
 * Tests de la vista multi-nivel organizacional — US-013.
 * ═════════════════════════════════════════════════════
 * Cuatro cosas distintas, y conviene no mezclarlas:
 *
 *   · que los ORGANIGRAMAS mock tengan las propiedades que la historia pide
 *     —profundidades distintas, tope de cinco niveles, un nivel vacío,
 *     unidades sin clasificar—, porque sin ellas la vista no prueba nada;
 *   · que las OPERACIONES de configuración respeten las reglas de negocio: el
 *     tope del criterio 5, los nombres repetidos, la raíz que no se borra y
 *     las unidades que no se pierden al borrar un nivel;
 *   · que los AGREGADOS cuadren: el total de un nodo tiene que ser la suma de
 *     sus hijos más lo que cuelga de él directamente, y coincidir con lo que
 *     dan los filtros globales al recortar por ese mismo nodo;
 *   · que los PERMISOS del criterio 3 salgan de la matriz de ADR-001, con la
 *     cuenta como objetivo, y no de una comparación por nombre de rol.
 *
 * El reloj es fijo. Un test que dependa de la hora a la que se ejecute no es un
 * test, es una moneda al aire.
 */
import { describe, expect, it } from 'vitest'
import { ACCOUNTS } from '../../data/accounts'
import { buildAccountActivity, fleetUnitsOf } from '../../data/fleet-activity'
import { summarizeDay, unitsOf } from '../../dashboard/metrics'
import type { ActivitySnapshot } from '../../dashboard/types'
import { ANY, DEFAULT_FILTERS, matches, type GlobalFilters } from '../../filters/types'
import { buildFilterOptions, reconcile, visibleUnits } from '../../filters/options'
import { findRollup, rollupOrg, rollupPath, rollupsAtLevel, totalsAddUp } from '../aggregate'
import {
  addChild,
  addLevel,
  moveUnits,
  removeLevel,
  removeNode,
  renameLevel,
  renameNode,
  unitsUnder,
} from '../operations'
import { applyOverrides, overridesFrom } from '../store'
import { baseOrgTreeOf, withUnassigned } from '../structure'
import {
  MAX_ORG_LEVELS,
  childrenOf,
  depthOf,
  findNode,
  pathOf,
  rootOf,
  subtreeOf,
  unitPathIndex,
  unitsAtNode,
  type OrgTree,
} from '../types'

/** Jueves 20 de agosto de 2026, 11:30 hora local. El mismo que US-008. */
const NOW = new Date(2026, 7, 20, 11, 30, 0, 0).getTime()

const BAJIO = ACCOUNTS.find((account) => account.id === 'acc_transportes_bajio')!
const GRANDE = ACCOUNTS.find((account) => account.id === 'acc_grupo_alimentario')!
const PENINSULAR = ACCOUNTS.find((account) => account.id === 'acc_logistica_peninsular')!
const DE_BAJA = ACCOUNTS.find((account) => !account.active)!

/** El organigrama tal como lo ve la aplicación: con «Sin asignar» si procede. */
function treeOf(account = BAJIO): OrgTree {
  return withUnassigned(
    baseOrgTreeOf(account),
    fleetUnitsOf(account).map((unit) => unit.id),
  )
}

function snapshotOf(account = BAJIO, at = NOW): ActivitySnapshot {
  const tree = treeOf(account)
  const paths = unitPathIndex(tree)
  const activity = buildAccountActivity(account, at, {
    periodDays: 30,
    orgPathOf: (unitId) => paths.get(unitId) ?? [],
  })
  return { at, accounts: [activity], loadMs: 0, fleetSize: account.fleetSize, periodDays: 30 }
}

function filtersWith(partial: Partial<GlobalFilters>): GlobalFilters {
  return { ...DEFAULT_FILTERS, ...partial }
}

// ── Organigramas mock ────────────────────────────────────────────────────

describe('organigramas de las cuentas piloto', () => {
  it('cada cuenta tiene una raíz y una sola', () => {
    for (const account of ACCOUNTS) {
      const roots = baseOrgTreeOf(account).nodes.filter((node) => node.parentId === null)
      expect(roots).toHaveLength(1)
      expect(roots[0]!.name).toBe(account.name)
      expect(roots[0]!.level).toBe(0)
    }
  })

  it('ningún organigrama pasa del tope del MVP — criterio 5', () => {
    for (const account of ACCOUNTS) {
      const tree = baseOrgTreeOf(account)
      // Los nombres de nivel INCLUYEN la unidad, así que cinco es el tope.
      expect(tree.levelNames.length).toBeLessThanOrEqual(MAX_ORG_LEVELS)
      // Y los nodos nunca ocupan el nivel de la unidad.
      expect(depthOf(tree)).toBeLessThanOrEqual(tree.levelNames.length - 1)
    }
  })

  it('las profundidades son distintas entre cuentas', () => {
    expect(baseOrgTreeOf(PENINSULAR).levelNames).toHaveLength(3)
    expect(baseOrgTreeOf(BAJIO).levelNames).toHaveLength(4)
    // La cuenta grande llega al tope: sin ella, «máximo 5» no se demostraría.
    expect(baseOrgTreeOf(GRANDE).levelNames).toHaveLength(MAX_ORG_LEVELS)
  })

  it('el criterio 2 se lee tal cual en el organigrama por defecto', () => {
    expect(baseOrgTreeOf(BAJIO).levelNames).toEqual([
      'Empresa',
      'División',
      'Departamento',
      'Unidad',
    ])
  })

  it('la cadena de padres nunca se rompe', () => {
    for (const account of ACCOUNTS) {
      const tree = baseOrgTreeOf(account)
      for (const node of tree.nodes) {
        const path = pathOf(tree, node.id)
        expect(path.length).toBeGreaterThan(0)
        expect(path[0]).toBe(rootOf(tree)!.id)
        expect(path[path.length - 1]).toBe(node.id)
        expect(path).toHaveLength(node.level + 1)
      }
    }
  })

  it('hay un nivel deliberadamente vacío, y es un dato, no un fallo', () => {
    const tree = baseOrgTreeOf(GRANDE)
    const vacio = tree.nodes.find((node) => node.name === 'Departamento Mantenimiento y Relevo')!

    expect(unitsUnder(tree, vacio.id)).toHaveLength(0)
    // Existe en el organigrama: no es que falte, es que no tiene flota.
    expect(findNode(tree, vacio.id)).toBeDefined()
  })

  it('hay unidades sin clasificar y suman igualmente en la empresa', () => {
    const base = baseOrgTreeOf(GRANDE)
    const unidades = fleetUnitsOf(GRANDE).map((unit) => unit.id)
    const huerfanas = unidades.filter((unitId) => base.assignment[unitId] === undefined)
    expect(huerfanas.length).toBeGreaterThan(0)

    const tree = withUnassigned(base, unidades)
    // Con el nodo sintético puesto, el padrón entero cuelga de la raíz.
    expect(Object.keys(tree.assignment)).toHaveLength(unidades.length)
    expect(unitsUnder(tree, rootOf(tree)!.id)).toHaveLength(unidades.length)

    const sintetico = tree.nodes.find((node) => node.synthetic === true)!
    expect(unitsAtNode(tree, sintetico.id)).toHaveLength(huerfanas.length)
  })

  it('«Sin asignar» no aparece cuando no hace falta', () => {
    const tree = treeOf(PENINSULAR)
    expect(tree.nodes.some((node) => node.synthetic === true)).toBe(false)
  })

  it('algunas unidades cuelgan de un nivel intermedio, no solo de las hojas', () => {
    const tree = baseOrgTreeOf(BAJIO)
    const conHijos = tree.nodes.filter((node) => childrenOf(tree, node.id).length > 0)
    const mixtos = conHijos.filter((node) => unitsAtNode(tree, node.id).length > 0)

    // Si solo las hojas tuvieran unidades, comparar por igualdad con la hoja
    // funcionaría y el corte por RUTA no estaría probando nada.
    expect(mixtos.length).toBeGreaterThan(0)
  })

  it('la cuenta dada de baja conserva su organigrama sin actividad', () => {
    const tree = baseOrgTreeOf(DE_BAJA)
    expect(tree.nodes.length).toBeGreaterThan(1)
    expect(buildAccountActivity(DE_BAJA, NOW, { periodDays: 30 }).units).toHaveLength(0)
  })

  it('los organigramas son deterministas', () => {
    expect(baseOrgTreeOf(BAJIO)).toEqual(baseOrgTreeOf(BAJIO))
  })
})

// ── Operaciones de configuración · criterio 1 ────────────────────────────

describe('configuración del organigrama', () => {
  it('renombrar un nivel no toca ni las unidades ni la forma', () => {
    const tree = treeOf()
    const division = tree.nodes.find((node) => node.level === 1 && node.synthetic !== true)!
    const result = renameNode(tree, division.id, '  División   Centro  ')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(findNode(result.tree, division.id)!.name).toBe('División Centro')
    expect(result.tree.assignment).toEqual(tree.assignment)
    expect(result.tree.nodes).toHaveLength(tree.nodes.length)
  })

  it('no deja dos hermanos con el mismo nombre', () => {
    const tree = treeOf()
    const root = rootOf(tree)!
    const hermana = childrenOf(tree, root.id).find((node) => node.synthetic !== true)!

    const result = addChild(tree, root.id, hermana.name.toUpperCase())
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toContain('mismo nivel')
  })

  it('el tope de cinco niveles se comprueba de verdad — criterio 5', () => {
    let tree = treeOf(GRANDE)
    expect(tree.levelNames).toHaveLength(MAX_ORG_LEVELS)

    // Un área ya está en el último nivel que puede tener hijos.
    const area = tree.nodes.find((node) => node.level === 3)!
    const result = addChild(tree, area.id, 'Sub-área')
    expect(result.ok).toBe(false)

    // Y tampoco se puede añadir un sexto nivel al organigrama.
    const added = addLevel(tree, 'Sub-área')
    expect(added.ok).toBe(false)
    if (added.ok) return
    expect(added.message).toContain(String(MAX_ORG_LEVELS))

    // En una cuenta con margen, sí.
    tree = treeOf(PENINSULAR)
    const conMargen = addLevel(tree, 'Departamento')
    expect(conMargen.ok).toBe(true)
    if (!conMargen.ok) return
    expect(conMargen.tree.levelNames).toEqual(['Empresa', 'División', 'Departamento', 'Unidad'])
  })

  it('el nivel nuevo se coloca justo encima de la unidad', () => {
    const result = addLevel(treeOf(PENINSULAR), 'Zona')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.tree.levelNames[result.tree.levelNames.length - 1]).toBe('Unidad')
  })

  it('borrar un nivel no pierde ni una unidad', () => {
    const tree = treeOf()
    const division = tree.nodes.find(
      (node) => node.level === 1 && node.synthetic !== true && unitsUnder(tree, node.id).length > 0,
    )!
    const antes = unitsUnder(tree, division.id)
    expect(antes.length).toBeGreaterThan(0)

    const result = removeNode(tree, division.id)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Ni el nodo ni sus descendientes siguen ahí…
    expect(findNode(result.tree, division.id)).toBeUndefined()
    expect(result.tree.nodes.length).toBeLessThan(tree.nodes.length)
    // …y todas sus unidades han subido al padre, no se han quedado huérfanas.
    expect(Object.keys(result.tree.assignment)).toHaveLength(
      Object.keys(tree.assignment).length,
    )
    for (const unitId of antes) {
      expect(result.tree.assignment[unitId]).toBe(division.parentId)
    }
  })

  it('la raíz y el nodo sintético no se tocan', () => {
    const tree = treeOf(GRANDE)
    expect(removeNode(tree, rootOf(tree)!.id).ok).toBe(false)

    const sintetico = tree.nodes.find((node) => node.synthetic === true)!
    expect(removeNode(tree, sintetico.id).ok).toBe(false)
    expect(renameNode(tree, sintetico.id, 'Otro nombre').ok).toBe(false)
    expect(addChild(tree, sintetico.id, 'Hijo').ok).toBe(false)
    expect(moveUnits(tree, ['ECO-3001'], sintetico.id).ok).toBe(false)
  })

  it('quitar un nivel exige vaciarlo antes', () => {
    const tree = treeOf(GRANDE)
    const ocupado = removeLevel(tree)
    expect(ocupado.ok).toBe(false)
    if (ocupado.ok) return
    expect(ocupado.message).toContain('Bórralos')
  })

  it('mover unidades las cambia de sitio y solo a ellas', () => {
    const tree = treeOf()
    const origen = tree.nodes.find(
      (node) => node.synthetic !== true && unitsAtNode(tree, node.id).length > 2,
    )!
    const destino = tree.nodes.find(
      (node) => node.synthetic !== true && node.id !== origen.id && node.level > 0,
    )!
    const mudanza = unitsAtNode(tree, origen.id).slice(0, 2)

    const result = moveUnits(tree, mudanza, destino.id)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    for (const unitId of mudanza) expect(result.tree.assignment[unitId]).toBe(destino.id)
    expect(unitsAtNode(result.tree, origen.id)).toHaveLength(
      unitsAtNode(tree, origen.id).length - 2,
    )
  })

  it('renombrar un nivel entero cambia el vocabulario de la cuenta', () => {
    const result = renameLevel(treeOf(), 2, 'Plaza')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.tree.levelNames).toEqual(['Empresa', 'División', 'Plaza', 'Unidad'])
  })

  it('los nombres vacíos y los repetidos entre niveles se rechazan', () => {
    const tree = treeOf()
    expect(renameLevel(tree, 1, '   ').ok).toBe(false)
    expect(renameLevel(tree, 1, 'departamento').ok).toBe(false)
    expect(renameLevel(tree, 9, 'Zona').ok).toBe(false)
  })
})

describe('persistencia de lo configurado', () => {
  it('lo guardado es la diferencia, no el árbol entero', () => {
    const base = baseOrgTreeOf(BAJIO)
    const renamed = renameNode(base, base.nodes[1]!.id, 'División Renombrada')
    expect(renamed.ok).toBe(true)
    if (!renamed.ok) return

    const overrides = overridesFrom(base, renamed.tree)
    // Un renombrado no mueve ninguna unidad: el mapa de mudanzas va vacío.
    expect(Object.keys(overrides.moved ?? {})).toHaveLength(0)
    expect(overrides.nodes).toHaveLength(base.nodes.length)
  })

  it('aplicar lo guardado reconstruye el mismo árbol', () => {
    const base = baseOrgTreeOf(BAJIO)
    const division = base.nodes.find((node) => node.level === 1)!
    const removed = removeNode(base, division.id)
    expect(removed.ok).toBe(true)
    if (!removed.ok) return

    const overrides = overridesFrom(base, removed.tree)
    const rebuilt = applyOverrides(base, overrides)

    expect(rebuilt.nodes).toEqual(removed.tree.nodes)
    expect(rebuilt.assignment).toEqual(removed.tree.assignment)
  })

  it('una asignación a un nodo que ya no existe se descarta al aplicar', () => {
    const base = baseOrgTreeOf(BAJIO)
    const rebuilt = applyOverrides(base, {
      nodes: base.nodes,
      moved: { 'ECO-1001': 'org:acc_transportes_bajio:inventado' },
    })
    expect(rebuilt.assignment['ECO-1001']).not.toBe('org:acc_transportes_bajio:inventado')
  })

  it('el nodo sintético no se guarda: se vuelve a calcular al leer', () => {
    const tree = treeOf(GRANDE)
    const overrides = overridesFrom(baseOrgTreeOf(GRANDE), tree)
    expect(overrides.nodes!.some((node) => node.synthetic === true)).toBe(false)
  })
})

// ── Agregación por nivel · criterio 4 ────────────────────────────────────

describe('KPIs agregados por nivel jerárquico', () => {
  const tree = treeOf()
  const snapshot = snapshotOf()
  const units = unitsOf(snapshot, DEFAULT_FILTERS)
  const rollup = rollupOrg(tree, units)!

  it('el total de cada nodo cuadra con el de sus hijos', () => {
    // Es la invariante del módulo: un organigrama en el que las cifras del
    // padre no cuadran con las de los hijos no sirve para decidir nada.
    expect(totalsAddUp(rollup)).toBe(true)
  })

  it('la raíz suma el padrón entero de la cuenta', () => {
    expect(rollup.fleetUnits).toBe(BAJIO.fleetSize)
    expect(rollup.node.level).toBe(0)
  })

  it('los litros de la raíz son los de todas las unidades del alcance', () => {
    const total = units.reduce((sum, unit) => sum + unit.liters, 0)
    expect(rollup.liters).toBeCloseTo(total, 1)
  })

  it('cada nivel se puede leer entero, que es la pregunta del criterio', () => {
    const divisiones = rollupsAtLevel(rollup, 1)
    expect(divisiones.length).toBeGreaterThan(1)
    expect(divisiones.every((nodo) => nodo.node.level === 1)).toBe(true)
    expect(divisiones.every((nodo) => nodo.levelName === 'División')).toBe(true)

    const suma = divisiones.reduce((total, nodo) => total + nodo.fleetUnits, 0)
    expect(suma + rollup.ownUnits).toBe(rollup.fleetUnits)
  })

  it('el rendimiento es del conjunto, no la media de las medias', () => {
    const division = rollup.children.find((child) => child.liters > 0)!
    expect(division.efficiency).toBeCloseTo(division.km / division.liters, 6)
  })

  it('un nivel sin unidades da ceros legítimos y rendimiento sin dato', () => {
    const grande = rollupOrg(treeOf(GRANDE), unitsOf(snapshotOf(GRANDE), DEFAULT_FILTERS))!
    const vacio = findRollup(grande, 'org:acc_grupo_alimentario:departamento-mantenimiento-y-relevo')!

    expect(vacio.fleetUnits).toBe(0)
    expect(vacio.liters).toBe(0)
    // Sin litros no hay rendimiento: es «sin dato», no un cero ni un infinito.
    expect(vacio.efficiency).toBeNull()
  })

  it('las migas de pan llevan de la raíz al nodo', () => {
    const hoja = rollup.children[0]!.children[0]!
    const path = rollupPath(rollup, hoja.node.id)

    expect(path[0]!.node.id).toBe(rollup.node.id)
    expect(path[path.length - 1]!.node.id).toBe(hoja.node.id)
    expect(path).toHaveLength(hoja.node.level + 1)
  })

  it('un árbol sin raíz devuelve `null` en vez de medio organigrama', () => {
    const roto: OrgTree = { ...tree, nodes: tree.nodes.filter((node) => node.parentId !== null) }
    expect(rollupOrg(roto, units)).toBeNull()
    expect(rollupsAtLevel(null, 1)).toEqual([])
    expect(findRollup(null, 'lo-que-sea')).toBeNull()
  })
})

// ── Coherencia con el contexto global de US-010 ──────────────────────────

describe('el nodo elegido es una dimensión del contexto global', () => {
  const tree = treeOf()
  const snapshot = snapshotOf()
  const division = tree.nodes.find(
    (node) => node.level === 1 && node.synthetic !== true && unitsUnder(tree, node.id).length > 0,
  )!

  it('filtrar por un nodo recorta al SUBÁRBOL, no al nodo', () => {
    const recortadas = unitsOf(snapshot, filtersWith({ orgNodeId: division.id }))
    const esperadas = unitsUnder(tree, division.id)

    expect(recortadas).toHaveLength(esperadas.length)
    expect(recortadas.every((unit) => unit.orgPath.includes(division.id))).toBe(true)
    // Y hay descendientes de verdad: si la división fuera una hoja, el test
    // no distinguiría «subárbol» de «nodo».
    expect(subtreeOf(tree, division.id).length).toBeGreaterThan(1)
  })

  it('el agregado del nodo coincide con lo que dan los filtros por ese nodo', () => {
    const rollup = rollupOrg(tree, unitsOf(snapshot, DEFAULT_FILTERS))!
    const nodo = findRollup(rollup, division.id)!
    const porFiltro = unitsOf(snapshot, filtersWith({ orgNodeId: division.id }))

    // Dos caminos distintos, la misma cifra. Si divergen, la pantalla estaría
    // diciendo dos cosas a la vez sobre el mismo departamento.
    expect(nodo.fleetUnits).toBe(porFiltro.length)
    expect(nodo.liters).toBeCloseTo(
      porFiltro.reduce((sum, unit) => sum + unit.liters, 0),
      1,
    )
  })

  it('la jerarquía compone con las demás dimensiones', () => {
    const soloNodo = unitsOf(snapshot, filtersWith({ orgNodeId: division.id }))
    const nodoYDiesel = unitsOf(snapshot, filtersWith({ orgNodeId: division.id, fuel: 'diesel' }))

    expect(nodoYDiesel.length).toBeGreaterThan(0)
    expect(nodoYDiesel.length).toBeLessThan(soloNodo.length)
    expect(nodoYDiesel.every((unit) => unit.fuel === 'diesel')).toBe(true)
  })

  it('sumar las divisiones por separado da el total de la empresa', () => {
    const raiz = rootOf(tree)!
    const total = unitsOf(snapshot, filtersWith({ orgNodeId: raiz.id })).length

    const porPartes = childrenOf(tree, raiz.id).reduce(
      (sum, hija) => sum + unitsOf(snapshot, filtersWith({ orgNodeId: hija.id })).length,
      0,
    )
    const directas = unitsAtNode(tree, raiz.id).length

    expect(porPartes + directas).toBe(total)
    expect(total).toBe(BAJIO.fleetSize)
  })

  it('el catálogo de filtros conoce los nodos y los sabe nombrar', () => {
    const options = buildFilterOptions([BAJIO], NOW, new Map([[BAJIO.id, tree]]))
    const nodo = options.orgNodes.find((candidate) => candidate.value === division.id)!

    expect(nodo.label).toBe(division.name)
    expect(nodo.levelName).toBe('División')
    expect(nodo.hint).toBe(BAJIO.name)
    expect(options.orgNodes).toHaveLength(tree.nodes.length)
  })

  it('elegir un nodo acota las unidades que se ofrecen', () => {
    const options = buildFilterOptions([BAJIO], NOW, new Map([[BAJIO.id, tree]]))
    const acotadas = visibleUnits(options, filtersWith({ orgNodeId: division.id }))

    expect(acotadas.length).toBeGreaterThan(0)
    expect(acotadas.length).toBeLessThan(options.units.length)
    expect(acotadas.every((unit) => unit.orgPath.includes(division.id))).toBe(true)
  })

  it('un nodo que ya no existe se suelta al reconciliar', () => {
    const options = buildFilterOptions([BAJIO], NOW, new Map([[BAJIO.id, tree]]))
    const { filters, dropped } = reconcile(
      filtersWith({ orgNodeId: 'org:acc_transportes_bajio:borrado' }),
      options,
    )

    expect(filters.orgNodeId).toBe(ANY)
    expect(dropped).toEqual(['org:acc_transportes_bajio:borrado'])
  })

  it('sin organigrama cargado, la ruta va vacía y nada casa por jerarquía', () => {
    const sinOrg = buildAccountActivity(BAJIO, NOW, { periodDays: 30 })
    const unit = sinOrg.units[0]!

    expect(unit.orgPath).toEqual([])
    expect(matches(unit, filtersWith({ orgNodeId: division.id }))).toBe(false)
    // Y sin filtro de jerarquía sigue casando: la dimensión no estorba.
    expect(matches(unit, DEFAULT_FILTERS)).toBe(true)
  })

  it('la ruta viaja también en las filas del histórico', () => {
    const punto = snapshot.accounts[0]!.period[0]!
    expect(punto.rows.every((row) => row.orgPath.length > 0)).toBe(true)

    const delNodo = summarizeDay(punto, filtersWith({ orgNodeId: division.id }))
    const total = summarizeDay(punto, DEFAULT_FILTERS)

    expect(delNodo.fleetUnits).toBe(unitsUnder(tree, division.id).length)
    expect(delNodo.fleetUnits).toBeLessThan(total.fleetUnits)
  })
})

