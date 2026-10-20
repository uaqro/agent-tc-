import { useState } from 'react';
import { Button, Checkbox, Chip, ChipGroup, Field, Input, InputAmount, Select, Switch } from '@er-mobility-mx/design-system';
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
const TOLL_PERIODS: TollPeriod[] = ['day', 'week', 'month'];
const CROSSING_LIMITS = [2, 4, 6, 8, 10, 15, 20];

export function TollPolicyDialog({ policy, policies, onClose, onSave }: TollPolicyDialogProps) {
  const [draft, setDraft] = useState<TollPolicy>(policy ?? { ...emptyTollPolicy, id: `tp-${Date.now()}` });
  const [wholeNetwork, setWholeNetwork] = useState((policy?.roadIds.length ?? 0) === 0);
  const patch = (changes: Partial<TollPolicy>) => setDraft((current) => ({ ...current, ...changes }));

  const roadIds = wholeNetwork ? [] : draft.roadIds;
  const periodOptions = TOLL_PERIODS.map((period) => ({
    value: period,
    label: `Por ${TOLL_PERIOD_META[period].noun}`,
  }));
  const crossingOptions = CROSSING_LIMITS.map((value) => ({
    value: String(value),
    label: String(value),
  }));
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
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!valid}
            onClick={() => onSave({ ...draft, name: draft.name.trim(), roadIds })}
          >
            {policy ? 'Guardar cambios' : 'Crear política'}
          </Button>
        </>
      }
    >
      <fieldset className="policy-form__block">
        <legend>1 · Aplica a</legend>
        <Field label="Nombre de la política" htmlFor="toll-policy-name" required>
          <Input
            id="toll-policy-name"
            type="text"
            required
            value={draft.name}
            placeholder="Ej. Corredor de carga · Corredor Norte"
            onChange={(event) => patch({ name: event.target.value })}
          />
        </Field>
        <div className="policy-form__checks">
          {assignableGroups.map((group) => (
            <Checkbox
              key={group.id}
              label={`${group.label} · ${formatCount(group.units)} unidades`}
              checked={draft.groupIds.includes(group.id)}
              onChange={() => patch({ groupIds: toggle(draft.groupIds, group.id) })}
            />
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
          <Field label="Periodo" htmlFor="toll-policy-period">
            <Select
              id="toll-policy-period"
              options={periodOptions}
              value={draft.period}
              onChange={(value) => {
                const option = periodOptions.find((candidate) => candidate.value === value);
                if (option) patch({ period: option.value });
              }}
            />
          </Field>
          <Field label={`Límite de gasto ${TOLL_PERIOD_META[draft.period].adjective} (MXN)`} htmlFor="toll-policy-limit" required>
            <InputAmount
              id="toll-policy-limit"
              required
              value={String(draft.periodLimitMXN)}
              onChange={(value) => patch({ periodLimitMXN: Number(value) || 0 })}
            />
          </Field>
          <Field label="Cruces por día" htmlFor="toll-policy-crossings">
            <Select
              id="toll-policy-crossings"
              options={crossingOptions}
              value={String(draft.maxCrossingsPerDay)}
              onChange={(value) => {
                const crossings = Number(value);
                if (CROSSING_LIMITS.includes(crossings)) patch({ maxCrossingsPerDay: crossings });
              }}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="policy-form__block">
        <legend>3 · Autopistas autorizadas</legend>
        <div className="policy-form__switch">
          <Switch checked={wholeNetwork} label="Toda la red de autopistas" onChange={setWholeNetwork} />
        </div>
        {!wholeNetwork && (
          <div className="policy-form__checks">
            {tollRoads.map((road) => (
              <Checkbox
                key={road.id}
                label={`${road.label} · ${road.plazas} plazas`}
                checked={draft.roadIds.includes(road.id)}
                onChange={() => patch({ roadIds: toggle(draft.roadIds, road.id) })}
              />
            ))}
          </div>
        )}
        <div className="policy-form__switch">
          <Switch
            checked={draft.allowUrbanHighways}
            label="Permitir segundos pisos y vías urbanas de cuota"
            onChange={(allowUrbanHighways) => patch({ allowUrbanHighways })}
          />
        </div>
      </fieldset>

      <fieldset className="policy-form__block">
        <legend>4 · Cuándo y con qué categoría</legend>
        <p className="policy-form__label">Días de cruce</p>
        <ChipGroup style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {DAY_LABELS.map((label, day) => (
            <Chip
              key={label}
              label={label}
              size="sm"
              selected={draft.days.includes(day)}
              onClick={() => patch({ days: toggle(draft.days, day) })}
            />
          ))}
        </ChipGroup>
        <div className="policy-form__fields">
          <Field label="Desde" htmlFor="toll-policy-time-from">
            <Input
              id="toll-policy-time-from"
              type="time"
              value={draft.timeFrom}
              onChange={(timeFrom) => patch({ timeFrom })}
            />
          </Field>
          <Field label="Hasta" htmlFor="toll-policy-time-to">
            <Input
              id="toll-policy-time-to"
              type="time"
              value={draft.timeTo}
              onChange={(timeTo) => patch({ timeTo })}
            />
          </Field>
        </div>
        <div className="policy-form__switch">
          <Switch
            checked={draft.categoryLock}
            label="Rechazar cruces cobrados con una categoría distinta a la registrada en el TAG"
            onChange={(categoryLock) => patch({ categoryLock })}
          />
        </div>
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
