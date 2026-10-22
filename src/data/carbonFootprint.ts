import { today } from '../domain/demo/clock';

export interface CarbonFootprintRow {
  id: string;
  date: string;
  unit: string;
  type: 'VEHÍCULO' | 'CAMIONETA' | 'CAMIÓN';
  brand: string;
  model: string;
  year: number;
  fuelLiters: number;
  distanceKm: number;
  emissionsGeneratedKg: number;
  emissionsCompensatedKg: number;
}

export interface CarbonFootprintTotals {
  fuelLiters: number;
  distanceKm: number;
  emissionsGeneratedKg: number;
  emissionsCompensatedKg: number;
}

export interface CarbonFootprintFilters {
  from: string;
  to: string;
}

export const MOVE_FOR_GOOD_DEMO_METRICS = {
  recycledWasteBags: 958,
  mobilePhonesCharged: 910819,
};

const DEMO_TOTALS: CarbonFootprintTotals = {
  fuelLiters: 117272.52,
  distanceKm: 133196,
  emissionsGeneratedKg: 26374.2,
  emissionsCompensatedKg: 13187.1,
};

const VEHICLES = [
  { type: 'VEHÍCULO', brand: 'TOYOTA', model: 'COROLLA XLE' },
  { type: 'CAMIONETA', brand: 'FORD', model: 'RANGER' },
  { type: 'VEHÍCULO', brand: 'NISSAN', model: 'KICKS PLAY' },
  { type: 'VEHÍCULO', brand: 'MAZDA', model: 'CX-5 AWD' },
  { type: 'CAMIONETA', brand: 'HONDA', model: 'HR-V SPORT' },
  { type: 'VEHÍCULO', brand: 'KIA', model: 'NIRO' },
  { type: 'CAMIONETA', brand: 'CHEVROLET', model: 'SILVERADO' },
  { type: 'CAMIÓN', brand: 'ISUZU', model: 'ELF 400' },
] as const;

const round2 = (value: number) => Math.round(value * 100) / 100;

function distributeTotal(total: number, weights: number[]): number[] {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const values = weights.map((weight, index) => index === weights.length - 1 ? 0 : round2(total * weight / weightTotal));
  const assigned = values.reduce((sum, value) => sum + value, 0);
  values[values.length - 1] = round2(total - assigned);
  return values;
}

function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function createDemoCarbonFootprintRows(referenceDate = today()): CarbonFootprintRow[] {
  const count = 118;
  const weights = Array.from({ length: count }, (_, index) => 70 + ((index * 37) % 61));
  const liters = distributeTotal(DEMO_TOTALS.fuelLiters, weights);
  const distances = distributeTotal(DEMO_TOTALS.distanceKm, weights.map((weight, index) => weight + ((index * 19) % 43)));
  const emissions = distributeTotal(DEMO_TOTALS.emissionsGeneratedKg, weights.map((weight, index) => weight + ((index * 13) % 29)));
  const compensated = distributeTotal(DEMO_TOTALS.emissionsCompensatedKg, weights);

  return Array.from({ length: count }, (_, index) => {
    const vehicle = VEHICLES[index % VEHICLES.length]!;
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    date.setDate(date.getDate() - (index % 30));
    return {
      id: `carbon-${index + 1}`,
      date: isoDay(date),
      unit: String(146035 + index * 137).padStart(8, '0'),
      type: vehicle.type,
      brand: vehicle.brand,
      model: vehicle.model,
      year: 2022 + ((index * 3) % 5),
      fuelLiters: liters[index]!,
      distanceKm: distances[index]!,
      emissionsGeneratedKg: emissions[index]!,
      emissionsCompensatedKg: compensated[index]!,
    };
  }).sort((left, right) => right.date.localeCompare(left.date) || left.unit.localeCompare(right.unit));
}

export function filterCarbonFootprintRows(rows: CarbonFootprintRow[], filters: CarbonFootprintFilters): CarbonFootprintRow[] {
  return rows.filter((row) => row.date >= filters.from && row.date <= filters.to);
}

export function summarizeCarbonFootprint(rows: CarbonFootprintRow[]): CarbonFootprintTotals {
  return rows.reduce((totals, row) => ({
    fuelLiters: round2(totals.fuelLiters + row.fuelLiters),
    distanceKm: round2(totals.distanceKm + row.distanceKm),
    emissionsGeneratedKg: round2(totals.emissionsGeneratedKg + row.emissionsGeneratedKg),
    emissionsCompensatedKg: round2(totals.emissionsCompensatedKg + row.emissionsCompensatedKg),
  }), { fuelLiters: 0, distanceKm: 0, emissionsGeneratedKg: 0, emissionsCompensatedKg: 0 });
}