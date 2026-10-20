import { useMemo, useState } from 'react';
import {
  EV_FUNDING_METHOD_LABEL,
  EV_LEDGER_LABEL,
  EV_RATES,
  evAccountTotals,
  evFundingQuote,
} from '../../data/electromobility';
import type { EvFunding, EvFundingMethod, EvFundingMode, EvLedgerEntry } from '../../types/electromobility';
import { businessNow } from '../../domain/demo/clock';
import { ReadOnlyNotice } from '../../components/ui/ReadOnlyNotice';
import { formatDateTime, formatMoney } from '../../utils/format';
import { useEvHistory } from './useEvHistory';
import '../TablePage.css';
import '../../components/limits/PolicyDialog.css';
import './ev.css';

interface EvAccountPageProps {
  onNotice: (message: string) => void;
  /** The role reads the account but can't fund it (ADR-TCP-001). */
  readOnly?: boolean;
}

const METHODS: EvFundingMethod[] = ['stp', 'transfer', 'card'];

const percent = (rate: number) => `${(rate * 100).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;

let fundingSequence = 440;

/** Unique per funding and never reused (RN-FND-8). */
function newReference(method: EvFundingMethod, sequence: number): string {
  if (method === 'stp') return `6461801570000${String(sequence).padStart(5, '0')}`;
  if (method === 'transfer') return `EVM-${sequence}-${String((sequence * 7919) % 10_000).padStart(4, '0')}`;
  return 'Visa •••• 8820';
}

export function EvAccountPage({ onNotice, readOnly = false }: EvAccountPageProps) {
  const history = useEvHistory();
  const [fundings, setFundings] = useState<EvFunding[]>(history.fundings);
  const [extraLedger, setExtraLedger] = useState<EvLedgerEntry[]>([]);
  const [method, setMethod] = useState<EvFundingMethod>('stp');
  const [mode, setMode] = useState<EvFundingMode>('net');
  const [amount, setAmount] = useState(50_000);

  const ledger = useMemo(() => [...extraLedger, ...history.ledger].sort((a, b) => b.at.localeCompare(a.at)), [extraLedger, history.ledger]);
  const totals = evAccountTotals(ledger);
  const quote = evFundingQuote(method, mode, amount);
  const valid = amount >= 1_000;
  const pending = fundings.filter((funding) => funding.status === 'pending');

  const request = () => {
    const sequence = ++fundingSequence;
    const funding: EvFunding = {
      id: `FND-0${sequence}`,
      at: new Date(businessNow()).toISOString(),
      method,
      reference: newReference(method, sequence),
      quote,
      status: method === 'card' ? 'confirmed' : 'pending',
    };
    setFundings((current) => [funding, ...current]);
    if (method === 'card') {
      credit(funding);
      onNotice(`Cargo a tarjeta aprobado: ${formatMoney(quote.credited, true)} abonados a la cuenta.`);
    } else {
      onNotice(
        method === 'stp'
          ? `CLABE ${funding.reference} generada. El abono llega al confirmar el depósito.`
          : `Referencia ${funding.reference} generada. El abono llega al conciliar la transferencia.`,
      );
    }
  };

  /** The account is credited only after the deposit is confirmed (RN-FND-6). */
  const credit = (funding: EvFunding) =>
    setExtraLedger((current) => [
      {
        id: `L-${funding.id}`,
        at: new Date(businessNow()).toISOString(),
        type: 'funding',
        amount: funding.quote.credited,
        description: `${EV_FUNDING_METHOD_LABEL[funding.method]} · ${funding.id}`,
      },
      ...current,
    ]);

  const confirm = (funding: EvFunding) => {
    setFundings((current) => current.map((candidate) => (candidate.id === funding.id ? { ...candidate, status: 'confirmed' } : candidate)));
    credit(funding);
    onNotice(`Depósito conciliado: ${formatMoney(funding.quote.credited, true)} abonados a la cuenta.`);
  };

  return (
    <div className="table-page">
      {readOnly && <ReadOnlyNotice what="la cuenta de electromovilidad y sus fondeos" />}
      <dl className="table-page__summary">
        <div>
          <dt>Saldo contable</dt>
          <dd>{formatMoney(totals.book)}</dd>
        </div>
        <div>
          <dt>Saldo comprometido</dt>
          <dd>
            {formatMoney(totals.committed)}
            <span className="ev__dd-sub">Recargas autorizadas en curso</span>
          </dd>
        </div>
        <div>
          <dt>Saldo disponible</dt>
          <dd>
            {formatMoney(totals.available)}
            <span className="ev__dd-sub">Contable − comprometido</span>
          </dd>
        </div>
        <div>
          <dt>Fondeos por conciliar</dt>
          <dd className={pending.length ? 'is-alert' : undefined}>{pending.length}</dd>
        </div>
      </dl>

      <div className="ev-grid ev-grid--even">
        <section className="table-page__card" aria-labelledby="ev-fund-title">
          <header className="table-page__head">
            <h2 className="table-page__title" id="ev-fund-title">
              {readOnly ? 'Simulador de fondeo' : 'Fondear la cuenta'}
            </h2>
            <p className="ev__hint">
              Comisión {percent(EV_RATES.fundingCommission)} + IVA {percent(EV_RATES.iva)}; tarjeta suma {percent(EV_RATES.cardProcessing)} de
              procesamiento.
            </p>
          </header>
          <div className="ev__body">
            <p className="policy-form__label">Método</p>
            <div className="policy-form__pills">
              {METHODS.map((candidate) => (
                <button
                  type="button"
                  key={candidate}
                  className={method === candidate ? 'is-active' : ''}
                  aria-pressed={method === candidate}
                  onClick={() => setMethod(candidate)}
                >
                  {EV_FUNDING_METHOD_LABEL[candidate]}
                </button>
              ))}
            </div>

            <p className="policy-form__label policy-form__label--spaced">Quiero</p>
            <div className="policy-form__pills">
              <button type="button" className={mode === 'net' ? 'is-active' : ''} aria-pressed={mode === 'net'} onClick={() => setMode('net')}>
                Abonar exactamente
              </button>
              <button type="button" className={mode === 'gross' ? 'is-active' : ''} aria-pressed={mode === 'gross'} onClick={() => setMode('gross')}>
                Pagar exactamente
              </button>
            </div>

            <label className="policy-form__field policy-form__label--spaced">
              <span>{mode === 'net' ? 'Monto a abonar (MXN)' : 'Monto a pagar (MXN)'}</span>
              <input type="number" min={1_000} step={1_000} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
            </label>

            <dl className="ev-quote">
              <dt>Abono a la cuenta</dt>
              <dd>{formatMoney(quote.credited, true)}</dd>
              <dt>Comisión de fondeo</dt>
              <dd>{formatMoney(quote.commission, true)}</dd>
              <dt>IVA de la comisión</dt>
              <dd>{formatMoney(quote.commissionTax, true)}</dd>
              {method === 'card' && (
                <>
                  <dt>Procesamiento de tarjeta</dt>
                  <dd>{formatMoney(quote.processingFee, true)}</dd>
                  <dt>IVA del procesamiento</dt>
                  <dd>{formatMoney(quote.processingTax, true)}</dd>
                </>
              )}
              <dt className="ev-quote__total">Total a pagar</dt>
              <dd className="ev-quote__total">{formatMoney(quote.totalToPay, true)}</dd>
            </dl>

            {!readOnly && (
              <div className="ev-actions">
                <button type="button" className="btn btn--primary" disabled={!valid} onClick={request}>
                  {method === 'stp' ? 'Generar CLABE' : method === 'transfer' ? 'Generar referencia' : 'Pagar con tarjeta'}
                </button>
                {!valid && <span className="policy-form__preview-error">El mínimo es {formatMoney(1_000)}.</span>}
              </div>
            )}
          </div>
        </section>

        <section className="table-page__card" aria-labelledby="ev-fundings-title">
          <header className="table-page__head">
            <h2 className="table-page__title" id="ev-fundings-title">
              Fondeos
            </h2>
          </header>
          <div className="table-page__scroll">
            <table className="table-page__table">
              <thead>
                <tr>
                  <th scope="col">Fondeo</th>
                  <th scope="col">Referencia</th>
                  <th scope="col">Abono</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {fundings.map((funding) => (
                  <tr key={funding.id}>
                    <td>
                      <span className="table-page__main">{EV_FUNDING_METHOD_LABEL[funding.method]}</span>
                      <span className="table-page__sub">
                        {funding.id} · {formatDateTime(new Date(funding.at))}
                      </span>
                    </td>
                    <td className="table-page__nowrap">{funding.reference}</td>
                    <td className="table-page__nowrap">
                      {formatMoney(funding.quote.credited, true)}
                      <span className="table-page__sub">pagado {formatMoney(funding.quote.totalToPay, true)}</span>
                    </td>
                    <td>
                      {funding.status === 'confirmed' ? (
                        <span className="chip chip--active">Abonado</span>
                      ) : (
                        <>
                          <span className="chip chip--review">Esperando depósito</span>
                          {!readOnly && (
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => confirm(funding)}>
                              Simular confirmación
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="table-page__card" aria-labelledby="ev-ledger-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="ev-ledger-title">
            Movimientos recientes
          </h2>
          <p className="ev__hint">Registro contable de solo inserción: una corrección es un movimiento nuevo, nunca una edición.</p>
        </header>
        <div className="table-page__scroll">
          <table className="table-page__table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Tipo</th>
                <th scope="col">Detalle</th>
                <th scope="col">Monto</th>
              </tr>
            </thead>
            <tbody>
              {ledger.slice(0, 15).map((entry) => (
                <tr key={entry.id}>
                  <td className="table-page__nowrap">{formatDateTime(new Date(entry.at))}</td>
                  <td>
                    <span className={`chip ${EV_LEDGER_LABEL[entry.type].chip}`}>{EV_LEDGER_LABEL[entry.type].label}</span>
                  </td>
                  <td>{entry.description}</td>
                  <td className="table-page__nowrap">
                    {entry.amount < 0 ? '− ' : '+ '}
                    {formatMoney(Math.abs(entry.amount), true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
