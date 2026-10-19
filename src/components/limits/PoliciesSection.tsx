import type { LimitPolicy } from '../../types/limits';
import { useFuelPolicies } from '../../data/FuelPolicyContext';
import {
  assignableGroups,
  additionalSettingsLabel,
  perFillLabel,
  periodLimitsLabel,
  policyUnits,
  policySummary,
  scheduleLabel,
  stationsLabel,
  validationLabel,
} from '../../data/limits';
import { PauseIcon, PlayIcon, PlusIcon, RuleIcon } from '../icons/Icons';
import { EmptyState } from '../ui/EmptyState';
import { formatCount } from '../../utils/format';
import { ApiTag } from '../api/ApiCoverage';
import './PoliciesSection.css';

interface PoliciesSectionProps {
  policies: LimitPolicy[];
  onCreate: () => void;
  onEdit: (policy: LimitPolicy) => void;
  onToggleStatus: (policy: LimitPolicy) => void;
}

function scopeText(policy: LimitPolicy): string {
  const groups = assignableGroups.filter((group) => policy.groupIds.includes(group.id));
  if (groups.length === 0) return 'Sin grupos · solo asignación individual';
  return `${groups.map((group) => group.label).join(', ')} · ${formatCount(policyUnits(policy))} unidades`;
}

export function PoliciesSection({ policies, onCreate, onEdit, onToggleStatus }: PoliciesSectionProps) {
  const { networks } = useFuelPolicies();
  return (
    <section className="policies" aria-labelledby="policies-title">
      <header className="policies__head">
        <h2 className="policies__title" id="policies-title">
          Políticas de uso
          <ApiTag id="lim-policies" />
        </h2>
        <button type="button" className="btn btn--primary btn--sm" onClick={onCreate}>
          <PlusIcon width={15} height={15} />
          Nueva política
        </button>
      </header>

      {policies.length === 0 && (
        <EmptyState
          card
          icon={<RuleIcon width={22} height={22} />}
          title="Aún no hay políticas de uso"
          description="No hay controles, restricciones de consumo ni configuraciones de uso asignados a la flota."
          actions={
            <button type="button" className="btn btn--primary btn--sm" onClick={onCreate}>
              <PlusIcon width={15} height={15} />
              Crear primera política
            </button>
          }
        />
      )}

      <ul className="policies__list">
        {policies.map((policy) => {
          const paused = policy.status === 'paused';
          const summary = policySummary(policy);

          return (
            <li className={`policy-card${paused ? ' policy-card--paused' : ''}`} key={policy.id}>
              <header className="policy-card__head">
                <h3 className="policy-card__name">{policy.name}</h3>
                <span className={`chip ${paused ? 'chip--paused' : 'chip--active'}`}>{paused ? 'Pausada' : 'Activa'}</span>
              </header>

              <p className="policy-card__scope">{scopeText(policy)}</p>
              {paused && <p className="policy-card__note">Sus unidades cargan sin candados mientras esté pausada.</p>}

              <dl className="policy-card__summary" aria-label="Resumen de configuración de la política">
                <div><dt>Controles solicitados</dt><dd>{summary.controls}<span>de 4</span></dd></div>
                <div><dt>Restricciones activas</dt><dd>{summary.restrictions}</dd></div>
                <div><dt>Configuraciones adicionales</dt><dd>{summary.additional}<span>de 6</span></dd></div>
              </dl>

              <dl className="policy-card__locks">
                <div className="policy-card__locks-wide">
                  <dt>Controles de transacción</dt>
                  <dd>{validationLabel(policy)}</dd>
                </div>
                <div className="policy-card__locks-wide">
                  <dt>Consumo por periodo</dt>
                  <dd>{periodLimitsLabel(policy)}</dd>
                </div>
                <div>
                  <dt>Límites por transacción</dt>
                  <dd>{perFillLabel(policy)}</dd>
                </div>
                <div>
                  <dt>Días y horario</dt>
                  <dd>{scheduleLabel(policy)}</dd>
                </div>
                <div>
                  <dt>Estaciones</dt>
                  <dd>{stationsLabel(policy, networks)}</dd>
                </div>
                <div className="policy-card__locks-wide">
                  <dt>Configuraciones adicionales</dt>
                  <dd>{additionalSettingsLabel(policy)}</dd>
                </div>
              </dl>

              <footer className="policy-card__foot">
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => onEdit(policy)}>
                  Editar
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => onToggleStatus(policy)}>
                  {paused ? <PlayIcon width={13} height={13} /> : <PauseIcon width={13} height={13} />}
                  {paused ? 'Activar' : 'Pausar'}
                </button>
              </footer>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
