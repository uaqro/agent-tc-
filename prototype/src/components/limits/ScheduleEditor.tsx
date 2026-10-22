import { Input } from '@er-mobility-mx/design-system';
import { DAY_LABELS } from '../../data/limits';
import type { ScheduleBlock, TimeRange } from '../../types/limits';

const DEFAULT_RANGE: TimeRange = { from: '09:00', to: '18:00' };
const WEEKDAYS = [0, 1, 2, 3, 4];
const WEEKEND = [5, 6];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const newBlock = (): ScheduleBlock => ({ days: [], ranges: [{ ...DEFAULT_RANGE }] });

/** Problems of one block: no days, no ranges, a range that does not start before it ends, or overlaps. */
export function blockErrors(block: ScheduleBlock): string[] {
  const errors: string[] = [];
  if (block.days.length === 0) errors.push('selecciona al menos un día');
  if (block.ranges.length === 0) errors.push('agrega al menos un rango');
  if (block.ranges.some((range) => !range.from || !range.to || range.from >= range.to)) {
    errors.push('cada rango debe iniciar antes de terminar');
  }
  const sorted = [...block.ranges].sort((left, right) => left.from.localeCompare(right.from));
  if (sorted.some((range, index) => index > 0 && range.from < sorted[index - 1].to)) {
    errors.push('los rangos no deben traslaparse');
  }
  return errors;
}

interface ScheduleEditorProps {
  blocks: ScheduleBlock[];
  onChange: (blocks: ScheduleBlock[]) => void;
}

export function ScheduleEditor({ blocks, onChange }: ScheduleEditorProps) {
  const patchBlock = (index: number, changes: Partial<ScheduleBlock>) =>
    onChange(blocks.map((block, current) => (current === index ? { ...block, ...changes } : block)));

  /** A day belongs to one block only: choosing it here takes it from the others. */
  const setDays = (index: number, days: number[]) =>
    onChange(
      blocks.map((block, current) =>
        current === index ? { ...block, days } : { ...block, days: block.days.filter((day) => !days.includes(day)) },
      ),
    );

  const toggleDay = (index: number, day: number) => {
    const days = blocks[index].days;
    setDays(index, days.includes(day) ? days.filter((item) => item !== day) : [...days, day]);
  };

  const updateRange = (index: number, rangeIndex: number, changes: Partial<TimeRange>) =>
    patchBlock(index, {
      ranges: blocks[index].ranges.map((range, current) => (current === rangeIndex ? { ...range, ...changes } : range)),
    });

  const addRange = (index: number) => {
    const ranges = blocks[index].ranges;
    const last = ranges[ranges.length - 1];
    patchBlock(index, { ranges: [...ranges, last && last.to < '23:00' ? { from: last.to, to: '23:59' } : { ...DEFAULT_RANGE }] });
  };

  return (
    <div className="schedule">
      {blocks.map((block, index) => {
        const errors = blockErrors(block);
        const title = `Horario ${index + 1}`;

        return (
          <section className="schedule__block" key={index} aria-label={title}>
            <header className="schedule__head">
              <h4>{title}</h4>
              {blocks.length > 1 && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(blocks.filter((_, current) => current !== index))}>
                  Quitar horario
                </button>
              )}
            </header>

            <p className="policy-form__label">Días</p>
            <div className="policy-form__pills schedule__days">
              {DAY_LABELS.map((label, day) => {
                const active = block.days.includes(day);
                const elsewhere = !active && blocks.some((other, current) => current !== index && other.days.includes(day));
                return (
                  <button type="button" key={label} className={active ? 'is-active' : elsewhere ? 'is-elsewhere' : ''}
                    aria-pressed={active} title={elsewhere ? 'Está en otro horario; se moverá a este' : undefined}
                    onClick={() => toggleDay(index, day)}>
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="schedule__quick">
              <button type="button" onClick={() => setDays(index, WEEKDAYS)}>Lun–Vie</button>
              <button type="button" onClick={() => setDays(index, WEEKEND)}>Fin de semana</button>
              <button type="button" onClick={() => setDays(index, ALL_DAYS)}>Todos</button>
              <button type="button" onClick={() => setDays(index, [])} disabled={block.days.length === 0}>Limpiar</button>
            </div>

            <p className="policy-form__label">Se permite transaccionar de</p>
            <div className="schedule__ranges">
              {block.ranges.map((range, rangeIndex) => (
                <div className="schedule__range" key={rangeIndex}>
                  <Input
                    type="time"
                    size="sm"
                    ariaLabel={`${title} · rango ${rangeIndex + 1} desde`}
                    value={range.from}
                    onChange={(value) => updateRange(index, rangeIndex, { from: value })}
                    style={{ width: '140px' }}
                  />
                  <span aria-hidden="true">a</span>
                  <Input
                    type="time"
                    size="sm"
                    ariaLabel={`${title} · rango ${rangeIndex + 1} hasta`}
                    value={range.to}
                    onChange={(value) => updateRange(index, rangeIndex, { to: value })}
                    style={{ width: '140px' }}
                  />
                  <button type="button" className="schedule__remove" aria-label={`Quitar rango ${rangeIndex + 1} de ${title}`}
                    disabled={block.ranges.length === 1}
                    onClick={() => patchBlock(index, { ranges: block.ranges.filter((_, current) => current !== rangeIndex) })}>
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn--ghost btn--sm schedule__add" onClick={() => addRange(index)}>
                + Agregar rango
              </button>
            </div>

            {errors.length > 0 && <p className="policy-form__warning">{title}: {errors.join(', ')}.</p>}
          </section>
        );
      })}

      <button type="button" className="btn btn--secondary btn--sm" onClick={() => onChange([...blocks, newBlock()])}>
        + Agregar otro horario para otros días
      </button>
    </div>
  );
}
