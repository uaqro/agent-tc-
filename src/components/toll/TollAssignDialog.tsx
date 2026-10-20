import { useState } from 'react';
import { Button, Field, Select } from '@er-mobility-mx/design-system';
import type { Vehicle } from '../../types/dispersion';
import type { TollCategory, TollTag } from '../../types/toll';
import { TOLL_CATEGORY_LABEL, TOLL_TAG_TYPE_LABEL } from '../../data/toll';
import { Modal } from '../ui/Modal';
import '../limits/PolicyDialog.css';

interface TollAssignDialogProps {
  tag: TollTag;
  /** Units without a working toll tag. */
  vehicles: Vehicle[];
  onClose: () => void;
  onAssign: (vehicleId: string, category: TollCategory) => void;
}

export function TollAssignDialog({ tag, vehicles, onClose, onAssign }: TollAssignDialogProps) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '');
  const [category, setCategory] = useState<TollCategory>(tag.category);
  const vehicleOptions = vehicles.map((vehicle) => ({
    value: vehicle.id,
    label: `${vehicle.plate} · ${vehicle.driver}`,
  }));
  const categoryOptions = (Object.keys(TOLL_CATEGORY_LABEL) as TollCategory[]).map((key) => ({
    value: key,
    label: TOLL_CATEGORY_LABEL[key],
  }));

  return (
    <Modal
      open
      title="Asignar TAG a una unidad"
      subtitle={`${tag.number} · ${TOLL_TAG_TYPE_LABEL[tag.type]}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!vehicleId} onClick={() => onAssign(vehicleId, category)}>
            Asignar TAG
          </Button>
        </>
      }
    >
      {vehicles.length === 0 ? (
        <p className="policy-form__preview">Todas las unidades ya tienen un TAG de telepeaje activo.</p>
      ) : (
        <>
          <div className="policy-form__fields">
            <Field label="Unidad" htmlFor="toll-assign-vehicle">
              <Select id="toll-assign-vehicle" options={vehicleOptions} value={vehicleId} onChange={setVehicleId} />
            </Field>
            <Field label="Categoría vehicular" htmlFor="toll-assign-category">
              <Select
                id="toll-assign-category"
                options={categoryOptions}
                value={category}
                onChange={(value) => {
                  const option = categoryOptions.find((candidate) => candidate.value === value);
                  if (option) setCategory(option.value);
                }}
              />
            </Field>
          </div>
          <p className="policy-form__preview policy-form__preview--spaced">
            La categoría debe coincidir con los ejes de la unidad: la caseta cobra según la categoría registrada en el TAG. El
            TAG toma la política de peaje del grupo de la unidad.
          </p>
        </>
      )}
    </Modal>
  );
}
