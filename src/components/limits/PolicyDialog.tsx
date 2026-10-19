import { useState } from 'react';
import type { FuelType, LimitMeasure, LimitPeriod, LimitPolicy } from '../../types/limits';
import {
  DAY_LABELS,
  FUEL_LABEL,
  PERIOD_META,
  assignableGroups,
  emptyPolicy,
  formatEquivalent,
  formatMeasure,
  policyForGroup,
  scheduleLabel,
  stationSubnets,
} from '../../data/limits';
import { Modal } from '../ui/Modal';
import { formatCount } from '../../utils/format';
import './PolicyDialog.css';

interface PolicyDialogProps {
  /** Null to create a policy. */
  policy: LimitPolicy | null;
  policies: LimitPolicy[];
  onClose: () => void;
  onSave: (policy: LimitPolicy) => void;
}

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export function PolicyDialog({ policy, policies, onClose, onSave }: PolicyDialogProps) {
  const [draft, setDraft] = useState<LimitPolicy>(policy ?? { ...emptyPolicy, id: `p-${Date.now()}` });
  const patch = (changes: Partial<LimitPolicy>) => setDraft((current) => ({ ...current, ...changes }));

  const valid =
    draft.name.trim() !== '' &&
    draft.periodLimit > 0 &&
    draft.maxLitersPerFill > 0 &&
    draft.fuels.length > 0 &&
    draft.days.length > 0;

  /** Groups that leave another policy when this one is saved. */
  const takenOver = assignableGroups
    .filter((group) => draft.groupIds.includes(group.id))
    .map((group) => ({ group, from: policyForGroup(policies, group.id) }))
    .filter((entry) => entry.from && entry.from.id !== draft.id);

  return (
    <Modal
      open
      size="lg"
      title={policy ? 'Editar política de límites' : 'Nueva política de límites'}
      subtitle="Los candados aplican en la estación al momento de la carga."
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
            onClick={() => onSave({ ...draft, name: draft.name.trim() })}
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
            placeholder="Ej. Reparto urbano · Ruta Centro"
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
        <legend>2 · Límite de consumo</legend>
        <div className="policy-form__fields">
          <label className="policy-form__field">
            <span>Unidad de medida</span>
            <select value={draft.measure} onChange={(event) => patch({ measure: event.target.value as LimitMeasure })}>
              <option value="liters">Litros</option>
              <option value="money">Pesos (MXN)</option>
            </select>
          </label>
          <label className="policy-form__field">
            <span>Periodo</span>
            <select value={draft.period} onChange={(event) => patch({ period: event.target.value as LimitPeriod })}>
              {(Object.keys(PERIOD_META) as LimitPeriod[]).map((period) => (
                <option key={period} value={period}>
                  Por {PERIOD_META[period].noun}
                </option>
              ))}
            </select>
          </label>
          <label className="policy-form__field">
            <span>
              Límite {PERIOD_META[draft.period].adjective} · ≈ {formatEquivalent(draft.periodLimit, draft.measure)}
            </span>
            <input
              type="number"
              min={1}
              step={draft.measure === 'liters' ? 10 : 100}
              value={draft.periodLimit}
              onChange={(event) => patch({ periodLimit: Number(event.target.value) })}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="policy-form__block">
        <legend>3 · Por carga</legend>
        <div className="policy-form__fields">
          <label className="policy-form__field">
            <span>Máximo por carga (L)</span>
            <input
              type="number"
              min={1}
              step={5}
              value={draft.maxLitersPerFill}
              onChange={(event) => patch({ maxLitersPerFill: Number(event.target.value) })}
            />
          </label>
          <label className="policy-form__field">
            <span>Cargas por día</span>
            <select
              value={draft.maxFillsPerDay}
              onChange={(event) => patch({ maxFillsPerDay: Number(event.target.value) })}
            >
              {[1, 2, 3, 4].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="policy-form__field">
            <span>Intervalo mínimo entre cargas</span>
            <select
              value={draft.minHoursBetweenFills}
              onChange={(event) => patch({ minHoursBetweenFills: Number(event.target.value) })}
            >
              {[0, 2, 4, 6, 8, 12, 24].map((value) => (
                <option key={value} value={value}>
                  {value === 0 ? 'Sin intervalo' : `${value} horas`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="policy-form__switch">
          <input
            type="checkbox"
            checked={draft.tankCapacityLock}
            onChange={(event) => patch({ tankCapacityLock: event.target.checked })}
          />
          Rechazar cargas por encima de la capacidad del tanque de la unidad
        </label>
      </fieldset>

      <fieldset className="policy-form__block">
        <legend>4 · Qué, cuándo y dónde</legend>
        <p className="policy-form__label">Combustible permitido</p>
        <div className="policy-form__pills">
          {(Object.keys(FUEL_LABEL) as FuelType[]).map((fuel) => (
            <button
              type="button"
              key={fuel}
              className={draft.fuels.includes(fuel) ? 'is-active' : ''}
              aria-pressed={draft.fuels.includes(fuel)}
              onClick={() => patch({ fuels: toggle(draft.fuels, fuel) })}
            >
              {FUEL_LABEL[fuel]}
            </button>
          ))}
        </div>

        <p className="policy-form__label">Días de carga</p>
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
          <label className="policy-form__field">
            <span>Estaciones</span>
            <select
              value={draft.stationSubnetId ?? ''}
              onChange={(event) => patch({ stationSubnetId: event.target.value || null })}
            >
              <option value="">Toda la red</option>
              {stationSubnets.map((subnet) => (
                <option key={subnet.id} value={subnet.id}>
                  {subnet.label} · {formatCount(subnet.stations)} estaciones
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="policy-form__block">
        <legend>5 · Validaciones</legend>
        <label className="policy-form__switch">
          <input
            type="checkbox"
            checked={draft.odometerRequired}
            onChange={(event) => patch({ odometerRequired: event.target.checked })}
          />
          Exigir la captura del odómetro en cada carga
        </label>
        <label className="policy-form__switch">
          <input
            type="checkbox"
            checked={draft.minKmPerLiter !== null}
            onChange={(event) => patch({ minKmPerLiter: event.target.checked ? 5 : null })}
          />
          Alertar cuando el rendimiento baje de
          <input
            type="number"
            className="policy-form__inline-number"
            min={0.5}
            step={0.1}
            disabled={draft.minKmPerLiter === null}
            value={draft.minKmPerLiter ?? 5}
            aria-label="Rendimiento mínimo en kilómetros por litro"
            onChange={(event) => patch({ minKmPerLiter: Number(event.target.value) })}
          />
          km/L
        </label>
      </fieldset>

      <p className="policy-form__preview">
        <strong>{formatMeasure(draft.periodLimit, draft.measure)}</strong> por {PERIOD_META[draft.period].noun} · máx.{' '}
        {draft.maxLitersPerFill} L por carga · {draft.days.length > 0 ? scheduleLabel(draft) : 'sin días de carga'}
        {!valid && <span className="policy-form__preview-error"> — completa nombre, límite, combustible y días</span>}
      </p>
    </Modal>
  );
}
