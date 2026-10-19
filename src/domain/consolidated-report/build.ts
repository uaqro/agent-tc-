// US-024
/**
 * EP-04 · US-024 — Reporte consolidado bajo demanda: qué se pide y qué sale.
 * ════════════════════════════════════════════════════════════════════════
 * El usuario elige TIPO, ALCANCE y PERIODO. Sale un documento con portada,
 * índice, KPIs ejecutivos y desglose por unidad y por conductor, más las
 * mismas cifras en CSV y XLSX.
 *
 * ── Tipos de reporte: PLACEHOLDERS ────────────────────────────────────────
 * Las plantillas reales (3–5) están pendientes de definir con Comercial. Los
 * tres tipos de aquí son genéricos y se rotulan como provisionales en la
 * portada: no son una propuesta de plantilla.
 *
 * ── Alcance: RBAC y US-013 ────────────────────────────────────────────────
 * Cuenta, nodo del organigrama, centro de costo, unidad o conductor, y siempre
 * DENTRO de lo que el rol alcanza: un rol global elige cuenta; los demás
 * trabajan sobre su cuenta activa, como en el resto del portal. El nodo sale
 * del organigrama VIGENTE de la sesión (US-013, ediciones incluidas) y entra
 * en el reporte con todo lo que cuelga de él. Las unidades se listan con su
 * ruta del organigrama para poder distinguirlas.
 *
 * ── Periodo ───────────────────────────────────────────────────────────────
 * Cualquier rango de fechas, con atajos de mes, de trimestre y de los doce
 * meses de datos (octubre de 2025–septiembre de 2026). Lo que caiga fuera de
 * los datos, o un hueco de una fuente, se avisa (`coverage.ts`).
 *
 * ── Etapas ────────────────────────────────────────────────────────────────
 * `prepareReport` valida la petición; `computeReport` hace las cuentas sobre
 * los despachos ya unificados. La pantalla las llama por separado
 * (`pipeline.ts`) para enseñar el progreso real y medir el tiempo real.
 */
import { ACCOUNTS } from '../data/accounts'
import { COST_CENTER_IDS, fleetDriversOf, fleetUnitsOf } from '../datasource/active'
import { FUEL_PRODUCT_LABELS, type FuelProduct } from '../dashboard/types'
import type { Account } from '../data/accounts'
import { findNode, levelName, pathOf, unitPathOf, type OrgTree } from '../org/types'
import { coverageWarnings, isoOfTime, rangeText, type CoverageWarning } from './coverage'
import { normalizeSources, type Dispatch } from './normalize'
import { COVERAGE, sourcesOf } from './sources'

// ── Tipos de reporte ─────────────────────────────────────────────────────

export type ReportType = 'ejecutivo' | 'operativo' | 'conductores'

export type ReportTypeSpec = {
  id: ReportType
  label: string
  description: string
  /** Cuántas filas de cada desglose entran. `null` = todas. */
  unitRows: number | null
  driverRows: number | null
}

/** PLACEHOLDERS — pendientes de Comercial. */
export const REPORT_TYPES: ReportTypeSpec[] = [
  {
    id: 'ejecutivo',
    label: 'Resumen ejecutivo',
    description: 'KPIs y las 15 unidades y 15 conductores de más gasto.',
    unitRows: 15,
    driverRows: 15,
  },
  {
    id: 'operativo',
    label: 'Operativo por unidad',
    description: 'KPIs y todas las unidades; conductores, las 15 de más gasto.',
    unitRows: null,
    driverRows: 15,
  },
  {
    id: 'conductores',
    label: 'Detalle por conductor',
    description: 'KPIs y todos los conductores; unidades, las 15 de más gasto.',
    unitRows: 15,
    driverRows: null,
  },
]

export const TEMPLATE_NOTICE = 'Plantilla provisional: los tipos de reporte están pendientes de definir con Comercial.'

// ── Alcance ──────────────────────────────────────────────────────────────

export type ScopeKind = 'cuenta' | 'nodo' | 'centro_costo' | 'unidad' | 'conductor'

export const SCOPE_LABELS: Record<ScopeKind, string> = {
  cuenta: 'Cuenta completa',
  nodo: 'Nodo del organigrama',
  centro_costo: 'Centro de costo',
  unidad: 'Unidad',
  conductor: 'Conductor',
}

