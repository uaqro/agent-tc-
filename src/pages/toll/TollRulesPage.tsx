import { useMemo, useState } from 'react';
import { Button, Select, StatusPill } from '@er-mobility-mx/design-system';
import { PauseIcon, PlayIcon, PlusIcon } from '../../components/icons/Icons';
import { TollPolicyDialog } from '../../components/toll/TollPolicyDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { fleetVehicles as vehicles } from '../../data/dispersion';
import { fleetAssignableGroups as assignableGroups } from '../../data/limits';
import {
  TOLL_CATEGORY_LABEL,
  TOLL_PERIOD_META,
  tollLimitLabel,
  tollLocksLabel,
  tollPolicies as seedPolicies,
  tollRoadsLabel,
  tollScheduleLabel,
  tollTags as seedTags,
} from '../../data/toll';
import type { TollPolicy, TollTag } from '../../types/toll';
import { formatCount, formatMoney } from '../../utils/format';
import '../../components/limits/PoliciesSection.css';
import { ReadOnlyNotice } from '../../components/ui/ReadOnlyNotice';
import '../TablePage.css';
import './toll.css';

interface TollRulesPageProps {
  onNotice: (message: string) => void;
  /** The role reads toll policies but can't create, edit or pause them (ADR-TCP-001). */
  readOnly?: boolean;
}

const usageTone = (ratio: number): string => (ratio >= 0.9 ? 'danger' : ratio >= 0.75 ? 'warn' : 'ok');

