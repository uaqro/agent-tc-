import { useMemo, useState } from 'react';
import { BulkBar, Button, EmptyState, FilterSet, Input, StatusPill, Table, type GridColumn } from '@er-mobility-mx/design-system';
import {
  INVOICE_PRODUCT_LABEL,
  INVOICE_STATUS_LABEL,
  IVA_RATE,
  invoices,
  parameterCatalogs,
  type Invoice,
  type InvoiceProduct,
  type InvoiceStatus,
} from '../../data/company';
import { formatDateLong, formatMoney } from '../../utils/format';
import './InvoicesPage.css';

interface InvoicesPageProps {
  onNotice: (message: string) => void;
}

const STATUS_TONE: Record<InvoiceStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger',
  cancelled: 'neutral',
};

const billingGroups = parameterCatalogs.find((catalog) => catalog.id === 'billing-groups')?.records.map((record) => record.values.name) ?? [];

const total = (subtotal: number) => Math.round(subtotal * (1 + IVA_RATE) * 100) / 100;

export function InvoicesPage({ onNotice }: InvoicesPageProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const group = filters.group?.[0] ?? '';
  const product = filters.product?.[0] ?? '';
  const status = filters.status?.[0] ?? '';
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([]);
  const productKeys = Object.keys(INVOICE_PRODUCT_LABEL) as InvoiceProduct[];
  const statusKeys = Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[];
  const groupOptions = [
    ...billingGroups.map((name) => ({ value: name, label: name })),
  ];
  const productOptions = [
    ...productKeys.map((key) => ({ value: key, label: INVOICE_PRODUCT_LABEL[key] })),
  ];
  const statusOptions = [
    ...statusKeys.map((key) => ({ value: key, label: INVOICE_STATUS_LABEL[key] })),
  ];

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return invoices.filter(
      (invoice) =>
        (!group || invoice.billingGroup === group) &&
        (!product || invoice.product === product) &&
        (!status || invoice.status === status) &&
        (!needle || `${invoice.folio} ${invoice.uuid}`.toLowerCase().includes(needle)),
    );
  }, [query, group, product, status]);

  const sumBy = (predicate: (status: InvoiceStatus) => boolean) =>
    invoices.filter((invoice) => predicate(invoice.status)).reduce((sum, invoice) => sum + total(invoice.subtotalMXN), 0);
  const monthTotal = invoices
    .filter((invoice) => invoice.issued.startsWith('2026-10') && invoice.status !== 'cancelled')
    .reduce((sum, invoice) => sum + total(invoice.subtotalMXN), 0);
  const overdue = sumBy((value) => value === 'overdue');

  const clearFilters = () => {
    setSelectedKeys([]);
    setQuery('');
    setFilters({});
  };

  const changeFilter = (update: () => void) => {
    setSelectedKeys([]);
    update();
  };

  const downloadSelected = (format: string) => {
    const formats = new Map([['pdf', 'PDF'], ['xml', 'XML'], ['both', 'PDF + XML']]);
    const label = formats.get(format);
    if (!label) throw new Error(`Formato de descarga desconocido: ${format}`);
    onNotice(`Descarga simulada: ${selectedKeys.length} facturas seleccionadas (${label}) en un .zip.`);
  };

  const columns: GridColumn<Invoice>[] = [
    {
      key: 'folio',
      label: 'Folio',
      render: (invoice) => (
        <>
          <span className="invoices-page__identifier">{invoice.folio}</span>
          <span className="invoices-page__metadata">
            UUID <span className="invoices-page__data-detail">{invoice.uuid}…</span>
          </span>
        </>
      ),
    },
    {
      key: 'issued',
      label: 'Emisión',
      render: (invoice) => (
        <>
          <time dateTime={invoice.issued}>{formatDateLong(invoice.issued)}</time>
          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <span className={`invoices-page__metadata${invoice.status === 'overdue' ? ' invoices-page__overdue' : ''}`}>
              Vence <time dateTime={invoice.due}>{formatDateLong(invoice.due)}</time>
            </span>
          )}
        </>
      ),
    },
    { key: 'billingGroup', label: 'Grupo de facturación' },
    { key: 'product', label: 'Producto', render: (invoice) => INVOICE_PRODUCT_LABEL[invoice.product] },
    {
      key: 'total',
      label: 'Total',
      render: (invoice) => {
        const iva = Math.round(invoice.subtotalMXN * IVA_RATE * 100) / 100;
        return (
          <>
            <span className="invoices-page__amount">{formatMoney(total(invoice.subtotalMXN), true)}</span>
            <span className="invoices-page__metadata">
              <span className="invoices-page__data-detail">{formatMoney(invoice.subtotalMXN, true)}</span>
              {' + IVA '}
              <span className="invoices-page__data-detail">{formatMoney(iva, true)}</span>
            </span>
          </>
        );
      },
    },
    {
      key: 'status',
      label: 'Estado',
      render: (invoice) => <StatusPill label={INVOICE_STATUS_LABEL[invoice.status]} tone={STATUS_TONE[invoice.status]} />,
    },
  ];

  return (
    <div className="invoices-page">
      <dl className="invoices-page__summary">
        <div>
          <dt>Facturado en octubre</dt>
          <dd>{formatMoney(monthTotal)}</dd>
        </div>
        <div>
          <dt>Pendiente de pago</dt>
          <dd>{formatMoney(sumBy((value) => value === 'pending'))}</dd>
        </div>
        <div>
          <dt>Vencido</dt>
          <dd className={overdue > 0 ? 'invoices-page__overdue' : undefined}>{formatMoney(overdue)}</dd>
        </div>
        <div>
          <dt>Facturas emitidas</dt>
          <dd>{invoices.length}</dd>
        </div>
      </dl>

      <section aria-label="Filtros de facturas">
        <FilterSet
          dimensions={[
            { id: 'group', label: 'Grupo', options: groupOptions },
            { id: 'product', label: 'Producto', options: productOptions },
            { id: 'status', label: 'Estado', options: statusOptions },
          ]}
          value={filters}
          onChange={(value) => changeFilter(() => setFilters(value))}
        />
      </section>

      <section className="invoices-page__results" aria-label="Listado de facturas">
        <div
          onFocusCapture={(event) => {
            // Native focus scrolling can leave a bulk action only partly visible.
            if (event.target instanceof HTMLElement) {
              event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
          }}
        >
          <BulkBar
            count={selectedKeys.length}
            actions={[
              { id: 'pdf', label: 'Descargar PDF', icon: 'download' },
              { id: 'xml', label: 'Descargar XML', icon: 'download' },
              { id: 'both', label: 'Descargar PDF + XML', icon: 'download' },
            ]}
            onAction={downloadSelected}
            onClear={() => setSelectedKeys([])}
            style={{ overflowX: 'auto' }}
            rest={
              <div className="invoices-page__search">
                <Input type="search" icon="search" ariaLabel="Buscar factura" value={query} placeholder="Folio o UUID" onChange={(value) => changeFilter(() => setQuery(value))} />
              </div>
            }
          />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon="search"
            title="Ninguna factura coincide con los filtros"
            description="Revisa el folio o UUID, o cambia el grupo de facturación, el producto y el estado."
            style={{
              background: 'var(--surface-card)',
              border: 'var(--border-width) solid var(--border-subtle)',
              borderTop: 'none',
              borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
            }}
            action={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <Table
            columns={columns}
            rows={rows}
            rowKey="uuid"
            caption="Facturas emitidas"
            sortable={false}
            attachedTop
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
          />
        )}
      </section>
    </div>
  );
}
