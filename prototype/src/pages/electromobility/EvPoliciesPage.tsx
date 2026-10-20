import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ReadOnlyNotice } from '../../components/ui/ReadOnlyNotice';
import {
  EV_CHARGE_TYPE_LABEL,
  EV_DAYS,
  EV_DAY_LABEL,
  EV_JS_DAYS,
  EV_NETWORK_LABEL,
  EV_SCOPE_LABEL,
  evAuthorize,
  evCards,
  evCostCenters,
  evGroups,
  evPolicies as seedPolicies,
  evRuleSummary,
  evScopeTargetLabel,
  evStations,
  evVehicles,
  formatKwh,
  stationById,
  vehicleById,
} from '../../data/electromobility';
import type { EvDay, EvNetwork, EvPolicy, EvPolicyRules, EvPolicyScope } from '../../types/electromobility';
import { formatMoney } from '../../utils/format';
import { useEvHistory } from './useEvHistory';
import '../TablePage.css';
import '../../components/limits/PolicyDialog.css';
import './ev.css';

interface EvPoliciesPageProps {
  onNotice: (message: string) => void;
  /** The role reads the restrictions but can't change them (ADR-TCP-001). */
  readOnly?: boolean;
}

const SCOPES: EvPolicyScope[] = ['company', 'cost-center', 'group', 'vehicle'];

function targetsFor(scope: EvPolicyScope): { id: string; label: string }[] {
  if (scope === 'cost-center') return evCostCenters.map((center) => ({ id: center.id, label: center.name }));
  if (scope === 'group') return evGroups.map((group) => ({ id: group.id, label: group.name }));
  if (scope === 'vehicle') return evVehicles.map((vehicle) => ({ id: vehicle.id, label: `${vehicle.alias} · ${vehicle.plate}` }));
  return [];
}

let policySequence = 5;

