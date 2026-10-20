import { useState } from 'react';
import { Field, InputAmount, Select } from '@er-mobility-mx/design-system';
import type { Vehicle } from '../../types/dispersion';
import type { LimitOverride, LimitPolicy, OverrideDuration, UnitAssignment } from '../../types/limits';
import {
  OVERRIDE_DURATIONS,
  OVERRIDE_REASONS,
  PERIOD_META,
  formatEquivalent,
  formatMeasure,
  overrideUntil,
  usedInMeasure,
} from '../../data/limits';
import { Modal } from '../ui/Modal';
import { formatDateLong } from '../../utils/format';
import './PolicyDialog.css';

interface OverrideDialogProps {
  vehicle: Vehicle;
  assignment: UnitAssignment;
  policy: LimitPolicy;
  onClose: () => void;
  onConfirm: (override: LimitOverride) => void;
}

export function OverrideDialog({ vehicle, assignment, policy, onClose, onConfirm }: OverrideDialogProps) {
  const [extra, setExtra] = useState(Math.round(policy.periodLimit * 0.2));
  const [duration, setDuration] = useState<OverrideDuration>('period');
  const [reason, setReason] = useState(OVERRIDE_REASONS[0]);

  const until = overrideUntil(duration, policy.period);
  const valid = extra > 0;
  const durationOptions = OVERRIDE_DURATIONS.map((option) => ({ value: option.id, label: option.label }));
  const reasonOptions = OVERRIDE_REASONS.map((option) => ({ value: option, label: option }));

  return (
    <Modal
      open
      title="Excepción temporal de límite"
      subtitle={`${vehicle.plate} · ${vehicle.driver} · ${policy.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!valid}
            onClick={() => onConfirm({ extra, until, reason })}
          >
            Aplicar excepción
          </button>
        </>
      }
    >
      <div className="policy-form__fields">
        <Field label={`Ampliación (${policy.measure === 'liters' ? 'L' : 'MXN'})`} htmlFor="override-extra" required>
          {policy.measure === 'money' ? (
            <InputAmount
              id="override-extra"
              value={String(extra)}
              required
              onChange={(value) => setExtra(Number(value) || 0)}
            />
          ) : (
            <input
              id="override-extra"
              className="policy-form__native-control"
              type="number"
              min={1}
              step={10}
              value={extra}
              onChange={(event) => setExtra(Number(event.target.value))}
            />
          )}
        </Field>
        <Field label="Vigencia" htmlFor="override-duration">
          <Select
            id="override-duration"
            options={durationOptions}
            value={duration}
            onChange={(value) => {
              const option = OVERRIDE_DURATIONS.find((candidate) => candidate.id === value);
              if (option) setDuration(option.id);
            }}
          />
        </Field>
        <Field label="Motivo" htmlFor="override-reason">
          <Select
            id="override-reason"
            options={reasonOptions}
            value={reason}
            onChange={(value) => {
              if (OVERRIDE_REASONS.includes(value)) setReason(value);
            }}
          />
        </Field>
      </div>

      <p className="policy-form__preview policy-form__preview--spaced">
        Lleva {formatMeasure(usedInMeasure(assignment, policy), policy.measure)} de{' '}
        {formatMeasure(policy.periodLimit, policy.measure)} por {PERIOD_META[policy.period].noun}. Con la excepción su
        límite sube a <strong>{formatMeasure(policy.periodLimit + Math.max(0, extra), policy.measure)}</strong> (≈{' '}
        {formatEquivalent(policy.periodLimit + Math.max(0, extra), policy.measure)}) hasta el {formatDateLong(until)}.
        Después regresa al límite de la política.
      </p>
    </Modal>
  );
}
