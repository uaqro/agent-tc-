import { useMemo, useState } from 'react';
import { AssignmentsTable } from '../components/limits/AssignmentsTable';
import { OverrideDialog } from '../components/limits/OverrideDialog';
import { PoliciesSection } from '../components/limits/PoliciesSection';
import { PolicyDialog } from '../components/limits/PolicyDialog';
import { StationExceptionDialog } from '../components/limits/StationExceptionDialog';
import { unitById } from '../data/client';
import { DevNote } from '../components/dev/DevNote';
import { autoconsumoUnits, vehicles } from '../data/dispersion';
import {
  fleetUnits,
  formatMeasure,
  groupIdOf,
  limitPolicies as seedPolicies,
  policyForGroup,
  unitAssignments as seedAssignments,
} from '../data/limits';
import type { LimitOverride, LimitPolicy, StationException, StationRecommendationRequest, UnitAssignment } from '../types/limits';
import { formatCount, formatDateLong } from '../utils/format';
import { ApiCoverageBanner, ApiTag } from '../components/api/ApiCoverage';
import './LimitsPage.css';

interface LimitsPageProps {
  onNotice: (message: string) => void;
  /** A recommendation the optimizer handed over with "Aplicar en Límites". Applied only after confirmation. */
  stationRequest?: StationRecommendationRequest | null;
  onStationRequestHandled?: () => void;
}

