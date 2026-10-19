import { useState } from 'react';
import type { Vehicle } from '../../types/dispersion';
import {
  MAINTENANCE_SYSTEMS,
  ORDER_KIND_LABEL,
  WORKSHOPS,
  type OrderKind,
  type ServiceOrder,
} from '../../data/maintenance';
import { today as businessToday } from '../../domain/demo/clock';
import { Modal } from '../ui/Modal';
import '../limits/PolicyDialog.css';
import './ServiceOrderDialog.css';

interface ServiceOrderDialogProps {
  vehicles: Vehicle[];
  initialVehicleId?: string;
  nextFolio: string;
  onClose: () => void;
  onCreate: (order: ServiceOrder) => void;
}

const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function ServiceOrderDialog({ vehicles, initialVehicleId, nextFolio, onClose, onCreate }: ServiceOrderDialogProps) {
  const today = toISODate(businessToday());
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? '');
  const [kind, setKind] = useState<OrderKind>('preventive');
  const [system, setSystem] = useState(MAINTENANCE_SYSTEMS[0]);
  const [workshop, setWorkshop] = useState(WORKSHOPS[0]);
  const [opened, setOpened] = useState(today);
  const [promised, setPromised] = useState(today);
  const [description, setDescription] = useState('');

  const datesValid = opened !== '' && promised !== '' && promised >= opened;
  const valid = vehicleId !== '' && description.trim() !== '' && datesValid;

  return (
    <Modal
      open
      title="Crear orden de servicio"
      subtitle={`Folio ${nextFolio} · se envía al taller para cotización`}
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
            onClick={() =>
              onCreate({
                folio: nextFolio,
                vehicleId,
                kind,
                system,
                workshop,
                status: 'scheduled',
                opened,
                promised,
                costMXN: 0,
                description: description.trim(),
              })
            }
          >
            Crear orden
          </button>
        </>
      }
    >
      <div className="service-form">
        <div className="policy-form__pills" role="group" aria-label="Tipo de servicio">
          {(Object.keys(ORDER_KIND_LABEL) as OrderKind[]).map((option) => (
            <button
              type="button"
              key={option}
              className={kind === option ? 'is-active' : ''}
              aria-pressed={kind === option}
              onClick={() => setKind(option)}
            >
              {ORDER_KIND_LABEL[option]}
            </button>
          ))}
        </div>

        <div className="service-form__grid">
          <label className="policy-form__field">
            <span>Unidad</span>
            <select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
              <option value="" disabled>
                Elige una unidad
              </option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} · {vehicle.driver}
                </option>
              ))}
            </select>
          </label>
          <label className="policy-form__field">
            <span>Sistema</span>
            <select value={system} onChange={(event) => setSystem(event.target.value)}>
              {MAINTENANCE_SYSTEMS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="policy-form__field">
            <span>Taller</span>
            <select value={workshop} onChange={(event) => setWorkshop(event.target.value)}>
              {WORKSHOPS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="policy-form__field">
            <span>Fecha de ingreso</span>
            <input type="date" value={opened} onChange={(event) => setOpened(event.target.value)} />
          </label>
          <label className="policy-form__field">
            <span>Fecha promesa</span>
            <input type="date" value={promised} min={opened || undefined} onChange={(event) => setPromised(event.target.value)} />
          </label>
        </div>

        <label className="policy-form__field service-form__description">
          <span>Descripción del servicio</span>
          <textarea
            rows={3}
            value={description}
            placeholder="Ej. Ruido al frenar, revisar balatas y discos delanteros"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {!datesValid && (
          <p className="service-form__error" role="alert">
            La fecha promesa no puede ser anterior a la fecha de ingreso.
          </p>
        )}
      </div>
    </Modal>
  );
}
