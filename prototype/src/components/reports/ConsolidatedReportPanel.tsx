/**
 * Consolidated report on demand (eOne US-024), rebuilt with Ticket Car's components.
 *
 * Autoconsumo and TicketCar+ in one document, with the type, scope and period the user picks, generated in visible
 * steps and previewed in a sandboxed frame. Exporting (CSV, XLSX, PDF) is `consumos.export`: finanzas and admin can,
 * consulta and flota only preview (ADR-TCP-001).
 *
 * TODO SLA: the maximum generation time is still undecided (≤30 s against ≤10 s). The screen shows the measured
 * time and holds no target.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { can } from '../../data/access';
import { clientAccount, clientOrgTree, scopeLabel } from '../../data/client';
import { reportPrincipal, reportScopeOptions } from '../../data/consolidatedReport';
import { sessionPrincipal } from '../../data/session';
import {
  MONTH_PERIODS,
  QUARTER_PERIODS,
  REPORT_TYPES,
  SCOPE_LABELS,
  TEMPLATE_NOTICE,
  YEAR_PERIOD,
  defaultPeriodRange,
  type ConsolidatedReport,
  type PeriodRange,
  type ReportType,
  type ScopeKind,
} from '../../domain/consolidated-report/build';
import { rangeText } from '../../domain/consolidated-report/coverage';
import { downloadBlob, fileBaseName, reportToCsv, reportToXlsx } from '../../domain/consolidated-report/export';
import { GENERATION_STEPS, generateReport } from '../../domain/consolidated-report/pipeline';
import { COVERAGE } from '../../domain/consolidated-report/sources';
import { businessNow } from '../../domain/demo/clock';
import { DownloadIcon, FileTextIcon } from '../icons/Icons';
import { EmptyState } from '../ui/EmptyState';
import '../limits/PolicyDialog.css';
import './ConsolidatedReportPanel.css';

type Phase =
  | { kind: 'idle' }
  | { kind: 'generating'; step: number }
  | { kind: 'ready'; report: ConsolidatedReport; html: string; elapsedMs: number }
  | { kind: 'error'; message: string };

const SCOPE_KINDS: ScopeKind[] = ['cuenta', 'nodo', 'centro_costo', 'unidad', 'conductor'];

const PERIOD_SHORTCUTS = [...MONTH_PERIODS, ...QUARTER_PERIODS, YEAR_PERIOD];

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

const seconds = (ms: number): string => (ms / 1000).toFixed(ms < 1000 ? 2 : 1);

export function ConsolidatedReportPanel() {
  const principal = sessionPrincipal();
  const canExport = can(principal, 'consumos.export', 'escribir');
  const [type, setType] = useState<ReportType>('ejecutivo');
  const [kind, setKind] = useState<ScopeKind>('cuenta');
  const [value, setValue] = useState('');
  const [range, setRange] = useState<PeriodRange>(() => defaultPeriodRange(businessNow()));
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [pdf, setPdf] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  // Each generation has its number: a newer one, or leaving the page, silences the older one.
  const run = useRef(0);

  useEffect(
    () => () => {
      run.current += 1;
    },
    [],
  );

  const options = useMemo(() => reportScopeOptions(kind), [kind]);
  const generating = phase.kind === 'generating';
  const typeSpec = REPORT_TYPES.find((candidate) => candidate.id === type)!;
  const shortcut = PERIOD_SHORTCUTS.find((period) => period.from === range.from && period.to === range.to)?.id ?? '';

  const generate = async () => {
    const mine = ++run.current;
    setPdf({ busy: false, error: null });
    setPhase({ kind: 'generating', step: 0 });
    const result = await generateReport(
      { type, period: range, scope: { accountId: clientAccount.id, kind, value: kind === 'cuenta' ? null : value } },
      reportPrincipal(),
      businessNow(),
      { orgTree: clientOrgTree },
      (step) => {
        if (run.current === mine) setPhase({ kind: 'generating', step });
      },
    );
    if (run.current !== mine) return;
    setPhase('error' in result ? { kind: 'error', message: result.error } : { kind: 'ready', ...result });
  };

  const downloadPdf = async (report: ConsolidatedReport) => {
    setPdf({ busy: true, error: null });
    try {
      // jsPDF is only downloaded the first time someone asks for a PDF.
      const { reportToPdf } = await import('../../domain/consolidated-report/pdf');
      downloadBlob(await reportToPdf(report), 'application/pdf', `${fileBaseName(report)}.pdf`);
      setPdf({ busy: false, error: null });
    } catch {
      setPdf({ busy: false, error: 'No se pudo componer el PDF. Vuelve a intentarlo o descarga el XLSX.' });
    }
  };

  return (
    <div className="consolidated">
      <p className="consolidated__notice">
        <strong>Plantillas provisionales.</strong> {TEMPLATE_NOTICE}
      </p>

      <div className="consolidated__form">
        <label className="policy-form__field">
          <span>Tipo de reporte</span>
          <select value={type} disabled={generating} onChange={(event) => setType(event.target.value as ReportType)}>
            {REPORT_TYPES.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.label}
              </option>
            ))}
          </select>
          <small>{typeSpec.description}</small>
        </label>

        <label className="policy-form__field">
          <span>Alcance</span>
          <select
            value={kind}
            disabled={generating}
            onChange={(event) => {
              setKind(event.target.value as ScopeKind);
              setValue('');
            }}
          >
            {SCOPE_KINDS.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate === 'cuenta' && principal.scopeNodeId !== null ? `Todo ${scopeLabel(principal.scopeNodeId)}` : SCOPE_LABELS[candidate]}
              </option>
            ))}
          </select>
          <small>
            {principal.scopeNodeId === null
              ? clientAccount.name
              : `Tu usuario está acotado a ${scopeLabel(principal.scopeNodeId)}: el reporte no sale de ahí.`}
          </small>
        </label>

        {kind !== 'cuenta' && (
          <label className="policy-form__field">
            <span>{SCOPE_LABELS[kind]}</span>
            <select value={value} disabled={generating} onChange={(event) => setValue(event.target.value)}>
              <option value="" disabled>
                Elige {SCOPE_LABELS[kind].toLowerCase()} · {decimal.format(options.length)} opciones
              </option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {option.hint ? ` · ${option.hint}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="policy-form__field">
          <span>Periodo</span>
          <select
            value={shortcut}
            disabled={generating}
            onChange={(event) => {
              const period = PERIOD_SHORTCUTS.find((candidate) => candidate.id === event.target.value);
              if (period) setRange({ from: period.from, to: period.to });
            }}
          >
            <option value="">Rango de fechas</option>
            {PERIOD_SHORTCUTS.map((period) => (
              <option key={period.id} value={period.id}>
                {period.label}
              </option>
            ))}
          </select>
          <small>Datos disponibles {rangeText(COVERAGE.from, COVERAGE.to)}.</small>
        </label>

        <div className="consolidated__dates">
          <label className="policy-form__field">
            <span>Desde</span>
            <input
              type="date"
              value={range.from}
              min={COVERAGE.from}
              max={COVERAGE.to}
              disabled={generating}
              onChange={(event) => event.target.value && setRange((current) => ({ ...current, from: event.target.value }))}
            />
          </label>
          <label className="policy-form__field">
            <span>Hasta</span>
            <input
              type="date"
              value={range.to}
              min={COVERAGE.from}
              max={COVERAGE.to}
              disabled={generating}
              onChange={(event) => event.target.value && setRange((current) => ({ ...current, to: event.target.value }))}
            />
          </label>
        </div>

        <div className="consolidated__actions">
          <button
            type="button"
            className="btn btn--primary"
            disabled={generating || (kind !== 'cuenta' && value === '')}
            onClick={generate}
          >
            <FileTextIcon width={15} height={15} />
            {generating ? 'Generando…' : 'Generar reporte'}
          </button>
        </div>
      </div>

      {phase.kind === 'generating' && (
        <ol className="consolidated__steps" aria-label="Progreso de la generación">
          {GENERATION_STEPS.map((step, index) => (
            <li key={step} className={index < phase.step ? 'is-done' : index === phase.step ? 'is-active' : ''}>
              {step}
            </li>
          ))}
        </ol>
      )}

      {phase.kind === 'error' && (
        <p className="consolidated__error" role="alert">
          {phase.message}
        </p>
      )}

      {phase.kind === 'idle' && (
        <EmptyState
          compact
          icon={<FileTextIcon width={22} height={22} />}
          title="Elige tipo, alcance y periodo, y genera el reporte"
          description="Consolida las cargas de Autoconsumo y de TicketCar+ en un mismo documento con KPIs y desglose por unidad y por conductor."
        />
      )}

      {phase.kind === 'ready' && (
        <section className="consolidated__result" aria-label="Reporte generado">
          <header className="consolidated__result-head">
            <div>
              <p className="consolidated__result-title">
                {phase.report.scopeLabel} · {phase.report.periodLabel}
              </p>
              <p className="consolidated__result-meta">
                {money.format(phase.report.kpis.amountMxn)} · {decimal.format(phase.report.kpis.liters)} L ·{' '}
                {decimal.format(phase.report.kpis.dispatches)} cargas · generado en {seconds(phase.elapsedMs)} s
              </p>
            </div>
            {canExport ? (
              <div className="consolidated__downloads">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => downloadBlob(reportToCsv(phase.report), 'text/csv;charset=utf-8', `${fileBaseName(phase.report)}.csv`)}
                >
                  <DownloadIcon width={14} height={14} />
                  CSV
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() =>
                    downloadBlob(
                      reportToXlsx(phase.report),
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                      `${fileBaseName(phase.report)}.xlsx`,
                    )
                  }
                >
                  <DownloadIcon width={14} height={14} />
                  XLSX
                </button>
                <button type="button" className="btn btn--secondary btn--sm" disabled={pdf.busy} onClick={() => downloadPdf(phase.report)}>
                  <DownloadIcon width={14} height={14} />
                  {pdf.busy ? 'Componiendo PDF…' : 'PDF'}
                </button>
              </div>
            ) : (
              <p className="consolidated__no-export">Tu rol puede ver el reporte, pero no exportarlo.</p>
            )}
          </header>

          {phase.report.coverage.length > 0 && (
            <ul className="consolidated__coverage">
              {phase.report.coverage.map((warning) => (
                <li key={warning.message}>{warning.message}</li>
              ))}
            </ul>
          )}
          {pdf.error && (
            <p className="consolidated__error" role="alert">
              {pdf.error}
            </p>
          )}

          <iframe
            className="consolidated__frame"
            title={`Reporte: ${phase.report.scopeLabel}`}
            srcDoc={phase.html}
            sandbox=""
          />
        </section>
      )}
    </div>
  );
}