export function LimitsPage({ onNotice, stationRequest = null, onStationRequestHandled }: LimitsPageProps) {
  const [policies, setPolicies] = useState<LimitPolicy[]>(seedPolicies);
  const [assignments, setAssignments] = useState<UnitAssignment[]>(seedAssignments);
  const [editor, setEditor] = useState<{ policy: LimitPolicy | null } | null>(null);
  const [overrideFor, setOverrideFor] = useState<string | null>(null);

  const vehicleOf = (vehicleId: string) => vehicles.find((vehicle) => vehicle.id === vehicleId);
  const assignmentOf = (vehicleId: string) => assignments.find((assignment) => assignment.vehicleId === vehicleId);
  const policyOf = (vehicleId: string) =>
    policies.find((policy) => policy.id === assignmentOf(vehicleId)?.policyId) ?? null;
  const groupPolicyOf = (vehicleId: string) => {
    const vehicle = vehicleOf(vehicleId);
    return vehicle ? policyForGroup(policies, groupIdOf(vehicle)) : null;
  };

  const summary = useMemo(() => {
    const unassigned = assignments.filter((assignment) => assignment.policyId === null).length;
    return {
      assigned: fleetUnits - unassigned,
      unassigned,
      overrides: assignments.filter((assignment) => assignment.override).length,
      rejections: assignments.reduce((sum, assignment) => sum + assignment.rejections7d, 0),
    };
  }, [assignments]);

  const patchAssignment = (vehicleId: string, changes: Partial<UnitAssignment>) =>
    setAssignments((current) =>
      current.map((assignment) => (assignment.vehicleId === vehicleId ? { ...assignment, ...changes } : assignment)),
    );

  const toggleStatus = (policy: LimitPolicy) => {
    setPolicies((current) =>
      current.map((candidate) =>
        candidate.id === policy.id
          ? { ...candidate, status: candidate.status === 'paused' ? 'active' : 'paused' }
          : candidate,
      ),
    );
    onNotice(policy.status === 'paused' ? `Política reactivada: ${policy.name}.` : `Política pausada: ${policy.name}.`);
  };

  const savePolicy = (saved: LimitPolicy) => {
    const isNew = !policies.some((policy) => policy.id === saved.id);
    const previous = policies.find((policy) => policy.id === saved.id);

    setPolicies((current) => {
      // A group follows one policy only: the saved policy takes its groups from the others.
      const released = current.map((policy) =>
        policy.id === saved.id
          ? saved
          : { ...policy, groupIds: policy.groupIds.filter((id) => !saved.groupIds.includes(id)) },
      );
      return isNew ? [...released, saved] : released;
    });

    setAssignments((current) =>
      current.map((assignment) => {
        const vehicle = vehicleOf(assignment.vehicleId);
        const groupId = vehicle ? groupIdOf(vehicle) : null;
        if (assignment.individual || !groupId) return assignment;

        const inherits = saved.groupIds.includes(groupId);
        if (inherits && assignment.policyId !== saved.id) return { ...assignment, policyId: saved.id, override: undefined };
        if (!inherits && assignment.policyId === saved.id) return { ...assignment, policyId: null, override: undefined };
        // The extension is expressed in the measure of the policy, so it does not survive a change of measure.
        if (inherits && previous && previous.measure !== saved.measure) return { ...assignment, override: undefined };
        return assignment;
      }),
    );

    setEditor(null);
    onNotice(isNew ? `Política creada: ${saved.name}.` : `Política actualizada: ${saved.name}.`);
  };

  const reassign = (vehicleId: string, policyId: string | null) => {
    const vehicle = vehicleOf(vehicleId);
    const target = policies.find((policy) => policy.id === policyId);
    const groupPolicy = groupPolicyOf(vehicleId);

    patchAssignment(vehicleId, {
      policyId,
      individual: policyId !== (groupPolicy?.id ?? null),
      override: undefined,
    });
    onNotice(
      target ? `${vehicle?.plate} ahora sigue la política ${target.name}.` : `${vehicle?.plate} queda sin política de límites.`,
    );
  };

  const applyOverride = (vehicleId: string, override: LimitOverride) => {
    const policy = policyOf(vehicleId);
    patchAssignment(vehicleId, { override });
    setOverrideFor(null);
    if (policy) {
      onNotice(
        `Excepción aplicada a ${vehicleOf(vehicleId)?.plate}: +${formatMeasure(override.extra, policy.measure)}.`,
      );
    }
  };

  const requestVehicle = stationRequest ? vehicleOf(stationRequest.vehicleId) : undefined;

  const applyStationException = (vehicleId: string, exception: StationException) => {
    const existing = assignmentOf(vehicleId);
    if (existing) {
      patchAssignment(vehicleId, { stationException: exception });
    } else {
      // The unit had no row yet: it gets one with its group policy, as any unit of the group would.
      setAssignments((current) => [
        ...current,
        {
          vehicleId,
          policyId: groupPolicyOf(vehicleId)?.id ?? null,
          individual: false,
          tankLiters: unitById(vehicleId)?.tankLiters ?? 0,
          usedLiters: 0,
          rejections7d: 0,
          stationException: exception,
        },
      ]);
    }
    onStationRequestHandled?.();
    onNotice(`${vehicleOf(vehicleId)?.plate} puede cargar en ${exception.station} hasta el ${formatDateLong(exception.until)}.`);
  };

  const overrideVehicle = overrideFor ? vehicleOf(overrideFor) : undefined;
  const overrideAssignment = overrideFor ? assignmentOf(overrideFor) : undefined;
  const overridePolicy = overrideFor ? policyOf(overrideFor) : null;

  return (
    <div className="limits">
      <ApiCoverageBanner page="limits" />
      <DevNote label="Pregunta de producto">
        ¿Autoconsumo tiene límites propios? De momento Límites solo cubre unidades TicketCar+: quedan fuera{' '}
        {formatCount(autoconsumoUnits)} unidades de Autoconsumo.
      </DevNote>

      <dl className="limits__summary">
        <div>
          <dt>Unidades con política</dt>
          <dd>
            {formatCount(summary.assigned)} <span>de {formatCount(fleetUnits)}</span>
          </dd>
        </div>
        <div>
          <dt>Sin política</dt>
          <dd className={summary.unassigned > 0 ? 'limits__summary-alert' : undefined}>{summary.unassigned}</dd>
        </div>
        <div>
          <dt>Excepciones vigentes</dt>
          <dd>{summary.overrides}</dd>
        </div>
        <div>
          <dt>
            Cargas rechazadas · 7 días
            <ApiTag id="lim-rejections" />
          </dt>
          <dd>{summary.rejections}</dd>
        </div>
      </dl>

      <PoliciesSection
        policies={policies}
        onCreate={() => setEditor({ policy: null })}
        onEdit={(policy) => setEditor({ policy })}
        onToggleStatus={toggleStatus}
      />

      <AssignmentsTable
        vehicles={vehicles}
        assignments={assignments}
        policies={policies}
        onReassign={reassign}
        onOverride={setOverrideFor}
        onRemoveOverride={(vehicleId) => {
          patchAssignment(vehicleId, { override: undefined });
          onNotice(`Excepción retirada de ${vehicleOf(vehicleId)?.plate}.`);
        }}
      />

      {editor && (
        <PolicyDialog policy={editor.policy} policies={policies} onClose={() => setEditor(null)} onSave={savePolicy} />
      )}

      {stationRequest && requestVehicle && (
        <StationExceptionDialog
          request={stationRequest}
          vehicle={requestVehicle}
          policy={policyOf(requestVehicle.id) ?? groupPolicyOf(requestVehicle.id)}
          onClose={() => {
            onStationRequestHandled?.();
            onNotice('Recomendación descartada: Límites no cambió.');
          }}
          onConfirm={(exception) => applyStationException(requestVehicle.id, exception)}
        />
      )}

      {overrideVehicle && overrideAssignment && overridePolicy && (
        <OverrideDialog
          vehicle={overrideVehicle}
          assignment={overrideAssignment}
          policy={overridePolicy}
          onClose={() => setOverrideFor(null)}
          onConfirm={(override) => applyOverride(overrideVehicle.id, override)}
        />
      )}
    </div>
  );
}