export function EvPoliciesPage({ onNotice, readOnly = false }: EvPoliciesPageProps) {
  const { now, sessions, totals } = useEvHistory();
  const [policies, setPolicies] = useState<EvPolicy[]>(seedPolicies);
  const [creating, setCreating] = useState(false);

  const [test, setTest] = useState({
    vehicleId: 'ev-03',
    stationId: 'st-reforma',
    day: EV_JS_DAYS[new Date(now).getDay()]!,
    time: '12:00',
    energyKwh: 40,
  });

  const result = useMemo(() => {
    const vehicle = vehicleById(test.vehicleId)!;
    const station = stationById(test.stationId)!;
    // The tested day is the next one with that weekday, counting today; the counters read that day's sessions.
    const base = new Date(now);
    const offset = (EV_JS_DAYS.indexOf(test.day) - base.getDay() + 7) % 7;
    const [hours, minutes] = test.time.split(':').map(Number);
    const at = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset, hours ?? 0, minutes ?? 0);
    return evAuthorize({ vehicle, station, at, energyKwh: test.energyKwh, policies, cards: evCards, sessions, availableBalance: totals.available });
  }, [test, policies, sessions, totals.available, now]);

  const toggle = (policy: EvPolicy) => {
    setPolicies((current) => current.map((candidate) => (candidate.id === policy.id ? { ...candidate, enabled: !candidate.enabled } : candidate)));
    onNotice(policy.enabled ? `«${policy.name}» deshabilitada.` : `«${policy.name}» habilitada.`);
  };

  const ordered = [...policies].sort((a, b) => SCOPES.indexOf(a.scope) - SCOPES.indexOf(b.scope));

  return (
    <div className="table-page">
      {readOnly && <ReadOnlyNotice what="las restricciones de carga" />}

      <section className="table-page__card" aria-labelledby="ev-policies-title">
        <header className="table-page__head">
          <div>
            <h2 className="table-page__title" id="ev-policies-title">
              Restricciones de carga
            </h2>
            <p className="ev__hint">
              Gana la regla más específica: vehículo › grupo › centro de costos › empresa. En los límites de recargas, kWh, monto y potencia aplica el
              menor.
            </p>
          </div>
          {!readOnly && (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
              Nueva restricción
            </button>
          )}
        </header>
        <div className="table-page__scroll">
          <table className="table-page__table">
            <thead>
              <tr>
                <th scope="col">Restricción</th>
                <th scope="col">Alcance</th>
                <th scope="col">Reglas</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((policy) => (
                <tr key={policy.id}>
                  <td>
                    <span className="table-page__main">{policy.name}</span>
                  </td>
                  <td>
                    <span className="table-page__main">{EV_SCOPE_LABEL[policy.scope]}</span>
                    <span className="table-page__sub">{evScopeTargetLabel(policy)}</span>
                  </td>
                  <td>
                    <span className="ev-tags">
                      {evRuleSummary(policy.rules).map((part) => (
                        <span key={part}>{part}</span>
                      ))}
                    </span>
                  </td>
                  <td>
                    {readOnly ? (
                      <span className={`chip ${policy.enabled ? 'chip--active' : 'chip--paused'}`}>{policy.enabled ? 'Habilitada' : 'Deshabilitada'}</span>
                    ) : (
                      <label className="policy-form__switch">
                        <input type="checkbox" checked={policy.enabled} onChange={() => toggle(policy)} />
                        <span>{policy.enabled ? 'Habilitada' : 'Deshabilitada'}</span>
                      </label>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="table-page__card" aria-labelledby="ev-test-title">
        <header className="table-page__head">
          <div>
            <h2 className="table-page__title" id="ev-test-title">
              Probar una autorización
            </h2>
            <p className="ev__hint">
              Lo que hace la plataforma cuando una estación pide autorizar una recarga: tarjeta, unidad, restricciones y saldo, en ese orden.
            </p>
          </div>
        </header>
        <div className="ev__body">
          <div className="policy-form__fields">
            <label className="policy-form__field">
              <span>Unidad</span>
              <select value={test.vehicleId} onChange={(event) => setTest({ ...test, vehicleId: event.target.value })}>
                {evVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.alias} · {vehicle.brand} {vehicle.model}
                  </option>
                ))}
              </select>
            </label>
            <label className="policy-form__field">
              <span>Estación</span>
              <select value={test.stationId} onChange={(event) => setTest({ ...test, stationId: event.target.value })}>
                {evStations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name} · {EV_NETWORK_LABEL[station.network]}
                  </option>
                ))}
              </select>
            </label>
            <label className="policy-form__field">
              <span>Energía solicitada (kWh)</span>
              <input type="number" min={1} max={150} value={test.energyKwh} onChange={(event) => setTest({ ...test, energyKwh: Number(event.target.value) })} />
            </label>
            <label className="policy-form__field">
              <span>Día</span>
              <select value={test.day} onChange={(event) => setTest({ ...test, day: event.target.value as EvDay })}>
                {EV_DAYS.map((day) => (
                  <option key={day} value={day}>
                    {EV_DAY_LABEL[day]}
                  </option>
                ))}
              </select>
            </label>
            <label className="policy-form__field">
              <span>Hora</span>
              <input type="time" value={test.time} onChange={(event) => setTest({ ...test, time: event.target.value })} />
            </label>
          </div>

          <ul className="ev-checks">
            {result.checks.map((check) => (
              <li key={check.id} className={check.ok ? undefined : 'is-failed'}>
                <span className="ev-checks__mark" aria-hidden="true">
                  {check.ok ? '✓' : '✕'}
                </span>
                <span>
                  {check.label}
                  <span className="visually-hidden">{check.ok ? ': cumple' : ': no cumple'}</span>
                </span>
                <span className="ev-checks__detail">
                  {check.detail}
                  {check.source && ` · ${check.source}`}
                </span>
              </li>
            ))}
          </ul>
          <p className={`ev-verdict${result.allowed ? '' : ' is-denied'}`} role="status">
            {result.allowed
              ? `Autorizada hasta ${formatKwh(test.energyKwh)} a ${result.powerKw} kW: se comprometen ${formatMoney(result.hold, true)} de la cuenta.`
              : `Denegada. ${result.reason}`}
          </p>
        </div>
      </section>

      {creating && (
        <PolicyDialog
          onClose={() => setCreating(false)}
          onSave={(policy) => {
            setPolicies((current) => [...current, policy]);
            setCreating(false);
            onNotice(`Restricción «${policy.name}» creada.`);
          }}
        />
      )}
    </div>
  );
}

