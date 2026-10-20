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
import { RuleIcon } from '../icons/Icons';
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
        <Button variant="primary" size="sm" icon="add" onClick={onCreate}>
          Nueva política
        </Button>
      </header>

      {policies.length === 0 && (
        <EmptyState
          card
          icon={<RuleIcon width={22} height={22} />}
          title="Aún no hay políticas de uso"
          description="No hay controles, restricciones de consumo ni configuraciones de uso asignados a la flota."
          actions={
            <Button variant="primary" size="sm" icon="add" onClick={onCreate}>
              Crear primera política
            </Button>
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
                <StatusPill label={paused ? 'Pausada' : 'Activa'} tone={paused ? 'neutral' : 'success'} />
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
                <Stack gap={2} wrap>
                  <Button variant="secondary" size="sm" onClick={() => onEdit(policy)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={paused ? 'play_arrow' : 'pause'}
                    onClick={() => onToggleStatus(policy)}
                  >
                    {paused ? 'Activar' : 'Pausar'}
                  </Button>
                </Stack>
              </footer>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
