import { useState } from 'react';
import { Button, DatePicker, Field, Select, Textarea } from '@er-mobility-mx/design-system';
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
  const vehicleOptions = vehicles.map((vehicle) => ({
    value: vehicle.id,
    label: `${vehicle.plate} · ${vehicle.driver}`,
  }));
  const systemOptions = MAINTENANCE_SYSTEMS.map((option) => ({ value: option, label: option }));
  const workshopOptions = WORKSHOPS.map((option) => ({ value: option, label: option }));

  return (
    <Modal
      open
      title="Crear orden de servicio"
      subtitle={`Folio ${nextFolio} · se envía al taller para cotización`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
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
          </Button>
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
          <Field label="Unidad" htmlFor="service-order-vehicle" required>
            <Select
              id="service-order-vehicle"
              options={vehicleOptions}
              value={vehicleId}
              placeholder="Elige una unidad"
              onChange={(value) => {
                if (vehicleOptions.some((option) => option.value === value)) setVehicleId(value);
              }}
            />
          </Field>
          <Field label="Sistema" htmlFor="service-order-system">
            <Select
              id="service-order-system"
              options={systemOptions}
              value={system}
              onChange={(value) => {
                if (MAINTENANCE_SYSTEMS.includes(value)) setSystem(value);
              }}
            />
          </Field>
          <Field label="Taller" htmlFor="service-order-workshop">
            <Select
              id="service-order-workshop"
              options={workshopOptions}
              value={workshop}
              onChange={(value) => {
                if (WORKSHOPS.includes(value)) setWorkshop(value);
              }}
            />
          </Field>
          <Field label="Fecha de ingreso" htmlFor="service-order-opened" required>
            <DatePicker id="service-order-opened" value={opened} onChange={setOpened} />
          </Field>
          <Field label="Fecha promesa" htmlFor="service-order-promised" required>
            <DatePicker
              id="service-order-promised"
              value={promised}
              min={opened || undefined}
              onChange={setPromised}
            />
          </Field>
        </div>

        <div className="service-form__description">
          <Field label="Descripción del servicio" htmlFor="service-order-description" required>
            <Textarea
              id="service-order-description"
              rows={3}
              value={description}
              placeholder="Ej. Ruido al frenar, revisar balatas y discos delanteros"
              required
              onChange={setDescription}
            />
          </Field>
        </div>

        {!datesValid && (
          <p className="service-form__error" role="alert">
            La fecha promesa no puede ser anterior a la fecha de ingreso.
          </p>
        )}
      </div>
    </Modal>
  );
}
