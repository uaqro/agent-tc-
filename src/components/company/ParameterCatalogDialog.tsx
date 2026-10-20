import { useState } from 'react';
import { Field, Input, Select } from '@er-mobility-mx/design-system';
import type { ParameterCatalog, ParameterField } from '../../data/company';
import { CloseIcon, PlusIcon } from '../icons/Icons';
import { Modal } from '../ui/Modal';
import '../limits/PolicyDialog.css';
import './CompanyDialogs.css';

interface ParameterCatalogDialogProps {
  catalogs: ParameterCatalog[];
  onClose: () => void;
  onCreate: (catalog: ParameterCatalog) => void;
}

interface DraftField {
  label: string;
  /** `text`, or the id of a catalog to reference. */
  source: string;
  required: boolean;
}

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Defines a new parameter catalog: its name and the fields each record carries. */
export function ParameterCatalogDialog({ catalogs, onClose, onCreate }: ParameterCatalogDialogProps) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<DraftField[]>([
    { label: 'Nombre', source: 'text', required: true },
    { label: '', source: 'text', required: false },
  ]);

  const named = fields.filter((field) => field.label.trim());
  const labels = named.map((field) => field.label.trim().toLowerCase());
  const repeatedField = labels.length !== new Set(labels).size;
  const takenName = catalogs.some((catalog) => catalog.label.toLowerCase() === label.trim().toLowerCase());
  const valid = label.trim() !== '' && named.length > 0 && !repeatedField && !takenName;

  const updateField = (index: number, patch: Partial<DraftField>) =>
    setFields((current) => current.map((field, position) => (position === index ? { ...field, ...patch } : field)));

  const create = () => {
    const id = `${slug(label) || 'catalogo'}-${Date.now().toString(36)}`;
    const built: ParameterField[] = named.map((field, index) => ({
      key: `${slug(field.label) || 'campo'}-${index}`,
      label: field.label.trim(),
      type: field.source === 'text' ? 'text' : 'ref',
      ref: field.source === 'text' ? undefined : field.source,
      required: index === 0 || field.required,
    }));
    onCreate({
      id,
      label: label.trim(),
      description: description.trim() || 'Catálogo personalizado de la empresa.',
      titleField: built[0].key,
      fields: built,
      records: [],
      custom: true,
    });
  };

  return (
    <Modal
      open
      size="lg"
      title="Nuevo catálogo de parámetros"
      subtitle="Crea un catálogo propio (p. ej. Proyectos, Clientes o Turnos) y úsalo como referencia en otros."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" disabled={!valid} onClick={create}>
            Crear catálogo
          </button>
        </>
      }
    >
      <div className="company-form__grid">
        <Field label="Nombre del catálogo" htmlFor="parameter-catalog-name" required>
          <Input
            id="parameter-catalog-name"
            value={label}
            placeholder="Ej. Proyectos"
            required
            onChange={setLabel}
          />
        </Field>
        <Field label="Descripción" htmlFor="parameter-catalog-description">
          <Input
            id="parameter-catalog-description"
            value={description}
            placeholder="Para qué se usa"
            onChange={setDescription}
          />
        </Field>
      </div>

      <fieldset className="policy-form__block company-form__fields">
        <legend>Campos de cada registro</legend>
        <ol className="company-form__field-list">
          {fields.map((field, index) => (
            <li key={index}>
              <Field label={`Nombre del campo ${index + 1}`} htmlFor={`parameter-catalog-field-${index}`} required={index === 0}>
                <Input
                  id={`parameter-catalog-field-${index}`}
                  value={field.label}
                  placeholder={index === 0 ? 'Campo principal' : 'Nombre del campo'}
                  required={index === 0}
                  onChange={(value) => updateField(index, { label: value })}
                />
              </Field>
              <Field label={`Tipo del campo ${index + 1}`} htmlFor={`parameter-catalog-source-${index}`}>
                <Select
                  id={`parameter-catalog-source-${index}`}
                  options={[
                    { value: 'text', label: 'Texto libre' },
                    ...catalogs.map((catalog) => ({
                      value: catalog.id,
                      label: `Referencia a ${catalog.label}`,
                    })),
                  ]}
                  value={field.source}
                  onChange={(source) => {
                    if (source === 'text' || catalogs.some((catalog) => catalog.id === source)) {
                      updateField(index, { source });
                    }
                  }}
                />
              </Field>
              <label className="company-form__check">
                <input
                  type="checkbox"
                  checked={index === 0 || field.required}
                  disabled={index === 0}
                  onChange={(event) => updateField(index, { required: event.target.checked })}
                />
                Obligatorio
              </label>
              <button
                type="button"
                className="company-form__remove"
                aria-label={`Quitar campo ${index + 1}`}
                disabled={index === 0}
                onClick={() => setFields((current) => current.filter((_, position) => position !== index))}
              >
                <CloseIcon width={14} height={14} />
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={fields.length >= 8}
          onClick={() => setFields((current) => [...current, { label: '', source: 'text', required: false }])}
        >
          <PlusIcon width={14} height={14} />
          Agregar campo
        </button>
        <p className="company-form__hint">El primer campo es el nombre con el que el registro aparece en listas y referencias.</p>
      </fieldset>

      {takenName && (
        <p className="company-form__error" role="alert">
          Ya existe un catálogo con ese nombre.
        </p>
      )}
      {repeatedField && (
        <p className="company-form__error" role="alert">
          Dos campos tienen el mismo nombre.
        </p>
      )}
    </Modal>
  );
}
