import { useState } from 'react';
import { Button, Field, Input, Select } from '@er-mobility-mx/design-system';
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
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!valid}
            onClick={() => onSave(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])))}
          >
            {record ? 'Guardar cambios' : 'Agregar'}
          </Button>
        </>
      }
    >
      <div className="company-form__grid">
        {catalog.fields.map((field) => {
          const value = values[field.key] ?? '';
          const setValue = (next: string) => setValues((current) => ({ ...current, [field.key]: next }));

          if (field.type === 'text') {
            return (
              <Field key={field.key} label={field.label} htmlFor={`parameter-record-${field.key}`} required={field.required}>
                <Input
                  id={`parameter-record-${field.key}`}
                  value={value}
                  placeholder={field.placeholder}
                  required={field.required}
                  onChange={setValue}
                />
              </Field>
            );
          }

          const options = field.type === 'ref' ? refOptions(field.ref ?? '', value) : field.options ?? [];
          const selectOptions = [
            ...(field.type === 'ref' && !field.required ? [{ value: '', label: 'Sin asignar' }] : []),
            ...options.map((option) => ({ value: option, label: option })),
          ];
          return (
            <Field key={field.key} label={field.label} htmlFor={`parameter-record-${field.key}`} required={field.required}>
              <Select
                id={`parameter-record-${field.key}`}
                options={selectOptions}
                value={value}
                placeholder={field.type === 'ref' && field.required ? 'Elige una opción' : undefined}
                onChange={(next) => {
                  if (selectOptions.some((option) => option.value === next)) setValue(next);
                }}
              />
            </Field>
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
