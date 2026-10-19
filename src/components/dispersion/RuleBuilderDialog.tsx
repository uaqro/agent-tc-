import { useMemo, useState } from 'react';
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
import { formatCount } from '../../utils/format';
import './RuleBuilderDialog.css';

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
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" disabled={!valid} onClick={submit}>
            Crear automatización
          </button>
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
          <label className="builder__field">
            <span>Grupo</span>
            <select value={draft.groupId} onChange={(event) => patch({ groupId: event.target.value })}>
              {vehicleGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label} · {formatCount(group.units)} unidades
                </option>
              ))}
            </select>
          </label>
        ) : (
          <ul className="builder__vehicles">
            {vehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.vehicleIds.includes(vehicle.id)}
                    onChange={(event) =>
                      patch({
                        vehicleIds: event.target.checked
                          ? [...draft.vehicleIds, vehicle.id]
                          : draft.vehicleIds.filter((id) => id !== vehicle.id),
                      })
                    }
                  />
                  <strong>{vehicle.plate}</strong> {vehicle.driver}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <fieldset className="builder__block">
        <legend>3 · Parámetros</legend>
        <div className="builder__fields">
          {draft.type === 'balance-threshold' && (
            <>
              <label className="builder__field">
                <span>Se dispara cuando el saldo baja de</span>
                <select value={draft.thresholdPct} onChange={(event) => patch({ thresholdPct: Number(event.target.value) })}>
                  {[5, 10, 15, 20, 25].map((value) => (
                    <option key={value} value={value}>
                      {value}% del depósito
                    </option>
                  ))}
                </select>
              </label>
              <label className="builder__field">
                <span>Recarga</span>
                <select
                  value={draft.refillMode}
                  onChange={(event) => patch({ refillMode: event.target.value as RuleDraft['refillMode'] })}
                >
                  <option value="top-off">A tope</option>
                  <option value="fixed">Monto fijo</option>
                </select>
              </label>
              {draft.refillMode === 'fixed' && (
                <label className="builder__field">
                  <span>Monto a cargar (MXN)</span>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={draft.refillAmountMXN}
                    onChange={(event) => patch({ refillAmountMXN: Number(event.target.value) })}
                  />
                </label>
              )}
            </>
          )}

          {draft.type === 'consumption' && (
            <>
              <label className="builder__field">
                <span>Ventana de consumo</span>
                <select value={draft.windowDays} onChange={(event) => patch({ windowDays: Number(event.target.value) })}>
                  {[15, 30, 60].map((value) => (
                    <option key={value} value={value}>
                      Últimos {value} días
                    </option>
                  ))}
                </select>
              </label>
              <label className="builder__field">
                <span>Colchón</span>
                <select value={draft.bufferPct} onChange={(event) => patch({ bufferPct: Number(event.target.value) })}>
                  {[0, 5, 10, 15, 20].map((value) => (
                    <option key={value} value={value}>
                      + {value}%
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {draft.type === 'top-off' && (
            <label className="builder__field">
              <span>Tope por unidad (L)</span>
              <input
                type="number"
                min={50}
                step={50}
                value={draft.capLiters}
                onChange={(event) => patch({ capLiters: Number(event.target.value) })}
              />
            </label>
          )}

          {draft.type === 'schedule-fixed' && (
            <label className="builder__field">
              <span>Monto por unidad (MXN)</span>
              <input
                type="number"
                min={100}
                step={100}
                value={draft.fixedAmountMXN}
                onChange={(event) => patch({ fixedAmountMXN: Number(event.target.value) })}
              />
            </label>
          )}

          {draft.type !== 'balance-threshold' && (
            <label className="builder__field">
              <span>Cadencia</span>
              <select value={draft.cadence} onChange={(event) => patch({ cadence: event.target.value })}>
                {CADENCES.map((cadence) => (
                  <option key={cadence.id} value={cadence.id}>
                    {cadence.label}
                  </option>
                ))}
              </select>
            </label>
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