export type ReportScope = {
  accountId: string
  kind: ScopeKind
  /** Valor del alcance. `null` con «cuenta completa». */
  value: string | null
}

/**
 * Quién pide el reporte — Ticket Car+ (ADR-TCP-001).
 *
 * En eOne era el `Principal` de ADR-001 y un rol global podía elegir cuenta.
 * En el portal la analítica siempre está limitada a la cuenta activa, para
 * todos los roles, y el usuario puede estar acotado a un nodo del organigrama:
 * el reporte nunca sale de ese subárbol, se pida el alcance que se pida.
 */
export type ReportPrincipal = {
  name: string
  accountId: string
  /** Nodo al que está acotada la sesión. `null` = toda la cuenta. */
  scopeNodeId: string | null
}

/** La cuenta activa de la sesión, si está activa. Nunca otra. */
export function reportableAccounts(principal: ReportPrincipal): Account[] {
  return ACCOUNTS.filter((account) => account.active && account.id === principal.accountId)
}

/** Mismo formato que las opciones de US-010: así el selector de unidad y conductor es `EntityPicker`. */
export type ScopeOption = { value: string; label: string; hint?: string }

/** Nombres de la ruta de un nodo, sin la raíz: «División Noreste › Departamento Monterrey». */
export function nodePathLabel(tree: OrgTree, nodeId: string): string {
  return pathOf(tree, nodeId)
    .slice(1)
    .map((id) => findNode(tree, id)?.name ?? id)
    .join(' › ')
}

/** Los nodos del árbol en orden de lectura: cada padre antes que sus hijos. */
function nodesInOrder(tree: OrgTree): OrgTree['nodes'] {
  const ordered: OrgTree['nodes'] = []
  const visit = (parentId: string | null) => {
    for (const node of tree.nodes) {
      if (node.parentId !== parentId) continue
      ordered.push(node)
      visit(node.id)
    }
  }
  visit(null)
  return ordered
}

export function scopeOptions(
  account: Account,
  kind: ScopeKind,
  orgPathOf?: (unitId: string) => string,
  orgTree?: OrgTree,
): ScopeOption[] {
  switch (kind) {
    case 'cuenta':
      return []
    case 'nodo':
      if (orgTree === undefined || orgTree.accountId !== account.id) return []
      // La pista dice el nivel y de dónde cuelga: el nombre ya va en la etiqueta.
      return nodesInOrder(orgTree).map((node) => {
        const parent = node.parentId === null ? '' : nodePathLabel(orgTree, node.parentId)
        return {
          value: node.id,
          label: node.name,
          hint:
            node.parentId === null
              ? 'Toda la empresa'
              : node.synthetic === true
                ? 'Unidades que no cuelgan de ningún nodo'
                : [levelName(orgTree, node.level), parent].filter((part) => part !== '').join(' · '),
        }
      })
    case 'centro_costo':
      return COST_CENTER_IDS.map((id) => ({ value: id, label: id }))
    case 'unidad':
      return fleetUnitsOf(account)
        .filter((unit) => unit.deregisteredAt === null)
        .map((unit) => ({
          value: unit.plate,
          label: unit.plate,
          // La ruta del organigrama (US-013) distingue dos unidades del mismo centro de costo.
          hint: orgPathOf ? `${orgPathOf(unit.id)} · ${unit.costCenter}` : unit.costCenter,
        }))
    case 'conductor':
      return fleetDriversOf(account).map((driver) => ({ value: driver.id, label: driver.name, hint: driver.id }))
  }
}

// ── Periodo ──────────────────────────────────────────────────────────────

/** Rango de fechas ISO, ambos días incluidos. */
export type PeriodRange = { from: string; to: string }

/** Identificador de un atajo: `sep-2026`, `t3-2026`, `12-meses`. */
export type PeriodPreset = string

/** Un atajo o un rango libre. */
export type ReportPeriod = PeriodPreset | PeriodRange

export type PeriodSpec = { id: PeriodPreset; label: string; from: string; to: string }

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MONTH_IDS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const QUARTER_NAMES = ['Primer', 'Segundo', 'Tercer', 'Cuarto']

const pad2 = (n: number) => String(n).padStart(2, '0')
const lastDay = (year: number, month: number) => new Date(year, month, 0).getDate()

