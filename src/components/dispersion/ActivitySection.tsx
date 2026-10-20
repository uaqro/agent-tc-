import { useId, useState } from 'react';
import { Badge, Button, SectionHeader, StatusPill, TabPanel, Tabs } from '@er-mobility-mx/design-system';
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

const KIND_META: Record<ReceiptKind, { label: string; tone: 'info' | 'warning' | 'danger' }> = {
  rule: { label: 'Regla', tone: 'info' },
  'one-off': { label: 'Puntual', tone: 'warning' },
  bulk: { label: 'Archivo', tone: 'info' },
  cut: { label: 'Recorte', tone: 'danger' },
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
  const tabsId = useId();
  const visible = expanded ? receipts : receipts.slice(0, PAGE_SIZE);

  return (
    <section className="activity" aria-labelledby="activity-title">
      <header className="activity__head">
        <SectionHeader
          size="sm"
          level={2}
          style={{ width: '100%' }}
          trailing={
            <Tabs
              id={tabsId}
              items={[
                { value: 'history', label: 'Últimas dispersiones' },
                { value: 'scheduled', label: 'Pagos programados', count: scheduled.length },
              ]}
              value={activeTab}
              onChange={(value) => {
                if (value === 'history' || value === 'scheduled') onTabChange(value);
              }}
              ariaLabel="Actividad de dispersión"
            />
          }
        >
          <span id="activity-title">
            {activeTab === 'history' ? <ClockIcon width={17} height={17} /> : <CalendarIcon width={17} height={17} />}
            {activeTab === 'history' ? 'Últimas dispersiones' : 'Pagos programados'}
            <ApiTag id={activeTab === 'history' ? 'disp-history' : 'disp-scheduled'} />
          </span>
        </SectionHeader>
      </header>

      <TabPanel tabsId={tabsId} value={activeTab} active>
        <div className="activity__scroll">{activeTab === 'history' && receipts.length === 0 ? (
          <EmptyState
            icon="history"
            title="Aún no hay dispersiones"
            description="Cada corrida, envío puntual, carga masiva o recorte queda registrado aquí con su comprobante."
            actions={
              <Button variant="secondary" size="sm" onClick={() => onTabChange('scheduled')}>
                <CalendarIcon width={14} height={14} />
                Ver pagos programados
              </Button>
            }
          />
        ) : activeTab === 'scheduled' && scheduled.length === 0 ? (
          <EmptyState
            icon="calendar_month"
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
                      <Badge tone={meta.tone}>{meta.label}</Badge>
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
                      <Button variant="ghost" size="sm" onClick={() => onOpenReceipt(receipt)}>
                        Comprobante
                      </Button>
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
                    {rule.approved && <StatusPill label="Aprobada" tone="success" />}
                    <Button variant="ghost" size="sm" onClick={() => onReviewPayment(rule)}>
                      <EyeIcon width={14} height={14} />
                      Revisar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => onRunPayment(rule)}>
                      <PlayIcon width={12} height={12} />
                      Ejecutar
                    </Button>
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
              <Button
                variant="ghost"
                size="sm"
                disabled={receipts.length <= PAGE_SIZE}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? 'Ver menos' : `Ver más dispersiones (${receipts.length})`}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onTabChange('scheduled')}>
                <CalendarIcon width={14} height={14} />
                Ver pagos programados
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => onTabChange('history')}>
              Ver últimas dispersiones
            </Button>
          )}
        </footer>
      </TabPanel>
    </section>
  );
}
