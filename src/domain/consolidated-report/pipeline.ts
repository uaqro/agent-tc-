// US-024
/**
 * EP-04 · US-024 — Generación por etapas, con el tiempo MEDIDO.
 * ════════════════════════════════════════════════════════════
 * Cada paso que la pantalla enseña es trabajo de verdad, y entre uno y otro
 * se cede el hilo para que el progreso se pinte. El tiempo que se devuelve es
 * el de reloj, de principio a fin: lo que el usuario esperó.
 *
 * TODO SLA: el tiempo máximo de generación sigue pendiente de decisión (≤30 s
 * frente a ≤10 s). Aquí no hay ningún objetivo: solo la medida.
 */
import { COST_CENTER_IDS } from '../datasource/active'
import type { ReportPrincipal } from './build'
import {
  computeReport,
  prepareReport,
  type ConsolidatedReport,
  type ReportContext,
  type ReportRequest,
} from './build'
import { renderReportHtml } from './document'
import { fromAutoconsumo, fromTicketCar, type Dispatch } from './normalize'
import { sourcesOf } from './sources'

export const GENERATION_STEPS = [
  'Extrayendo despachos de Autoconsumo',
  'Extrayendo transacciones de TicketCar+',
  'Unificando formatos',
  'Calculando KPIs y desgloses',
  'Componiendo el documento',
]

export type GeneratedReport = { report: ConsolidatedReport; html: string; elapsedMs: number }

/** Cede el hilo: la pantalla pinta el paso antes de que empiece. */
const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

export async function generateReport(
  request: ReportRequest,
  principal: ReportPrincipal,
  now: number,
  context: ReportContext = {},
  onStep: (step: number) => void = () => {},
): Promise<GeneratedReport | { error: string }> {
  const startedAt = performance.now()

  const prepared = prepareReport(request, principal, context)
  if ('error' in prepared) return prepared

  onStep(0)
  await yieldToUi()
  const sources = sourcesOf(prepared.account)
  const fromErp: Dispatch[] = sources.autoconsumo.map((row) => fromAutoconsumo(row, COST_CENTER_IDS))

  onStep(1)
  await yieldToUi()
  const fromNetwork: Dispatch[] = sources.ticketcar.map(fromTicketCar)

  onStep(2)
  await yieldToUi()
  const dispatches = [...fromErp, ...fromNetwork].sort((a, b) => a.at - b.at)

  onStep(3)
  await yieldToUi()
  const report = computeReport(prepared, dispatches, principal, now)

  onStep(4)
  await yieldToUi()
  const html = renderReportHtml(report)

  return { report, html, elapsedMs: performance.now() - startedAt }
}
