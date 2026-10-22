import { useState } from 'react';
import { Checkbox, Field, Select } from '@er-mobility-mx/design-system';
import { OVERRIDE_DURATIONS, overrideUntil, stationsLabel } from '../../data/limits';
import type { Vehicle } from '../../types/dispersion';
import type { LimitPolicy, OverrideDuration, StationException, StationRecommendationRequest } from '../../types/limits';
import { formatDateLong, formatMoney } from '../../utils/format';
import { Modal } from '../ui/Modal';
import '../company/CompanyDialogs.css';
import './PolicyDialog.css';

interface StationExceptionDialogProps {
  request: StationRecommendationRequest;
  vehicle: Vehicle;
  /** Policy the unit follows today. Null when it fuels without locks. */
  policy: LimitPolicy | null;
  onClose: () => void;
  onConfirm: (exception: StationException) => void;
}

/**
 * Confirmation step for "Aplicar en Límites". The optimizer only proposes; this dialog is where a person with
 * permission on Límites decides, and nothing changes until they tick the confirmation and press the button.
 */
export function StationExceptionDialog({ request, vehicle, policy, onClose, onConfirm }: StationExceptionDialogProps) {
  const [duration, setDuration] = useState<OverrideDuration>('period');
  const [confirmed, setConfirmed] = useState(false);
  const until = overrideUntil(duration, policy?.period ?? 'month');
  const unrestricted = policy === null || policy.stationSubnetId === null;
  const durationOptions = OVERRIDE_DURATIONS.map((option) => ({ value: option.id, label: option.label }));

  return (
    <Modal
      open
      title="Aplicar recomendación de estación"
      subtitle={`${vehicle.plate} · ${vehicle.driver} · ${request.cardLabel}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!confirmed}
            onClick={() => onConfirm({ station: request.toStation, until, source: `Optimizador · ${request.cardLabel}` })}
          >
            Confirmar excepción
          </button>
        </>
      }
    >
      <dl className="policy-form__summary">
        <div>
          <dt>Carga hoy en</dt>
          <dd>{request.fromStation}</dd>
        </div>
        <div>
          <dt>Estación recomendada</dt>
          <dd>{request.toStation}</dd>
        </div>
        <div>
          <dt>Ahorro bruto estimado</dt>
          <dd>{formatMoney(request.estimatedSavingMXN)} en el periodo analizado</dd>
        </div>
        <div>
          <dt>Política actual</dt>
          <dd>{policy ? `${policy.name} · ${stationsLabel(policy)}` : 'Sin política: carga en toda la red'}</dd>
        </div>
      </dl>

      {unrestricted ? (
        <p className="policy-form__preview">
          La política de esta unidad ya permite toda la red: la recomendación se puede seguir sin cambiar sus límites. Si
          confirmas, solo queda registrada la estación recomendada en la asignación.
        </p>
      ) : (
        <p className="policy-form__preview">
          La política limita las cargas a una subred de estaciones. La excepción permite además {request.toStation} a esta
          unidad, sin tocar la política del grupo.
        </p>
      )}

      <Field label="Vigencia" htmlFor="station-exception-duration" help={`Hasta el ${formatDateLong(until)}.`}>
        <Select
          id="station-exception-duration"
          options={durationOptions}
          value={duration}
          onChange={(value) => {
            const option = OVERRIDE_DURATIONS.find((candidate) => candidate.id === value);
            if (option) setDuration(option.id);
          }}
        />
      </Field>

      <Checkbox
        checked={confirmed}
        label={`Confirmo que quiero permitir ${request.toStation} a ${vehicle.plate}. El optimizador no aplica este cambio: lo aplico yo desde Límites.`}
        onChange={setConfirmed}
      />
    </Modal>
  );
}
