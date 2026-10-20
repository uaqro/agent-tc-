import { useMemo, useState } from 'react';
import { Button, Input, Select } from '@er-mobility-mx/design-system';
import { DownloadIcon, SearchIcon } from '../../components/icons/Icons';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  INVOICE_PRODUCT_LABEL,
  INVOICE_STATUS_LABEL,
  IVA_RATE,
  invoices,
  parameterCatalogs,
  type InvoiceProduct,
  type InvoiceStatus,
} from '../../data/company';
import { formatDateLong, formatMoney } from '../../utils/format';
import '../TablePage.css';

interface InvoicesPageProps {
  onNotice: (message: string) => void;
}

const STATUS_CHIP: Record<InvoiceStatus, string> = {
  paid: 'chip--active',
  pending: 'chip--review',
  overdue: 'chip--danger',
  cancelled: 'chip--paused',
};

const billingGroups = parameterCatalogs.find((catalog) => catalog.id === 'billing-groups')?.records.map((record) => record.values.name) ?? [];

const total = (subtotal: number) => Math.round(subtotal * (1 + IVA_RATE) * 100) / 100;

export function InvoicesPage({ onNotice }: InvoicesPageProps) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [product, setProduct] = useState<InvoiceProduct | ''>('');
  const [status, setStatus] = useState<InvoiceStatus | ''>('');
  const productKeys = Object.keys(INVOICE_PRODUCT_LABEL) as InvoiceProduct[];
  const statusKeys = Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[];
  const groupOptions = [
    { value: '', label: 'Todos los grupos de facturación' },
    ...billingGroups.map((name) => ({ value: name, label: name })),
  ];
  const productOptions = [
    { value: '', label: 'Todos los productos' },
    ...productKeys.map((key) => ({ value: key, label: INVOICE_PRODUCT_LABEL[key] })),
  ];
  const statusOptions = [
    { value: '', label: 'Todos los estados' },
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
    setQuery('');
    setGroup('');
    setProduct('');
    setStatus('');
  };

  return (
    <div className="table-page">
      <dl className="table-page__summary">
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
          <dd className={overdue > 0 ? 'is-alert' : ''}>{formatMoney(overdue)}</dd>
        </div>
        <div>
          <dt>Facturas emitidas</dt>
          <dd>{invoices.length}</dd>
        </div>
      </dl>

      <section className="table-page__card" aria-labelledby="invoices-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="invoices-title">
            Facturas
          </h2>
          <div className="table-page__filters">
            <label className="table-page__search">
              <SearchIcon width={15} height={15} />
              <Input type="search" ariaLabel="Buscar factura" value={query} placeholder="Folio o UUID" onChange={setQuery} />
            </label>
            <span id="invoices-group-filter-label" className="visually-hidden">Filtrar por grupo de facturación</span>
            <Select
              options={groupOptions}
              value={group}
              aria-labelledby="invoices-group-filter-label"
              onChange={(value) => {
                if (groupOptions.some((option) => option.value === value)) setGroup(value);
              }}
            />
            <span id="invoices-product-filter-label" className="visually-hidden">Filtrar por producto</span>
            <Select
              options={productOptions}
              value={product}
              aria-labelledby="invoices-product-filter-label"
              onChange={(value) => {
                const selected = productKeys.find((key) => key === value);
                if (selected || value === '') setProduct(selected ?? '');
              }}
            />
            <span id="invoices-status-filter-label" className="visually-hidden">Filtrar por estado</span>
            <Select
              options={statusOptions}
              value={status}
              aria-labelledby="invoices-status-filter-label"
              onChange={(value) => {
                const selected = statusKeys.find((key) => key === value);
                if (selected || value === '') setStatus(selected ?? '');
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={rows.length === 0}
              onClick={() => onNotice(`Descargando ${rows.length} facturas (PDF + XML) en un .zip.`)}
            >
              <DownloadIcon width={14} height={14} />
              Descargar ({rows.length})
            </Button>
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            compact
            icon={<SearchIcon width={20} height={20} />}
            title="Ninguna factura coincide con los filtros"
            description="Revisa el folio o UUID, o cambia el grupo de facturación, el producto y el estado."
            actions={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <div className="table-page__scroll">
            <table className="table-page__table">
              <thead>
                <tr>
                  <th scope="col">Folio</th>
                  <th scope="col">Emisión</th>
                  <th scope="col">Grupo de facturación</th>
                  <th scope="col">Producto</th>
                  <th scope="col">Total</th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="visually-hidden">Descargas</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((invoice) => {
                  const iva = Math.round(invoice.subtotalMXN * IVA_RATE * 100) / 100;
                  return (
                    <tr key={invoice.uuid}>
                      <td>
                        <span className="table-page__main table-page__nowrap">{invoice.folio}</span>
                        <span className="table-page__sub table-page__nowrap">UUID {invoice.uuid}…</span>
                      </td>
                      <td>
                        <span className="table-page__nowrap">{formatDateLong(invoice.issued)}</span>
                        {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                          <span className={`table-page__sub table-page__nowrap${invoice.status === 'overdue' ? ' table-page__warn' : ''}`}>
                            Vence {formatDateLong(invoice.due)}
                          </span>
                        )}
                      </td>
                      <td>{invoice.billingGroup}</td>
                      <td>{INVOICE_PRODUCT_LABEL[invoice.product]}</td>
                      <td className="table-page__nowrap">
                        <span className="table-page__main">{formatMoney(total(invoice.subtotalMXN), true)}</span>
                        <span className="table-page__sub">
                          {formatMoney(invoice.subtotalMXN, true)} + IVA {formatMoney(iva, true)}
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${STATUS_CHIP[invoice.status]}`}>{INVOICE_STATUS_LABEL[invoice.status]}</span>
                      </td>
                      <td className="table-page__action">
                        <Button variant="ghost" size="sm" onClick={() => onNotice(`Descargando PDF de ${invoice.folio}.`)}>
                          PDF
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onNotice(`Descargando XML de ${invoice.folio}.`)}>
                          XML
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
