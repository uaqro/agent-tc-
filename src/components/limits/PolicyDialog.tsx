import { useState } from 'react';
import { Select } from '@er-mobility-mx/design-system';
import type { LimitMeasure, LimitPeriod, LimitPolicy, PeriodRestriction, PolicySettings, TransactionControls } from '../../types/limits';
import { PERIOD_META, assignableGroups, emptyPolicy, policyForGroup, policySettings } from '../../data/limits';
import { useFuelPolicies } from '../../data/FuelPolicyContext';
import { networkModeLabel } from '../../data/stationNetworks';
import { Modal } from '../ui/Modal';
import { ScheduleEditor, blockErrors, newBlock } from './ScheduleEditor';
import { formatCount } from '../../utils/format';
import './PolicyDialog.css';

interface PolicyDialogProps {
  policy: LimitPolicy | null;
  policies: LimitPolicy[];
  onClose: () => void;
  onSave: (policy: LimitPolicy) => void;
}

const PERIODS = Object.keys(PERIOD_META) as LimitPeriod[];
const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
const positive = (value: number | null) => value === null || (Number.isFinite(value) && value > 0);

function FormattedValue({ label, value, onChange, unit }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: 'money' | 'liters';
}) {
  const [entry, setEntry] = useState<string | null>(null);
  const formatted = unit === 'money'
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
    : `${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} L`;
  return <input type="text" inputMode="decimal" aria-label={label} value={entry ?? formatted}
    onFocus={(event) => event.target.select()}
    onBlur={() => setEntry(null)}
    onChange={(event) => {
      const next = event.target.value;
      if (!/^\d*(\.\d{0,2})?$/.test(next)) return;
      setEntry(next);
      onChange(Number(next));
    }} />;
}

function OptionalValue({ label, value, onChange, integer = false, unit }: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  integer?: boolean;
  unit?: 'money' | 'liters';
}) {
  return (
    <div className="policy-form__optional">
      <label className="policy-form__switch">
        <input type="checkbox" checked={value !== null} onChange={(event) => onChange(event.target.checked ? 0 : null)} />
        {label}
      </label>
      {value !== null && (
        unit ? <FormattedValue label={label} value={value} onChange={onChange} unit={unit} /> :
        <input type="number" aria-label={label} min={integer ? 1 : 0.01} step={integer ? 1 : 0.01}
          value={value || ''} required onChange={(event) => onChange(Number(event.target.value))} />
      )}
    </div>
  );
}

