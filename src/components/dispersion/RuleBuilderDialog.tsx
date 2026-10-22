import { useMemo, useState } from 'react';
import { Button, Field, Input, InputAmount, Select } from '@er-mobility-mx/design-system';
import type { FundingRule, Vehicle } from '../../types/dispersion';
import { vehicleGroups } from '../../data/dispersion';
import {
  CADENCES,
  RULE_TYPES,
  type RuleDraft,
  buildRule,
  emptyDraft,
  scopeOf,
  summaryOf,
  triggerOf,
} from '../../data/ruleTypes';
import { Modal } from '../ui/Modal';
import { UnitSelector } from './UnitSelector';
import { formatCount } from '../../utils/format';
import './RuleBuilderDialog.css';

const THRESHOLD_OPTIONS = [5, 10, 15, 20, 25];
const REFILL_MODES = [
  { value: 'top-off', label: 'A tope' },
  { value: 'fixed', label: 'Monto fijo' },
] as const;
const CONSUMPTION_WINDOWS = [15, 30, 60];
const BUFFER_OPTIONS = [0, 5, 10, 15, 20];

interface RuleBuilderDialogProps {
  open: boolean;
  vehicles: Vehicle[];
  onClose: () => void;
  onCreate: (rule: FundingRule) => void;
}