export function TollRulesPage({ onNotice, readOnly = false }: TollRulesPageProps) {
  const [policies, setPolicies] = useState<TollPolicy[]>(seedPolicies);
  const [tags, setTags] = useState<TollTag[]>(seedTags);
  const [editor, setEditor] = useState<{ policy: TollPolicy | null } | null>(null);
  const policyOptions = [
    { value: '', label: 'Sin política' },
    ...policies.map((policy) => ({ value: policy.id, label: policy.name })),
  ];

  const vehicleOf = (id: string | null) => vehicles.find((vehicle) => vehicle.id === id);
  const groupIdOfTag = (tag: TollTag) =>
    assignableGroups.find((group) => group.label === vehicleOf(tag.vehicleId)?.group)?.id ?? null;

  /** Only tags on a unit carry a policy; spare tags get one when they are assigned. */
  const assignedTags = useMemo(() => tags.filter((tag) => tag.vehicleId !== null), [tags]);

  const summary = {
    withPolicy: assignedTags.filter((tag) => tag.policyId !== null).length,
    withoutPolicy: assignedTags.filter((tag) => tag.policyId === null).length,
    rejections: assignedTags.reduce((sum, tag) => sum + tag.rejections7d, 0),
    activePolicies: policies.filter((policy) => policy.status === 'active').length,
  };

  const scopeText = (policy: TollPolicy) => {
    const groups = assignableGroups.filter((group) => policy.groupIds.includes(group.id));
    if (groups.length === 0) return 'Sin grupos · solo asignación por TAG';
    const units = groups.reduce((sum, group) => sum + group.units, 0);
    return `${groups.map((group) => group.label).join(', ')} · ${formatCount(units)} unidades`;
  };

  const toggleStatus = (policy: TollPolicy) => {
    setPolicies((current) =>
      current.map((candidate) =>
        candidate.id === policy.id ? { ...candidate, status: candidate.status === 'paused' ? 'active' : 'paused' } : candidate,
      ),
    );
    onNotice(policy.status === 'paused' ? `Política reactivada: ${policy.name}.` : `Política pausada: ${policy.name}.`);
  };

  const savePolicy = (saved: TollPolicy) => {
    const isNew = !policies.some((policy) => policy.id === saved.id);

    setPolicies((current) => {
      // A group follows one toll policy only.
      const released = current.map((policy) =>
        policy.id === saved.id
          ? saved
          : { ...policy, groupIds: policy.groupIds.filter((id) => !saved.groupIds.includes(id)) },
      );
      return isNew ? [...released, saved] : released;
    });

    setTags((current) =>
      current.map((tag) => {
        const groupId = groupIdOfTag(tag);
        if (!groupId) return tag;
        if (saved.groupIds.includes(groupId)) return { ...tag, policyId: saved.id };
        if (tag.policyId === saved.id) return { ...tag, policyId: null };
        return tag;
      }),
    );

    setEditor(null);
    onNotice(isNew ? `Política de peaje creada: ${saved.name}.` : `Política de peaje actualizada: ${saved.name}.`);
  };

  const reassign = (tag: TollTag, policyId: string | null) => {
    setTags((current) => current.map((candidate) => (candidate.id === tag.id ? { ...candidate, policyId } : candidate)));
    const policy = policies.find((candidate) => candidate.id === policyId);
    const plate = vehicleOf(tag.vehicleId)?.plate;
    onNotice(policy ? `El TAG de ${plate} ahora sigue ${policy.name}.` : `El TAG de ${plate} queda sin política de peaje.`);
  };

  return (
    <div className="table-page">
      {readOnly && <ReadOnlyNotice what="las políticas de peaje" />}
      <dl className="table-page__summary">
        <div>
          <dt>TAGs con política</dt>
          <dd>{summary.withPolicy}</dd>
        </div>
        <div>
          <dt>TAGs sin política</dt>
          <dd className={summary.withoutPolicy > 0 ? 'is-alert' : undefined}>{summary.withoutPolicy}</dd>
        </div>
        <div>
          <dt>Cruces rechazados · 7 días</dt>
          <dd>{summary.rejections}</dd>
        </div>
        <div>
          <dt>Políticas activas</dt>
          <dd>{summary.activePolicies}</dd>
        </div>
      </dl>

      <section className="toll-policies" aria-labelledby="toll-policies-title">
        <header className="policies__head">
          <h2 className="policies__title" id="toll-policies-title">
            Políticas de peaje
          </h2>
          {!readOnly && (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setEditor({ policy: null })}>
              <PlusIcon width={15} height={15} />
              Nueva política
            </button>
          )}
        </header>

        {policies.length === 0 && (
          <EmptyState
            card
            icon="rule"
            title="Aún no hay políticas de peaje"
            description="Sin políticas, los TAGs cruzan cualquier caseta sin límite. Crea una para fijar gasto, cruces, autopistas y horarios de cada grupo."
          />
        )}

        <ul className="policies__list">
          {policies.map((policy) => {
            const paused = policy.status === 'paused';
            return (
              <li className={`policy-card${paused ? ' policy-card--paused' : ''}`} key={policy.id}>
                <header className="policy-card__head">
                  <h3 className="policy-card__name">{policy.name}</h3>
                  <StatusPill label={paused ? 'Pausada' : 'Activa'} tone={paused ? 'neutral' : 'success'} />
                </header>
                <p className="policy-card__scope">{scopeText(policy)}</p>
                {paused && <p className="policy-card__note">Sus TAGs cruzan sin candados mientras esté pausada.</p>}

                <p className="policy-card__limit">
                  {formatMoney(policy.periodLimitMXN)}
                  <span>por {TOLL_PERIOD_META[policy.period].noun}</span>
                </p>

                <dl className="policy-card__locks">
                  <div className="policy-card__locks-wide">
                    <dt>Autopistas</dt>
                    <dd>{tollRoadsLabel(policy)}</dd>
                  </div>
                  <div>
                    <dt>Días y horario</dt>
                    <dd>{tollScheduleLabel(policy)}</dd>
                  </div>
                  <div>
                    <dt>Cruces y vías</dt>
                    <dd>{tollLocksLabel(policy)}</dd>
                  </div>
                </dl>

                {!readOnly && (
                  <footer className="policy-card__foot">
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditor({ policy })}>
                      Editar
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleStatus(policy)}>
                      {paused ? <PlayIcon width={13} height={13} /> : <PauseIcon width={13} height={13} />}
                      {paused ? 'Activar' : 'Pausar'}
                    </button>
                  </footer>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="table-page__card" aria-labelledby="toll-assign-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="toll-assign-title">
            Asignación por TAG
          </h2>
        </header>
        <div className="table-page__scroll">
          <table className="table-page__table">
            <thead>
              <tr>
                <th scope="col">TAG · unidad</th>
                <th scope="col">Categoría</th>
                <th scope="col">Política asignada</th>
                <th scope="col">Gasto del periodo</th>
                <th scope="col">Cruces hoy</th>
                <th scope="col">Rechazos 7 días</th>
              </tr>
            </thead>
            <tbody>
              {assignedTags.map((tag) => {
                const vehicle = vehicleOf(tag.vehicleId);
                const policy = policies.find((candidate) => candidate.id === tag.policyId) ?? null;
                const ratio = policy ? tag.spentPeriodMXN / policy.periodLimitMXN : 0;

                return (
                  <tr key={tag.id}>
                    <td>
                      <span className="table-page__main">{vehicle?.plate}</span>
                      <span className="table-page__sub">
                        {tag.number} · {vehicle?.group}
                      </span>
                    </td>
                    <td className="table-page__nowrap">{TOLL_CATEGORY_LABEL[tag.category]}</td>
                    <td>
                      <span id={`toll-policy-${tag.id}-label`} className="visually-hidden">
                        Política de peaje de {vehicle?.plate ?? tag.number}
                      </span>
                      <Select
                        options={policyOptions}
                        value={tag.policyId ?? ''}
                        aria-labelledby={`toll-policy-${tag.id}-label`}
                        onChange={(value) => {
                          if (policyOptions.some((option) => option.value === value)) {
                            reassign(tag, value || null);
                          }
                        }}
                      />
                      {policy?.status === 'paused' && <span className="table-page__sub">Política pausada</span>}
                      {!policy && <span className="table-page__sub table-page__warn">Cruza sin candados</span>}
                    </td>
                    <td>
                      {policy ? (
                        <>
                          <div
                            className={`toll-usage toll-usage--${usageTone(ratio)}`}
                            role="img"
                            aria-label={`${Math.round(ratio * 100)}% del límite usado`}
                          >
                            <span style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                          </div>
                          <span className="table-page__sub">
                            {formatMoney(tag.spentPeriodMXN)} de {tollLimitLabel(policy)}
                          </span>
                        </>
                      ) : (
                        <span className="table-page__sub">{formatMoney(tag.spentPeriodMXN)} sin límite</span>
                      )}
                    </td>
                    <td>
                      {tag.crossingsToday}
                      {policy && <span className="table-page__sub">de {policy.maxCrossingsPerDay}</span>}
                    </td>
                    <td className={tag.rejections7d > 0 ? 'table-page__warn' : undefined}>{tag.rejections7d}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {editor && (
        <TollPolicyDialog policy={editor.policy} policies={policies} onClose={() => setEditor(null)} onSave={savePolicy} />
      )}
    </div>
  );
}