export function PolicyDialog({ policy, policies, onClose, onSave }: PolicyDialogProps) {
  const { networks } = useFuelPolicies();
  const [draft, setDraft] = useState<LimitPolicy>(() => {
    const initial = policy ?? {
      ...emptyPolicy, id: `p-${Date.now()}`, periodLimit: 0, maxFillsPerDay: 0, maxLitersPerFill: 0,
      odometerRequired: false, minKmPerLiter: null, tankCapacityLock: false, minHoursBetweenFills: 0,
    };
    return { ...initial, settings: policy ? policySettings(initial) : {
      ...policySettings(initial),
      periods: Object.fromEntries(PERIODS.map((period) => [period, {
        amount: null, volume: null, transactions: null,
      }])) as PolicySettings['periods'],
      scheduleBlocks: null,
    } };
  });
  const [networkRequired, setNetworkRequired] = useState(draft.stationSubnetId !== null);
  const [intervalEnabled, setIntervalEnabled] = useState(draft.minHoursBetweenFills > 0);
  const settings = draft.settings!;
  const controls = settings.controls;
  const patch = (changes: Partial<LimitPolicy>) => setDraft((current) => ({ ...current, ...changes }));
  const patchSettings = (changes: Partial<PolicySettings>) => setDraft((current) => ({
    ...current, settings: { ...current.settings!, ...changes },
  }));
  const patchControls = (changes: Partial<TransactionControls>) => patchSettings({ controls: { ...controls, ...changes } });
  const patchPeriod = (period: LimitPeriod, changes: Partial<PeriodRestriction>) => patchSettings({
    periods: { ...settings.periods, [period]: { ...settings.periods[period], ...changes } },
  });
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push('Indica el nombre de la política.');
  if (controls.kmRange) {
    const { min, max } = controls.kmRange;
    if (![min, max].every((value) => Number.isFinite(value) && value > 0)) errors.push('Indica un recorrido mínimo y máximo mayores a cero.');
    else if (min > max) errors.push('El recorrido mínimo no puede ser mayor que el recorrido máximo.');
  }
  for (const period of PERIODS) {
    const restriction = settings.periods[period];
    if (![restriction.amount, restriction.volume, restriction.transactions].every(positive) ||
      (restriction.transactions !== null && !Number.isInteger(restriction.transactions))) {
      errors.push(`Revisa los límites del periodo ${PERIOD_META[period].adjective}; las transacciones deben ser enteras.`);
    }
  }
  if (settings.scheduleBlocks && settings.scheduleBlocks.some((block) => blockErrors(block).length > 0)) {
    errors.push('Completa el horario: cada bloque necesita días y rangos que inicien antes de terminar y no se traslapen.');
  }
  if (![settings.minTransactionAmount, settings.maxTransactionAmount].every(positive)) errors.push('Indica un monto mayor a cero en cada límite por transacción activado.');
  if (settings.minTransactionAmount !== null && settings.maxTransactionAmount !== null &&
    settings.minTransactionAmount > settings.maxTransactionAmount) errors.push('El monto mínimo no puede superar el máximo por transacción.');
  if (![settings.minTransactionVolume, settings.maxTransactionVolume].every(positive)) errors.push('Indica un volumen mayor a cero en cada límite por transacción activado.');
  if (settings.minTransactionVolume !== null && settings.maxTransactionVolume !== null &&
    settings.minTransactionVolume > settings.maxTransactionVolume) errors.push('El volumen mínimo no puede superar el máximo por transacción.');
  if (networkRequired && !networks.some((network) => network.id === draft.stationSubnetId)) errors.push('Selecciona una red de estaciones configurada.');
  if (intervalEnabled && (!Number.isInteger(draft.minHoursBetweenFills) || draft.minHoursBetweenFills < 1)) errors.push('El intervalo entre cargas debe ser un número entero mayor o igual a 1 hora.');

  const save = () => {
    if (errors.length) return;
    const limits = PERIODS.flatMap<{ period: LimitPeriod; measure: LimitMeasure; value: number }>((period) => {
      const restriction = settings.periods[period];
      return [
        ...(restriction.volume !== null ? [{ period, measure: 'liters' as const, value: restriction.volume }] : []),
        ...(restriction.amount !== null ? [{ period, measure: 'money' as const, value: restriction.amount }] : []),
      ];
    });
    const primary = limits.find((limit) => limit.period === draft.period && limit.measure === draft.measure) ?? limits[0];
    const blocks = settings.scheduleBlocks;
    const openDays = blocks ? blocks.flatMap((block) => block.days).sort((left, right) => left - right) : [0, 1, 2, 3, 4, 5, 6];
    const allRanges = blocks ? blocks.flatMap((block) => block.ranges) : [];
    onSave({ ...draft, name: draft.name.trim(),
      period: primary?.period ?? 'week', measure: primary?.measure ?? 'liters', periodLimit: primary?.value ?? 0,
      maxFillsPerDay: settings.periods.day.transactions ?? 0,
      maxLitersPerFill: settings.maxTransactionVolume ?? 0,
      days: openDays,
      timeFrom: allRanges.length ? allRanges.map((range) => range.from).sort()[0] : '00:00',
      timeTo: allRanges.length ? allRanges.map((range) => range.to).sort().reverse()[0] : '23:59',
      odometerRequired: controls.odometerRequired, minKmPerLiter: controls.kmPerformance ? draft.minKmPerLiter : null,
      stationSubnetId: networkRequired ? draft.stationSubnetId : null,
    });
  };
  const takenOver = assignableGroups.filter((group) => draft.groupIds.includes(group.id))
    .map((group) => ({ group, from: policyForGroup(policies, group.id) }))
    .filter((entry) => entry.from && entry.from.id !== draft.id);
  return (
    <Modal open size="lg" title={policy ? 'Editar política de uso' : 'Nueva política de uso'} onClose={onClose}
      footer={<>
        <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn--primary" disabled={errors.length > 0} onClick={save}>
          {policy ? 'Guardar cambios' : 'Crear política'}
        </button>
      </>}>
      <div className="policy-form__identity">
        <label className="policy-form__field">
          <span>Nombre de la política</span>
          <input type="text" value={draft.name} placeholder="Ej. Reparto urbano" onChange={(event) => patch({ name: event.target.value })} />
        </label>
        <p className="policy-form__label">Grupos de vehículos</p>
        <div className="policy-form__checks">
          {assignableGroups.map((group) => <label key={group.id}>
            <input type="checkbox" checked={draft.groupIds.includes(group.id)} onChange={() => patch({ groupIds: toggle(draft.groupIds, group.id) })} />
            {group.label} · {formatCount(group.units)} unidades
          </label>)}
        </div>
        {takenOver.map(({ group, from }) => <p className="policy-form__warning" key={group.id}>{group.label} dejará la política «{from?.name}».</p>)}
      </div>

      <fieldset className="policy-form__block policy-form__section">
        <legend>1 · Controles durante la transacción</legend>
        <div className="policy-form__control">
          <label className="policy-form__switch">
            <input type="checkbox" checked={controls.plateRequired} onChange={(event) => patchControls({ plateRequired: event.target.checked })} />Solicitar la placa
          </label>
          {controls.plateRequired && <p className="policy-form__hint">Se validará el valor numérico de la placa configurada en cada vehículo.</p>}
        </div>
        <div className="policy-form__control">
          <label className="policy-form__switch">
            <input type="checkbox" checked={controls.driverRequired} onChange={(event) => patchControls({
              driverRequired: event.target.checked, driverPin: false,
            })} />Solicitar conductor
          </label>
          {controls.driverRequired && <div className="policy-form__nested">
            <p className="policy-form__hint">Se valida el número de conductor en cada transacción.</p>
            <label className="policy-form__switch"><input type="checkbox" checked={controls.driverPin} onChange={(event) => patchControls({ driverPin: event.target.checked })} />Validar también NIP de conductor</label>
          </div>}
        </div>
        <div className="policy-form__control">
          <label className="policy-form__switch">
            <input type="checkbox" checked={controls.odometerRequired} onChange={(event) => patchControls({
              odometerRequired: event.target.checked, kmPerformance: false, kmRange: null,
            })} />Solicitar kilometraje
          </label>
          {controls.odometerRequired && <div className="policy-form__nested">
            <label className="policy-form__switch" title="El rendimiento esperado se toma de la configuración de cada vehículo.">
              <input type="checkbox" checked={controls.kmPerformance} onChange={(event) => patchControls({ kmPerformance: event.target.checked })} />
              Validar rendimiento (km/L)
            </label>
            <p className="policy-form__hint">El rendimiento se toma de la configuración de cada vehículo.</p>
            <label className="policy-form__switch">
              <input type="checkbox" checked={controls.kmRange !== null} onChange={(event) => patchControls({
                kmRange: event.target.checked ? { min: 1, max: 1_000_000 } : null,
              })} />
              Validar recorrido (km)
            </label>
            {controls.kmRange && <div className="policy-form__fields policy-form__fields--two policy-form__nested">
              <label className="policy-form__field"><span>Recorrido mínimo (km)</span>
                <input type="number" min={1} max={controls.kmRange.max} step={1} value={controls.kmRange.min || ''}
                  onChange={(event) => patchControls({ kmRange: { ...controls.kmRange!, min: Number(event.target.value) } })} />
              </label>
              <label className="policy-form__field"><span>Recorrido máximo (km)</span>
                <input type="number" min={controls.kmRange.min || 1} step={1} value={controls.kmRange.max || ''}
                  onChange={(event) => patchControls({ kmRange: { ...controls.kmRange!, max: Number(event.target.value) } })} />
              </label>
            </div>}
          </div>}
        </div>
        <div className="policy-form__control">
          <label className="policy-form__switch">
            <input type="checkbox" checked={controls.hourmeterRequired} onChange={(event) => patchControls({ hourmeterRequired: event.target.checked, hourPerformance: false })} />Solicitar horómetro
          </label>
          {controls.hourmeterRequired && <div className="policy-form__nested">
            <label className="policy-form__switch" title="El rendimiento esperado se toma de la configuración de cada unidad.">
              <input type="checkbox" checked={controls.hourPerformance} onChange={(event) => patchControls({ hourPerformance: event.target.checked })} />
              Validar rendimiento (h/L)
            </label>
            <p className="policy-form__hint">El rendimiento se toma de la configuración de cada unidad.</p>
          </div>}
        </div>
      </fieldset>

      <fieldset className="policy-form__block policy-form__section">
        <legend>2 · Restricciones y límites de autorización</legend>
        <div className="policy-form__period">
          <h3>Horario</h3>
          <label className="policy-form__switch">
            <input type="checkbox" checked={settings.scheduleBlocks !== null} onChange={(event) => patchSettings({
              scheduleBlocks: event.target.checked ? [newBlock()] : null,
            })} />Restringir horario de transacción
          </label>
          {settings.scheduleBlocks && <ScheduleEditor blocks={settings.scheduleBlocks} onChange={(scheduleBlocks) => patchSettings({ scheduleBlocks })} />}
        </div>

        <div className="policy-form__period">
          <h3>Consumo</h3>
          <p className="policy-form__label">Monto ($)</p>
          <div className="policy-form__fields">
            {PERIODS.map((period) => <OptionalValue key={period} unit="money" label={`Monto ${PERIOD_META[period].adjective} ($)`} value={settings.periods[period].amount} onChange={(value) => patchPeriod(period, { amount: value })} />)}
            <OptionalValue unit="money" label="Monto mínimo por transacción ($)" value={settings.minTransactionAmount} onChange={(value) => patchSettings({ minTransactionAmount: value })} />
            <OptionalValue unit="money" label="Monto máximo por transacción ($)" value={settings.maxTransactionAmount} onChange={(value) => patchSettings({ maxTransactionAmount: value })} />
          </div>
          <p className="policy-form__label policy-form__label--spaced">Volumen (L)</p>
          <div className="policy-form__fields">
            {PERIODS.map((period) => <OptionalValue key={period} unit="liters" label={`Volumen ${PERIOD_META[period].adjective} (L)`} value={settings.periods[period].volume} onChange={(value) => patchPeriod(period, { volume: value })} />)}
            <OptionalValue unit="liters" label="Volumen mínimo por transacción (L)" value={settings.minTransactionVolume} onChange={(value) => patchSettings({ minTransactionVolume: value })} />
            <OptionalValue unit="liters" label="Volumen máximo por transacción (L)" value={settings.maxTransactionVolume} onChange={(value) => patchSettings({ maxTransactionVolume: value })} />
          </div>
          <p className="policy-form__label policy-form__label--spaced">Transacciones</p>
          <div className="policy-form__fields">
            {PERIODS.map((period) => <OptionalValue key={period} integer label={`Transacciones ${{ day: 'diarias', week: 'semanales', fortnight: 'quincenales', month: 'mensuales' }[period]}`} value={settings.periods[period].transactions} onChange={(value) => patchPeriod(period, { transactions: value })} />)}
          </div>
        </div>

        <div className="policy-form__period">
          <h3>Estación</h3>
          <label className="policy-form__switch">
            <input type="checkbox" checked={networkRequired} onChange={(event) => { setNetworkRequired(event.target.checked); if (!event.target.checked) patch({ stationSubnetId: null }); }} />
            Restringir a una red de estaciones personalizada
          </label>
          {networkRequired && <label className="policy-form__field">
            <span id="policy-station-network-label">Red de estaciones configurada</span>
            <Select
              id="policy-station-network"
              aria-labelledby="policy-station-network-label"
              options={networks.map((network) => ({
                value: network.id,
                label: `${network.name} · ${networkModeLabel(network.mode)} · ${formatCount(network.stationIds.length)} estaciones`,
              }))}
              value={draft.stationSubnetId ?? ''}
              placeholder="Selecciona una red"
              onChange={(value) => {
                if (networks.some((network) => network.id === value)) patch({ stationSubnetId: value });
              }}
            />
          </label>}
          {networkRequired && networks.length === 0 && <p className="policy-form__hint">No hay redes configuradas. Crea una en Red de estaciones personalizadas.</p>}
        </div>
      </fieldset>

      <fieldset className="policy-form__block policy-form__section">
        <legend>3 · Configuraciones adicionales</legend>
        <label className="policy-form__switch">
          <input type="checkbox" checked={draft.tankCapacityLock} onChange={(event) => patch({ tankCapacityLock: event.target.checked })} />
          Limitar a la capacidad del tanque registrada en cada vehículo
        </label>
        <label className="policy-form__switch">
          <input type="checkbox" checked={intervalEnabled} onChange={(event) => {
            setIntervalEnabled(event.target.checked);
            patch({ minHoursBetweenFills: event.target.checked ? 1 : 0 });
          }} />
          Intervalo mínimo entre cargas
        </label>
        {intervalEnabled && <label className="policy-form__field">
          <span>Intervalo mínimo entre cargas (horas)</span>
          <input type="number" min={1} step={1} value={draft.minHoursBetweenFills || ''} onChange={(event) => patch({ minHoursBetweenFills: Number(event.target.value) })} />
        </label>}
        <label className="policy-form__switch">
          <input type="checkbox" checked={settings.showAvailableLiters} onChange={(event) => patchSettings({ showAvailableLiters: event.target.checked })} />
          Mostrar litros disponibles al momento de transaccionar
        </label>
        <label className="policy-form__switch">
          <input type="checkbox" checked={settings.showAvailableBalance} onChange={(event) => patchSettings({ showAvailableBalance: event.target.checked })} />
          Mostrar saldo disponible al transaccionar y en los medios de consulta
        </label>
        <label className="policy-form__switch">
          <input type="checkbox" checked={settings.showPreviousKm} onChange={(event) => patchSettings({ showPreviousKm: event.target.checked })} />
          Mostrar el kilometraje anterior al momento de transaccionar
        </label>
        <label className="policy-form__switch">
          <input type="checkbox" checked={settings.allowKmChanges} onChange={(event) => patchSettings({ allowKmChanges: event.target.checked })} />
          Permitir cambios de kilometraje en los vehículos
        </label>
      </fieldset>
      {errors.length > 0 && <ul className="policy-form__errors" aria-live="polite">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
    </Modal>
  );
}