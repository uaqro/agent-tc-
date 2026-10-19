// US-024
/**
 * EP-04 · US-024 — El documento: portada, índice, KPIs y desgloses.
 * ════════════════════════════════════════════════════════════════
 * HTML autocontenido, con su propia hoja de estilos y sin un solo script. Se
 * enseña en el MISMO marco aislado que los reportes de US-092 (`ReportFrame`:
 * `iframe` con `sandbox` vacío). El PDF (`pdf.ts`) lleva el mismo contenido.
 *
 * Todo texto que sale de los datos pasa por `escapeHtml`: nombres de unidad,
 * de conductor y de cuenta no se insertan nunca tal cual.
 */
import { REPORT_TYPES, SOURCE_LABEL, TEMPLATE_NOTICE, publishedRows, type BreakdownRow, type ConsolidatedReport } from './build'

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const moneyPrecise = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })
const pct = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 })
const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' })

function table(rows: BreakdownRow[], firstHeader: string, total: number): string {
  const body = rows
    .map(
      (row) => `<tr>
  <td>${escapeHtml(row.label)}</td>
  <td class="n">${number.format(row.dispatches)}</td>
  <td class="n">${number.format(row.liters)}</td>
  <td class="n">${money.format(row.amountMxn)}</td>
  <td class="n">${row.mxnPerLiter === null ? '—' : moneyPrecise.format(row.mxnPerLiter)}</td>
  <td class="n">${pct.format(row.autoconsumoShare)}</td>
</tr>`,
    )
    .join('\n')
  const note =
    rows.length < total ? `<p class="note">Se muestran ${rows.length} de ${total}, de mayor a menor gasto.</p>` : ''
  return `<table>
<thead><tr><th>${firstHeader}</th><th class="n">Cargas</th><th class="n">Litros</th><th class="n">Gasto</th><th class="n">$/L</th><th class="n">% Autoconsumo</th></tr></thead>
<tbody>
${body || '<tr><td colspan="6">Sin despachos en el alcance.</td></tr>'}
</tbody>
</table>${note}`
}

/** Litros por mes y fuente. Un mes sin datos de una fuente dice «Sin datos»: ni cero ni interpolado. */
function monthTable(report: ConsolidatedReport): string {
  const cell = (source: 'autoconsumo' | 'ticketcar_plus', value: { liters: number | null; incomplete: boolean }) =>
    value.liters === null
      ? `<td class="n gap">Sin datos de ${SOURCE_LABEL[source]} para este periodo</td>`
      : `<td class="n">${number.format(value.liters)}${value.incomplete ? ' <span class="note">(incompleto)</span>' : ''}</td>`
  const body = report.byMonth
    .map((row) => `<tr><td>${row.label}</td>${cell('autoconsumo', row.bySource.autoconsumo)}${cell('ticketcar_plus', row.bySource.ticketcar_plus)}</tr>`)
    .join('\n')
  return `<table>
<thead><tr><th>Mes</th><th class="n">${SOURCE_LABEL.autoconsumo} (L)</th><th class="n">${SOURCE_LABEL.ticketcar_plus} (L)</th></tr></thead>
<tbody>
${body}
</tbody>
</table>
<p class="note">Litros de todo el alcance. «Sin datos» es un mes que la fuente, o una de sus plantas dentro del alcance, no entregó: no se cuenta como cero ni se interpola.</p>`
}

/** Lo que falta en el periodo, en la portada: quien lee el reporte lo ve antes que las cifras. */
function coverageBlock(report: ConsolidatedReport): string {
  if (report.coverage.length === 0) return ''
  const items = report.coverage.map((w) => `<li>${escapeHtml(w.message)}</li>`).join('')
  return `  <div class="warn" role="note"><strong>Datos incompletos en el periodo</strong><ul>${items}</ul></div>`
}

