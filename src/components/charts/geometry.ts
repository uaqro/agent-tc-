export const CHART_WIDTH = 760;
export const CHART_HEIGHT = 260;

export function formatTick(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/0$/, '');
}
