import { useState } from 'react';
import type { FundingRule, Receipt, ReceiptKind } from '../../types/dispersion';
import { CalendarIcon, ClockIcon, EyeIcon, PlayIcon } from '../icons/Icons';
import { formatCount, formatDateLong, formatDateTime, formatMoney } from '../../utils/format';
import { EmptyState } from '../ui/EmptyState';
import { ApiTag } from '../api/ApiCoverage';
import './ActivitySection.css';

export type ActivityTab = 'history' | 'scheduled';

interface ActivitySectionProps {
  receipts: Receipt[];
  scheduled: FundingRule[];
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
  onOpenReceipt: (receipt: Receipt) => void;
  onReviewPayment: (rule: FundingRule) => void;
  onRunPayment: (rule: FundingRule) => void;
}

const PAGE_SIZE = 6;

const KIND_META: Record<ReceiptKind, { label: string; chip: string }> = {
  rule: { label: 'Regla', chip: 'chip--info' },
  'one-off': { label: 'Puntual', chip: 'chip--review' },
  bulk: { label: 'Archivo', chip: 'chip--info' },
  cut: { label: 'Recorte', chip: 'chip--danger' },
};

export function ActivitySection({
  receipts,
  scheduled,
  activeTab,
  onTabChange,
  onOpenReceipt,
  onReviewPayment,
  onRunPayment,
}: ActivitySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? receipts : receipts.slice(0, PAGE_SIZE);

  return (
    <section className="activity" aria-labelledby="activity-title">
      <header className="activity__head">
        <h2 className="activity__title" id="activity-title">
          {activeTab === 'history' ? <ClockIcon width={17} height={17} /> : <CalendarIcon width={17} height={17} />}
          {activeTab === 'history' ? 'Últimas dispersiones' : 'Pagos programados'}
          <ApiTag id={activeTab === 'history' ? 'disp-history' : 'disp-scheduled'} />
        </h2>

        <div className="activity__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={activeTab === 'history' ? 'is-active' : ''}
            onClick={() => onTabChange('history')}
          >
            Últimas dispersiones
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'scheduled'}
            className={activeTab === 'scheduled' ? 'is-active' : ''}
            onClick={() => onTabChange('scheduled')}
          >
            Pagos programados ({scheduled.length})
          </button>
        </div>
      </header>

      <div className="activity__scroll">
        {activeTab === 'history' && receipts.length === 0 ? (
          <EmptyState
            icon={<ClockIcon width={22} height={22} />}
            title="Aún no hay dispersiones"
            description="Cada corrida, envío puntual, carga masiva o recorte queda registrado aquí con su comprobante."
            actions={
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => onTabChange('scheduled')}>
                <CalendarIcon width={14} height={14} />
                Ver pagos programados
              </button>
            }
          />
        ) : activeTab === 'scheduled' && scheduled.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon width={22} height={22} />}
            title="No hay pagos programados"
            description="Las automatizaciones activas aparecen aquí con su fecha y monto proyectado. Crea una o reactiva las que estén pausadas."
          />
        ) : activeTab === 'history' ? (
          <table className="activity__table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Tipo</th>
                <th scope="col">Origen</th>
                <th scope="col">Unidades</th>
                <th scope="col">Monto</th>
                <th scope="col">
                  <span className="visually-hidden">Comprobante</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((receipt) => {
                const meta = KIND_META[receipt.kind];
                return (
                  <tr key={receipt.folio}>
                    <td>{formatDateTime(new Date(receipt.issuedAt))}</td>
                    <td>
                      <span className={`chip ${meta.chip}`}>{meta.label}</span>
                    </td>
                    <td>
                      <span className="activity__source">{receipt.sourceLabel}</span>
                      <span className="activity__scope">{receipt.scopeLabel}</span>
                    </td>
                    <td>{formatCount(receipt.units)}</td>
                    <td
                      className={
                        receipt.totalMXN < 0 ? 'activity__amount activity__amount--negative' : 'activity__amount'
                      }
                    >
                      {receipt.totalMXN < 0 ? '− ' : ''}
                      {formatMoney(Math.abs(receipt.totalMXN))}
                    </td>
                    <td className="activity__action">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => onOpenReceipt(receipt)}>
                        Comprobante
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="activity__table">
            <thead>
              <tr>
                <th scope="col">Cuándo</th>
                <th scope="col">Automatización</th>
                <th scope="col">Alcance</th>
                <th scope="col">Unidades</th>
                <th scope="col">Monto</th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {scheduled.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <span className="activity__source">
                      {rule.nextRun ? formatDateLong(rule.nextRun) : 'Automático'}
                    </span>
                    <span className="activity__scope">{rule.triggerText}</span>
                  </td>
                  <td>
                    <span className="activity__source">{rule.name}</span>
                    <span className="activity__scope">{rule.summary}</span>
                  </td>
                  <td>{rule.scopeLabel}</td>
                  <td>{formatCount(rule.units - rule.excludedUnits)}</td>
                  <td className="activity__amount">{formatMoney(rule.projectedMXN)}</td>
                  <td className="activity__action">
                    {rule.approved && <span className="chip chip--active">Aprobada</span>}
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => onReviewPayment(rule)}>
                      <EyeIcon width={14} height={14} />
                      Revisar
                    </button>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => onRunPayment(rule)}>
                      <PlayIcon width={12} height={12} />
                      Ejecutar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <footer className="activity__foot">
        {activeTab === 'history' ? (
          <>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={receipts.length <= PAGE_SIZE}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Ver menos' : `Ver más dispersiones (${receipts.length})`}
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => onTabChange('scheduled')}>
              <CalendarIcon width={14} height={14} />
              Ver pagos programados
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onTabChange('history')}>
            Ver últimas dispersiones
          </button>
        )}
      </footer>
    </section>
  );
}
