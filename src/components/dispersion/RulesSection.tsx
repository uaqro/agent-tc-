import type { FundingRule, RuleStatus, RuleType } from '../../types/dispersion';
import { Button, StatusPill } from '@er-mobility-mx/design-system';
import { toLiters } from '../../data/dispersion';
import { EyeIcon, PauseIcon, PlayIcon, PlusIcon, RuleIcon, UploadIcon } from '../icons/Icons';
import { EmptyState } from '../ui/EmptyState';
import { formatCount, formatDateLong, formatLiters, formatMoney } from '../../utils/format';
import { ApiTag } from '../api/ApiCoverage';
import './RulesSection.css';

interface RulesSectionProps {
  rules: FundingRule[];
  onSimulate: (rule: FundingRule) => void;
  onToggleStatus: (rule: FundingRule) => void;
  onCreate: () => void;
  onBulkUpload: () => void;
  onEdit: (rule: FundingRule) => void;
}

const STATUS_META: Record<RuleStatus, { label: string; tone: 'success' | 'neutral' | 'warning' }> = {
  active: { label: 'Activa', tone: 'success' },
  paused: { label: 'Pausada', tone: 'neutral' },
  'needs-review': { label: 'Necesita revisión', tone: 'warning' },
};

const TYPE_LABEL: Record<RuleType, string> = {
  'balance-threshold': 'Automática por saldo',
  consumption: 'Automática por consumo',
  'top-off': 'Calendario · a tope',
  'schedule-fixed': 'Calendario · monto fijo',
};

export function RulesSection({ rules, onSimulate, onToggleStatus, onCreate, onBulkUpload, onEdit }: RulesSectionProps) {
  return (
    <section className="rules" aria-labelledby="rules-title">
      <header className="rules__head">
        <h2 className="rules__title" id="rules-title">
          Automatización de dispersiones
          <ApiTag id="disp-rules" />
        </h2>
        <div className="rules__actions">
          <ApiTag id="disp-bulk" />
          <Button variant="secondary" size="sm" onClick={onBulkUpload}>
            <UploadIcon width={15} height={15} />
            Carga masiva desde archivo
          </Button>
          <Button size="sm" onClick={onCreate}>
            <PlusIcon width={15} height={15} />
            Nueva automatización
          </Button>
        </div>
      </header>

      {rules.length === 0 && (
        <EmptyState
          card
          icon={<RuleIcon width={22} height={22} />}
          title="Aún no hay automatizaciones"
          description="Crea una regla para que el saldo se disperse solo: por calendario, a tope o cuando una unidad baje de cierto saldo. Si solo necesitas un envío único, carga un archivo."
          actions={
            <>
              <Button size="sm" onClick={onCreate}>
                <PlusIcon width={15} height={15} />
                Crear primera automatización
              </Button>
              <Button variant="secondary" size="sm" onClick={onBulkUpload}>
                <UploadIcon width={15} height={15} />
                Carga masiva desde archivo
              </Button>
            </>
          }
        />
      )}

      <ul className="rules__list">
        {rules.map((rule) => {
          const status = STATUS_META[rule.status];
          const paused = rule.status === 'paused';

          return (
            <li className={`rule-card${paused ? ' rule-card--paused' : ''}`} key={rule.id}>
              <header className="rule-card__head">
                <h3 className="rule-card__name">{rule.name}</h3>
                <StatusPill label={status.label} tone={status.tone} />
              </header>

              {rule.statusNote && <p className="rule-card__note">{rule.statusNote}</p>}

              <p className="rule-card__scope">
                <span className="chip chip--info">{TYPE_LABEL[rule.type]}</span>
                {rule.scopeLabel} · {formatCount(rule.units)} unidades
              </p>

              <p className="rule-card__summary">{rule.summary}</p>

              <p className="rule-card__trigger">
                {rule.triggerText}
                {rule.nextRun && ` · próxima: ${formatDateLong(rule.nextRun)}`}
              </p>

              <footer className="rule-card__foot">
                <span className="rule-card__amount">
                  {formatMoney(rule.projectedMXN)}
                  <small>{formatLiters(toLiters(rule.projectedMXN))}</small>
                </span>

                <div className="rule-card__buttons">
                  <Button variant="secondary" size="sm" onClick={() => onSimulate(rule)}>
                    <EyeIcon width={15} height={15} />
                    Simular
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onToggleStatus(rule)}>
                    {paused ? <PlayIcon width={13} height={13} /> : <PauseIcon width={13} height={13} />}
                    {paused ? 'Activar' : 'Pausar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(rule)}>
                    Editar
                  </Button>
                </div>
              </footer>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
