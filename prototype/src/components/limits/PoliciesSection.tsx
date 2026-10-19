import type { LimitPolicy } from '../../types/limits';
import {
  PERIOD_META,
  assignableGroups,
  formatEquivalent,
  formatMeasure,
  fuelsLabel,
  perFillLabel,
  policyUnits,
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
  return (
    <section className="policies" aria-labelledby="policies-title">
      <header className="policies__head">
        <h2 className="policies__title" id="policies-title">
          Políticas de límites
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
          title="Aún no hay políticas de límites"
          description="Sin políticas, todas las unidades cargan sin candados. Crea una para fijar el límite por periodo y por carga, el combustible, los horarios y las estaciones permitidas de cada grupo."
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

          return (
            <li className={`policy-card${paused ? ' policy-card--paused' : ''}`} key={policy.id}>
              <header className="policy-card__head">
                <h3 className="policy-card__name">{policy.name}</h3>
                <span className={`chip ${paused ? 'chip--paused' : 'chip--active'}`}>{paused ? 'Pausada' : 'Activa'}</span>
              </header>

              <p className="policy-card__scope">{scopeText(policy)}</p>
              {paused && <p className="policy-card__note">Sus unidades cargan sin candados mientras esté pausada.</p>}

              <p className="policy-card__limit">
                {formatMeasure(policy.periodLimit, policy.measure)}
                <span>por {PERIOD_META[policy.period].noun}</span>
                <small>≈ {formatEquivalent(policy.periodLimit, policy.measure)}</small>
              </p>

              <dl className="policy-card__locks">
                <div>
                  <dt>Por carga</dt>
                  <dd>{perFillLabel(policy)}</dd>
                </div>
                <div>
                  <dt>Combustible</dt>
                  <dd>{fuelsLabel(policy)}</dd>
                </div>
                <div>
                  <dt>Días y horario</dt>
                  <dd>{scheduleLabel(policy)}</dd>
                </div>
                <div>
                  <dt>Estaciones</dt>
                  <dd>{stationsLabel(policy)}</dd>
                </div>
                <div className="policy-card__locks-wide">
                  <dt>Validaciones</dt>
                  <dd>{validationLabel(policy)}</dd>
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
