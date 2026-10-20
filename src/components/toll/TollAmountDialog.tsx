import { useState } from 'react';
import { Button, Field, InputAmount } from '@er-mobility-mx/design-system';
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
  const [amountValue, setAmountValue] = useState(String(isTopUp ? 500 : tag.balanceMXN));
  const amount = Number(amountValue) || 0;

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
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!valid} onClick={() => onConfirm(amount)}>
            {isTopUp ? `Recargar ${formatMoney(amount)}` : `Recortar ${formatMoney(amount)}`}
          </Button>
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
            onClick={() => setAmountValue(String(preset))}
          >
            {preset === tag.balanceMXN && !isTopUp ? `Todo · ${formatMoney(preset)}` : formatMoney(preset)}
          </button>
        ))}
      </div>

      <Field label="Otro monto (MXN)" htmlFor="toll-amount" required>
        <InputAmount id="toll-amount" value={amountValue} onChange={setAmountValue} required />
      </Field>

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
