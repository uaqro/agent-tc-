import { useMemo, useState } from 'react';
import {
  accountPeriodBalances,
  createDemoAccountMovements,
  createDemoBalanceMovements,
  filterAccountMovements,
  filterBalanceMovements,
  balancePeriodByMedium,
  type AccountMovementType,
} from '../../domain/reporting/data';
import { defaultReportPeriod, type ReportPeriod } from '../../domain/reporting/periods';
import { ReportDownloadButtons } from './ReportDownloadButtons';
import { ReportPeriodPicker } from './ReportPeriodPicker';
import './FixedReports.css';

const ACCOUNT_TYPES: (AccountMovementType | 'Todos')[] = ['Todos', 'Dispersión', 'Abono del cliente', 'Comisión', 'Servicio', 'Ajuste', 'Reverso'];
const CURRENCY = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day!, 12).toLocaleDateString('es-MX');
}

function ReportTable({ columns, rows, rowIds, emptyMessage }: { columns: string[]; rows: (string | number)[][]; rowIds: string[]; emptyMessage: string }) {
  if (rows.length === 0) return <p className="fixed-report__empty">{emptyMessage}</p>;
  return (
    <div className="fixed-report__table-wrap">
      <table className="fixed-report__table">
        <thead>
          <tr>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIds[rowIndex]}>
              {row.map((value, columnIndex) => (
                <td key={`${rowIds[rowIndex]}-${columnIndex}`} data-mono={typeof value === 'number' || /Fecha|Folio|Referencia|Medio|Tarjeta/i.test(columns[columnIndex] ?? '') ? '' : undefined}>
                  {typeof value === 'number' ? CURRENCY.format(value) : value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AccountStatementReport() {
  const [period, setPeriod] = useState<ReportPeriod>(defaultReportPeriod);
  const [movementType, setMovementType] = useState<AccountMovementType | 'Todos'>('Todos');
  const movements = useMemo(() => createDemoAccountMovements(), []);
  const filtered = filterAccountMovements(movements, period, movementType);
  const balances = accountPeriodBalances(movements, period);
  const columns = ['Fecha', 'Tipo de movimiento', 'Referencia', 'Descripción', 'Abono', 'Cargo', 'Saldo posterior'];
  const rows = filtered.map((movement) => [
    formatDate(movement.date), movement.type, movement.reference, movement.description,
    movement.amount > 0 ? movement.amount : '', movement.amount < 0 ? Math.abs(movement.amount) : '', movement.balanceAfter,
  ]);

  return (
    <section className="fixed-report" aria-label="Reporte de estado de cuenta">
      <div className="fixed-report__filters">
        <ReportPeriodPicker value={period} onChange={setPeriod} />
        <label className="fixed-report__select">
          <span>Tipo de movimiento</span>
          <select value={movementType} onChange={(event) => setMovementType(event.target.value as AccountMovementType | 'Todos')}>
            {ACCOUNT_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
      </div>

      <dl className="fixed-report__balances">
        <div><dt>Saldo inicial del período</dt><dd>{CURRENCY.format(balances.opening)}</dd></div>
        <div><dt>Saldo final del período</dt><dd>{CURRENCY.format(balances.closing)}</dd></div>
      </dl>

      <div className="fixed-report__table-head">
        <p>{filtered.length} movimientos</p>
        <ReportDownloadButtons columns={columns} rows={rows} fileName={`estado-de-cuenta-${period.from}-${period.to}`} />
      </div>
      <ReportTable columns={columns} rows={rows} rowIds={filtered.map((movement) => movement.id)} emptyMessage="No hay movimientos para los filtros seleccionados." />
    </section>
  );
}

export function PaymentBalanceReport() {
  const [period, setPeriod] = useState<ReportPeriod>(defaultReportPeriod);
  const [medium, setMedium] = useState('Todos');
  const movements = useMemo(() => createDemoBalanceMovements(), []);
  const filtered = filterBalanceMovements(movements, period, medium);
  const balances = balancePeriodByMedium(movements, period);
  const media = [...new Set(movements.map((movement) => movement.medium))];
  const columns = ['Fecha', 'Medio de pago', 'Dispositivo', 'Unidad', 'Tipo de movimiento', 'Referencia', 'Importe (+/-)', 'Saldo posterior'];
  const rows = filtered.map((movement) => [
    formatDate(movement.date), movement.medium, movement.device, movement.unit, movement.type, movement.reference,
    movement.amount, movement.balanceAfter,
  ]);
  const summary = [...balances.entries()].filter(([name]) => medium === 'Todos' || name === medium);

  return (
    <section className="fixed-report" aria-label="Reporte de saldos por medio de pago">
      <div className="fixed-report__filters">
        <ReportPeriodPicker value={period} onChange={setPeriod} />
        <label className="fixed-report__select">
          <span>Medio de pago</span>
          <select value={medium} onChange={(event) => setMedium(event.target.value)}>
            <option>Todos</option>
            {media.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <dl className="fixed-report__balances fixed-report__balances--media">
        {summary.map(([name, balance]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd><span>Saldo inicial</span><strong>{CURRENCY.format(balance.opening)}</strong></dd>
            <dd><span>Saldo final</span><strong>{CURRENCY.format(balance.closing)}</strong></dd>
          </div>
        ))}
      </dl>

      <div className="fixed-report__table-head">
        <p>{filtered.length} movimientos</p>
        <ReportDownloadButtons columns={columns} rows={rows} fileName={`saldos-medios-pago-${period.from}-${period.to}`} />
      </div>
      <ReportTable columns={columns} rows={rows} rowIds={filtered.map((movement) => movement.id)} emptyMessage="No hay movimientos para los filtros seleccionados." />
    </section>
  );
}