function PolicyDialog({ onClose, onSave }: { onClose: () => void; onSave: (policy: EvPolicy) => void }) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<EvPolicyScope>('group');
  const [targetId, setTargetId] = useState(targetsFor('group')[0]!.id);
  const [useSchedule, setUseSchedule] = useState(true);
  const [from, setFrom] = useState('06:00');
  const [to, setTo] = useState('22:00');
  const [days, setDays] = useState<EvDay[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [maxSessionsDay, setMaxSessionsDay] = useState('');
  const [maxKwhDay, setMaxKwhDay] = useState('');
  const [maxAmountDay, setMaxAmountDay] = useState('');
  const [network, setNetwork] = useState<EvNetwork | ''>('');

  const errors = [
    !name.trim() && 'Ponle un nombre a la restricción.',
    useSchedule && from >= to && 'La hora de inicio debe ser anterior a la de fin.',
    days.length === 0 && 'Elige al menos un día.',
  ].filter(Boolean) as string[];

  const number = (value: string) => (value.trim() === '' ? undefined : Number(value));

  const save = () => {
    const rules: EvPolicyRules = {
      ...(useSchedule ? { schedule: { from, to } } : {}),
      ...(days.length < 7 ? { allowedDays: EV_DAYS.filter((day) => days.includes(day)) } : {}),
      maxSessionsDay: number(maxSessionsDay),
      maxKwhDay: number(maxKwhDay),
      maxAmountDay: number(maxAmountDay),
      ...(network ? { network } : {}),
    };
    (Object.keys(rules) as (keyof EvPolicyRules)[]).forEach((key) => rules[key] === undefined && delete rules[key]);
    onSave({ id: `evp-${++policySequence}`, name: name.trim(), scope, targetId: scope === 'company' ? null : targetId, enabled: true, rules });
  };

  return (
    <Modal
      open
      title="Nueva restricción de carga"
      subtitle="Se evalúa antes de autorizar cada recarga"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" disabled={errors.length > 0} onClick={save}>
            Crear restricción
          </button>
        </>
      }
    >
      <label className="policy-form__field">
        <span>Nombre</span>
        <input value={name} placeholder="Ej. Reparto — sin carga ultrarrápida" onChange={(event) => setName(event.target.value)} />
      </label>

      <div className="ev-form-row">
        <label className="policy-form__field">
          <span>Alcance</span>
          <select
            value={scope}
            onChange={(event) => {
              const next = event.target.value as EvPolicyScope;
              setScope(next);
              setTargetId(targetsFor(next)[0]?.id ?? '');
            }}
          >
            {SCOPES.map((candidate) => (
              <option key={candidate} value={candidate}>
                {EV_SCOPE_LABEL[candidate]}
              </option>
            ))}
          </select>
        </label>
        {scope !== 'company' && (
          <label className="policy-form__field">
            <span>Aplica a</span>
            <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
              {targetsFor(scope).map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <label className="policy-form__switch policy-form__label--spaced">
        <input type="checkbox" checked={useSchedule} onChange={(event) => setUseSchedule(event.target.checked)} />
        <span>Restringir el horario</span>
      </label>
      {useSchedule && (
        <div className="ev-form-row">
          <label className="policy-form__field">
            <span>Permitido desde</span>
            <input type="time" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="policy-form__field">
            <span>Permitido hasta</span>
            <input type="time" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
      )}

      <p className="policy-form__label policy-form__label--spaced">Días permitidos</p>
      <div className="policy-form__pills">
        {EV_DAYS.map((day) => (
          <button
            type="button"
            key={day}
            className={days.includes(day) ? 'is-active' : ''}
            aria-pressed={days.includes(day)}
            onClick={() => setDays((current) => (current.includes(day) ? current.filter((candidate) => candidate !== day) : [...current, day]))}
          >
            {EV_DAY_LABEL[day]}
          </button>
        ))}
      </div>

      <div className="policy-form__fields policy-form__label--spaced">
        <label className="policy-form__field">
          <span>Recargas por día</span>
          <input type="number" min={1} placeholder="Sin límite" value={maxSessionsDay} onChange={(event) => setMaxSessionsDay(event.target.value)} />
        </label>
        <label className="policy-form__field">
          <span>kWh por día</span>
          <input type="number" min={1} placeholder="Sin límite" value={maxKwhDay} onChange={(event) => setMaxKwhDay(event.target.value)} />
        </label>
        <label className="policy-form__field">
          <span>Monto por día (MXN)</span>
          <input type="number" min={1} placeholder="Sin límite" value={maxAmountDay} onChange={(event) => setMaxAmountDay(event.target.value)} />
        </label>
      </div>

      <label className="policy-form__field policy-form__label--spaced">
        <span>Tipo de red</span>
        <select value={network} onChange={(event) => setNetwork(event.target.value as EvNetwork | '')}>
          <option value="">Sin restricción por tipo de red</option>
          <option value="public">Solo red pública</option>
          <option value="private">Solo red privada</option>
        </select>
      </label>
      <p className="ev__hint" style={{ marginTop: 8 }}>
        Tipos de carga disponibles en la red: {Object.values(EV_CHARGE_TYPE_LABEL).join(', ')}.
      </p>

      {errors.length > 0 && name !== '' && (
        <ul className="policy-form__errors">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
