import { useState } from 'react';
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

  return (
    <Modal
      open
      title="Asignar TAG a una unidad"
      subtitle={`${tag.number} · ${TOLL_TAG_TYPE_LABEL[tag.type]}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" disabled={!vehicleId} onClick={() => onAssign(vehicleId, category)}>
            Asignar TAG
          </button>
        </>
      }
    >
      {vehicles.length === 0 ? (
        <p className="policy-form__preview">Todas las unidades ya tienen un TAG de telepeaje activo.</p>
      ) : (
        <>
          <div className="policy-form__fields">
            <label className="policy-form__field">
              <span>Unidad</span>
              <select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} · {vehicle.driver}
                  </option>
                ))}
              </select>
            </label>
            <label className="policy-form__field">
              <span>Categoría vehicular</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as TollCategory)}>
                {(Object.keys(TOLL_CATEGORY_LABEL) as TollCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {TOLL_CATEGORY_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
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
