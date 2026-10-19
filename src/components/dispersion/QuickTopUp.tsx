import { useMemo, useRef, useState } from 'react';
import type { Receipt, Vehicle } from '../../types/dispersion';
import { suggestedTopUps, toLiters } from '../../data/dispersion';
import { BoltIcon, CheckCircleIcon, SearchIcon } from '../icons/Icons';
import { formatLiters, formatMoney } from '../../utils/format';
import './QuickTopUp.css';

interface QuickTopUpProps {
  vehicles: Vehicle[];
  availableMXN: number;
  onSend: (vehicle: Vehicle, amountMXN: number) => Receipt;
  onViewReceipt: (receipt: Receipt) => void;
  variant?: 'card' | 'embedded';
  initialVehicle?: Vehicle | null;
  initialAmount?: number | null;
}

function matches(vehicle: Vehicle, term: string): boolean {
  const haystack = `${vehicle.plate} ${vehicle.device} ${vehicle.driver} ${vehicle.group}`.toLowerCase();
  return haystack.includes(term);
}

export function QuickTopUp({
  vehicles,
  availableMXN,
  onSend,
  onViewReceipt,
  variant = 'card',
  initialVehicle = null,
  initialAmount = null,
}: QuickTopUpProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialVehicle ? `${initialVehicle.plate} · ${initialVehicle.driver}` : '');
  const [highlight, setHighlight] = useState(0);
  const [selected, setSelected] = useState<Vehicle | null>(initialVehicle);
  const [amount, setAmount] = useState<number | null>(
    initialAmount ?? (initialVehicle ? suggestedTopUps(initialVehicle)[0] : null),
  );
  const [customAmount, setCustomAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [customMode, setCustomMode] = useState(
    Boolean(initialVehicle && initialAmount && !suggestedTopUps(initialVehicle).includes(initialAmount)),
  );
  const [sent, setSent] = useState<Receipt | null>(null);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || selected) return [];
    return vehicles.filter((vehicle) => matches(vehicle, term)).slice(0, 6);
  }, [query, selected, vehicles]);

  const noMatches = query.trim() !== '' && !selected && results.length === 0;

  const finalAmount = customMode ? Number(customAmount) : amount;
  const valid = Boolean(selected) && Number.isFinite(finalAmount) && (finalAmount ?? 0) > 0;
  const overBudget = (finalAmount ?? 0) > availableMXN;

  const reset = () => {
    setQuery('');
    setSelected(null);
    setAmount(null);
    setCustomAmount('');
    setCustomMode(false);
    setSent(null);
    setHighlight(0);
    inputRef.current?.focus();
  };

  const pick = (vehicle: Vehicle) => {
    setSelected(vehicle);
    setQuery(`${vehicle.plate} · ${vehicle.driver}`);
    setAmount(suggestedTopUps(vehicle)[0]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pick(results[highlight]);
    } else if (event.key === 'Escape') {
      setQuery('');
    }
  };

  const handleSend = () => {
    if (!selected || !valid || overBudget) return;
    setSent(onSend(selected, finalAmount as number));
  };

  if (sent) {
    return (
      <section className={`quick quick--done quick--${variant}`} aria-live="polite">
        <CheckCircleIcon width={26} height={26} />
        <div className="quick__done-body">
          <h2 className="quick__done-title">Saldo enviado · {formatMoney(sent.totalMXN, true)}</h2>
          <p className="quick__done-text">
            {sent.scopeLabel} · folio {sent.folio}. El conductor puede cargar de inmediato.
          </p>
        </div>
        <div className="quick__done-actions">
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => onViewReceipt(sent)}>
            Ver comprobante
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={reset}>
            Enviar otra
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`quick quick--${variant}`} aria-labelledby="quick-title">
      <header className="quick__head">
        <span className="quick__badge">
          <BoltIcon width={17} height={17} />
        </span>
        <div>
          <h2 className="quick__title" id="quick-title">
            Dispersión puntual
          </h2>
        </div>
      </header>

      <div className="quick__search">
        <SearchIcon width={17} height={17} />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="quick-results"
          aria-autocomplete="list"
          placeholder="Buscar unidad, placa, dispositivo o conductor…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            setHighlight(0);
          }}
          onKeyDown={handleKeyDown}
        />
        {selected && (
          <button type="button" className="quick__clear" onClick={reset}>
            Cambiar
          </button>
        )}
      </div>

      {results.length > 0 && (
        <ul className="quick__results" id="quick-results" role="listbox">
          {results.map((vehicle, index) => (
            <li key={vehicle.id} role="none">
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                className={`quick__result${index === highlight ? ' quick__result--active' : ''}`}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => pick(vehicle)}
              >
                <span className="quick__result-main">
                  <strong>{vehicle.plate}</strong> {vehicle.driver}
                </span>
                <span className="quick__result-meta">
                  {vehicle.group} · {vehicle.device} · {formatMoney(vehicle.balanceMXN, true)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {noMatches && (
        <p className="quick__no-results" role="status">
          {vehicles.length === 0
            ? 'Aún no hay unidades en la flota para enviar saldo.'
            : `Ninguna unidad coincide con “${query.trim()}”. Revisa la placa, el dispositivo o el conductor.`}
        </p>
      )}

      {selected && (
        <div className="quick__panel">
          <div className="quick__balance">
            <span className="quick__balance-label">Saldo actual</span>
            <span className={`quick__balance-value${selected.balanceMXN === 0 ? ' quick__balance-value--zero' : ''}`}>
              {formatMoney(selected.balanceMXN, true)}
            </span>
            <span className="quick__balance-liters">{formatLiters(toLiters(selected.balanceMXN))}</span>
          </div>

          <div className="quick__amounts" role="group" aria-label="Monto a enviar">
            {suggestedTopUps(selected).map((value) => (
              <button
                type="button"
                key={value}
                className={`quick__amount${!customMode && amount === value ? ' quick__amount--active' : ''}`}
                onClick={() => {
                  setCustomMode(false);
                  setAmount(value);
                }}
              >
                + {formatMoney(value)}
              </button>
            ))}
            <button
              type="button"
              className={`quick__amount${customMode ? ' quick__amount--active' : ''}`}
              onClick={() => setCustomMode(true)}
            >
              Otro monto
            </button>
            {customMode && (
              <label className="quick__custom">
                <span className="visually-hidden">Monto personalizado en pesos</span>
                <input
                  type="number"
                  min={1}
                  step={50}
                  autoFocus
                  value={customAmount}
                  placeholder="0"
                  onChange={(event) => setCustomAmount(event.target.value)}
                />
              </label>
            )}
          </div>

          <div className="quick__confirm">
            <div className="quick__confirm-figures">
              <p className="quick__confirm-amount">
                {valid ? formatMoney(finalAmount as number, true) : '—'}
                <span>{valid ? formatLiters(toLiters(finalAmount as number)) : 'Elige un monto'}</span>
              </p>
              <p className={`quick__confirm-available${overBudget ? ' quick__confirm-available--over' : ''}`}>
                Disponible en cuenta después del envío:{' '}
                <strong>{formatMoney(availableMXN - (valid ? (finalAmount as number) : 0))}</strong>
              </p>
            </div>

            <button type="button" className="btn btn--primary" disabled={!valid || overBudget} onClick={handleSend}>
              Enviar ahora
            </button>
          </div>

          {overBudget && (
            <p className="quick__error" role="alert">
              El monto supera el disponible de la cuenta.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
