import { PERIOD_PRESETS, periodForPreset, type PeriodPreset, type ReportPeriod } from '../../domain/reporting/periods';
import './ReportPeriodPicker.css';

interface ReportPeriodPickerProps {
  value: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}

export function ReportPeriodPicker({ value, onChange }: ReportPeriodPickerProps) {
  const valid = value.from !== '' && value.to !== '' && value.from <= value.to;

  const selectPreset = (preset: PeriodPreset) => {
    if (preset === 'custom') {
      onChange({ ...value, preset });
      return;
    }
    onChange(periodForPreset(preset));
  };

  return (
    <fieldset className="report-period">
      <legend>Período</legend>
      <div className="report-period__presets" role="group" aria-label="Período de consulta">
        {PERIOD_PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.id}
            aria-pressed={value.preset === preset.id}
            className={value.preset === preset.id ? 'is-active' : ''}
            onClick={() => selectPreset(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {value.preset === 'custom' && (
        <div className="report-period__dates">
          <label>
            <span>Desde</span>
            <input
              type="date"
              value={value.from}
              max={value.to || undefined}
              onChange={(event) => onChange({ ...value, preset: 'custom', from: event.target.value })}
            />
          </label>
          <label>
            <span>Hasta</span>
            <input
              type="date"
              value={value.to}
              min={value.from || undefined}
              onChange={(event) => onChange({ ...value, preset: 'custom', to: event.target.value })}
            />
          </label>
        </div>
      )}
      {!valid && <p className="report-period__error" role="alert">Elige un rango válido: “Desde” no puede ser posterior a “Hasta”.</p>}
    </fieldset>
  );
}