function monthSpec(year: number, month: number): PeriodSpec {
  return {
    id: `${MONTH_IDS[month - 1]}-${year}`,
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(lastDay(year, month))}`,
  }
}

function quarterSpec(year: number, quarter: number): PeriodSpec {
  const first = (quarter - 1) * 3 + 1
  return {
    id: `t${quarter}-${year}`,
    label: `${QUARTER_NAMES[quarter - 1]} trimestre ${year}`,
    from: `${year}-${pad2(first)}-01`,
    to: `${year}-${pad2(first + 2)}-${pad2(lastDay(year, first + 2))}`,
  }
}

/** Los doce meses de datos, del más reciente al más antiguo. */
export const MONTH_PERIODS: PeriodSpec[] = Array.from({ length: 12 }, (_, i) => {
  const date = new Date(2026, 8 - i, 1)
  return monthSpec(date.getFullYear(), date.getMonth() + 1)
})

export const QUARTER_PERIODS: PeriodSpec[] = [quarterSpec(2026, 3), quarterSpec(2026, 2), quarterSpec(2026, 1), quarterSpec(2025, 4)]

/** Los doce meses que acaban el último día con datos (Ticket Car+: la víspera de la fecha de demo). */
export const YEAR_PERIOD: PeriodSpec = (() => {
  const [y, m, d] = COVERAGE.to.split('-').map(Number)
  const start = new Date(y! - 1, m! - 1, d! + 1)
  return { id: '12-meses', label: 'Últimos 12 meses', from: `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-${pad2(start.getDate())}`, to: COVERAGE.to }
})()

export const PERIODS: PeriodSpec[] = [...MONTH_PERIODS, ...QUARTER_PERIODS, YEAR_PERIOD]

/**
 * Periodo con el que abre la pantalla: el mes de «hoy» (reloj de negocio), o
 * el más cercano con datos si «hoy» cae fuera de ellos.
 */
export function defaultPeriodRange(now: number): PeriodRange {
  const date = new Date(now)
  const month = monthSpec(date.getFullYear(), date.getMonth() + 1)
  if (month.to < COVERAGE.from) return { from: MONTH_PERIODS[MONTH_PERIODS.length - 1]!.from, to: MONTH_PERIODS[MONTH_PERIODS.length - 1]!.to }
  if (month.from > COVERAGE.to) return { from: MONTH_PERIODS[0]!.from, to: MONTH_PERIODS[0]!.to }
  // El mes en curso, hasta el último día cerrado: lo que va de mes.
  return { from: month.from, to: month.to < COVERAGE.to ? month.to : COVERAGE.to }
}

export type ResolvedPeriod = { from: number; to: number; fromIso: string; toIso: string; days: number; label: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** El atajo que coincide con un rango, si lo hay. */
export function presetOf(range: PeriodRange): PeriodSpec | undefined {
  return PERIODS.find((p) => p.from === range.from && p.to === range.to)
}

export function periodRangeOf(period: ReportPeriod): PeriodRange | null {
  if (typeof period !== 'string') return period
  const spec = PERIODS.find((p) => p.id === period)
  return spec ? { from: spec.from, to: spec.to } : null
}

export function resolvePeriod(period: ReportPeriod): ResolvedPeriod | { error: string } {
  const range = periodRangeOf(period)
  if (range === null || !ISO_DATE.test(range.from) || !ISO_DATE.test(range.to)) {
    return { error: 'Elige un periodo: un atajo o un rango de fechas.' }
  }
  if (range.from > range.to) return { error: 'La fecha de inicio va después de la de fin.' }
  if (range.to < COVERAGE.from || range.from > COVERAGE.to) {
    return { error: `No hay datos de ese periodo: las fuentes cubren ${rangeText(COVERAGE.from, COVERAGE.to)}.` }
  }
  const [fy, fm, fd] = range.from.split('-').map(Number)
  const [ty, tm, td] = range.to.split('-').map(Number)
  const from = new Date(fy!, fm! - 1, fd!).getTime()
  const to = new Date(ty!, tm! - 1, td! + 1).getTime() - 1
  const free = rangeText(range.from, range.to)
  return {
    from,
    to,
    fromIso: range.from,
    toIso: range.to,
    days: Math.round((to + 1 - from) / 86_400_000),
    label: presetOf(range)?.label ?? free.charAt(0).toUpperCase() + free.slice(1),
  }
}

// ── Construcción ─────────────────────────────────────────────────────────

export type ReportRequest = {
  type: ReportType
  scope: ReportScope
  period: ReportPeriod
}

/** Lo que la sesión aporta además de la petición. */
export type ReportContext = {
  /** Organigrama vigente de la cuenta (US-013). Necesario con alcance «nodo». */
  orgTree?: OrgTree
}

export type BreakdownRow = {
  id: string
  label: string
  dispatches: number
  liters: number
  amountMxn: number
  /** $/L medio. `null` sin litros. */
  mxnPerLiter: number | null
  /** Litros de Autoconsumo sobre el total de la fila, en [0, 1]. */
  autoconsumoShare: number
}

export type ConsolidatedReport = {
  request: ReportRequest
  account: Account
  scopeLabel: string
  periodLabel: string
  periodRange: PeriodRange
  /** Lo que falta en el periodo: días fuera de los datos o huecos de una fuente. */
  coverage: CoverageWarning[]
  generatedAt: number
  generatedBy: string
  kpis: {
    amountMxn: number
    liters: number
    dispatches: number
    mxnPerLiter: number | null
    units: number
    drivers: number
    bySource: Record<FuelProduct, { liters: number; amountMxn: number; dispatches: number }>
  }
  /** Todas las filas; el tipo de reporte decide cuántas se publican. */
  byUnit: BreakdownRow[]
  byDriver: BreakdownRow[]
  /**
   * Litros por mes y fuente — Ticket Car+. Muestra la estacionalidad y los
   * huecos: un mes que una fuente (o una planta del alcance) no entregó es
   * `null` («Sin datos de … para este periodo»), nunca cero ni un valor
   * interpolado. Si solo faltan unos días, lleva `incomplete`.
   */
  byMonth: MonthRow[]
}

export type MonthRow = {
  /** `YYYY-MM`. */
  month: string
  /** «feb 2026». */
  label: string
  bySource: Record<FuelProduct, { liters: number | null; incomplete: boolean }>
}

const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function nextIsoDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y!, m! - 1, d! + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Meses del periodo con los litros de cada fuente; los días sin datos de una fuente salen de los avisos de cobertura. */
function monthRows(
  dispatches: readonly Dispatch[],
  fromIso: string,
  toIso: string,
  coverage: readonly CoverageWarning[],
  /** Plantas que tienen unidades dentro del alcance: el hueco de una planta ajena no vacía el mes. */
  scopePlants: ReadonlySet<string>,
): MonthRow[] {
  const sources = Object.keys(FUEL_PRODUCT_LABELS) as FuelProduct[]
  const missing = (source: FuelProduct, day: string) =>
    coverage.some(
      (w) =>
        (w.kind === 'fuera_de_cobertura' || (w.source === source && (w.plant === null || scopePlants.has(w.plant)))) &&
        day >= w.from &&
        day <= w.to,
    )
  const months = new Map<string, { days: number; missing: Record<FuelProduct, number>; liters: Record<FuelProduct, number> }>()
  for (let day = fromIso; day <= toIso; day = nextIsoDay(day)) {
    const key = day.slice(0, 7)
    const month = months.get(key) ?? { days: 0, missing: { autoconsumo: 0, ticketcar_plus: 0 }, liters: { autoconsumo: 0, ticketcar_plus: 0 } }
    month.days += 1
    for (const source of sources) if (missing(source, day)) month.missing[source] += 1
    months.set(key, month)
  }
  for (const d of dispatches) {
    const month = months.get(isoOfTime(d.at).slice(0, 7))
    if (month) month.liters[d.source] += d.liters
  }
  return [...months].map(([key, month]) => ({
    month: key,
    label: `${MONTH_LABELS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`,
    bySource: Object.fromEntries(
      sources.map((source) => [
        source,
        {
          liters: month.missing[source] === month.days ? null : month.liters[source],
          incomplete: month.missing[source] > 0 && month.missing[source] < month.days,
        },
      ]),
    ) as MonthRow['bySource'],
  }))
}

function breakdown(dispatches: Dispatch[], keyOf: (d: Dispatch) => string, labelOf: (key: string) => string): BreakdownRow[] {
  const rows = new Map<string, { n: number; liters: number; amount: number; auto: number }>()
  for (const d of dispatches) {
    const key = keyOf(d)
    const row = rows.get(key) ?? { n: 0, liters: 0, amount: 0, auto: 0 }
    row.n += 1
    row.liters += d.liters
    row.amount += d.amountMxn
    if (d.source === 'autoconsumo') row.auto += d.liters
    rows.set(key, row)
  }
  return [...rows.entries()]
    .map(([id, r]) => ({
      id,
      label: labelOf(id),
      dispatches: r.n,
      liters: r.liters,
      amountMxn: r.amount,
      mxnPerLiter: r.liters > 0 ? r.amount / r.liters : null,
      autoconsumoShare: r.liters > 0 ? r.auto / r.liters : 0,
    }))
    .sort((a, b) => b.amountMxn - a.amountMxn)
}

export const NO_DRIVER_KEY = 'sin_conductor'

/** Petición validada: cuenta, periodo y filtro de alcance ya resueltos. */
export type PreparedReport = {
  request: ReportRequest
  account: Account
  period: ResolvedPeriod
  scopeLabel: string
  inScope: (dispatch: Dispatch) => boolean
}

export function prepareReport(
  request: ReportRequest,
  principal: ReportPrincipal,
  context: ReportContext = {},
): PreparedReport | { error: string } {
  const account = reportableAccounts(principal).find((a) => a.id === request.scope.accountId)
  if (account === undefined) {
    return { error: 'Esa cuenta queda fuera de tu alcance: el reporte solo se genera sobre cuentas que tu rol puede ver.' }
  }
  const { kind, value } = request.scope
  if (kind !== 'cuenta' && (value === null || value === '')) {
    return { error: `Elige ${SCOPE_LABELS[kind].toLowerCase()} para acotar el reporte.` }
  }
  const period = resolvePeriod(request.period)
  if ('error' in period) return period

  // Alcance de la sesión (ADR-TCP-001): un usuario acotado a un nodo solo ve
  // las unidades de su subárbol, y eso se cruza con el alcance que pida.
  const sessionPlates = sessionPlatesOf(account, principal, context.orgTree)
  if (sessionPlates === 'sin_arbol') return { error: 'El organigrama de la cuenta no está disponible en tu sesión.' }
  const prepared = scopeOf(request, account, period, context)
  if ('error' in prepared) return prepared
  if (sessionPlates === null) return prepared
  // El rótulo lo dice: «Cuenta completa» sería falso para quien solo ve un nodo.
  const sessionNode = findNode(context.orgTree!, principal.scopeNodeId!)?.name ?? ''
  const scopeLabel =
    request.scope.kind === 'cuenta' ? `Alcance de tu usuario: ${sessionNode}` : `${prepared.scopeLabel} · dentro de ${sessionNode}`
  return { ...prepared, scopeLabel, inScope: (d) => sessionPlates.has(d.plate) && prepared.inScope(d) }
}

/** Placas del subárbol de la sesión, `null` sin alcance. */
function sessionPlatesOf(account: Account, principal: ReportPrincipal, tree: OrgTree | undefined): Set<string> | null | 'sin_arbol' {
  if (principal.scopeNodeId === null) return null
  if (tree === undefined || tree.accountId !== account.id) return 'sin_arbol'
  const node = principal.scopeNodeId
  return new Set(
    fleetUnitsOf(account)
      .filter((unit) => unitPathOf(tree, unit.id).includes(node))
      .map((unit) => unit.plate),
  )
}

function scopeOf(
  request: ReportRequest,
  account: Account,
  period: ResolvedPeriod,
  context: ReportContext,
): PreparedReport | { error: string } {
  const { kind, value } = request.scope
  const base = { request, account, period }
  switch (kind) {
    case 'cuenta':
      return { ...base, scopeLabel: 'Cuenta completa', inScope: () => true }
    case 'nodo': {
      // El árbol es el de la sesión, que solo trae cuentas del alcance; aun así
      // se comprueba que sea el de ESTA cuenta y que el nodo siga en él.
      const tree = context.orgTree
      if (tree === undefined || tree.accountId !== account.id) {
        return { error: 'El organigrama de esa cuenta no está disponible en tu sesión.' }
      }
      const node = findNode(tree, value!)
      if (node === undefined) return { error: 'Ese nodo ya no está en el organigrama de la cuenta.' }
      const plates = new Set(
        fleetUnitsOf(account)
          .filter((unit) => unitPathOf(tree, unit.id).includes(node.id))
          .map((unit) => unit.plate),
      )
      const path = node.parentId === null ? node.name : nodePathLabel(tree, node.id)
      return { ...base, scopeLabel: `${SCOPE_LABELS.nodo}: ${path}`, inScope: (d) => plates.has(d.plate) }
    }
    case 'centro_costo':
      return { ...base, scopeLabel: `${SCOPE_LABELS.centro_costo}: ${value}`, inScope: (d) => d.costCenter === value }
    case 'unidad':
      return { ...base, scopeLabel: `${SCOPE_LABELS.unidad}: ${value}`, inScope: (d) => d.plate === value }
    case 'conductor': {
      const name = fleetDriversOf(account).find((d) => d.id === value)?.name ?? value
      return { ...base, scopeLabel: `Conductor: ${name}`, inScope: (d) => d.driverId === value }
    }
  }
}

/** Las cuentas, sobre los despachos ya unificados de TODA la cuenta. */
export function computeReport(
  prepared: PreparedReport,
  accountDispatches: readonly Dispatch[],
  principal: ReportPrincipal,
  now: number,
): ConsolidatedReport {
  const { account, period } = prepared
  const dispatches = accountDispatches.filter((d) => d.at >= period.from && d.at <= period.to && prepared.inScope(d))

  const units = fleetUnitsOf(account)
  const drivers = new Map(fleetDriversOf(account).map((d) => [d.id, d.name]))
  const plateInfo = new Map(units.map((u) => [u.plate, u]))

  const bySource: ConsolidatedReport['kpis']['bySource'] = {
    autoconsumo: { liters: 0, amountMxn: 0, dispatches: 0 },
    ticketcar_plus: { liters: 0, amountMxn: 0, dispatches: 0 },
  }
  let liters = 0
  let amount = 0
  for (const d of dispatches) {
    liters += d.liters
    amount += d.amountMxn
    bySource[d.source].liters += d.liters
    bySource[d.source].amountMxn += d.amountMxn
    bySource[d.source].dispatches += 1
  }

  const coverage = coverageWarnings(accountDispatches, period.fromIso, period.toIso)
  return {
    request: prepared.request,
    account,
    scopeLabel: prepared.scopeLabel,
    periodLabel: period.label,
    periodRange: { from: period.fromIso, to: period.toIso },
    coverage,
    byMonth: monthRows(
      dispatches,
      period.fromIso,
      period.toIso,
      coverage,
      new Set(accountDispatches.filter((d) => d.plant !== null && prepared.inScope(d)).map((d) => d.plant!)),
    ),
    generatedAt: now,
    generatedBy: principal.name,
    kpis: {
      amountMxn: amount,
      liters,
      dispatches: dispatches.length,
      mxnPerLiter: liters > 0 ? amount / liters : null,
      units: new Set(dispatches.map((d) => d.plate)).size,
      drivers: new Set(dispatches.map((d) => d.driverId).filter((id) => id !== null)).size,
      bySource,
    },
    byUnit: breakdown(
      dispatches,
      (d) => d.plate,
      (plate) => {
        const unit = plateInfo.get(plate)
        return unit ? `${plate} · ${unit.costCenter}` : plate
      },
    ),
    byDriver: breakdown(
      dispatches,
      (d) => d.driverId ?? NO_DRIVER_KEY,
      (id) => (id === NO_DRIVER_KEY ? 'Sin conductor registrado' : drivers.get(id) ?? id),
    ),
  }
}

/** Todo de una vez: validar, extraer, unificar y calcular. */
export function buildConsolidatedReport(
  request: ReportRequest,
  principal: ReportPrincipal,
  now: number,
  context: ReportContext = {},
): ConsolidatedReport | { error: string } {
  const prepared = prepareReport(request, principal, context)
  if ('error' in prepared) return prepared
  return computeReport(prepared, normalizeSources(sourcesOf(prepared.account), COST_CENTER_IDS), principal, now)
}

export function publishedRows(report: ConsolidatedReport): { units: BreakdownRow[]; drivers: BreakdownRow[] } {
  const spec = REPORT_TYPES.find((t) => t.id === report.request.type)!
  return {
    units: spec.unitRows === null ? report.byUnit : report.byUnit.slice(0, spec.unitRows),
    drivers: spec.driverRows === null ? report.byDriver : report.byDriver.slice(0, spec.driverRows),
  }
}

export const SOURCE_LABEL = FUEL_PRODUCT_LABELS