export function RuleBuilderDialog({ open, vehicles, onClose, onCreate }: RuleBuilderDialogProps) {
  const [draft, setDraft] = useState<RuleDraft>(emptyDraft);

  const groupedTypes = useMemo(() => {
    return RULE_TYPES.reduce<Record<string, typeof RULE_TYPES>>((groups, type) => {
      groups[type.group] = [...(groups[type.group] ?? []), type];
      return groups;
    }, {});
  }, []);

  const scope = scopeOf(draft, vehicles);
  const patch = (changes: Partial<RuleDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const valid = scope.units > 0;
  const groupOptions = vehicleGroups.map((group) => ({
    value: group.id,
    label: `${group.label} · ${formatCount(group.units)} unidades`,
  }));
  const thresholdOptions = THRESHOLD_OPTIONS.map((value) => ({
    value: String(value),
    label: `${value}% del depósito`,
  }));
  const windowOptions = CONSUMPTION_WINDOWS.map((value) => ({
    value: String(value),
    label: `Últimos ${value} días`,
  }));
  const bufferOptions = BUFFER_OPTIONS.map((value) => ({
    value: String(value),
    label: `+ ${value}%`,
  }));
  const cadenceOptions = CADENCES.map((cadence) => ({ value: cadence.id, label: cadence.label }));

  const submit = () => {
    onCreate(buildRule(draft, vehicles));
    setDraft(emptyDraft);
  };

  return (
    <Modal
      open={open}
      size="lg"
      title="Nueva automatización"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!valid} onClick={submit}>
            Crear automatización
          </Button>
        </>
      }
    >
      <fieldset className="builder__block">
        <legend>1 · Tipo de dispersión</legend>
        {Object.entries(groupedTypes).map(([group, types]) => (
          <div className="builder__type-group" key={group}>
            <p className="builder__type-group-label">{group}</p>
            <div className="builder__types">
              {types.map((type) => (
                <button
                  type="button"
                  key={type.id}
                  className={`builder__type${draft.type === type.id ? ' builder__type--active' : ''}`}
                  aria-pressed={draft.type === type.id}
                  onClick={() => patch({ type: type.id })}
                >
                  <span className="builder__type-label">{type.label}</span>
                  <span className="builder__type-hint">{type.hint}</span>
                  <span className="builder__type-example">{type.example}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset className="builder__block">
        <legend>2 · Aplica a</legend>
        <div className="builder__segment">
          <button
            type="button"
            className={draft.scopeKind === 'group' ? 'is-active' : ''}
            onClick={() => patch({ scopeKind: 'group' })}
          >
            Grupo de unidades
          </button>
          <button
            type="button"
            className={draft.scopeKind === 'units' ? 'is-active' : ''}
            onClick={() => patch({ scopeKind: 'units' })}
          >
            Unidades específicas
          </button>
        </div>

        {draft.scopeKind === 'group' ? (
          <Field label="Grupo" htmlFor="rule-builder-group">
            <Select
              id="rule-builder-group"
              options={groupOptions}
              value={draft.groupId}
              onChange={(groupId) => {
                if (groupOptions.some((option) => option.value === groupId)) patch({ groupId });
              }}
            />
          </Field>
        ) : (
          <UnitSelector vehicles={vehicles} selected={draft.vehicleIds} onChange={(vehicleIds) => patch({ vehicleIds })} />
        )}
      </fieldset>

      <fieldset className="builder__block">
        <legend>3 · Parámetros</legend>
        <div className="builder__fields">
          {draft.type === 'balance-threshold' && (
            <>
              <Field label="Se dispara cuando el saldo baja de" htmlFor="rule-builder-threshold">
                <Select
                  id="rule-builder-threshold"
                  options={thresholdOptions}
                  value={String(draft.thresholdPct)}
                  onChange={(value) => {
                    const threshold = Number(value);
                    if (THRESHOLD_OPTIONS.includes(threshold)) patch({ thresholdPct: threshold });
                  }}
                />
              </Field>
              <Field label="Recarga" htmlFor="rule-builder-refill-mode">
                <Select
                  id="rule-builder-refill-mode"
                  options={[...REFILL_MODES]}
                  value={draft.refillMode}
                  onChange={(value) => {
                    const mode = REFILL_MODES.find((option) => option.value === value);
                    if (mode) patch({ refillMode: mode.value });
                  }}
                />
              </Field>
              {draft.refillMode === 'fixed' && (
                <Field label="Monto a cargar (MXN)" htmlFor="rule-builder-refill-amount" required>
                  <InputAmount
                    id="rule-builder-refill-amount"
                    required
                    value={String(draft.refillAmountMXN)}
                    onChange={(value) => patch({ refillAmountMXN: Number(value) || 0 })}
                  />
                </Field>
              )}
            </>
          )}

          {draft.type === 'consumption' && (
            <>
              <Field label="Ventana de consumo" htmlFor="rule-builder-window">
                <Select
                  id="rule-builder-window"
                  options={windowOptions}
                  value={String(draft.windowDays)}
                  onChange={(value) => {
                    const days = Number(value);
                    if (CONSUMPTION_WINDOWS.includes(days)) patch({ windowDays: days });
                  }}
                />
              </Field>
              <Field label="Colchón" htmlFor="rule-builder-buffer">
                <Select
                  id="rule-builder-buffer"
                  options={bufferOptions}
                  value={String(draft.bufferPct)}
                  onChange={(value) => {
                    const bufferPct = Number(value);
                    if (BUFFER_OPTIONS.includes(bufferPct)) patch({ bufferPct });
                  }}
                />
              </Field>
            </>
          )}

          {draft.type === 'top-off' && (
            <Field label="Tope por unidad (L)" htmlFor="rule-builder-cap-liters">
              <div className="builder__native-control">
                <Input
                  id="rule-builder-cap-liters"
                  type="number"
                  min={50}
                  step={50}
                  size="sm"
                  value={String(draft.capLiters)}
                  onChange={(value) => patch({ capLiters: Number(value) })}
                />
              </div>
            </Field>
          )}

          {draft.type === 'schedule-fixed' && (
            <Field label="Monto por unidad (MXN)" htmlFor="rule-builder-fixed-amount" required>
              <InputAmount
                id="rule-builder-fixed-amount"
                required
                value={String(draft.fixedAmountMXN)}
                onChange={(value) => patch({ fixedAmountMXN: Number(value) || 0 })}
              />
            </Field>
          )}

          {draft.type !== 'balance-threshold' && (
            <Field label="Cadencia" htmlFor="rule-builder-cadence">
              <Select
                id="rule-builder-cadence"
                options={cadenceOptions}
                value={draft.cadence}
                onChange={(cadence) => {
                  if (CADENCES.some((option) => option.id === cadence)) patch({ cadence });
                }}
              />
            </Field>
          )}
        </div>
      </fieldset>

      <p className="builder__preview">
        <strong>{scope.label}</strong> · {formatCount(scope.units)} unidades · {summaryOf(draft)} · {triggerOf(draft)}
        {!valid && <span className="builder__preview-error"> — selecciona al menos una unidad</span>}
      </p>
    </Modal>
  );
}
