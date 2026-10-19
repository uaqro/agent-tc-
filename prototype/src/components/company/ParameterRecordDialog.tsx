import { useState } from 'react';
import type { ParameterCatalog, ParameterRecord } from '../../data/company';
import { Modal } from '../ui/Modal';
import '../limits/PolicyDialog.css';
import './CompanyDialogs.css';

interface ParameterRecordDialogProps {
  catalog: ParameterCatalog;
  /** Every catalog, so `ref` fields can list the active records of the catalog they point to. */
  catalogs: ParameterCatalog[];
  record?: ParameterRecord;
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
}

/** Renders the form from the catalog's field definitions, so any catalog — built-in or custom — gets an editor. */
export function ParameterRecordDialog({ catalog, catalogs, record, onClose, onSave }: ParameterRecordDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      catalog.fields.map((field) => [field.key, record?.values[field.key] ?? (field.type === 'select' ? field.options?.[0] ?? '' : '')]),
    ),
  );

  const title = catalog.fields.find((field) => field.key === catalog.titleField);
  const titleValue = values[catalog.titleField]?.trim().toLowerCase() ?? '';
  const duplicate =
    titleValue !== '' &&
    catalog.records.some((candidate) => candidate.id !== record?.id && candidate.values[catalog.titleField]?.trim().toLowerCase() === titleValue);
  const valid = catalog.fields.every((field) => !field.required || values[field.key]?.trim()) && !duplicate;

  const refOptions = (catalogId: string, current: string) => {
    const source = catalogs.find((candidate) => candidate.id === catalogId);
    if (!source) return [];
    const names = source.records.filter((candidate) => candidate.active).map((candidate) => candidate.values[source.titleField]);
    return current && !names.includes(current) ? [current, ...names] : names;
  };

  return (
    <Modal
      open
      title={record ? `Editar · ${record.values[catalog.titleField]}` : `Nuevo registro · ${catalog.label}`}
      subtitle={catalog.description}
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
            onClick={() => onSave(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])))}
          >
            {record ? 'Guardar cambios' : 'Agregar'}
          </button>
        </>
      }
    >
      <div className="company-form__grid">
        {catalog.fields.map((field) => {
          const value = values[field.key] ?? '';
          const setValue = (next: string) => setValues((current) => ({ ...current, [field.key]: next }));
          const label = `${field.label}${field.required ? ' *' : ''}`;

          if (field.type === 'text') {
            return (
              <label key={field.key} className="policy-form__field">
                <span>{label}</span>
                <input value={value} placeholder={field.placeholder} onChange={(event) => setValue(event.target.value)} />
              </label>
            );
          }

          const options = field.type === 'ref' ? refOptions(field.ref ?? '', value) : field.options ?? [];
          return (
            <label key={field.key} className="policy-form__field">
              <span>{label}</span>
              <select value={value} onChange={(event) => setValue(event.target.value)}>
                {field.type === 'ref' && (
                  <option value="" disabled={field.required}>
                    {field.required ? 'Elige una opción' : 'Sin asignar'}
                  </option>
                )}
                {options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      {duplicate && title && (
        <p className="company-form__error" role="alert">
          Ya existe un registro con ese {title.label.toLowerCase()} en {catalog.label}.
        </p>
      )}
    </Modal>
  );
}