export function renderReportHtml(report: ConsolidatedReport): string {
  const spec = REPORT_TYPES.find((t) => t.id === report.request.type)!
  const { units, drivers } = publishedRows(report)
  const k = report.kpis
  const title = `Reporte consolidado · ${spec.label}`

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} — ${escapeHtml(report.account.name)}</title>
<style>
  body { font-family: Ubuntu, "Segoe UI", Arial, sans-serif; color: #1d2433; margin: 0; padding: 32px 40px; line-height: 1.45; }
  h1 { font-size: 28px; margin: 0 0 8px; }
  h2 { font-size: 20px; margin: 32px 0 12px; border-bottom: 2px solid #e4e7ee; padding-bottom: 6px; }
  .cover { min-height: 70vh; display: flex; flex-direction: column; justify-content: center; border-left: 6px solid #e2001a; padding-left: 24px; }
  .cover dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin-top: 24px; }
  .cover dt { color: #5b6477; }
  .warn { background: #fdecec; color: #8a1c1c; border-left: 4px solid #c62828; border-radius: 4px; padding: 8px 12px; margin-top: 16px; font-size: 13px; }
  .warn ul { margin: 4px 0 0; padding-left: 18px; }
  .tag { display: inline-block; background: #fff4d6; color: #7a5600; border-radius: 4px; padding: 4px 8px; font-size: 13px; margin-top: 16px; }
  .toc ol { padding-left: 20px; }
  .toc a { color: #1d4ed8; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
  .kpi { border: 1px solid #e4e7ee; border-radius: 8px; padding: 12px; }
  .kpi span { display: block; font-size: 12px; color: #5b6477; }
  .kpi strong { font-size: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e4e7ee; text-align: left; }
  th { background: #f4f6fa; }
  .n { text-align: right; font-variant-numeric: tabular-nums; }
  .note { font-size: 12px; color: #5b6477; }
  .gap { color: #8a1c1c; font-style: italic; background: repeating-linear-gradient(45deg, #fdecec, #fdecec 4px, #fff 4px, #fff 8px); }
  section { page-break-before: always; }
  @media print { body { padding: 0 12mm; } .cover { min-height: 90vh; } }
</style>
</head>
<body>
<div class="cover">
  <h1>${escapeHtml(title)}</h1>
  <div>${escapeHtml(report.account.name)}</div>
  <dl>
    <dt>Alcance</dt><dd>${escapeHtml(report.scopeLabel)}</dd>
    <dt>Periodo</dt><dd>${escapeHtml(report.periodLabel)}</dd>
    <dt>Fuentes</dt><dd>${SOURCE_LABEL.autoconsumo} + ${SOURCE_LABEL.ticketcar_plus}</dd>
    <dt>Generado</dt><dd>${dateTime.format(report.generatedAt)} por ${escapeHtml(report.generatedBy)}</dd>
  </dl>
${coverageBlock(report)}
  <div class="tag">${escapeHtml(TEMPLATE_NOTICE)}</div>
  <p class="note">Edenred One Mobility · prototipo con datos mock.</p>
</div>

<section class="toc" id="indice">
  <h2>Índice</h2>
  <ol>
    <li><a href="#kpis">KPIs ejecutivos</a></li>
    <li><a href="#unidades">Desglose por unidad</a></li>
    <li><a href="#conductores">Desglose por conductor</a></li>
    <li><a href="#meses">Evolución mensual</a></li>
  </ol>
</section>

<section id="kpis">
  <h2>1. KPIs ejecutivos</h2>
  <div class="kpis">
    <div class="kpi"><span>Gasto total</span><strong>${money.format(k.amountMxn)}</strong></div>
    <div class="kpi"><span>Litros</span><strong>${number.format(k.liters)}</strong></div>
    <div class="kpi"><span>Cargas</span><strong>${number.format(k.dispatches)}</strong></div>
    <div class="kpi"><span>Precio medio por litro</span><strong>${k.mxnPerLiter === null ? '—' : moneyPrecise.format(k.mxnPerLiter)}</strong></div>
    <div class="kpi"><span>Unidades con carga</span><strong>${number.format(k.units)}</strong></div>
    <div class="kpi"><span>Conductores</span><strong>${number.format(k.drivers)}</strong></div>
    <div class="kpi"><span>${SOURCE_LABEL.autoconsumo}</span><strong>${number.format(k.bySource.autoconsumo.liters)} L</strong><span>${money.format(k.bySource.autoconsumo.amountMxn)} · ${number.format(k.bySource.autoconsumo.dispatches)} cargas</span></div>
    <div class="kpi"><span>${SOURCE_LABEL.ticketcar_plus}</span><strong>${number.format(k.bySource.ticketcar_plus.liters)} L</strong><span>${money.format(k.bySource.ticketcar_plus.amountMxn)} · ${number.format(k.bySource.ticketcar_plus.dispatches)} cargas</span></div>
  </div>
</section>

<section id="unidades">
  <h2>2. Desglose por unidad</h2>
  ${table(units, 'Unidad', report.byUnit.length)}
</section>

<section id="conductores">
  <h2>3. Desglose por conductor</h2>
  ${table(drivers, 'Conductor', report.byDriver.length)}
</section>

<section id="meses">
  <h2>4. Evolución mensual</h2>
  ${monthTable(report)}
</section>
</body>
</html>`
}
