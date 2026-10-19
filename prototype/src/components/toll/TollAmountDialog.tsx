import { useState } from 'react';
import type { TollTag } from '../../types/toll';
import { Modal } from '../ui/Modal';
import { formatMoney } from '../../utils/format';
import '../limits/PolicyDialog.css';

export type TollAmountMode = 'top-up' | 'cut';

interface TollAmountDialogProps {
  tag: TollTag;
  mode: TollAmountMode;
  plate: string;
  availableMXN: number;
  onClose: () => void;
  onConfirm: (amountMXN: number) => void;
}

const PRESETS = [200, 500, 1_000, 2_000];

export function TollAmountDialog({ tag, mode, plate, availableMXN, onClose, onConfirm }: TollAmountDialogProps) {
  const isTopUp = mode === 'top-up';
  const [amount, setAmount] = useState(isTopUp ? 500 : tag.balanceMXN);

  const ceiling = isTopUp ? availableMXN : tag.balanceMXN;
  const valid = amount > 0 && amount <= ceiling;
  const poolAfter = availableMXN + (isTopUp ? -amount : amount);
  const tagAfter = tag.balanceMXN + (isTopUp ? amount : -amount);

  return (
    <Modal
      open
      title={isTopUp ? 'Recargar TAG' : 'Recortar saldo del TAG'}
      subtitle={`${tag.number} · ${plate} · saldo actual ${formatMoney(tag.balanceMXN, true)}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" disabled={!valid} onClick={() => onConfirm(amount)}>
            {isTopUp ? `Recargar ${formatMoney(amount)}` : `Recortar ${formatMoney(amount)}`}
          </button>
        </>
      }
    >
      <p className="policy-form__label">Monto</p>
      <div className="policy-form__pills">
        {(isTopUp ? PRESETS : [...new Set([Math.round(tag.balanceMXN / 2), tag.balanceMXN])].filter((value) => value > 0)).map((preset) => (
          <button
            type="button"
            key={preset}
            className={amount === preset ? 'is-active' : ''}
            aria-pressed={amount === preset}
            onClick={() => setAmount(preset)}
          >
            {preset === tag.balanceMXN && !isTopUp ? `Todo · ${formatMoney(preset)}` : formatMoney(preset)}
          </button>
        ))}
      </div>

      <label className="policy-form__field">
        <span>Otro monto (MXN)</span>
        <input type="number" min={1} step={50} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
      </label>

      <p className="policy-form__preview policy-form__preview--spaced">
        TAG: {formatMoney(tag.balanceMXN, true)} → <strong>{formatMoney(Math.max(0, tagAfter), true)}</strong> · Bolsa de
        peaje: {formatMoney(availableMXN)} → <strong>{formatMoney(poolAfter)}</strong>
        {!valid && (
          <span className="policy-form__preview-error">
            {' '}
            — {isTopUp ? 'el monto supera la bolsa disponible' : 'el monto supera el saldo del TAG'}
          </span>
        )}
      </p>
    </Modal>
  );
}
