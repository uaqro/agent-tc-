import { useState } from 'react';
import type { TollPeriod, TollPolicy } from '../../types/toll';
import { DAY_LABELS, fleetAssignableGroups as assignableGroups } from '../../data/limits';
import { TOLL_PERIOD_META, emptyTollPolicy, tollRoads, tollScheduleLabel } from '../../data/toll';
import { Modal } from '../ui/Modal';
import { formatCount, formatMoney } from '../../utils/format';
import '../limits/PolicyDialog.css';

interface TollPolicyDialogProps {
  /** Null to create a policy. */
  policy: TollPolicy | null;
  policies: TollPolicy[];
  onClose: () => void;
  onSave: (policy: TollPolicy) => void;
}

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export function TollPolicyDialog({ policy, policies, onClose, onSave }: TollPolicyDialogProps) {
  const [draft, setDraft] = useState<TollPolicy>(policy ?? { ...emptyTollPolicy, id: `tp-${Date.now()}` });
  const [wholeNetwork, setWholeNetwork] = useState((policy?.roadIds.length ?? 0) === 0);
  const patch = (changes: Partial<TollPolicy>) => setDraft((current) => ({ ...current, ...changes }));

  const roadIds = wholeNetwork ? [] : draft.roadIds;
  const valid =
    draft.name.trim() !== '' &&
    draft.periodLimitMXN > 0 &&
    draft.days.length > 0 &&
    (wholeNetwork || draft.roadIds.length > 0);

  const takenOver = assignableGroups
    .filter((group) => draft.groupIds.includes(group.id))
    .map((group) => ({ group, from: policies.find((candidate) => candidate.groupIds.includes(group.id)) }))
    .filter((entry) => entry.from && entry.from.id !== draft.id);

  return (
    <Modal
      open
      size="lg"
      title={policy ? 'Editar política de peaje' : 'Nueva política de peaje'}
      subtitle="Los candados aplican en el carril de cobro al leer el TAG."
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
            onClick={() => onSave({ ...draft, name: draft.name.trim(), roadIds })}
          >
            {policy ? 'Guardar cambios' : 'Crear política'}
          </button>
        </>
      }
    >
      <fieldset className="policy-form__block">
        <legend>1 · Aplica a</legend>
        <label className="policy-form__field">
          <span>Nombre de la política</span>
          <input
            type="text"
            value={draft.name}
            placeholder="Ej. Corredor de carga · Corredor Norte"
            onChange={(event) => patch({ name: event.target.value })}
          />
        </label>
        <div className="policy-form__checks">
          {assignableGroups.map((group) => (
            <label key={group.id}>
              <input
                type="checkbox"
                checked={draft.groupIds.includes(group.id)}
                onChange={() => patch({ groupIds: toggle(draft.groupIds, group.id) })}
              />
              {group.label} · {formatCount(group.units)} unidades
            </label>
          ))}
        </div>
        {takenOver.map(({ group, from }) => (
          <p className="policy-form__warning" key={group.id}>
            {group.label} dejará la política «{from?.name}».
          </p>
        ))}
      </fieldset>

      <fieldset className="policy-form__block">
        <legend>2 · Gasto y cruces</legend>
        <div className="policy-form__fields">
          <label className="policy-form__field">
            <span>Periodo</span>
            <select value={draft.period} onChange={(event) => patch({ period: event.target.value as TollPeriod })}>
              {(Object.keys(TOLL_PERIOD_META) as TollPeriod[]).map((period) => (
                <option key={period} value={period}>
                  Por {TOLL_PERIOD_META[period].noun}
                </option>
              ))}
            </select>
          </label>
          <label className="policy-form__field">
            <span>Límite de gasto {TOLL_PERIOD_META[draft.period].adjective} (MXN)</span>
            <input
              type="number"
              min={1}
              step={100}
              value={draft.periodLimitMXN}
              onChange={(event) => patch({ periodLimitMXN: Number(event.target.value) })}
            />
          </label>
          <label className="policy-form__field">
            <span>Cruces por día</span>
            <select
              value={draft.maxCrossingsPerDay}
              onChange={(event) => patch({ maxCrossingsPerDay: Number(event.target.value) })}
            >
              {[2, 4, 6, 8, 10, 15, 20].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="policy-form__block">
        <legend>3 · Autopistas autorizadas</legend>
        <label className="policy-form__switch">
          <input type="checkbox" checked={wholeNetwork} onChange={(event) => setWholeNetwork(event.target.checked)} />
          Toda la red de autopistas
        </label>
        {!wholeNetwork && (
          <div className="policy-form__checks">
            {tollRoads.map((road) => (
              <label key={road.id}>
                <input
                  type="checkbox"
                  checked={draft.roadIds.includes(road.id)}
                  onChange={() => patch({ roadIds: toggle(draft.roadIds, road.id) })}
                />
                {road.label} · {road.plazas} plazas
              </label>
            ))}
          </div>
        )}
        <label className="policy-form__switch">
          <input
            type="checkbox"
            checked={draft.allowUrbanHighways}
            onChange={(event) => patch({ allowUrbanHighways: event.target.checked })}
          />
          Permitir segundos pisos y vías urbanas de cuota
        </label>
      </fieldset>

      <fieldset className="policy-form__block">
        <legend>4 · Cuándo y con qué categoría</legend>
        <p className="policy-form__label">Días de cruce</p>
        <div className="policy-form__pills">
          {DAY_LABELS.map((label, day) => (
            <button
              type="button"
              key={label}
              className={draft.days.includes(day) ? 'is-active' : ''}
              aria-pressed={draft.days.includes(day)}
              onClick={() => patch({ days: toggle(draft.days, day) })}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="policy-form__fields">
          <label className="policy-form__field">
            <span>Desde</span>
            <input type="time" value={draft.timeFrom} onChange={(event) => patch({ timeFrom: event.target.value })} />
          </label>
          <label className="policy-form__field">
            <span>Hasta</span>
            <input type="time" value={draft.timeTo} onChange={(event) => patch({ timeTo: event.target.value })} />
          </label>
        </div>
        <label className="policy-form__switch">
          <input
            type="checkbox"
            checked={draft.categoryLock}
            onChange={(event) => patch({ categoryLock: event.target.checked })}
          />
          Rechazar cruces cobrados con una categoría distinta a la registrada en el TAG
        </label>
      </fieldset>

      <p className="policy-form__preview">
        <strong>{formatMoney(draft.periodLimitMXN)}</strong> por {TOLL_PERIOD_META[draft.period].noun} · máx.{' '}
        {draft.maxCrossingsPerDay} cruces al día · {draft.days.length > 0 ? tollScheduleLabel(draft) : 'sin días de cruce'}
        {!valid && (
          <span className="policy-form__preview-error"> — completa nombre, límite, días y al menos una autopista</span>
        )}
      </p>
    </Modal>
  );
}
