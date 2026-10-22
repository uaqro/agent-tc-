import { useId, useState } from 'react';
import { Badge, Button, SectionHeader, StatusPill, TabPanel, Table, Tabs, type GridColumn } from '@er-mobility-mx/design-system';
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
  const receiptColumns: GridColumn<Receipt>[] = [
    { key: 'date', label: 'Fecha', render: (receipt) => formatDateTime(new Date(receipt.issuedAt)) },
    {
      key: 'kind',
      label: 'Tipo',
      render: (receipt) => {
        const meta = KIND_META[receipt.kind];
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: 'source',
      label: 'Origen',
      render: (receipt) => (
        <>
          <span className="activity__source">{receipt.sourceLabel}</span>
          <span className="activity__scope">{receipt.scopeLabel}</span>
        </>
      ),
    },
    { key: 'units', label: 'Unidades', align: 'right', render: (receipt) => formatCount(receipt.units) },
    {
      key: 'amount',
      label: 'Monto',
      align: 'right',
      render: (receipt) => (
        <span className={receipt.totalMXN < 0 ? 'activity__amount activity__amount--negative' : 'activity__amount'}>
          {receipt.totalMXN < 0 ? '− ' : ''}
          {formatMoney(Math.abs(receipt.totalMXN))}
        </span>
      ),
    },
    {
      key: 'receipt',
      label: 'Comprobante',
      align: 'right',
      render: (receipt) => (
        <Button variant="ghost" size="sm" onClick={() => onOpenReceipt(receipt)}>
          Comprobante
        </Button>
      ),
    },
  ];
  const scheduledColumns: GridColumn<FundingRule>[] = [
    {
      key: 'when',
      label: 'Cuándo',
      render: (rule) => (
        <>
          <span className="activity__source">{rule.nextRun ? formatDateLong(rule.nextRun) : 'Automático'}</span>
          <span className="activity__scope">{rule.triggerText}</span>
        </>
      ),
    },
    {
      key: 'automation',
      label: 'Automatización',
      render: (rule) => (
        <>
          <span className="activity__source">{rule.name}</span>
          <span className="activity__scope">{rule.summary}</span>
        </>
      ),
    },
    { key: 'scope', label: 'Alcance', render: (rule) => rule.scopeLabel },
    {
      key: 'units',
      label: 'Unidades',
      align: 'right',
      render: (rule) => formatCount(rule.units - rule.excludedUnits),
    },
    {
      key: 'amount',
      label: 'Monto',
      align: 'right',
      render: (rule) => <span className="activity__amount">{formatMoney(rule.projectedMXN)}</span>,
    },
    {
      key: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (rule) => (
        <div className="activity__actions">
          {rule.approved && <StatusPill label="Aprobada" tone="success" />}
          <Button variant="ghost" size="sm" onClick={() => onReviewPayment(rule)}>
            <EyeIcon width={14} height={14} />
            Revisar
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onRunPayment(rule)}>
            <PlayIcon width={12} height={12} />
            Ejecutar
          </Button>
        </div>
      ),
    },
  ];

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
        {activeTab === 'history' && receipts.length === 0 ? (
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
          <Table
            caption="Últimas dispersiones"
            columns={receiptColumns}
            rows={visible}
            rowKey="folio"
            surface="none"
            sortable={false}
          />
        ) : (
          <Table
            caption="Pagos programados"
            columns={scheduledColumns}
            rows={scheduled}
            rowKey="id"
            surface="none"
            sortable={false}
          />
        )}

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
