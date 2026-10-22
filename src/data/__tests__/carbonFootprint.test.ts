import { describe, expect, it } from 'vitest';
import {
  createDemoCarbonFootprintRows,
  filterCarbonFootprintRows,
  summarizeCarbonFootprint,
} from '../carbonFootprint';

describe('Move for Good carbon footprint demo report', () => {
  const referenceDate = new Date(2026, 9, 22, 12);

  it('builds the fleet KPIs from the same rows shown in the report', () => {
    const rows = createDemoCarbonFootprintRows(referenceDate);
    expect(rows).toHaveLength(118);
    expect(summarizeCarbonFootprint(rows)).toEqual({
      fuelLiters: 117272.52,
      distanceKm: 133196,
      emissionsGeneratedKg: 26374.2,
      emissionsCompensatedKg: 13187.1,
    });
  });

  it('filters rows inclusively by reporting period', () => {
    const rows = createDemoCarbonFootprintRows(referenceDate);
    const filtered = filterCarbonFootprintRows(rows, { from: '2026-10-21', to: '2026-10-22' });
    expect(filtered).toHaveLength(8);
    expect(filtered.every((row) => row.date >= '2026-10-21' && row.date <= '2026-10-22')).toBe(true);
  });
});