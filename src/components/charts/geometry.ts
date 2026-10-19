export const CHART_WIDTH = 760;
export const CHART_HEIGHT = 260;

export const PADDING = { top: 18, right: 18, bottom: 34, left: 52 };

export const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
export const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

/** Converts a value to its vertical pixel position inside the plot area. */
export function scaleY(value: number, min: number, max: number): number {
  const ratio = (value - min) / (max - min || 1);
  return PADDING.top + PLOT_HEIGHT - ratio * PLOT_HEIGHT;
}

/** Evenly spaced x position for a category index. */
export function scaleX(index: number, count: number): number {
  if (count <= 1) return PADDING.left + PLOT_WIDTH / 2;
  return PADDING.left + (index * PLOT_WIDTH) / (count - 1);
}

/** Band centre used by category based charts such as bars. */
export function bandX(index: number, count: number): number {
  const band = PLOT_WIDTH / (count || 1);
  return PADDING.left + band * index + band / 2;
}

export function buildTicks(min: number, max: number, count: number): number[] {
  return Array.from({ length: count + 1 }, (_, i) => min + ((max - min) * i) / count);
}

export function formatTick(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/0$/, '');
}
