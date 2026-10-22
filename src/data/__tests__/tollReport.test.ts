import { afterEach, describe, expect, it } from 'vitest';
import { setSessionPrincipal, DEFAULT_PRINCIPAL } from '../session';
import { createTollReportRows, filterTollReportRows, reorderTollColumns, type TollReportQuery } from '../tollReport';

afterEach(() => setSessionPrincipal(DEFAULT_PRINCIPAL));

describe('reporte dinámico de peaje', () => {
  it('mapea cruces y movimientos a los campos del modelo de Peaje', () => {
    const rows = createTollReportRows();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toEqual(expect.objectContaining({ tag: expect.any(String), unit: expect.any(String), category: expect.any(String), road: expect.any(String), kind: expect.any(String) }));
  });

  it('filtra movimientos por periodo, tipo y dato avanzado', () => {
    const rows = createTollReportRows();
    const query: TollReportQuery = {
      preset: 'last90', from: '2026-10-15', to: '2026-10-15', kinds: ['crossing'],
      filters: [{ id: 1, field: 'TAG', operator: 'Contiene', value: 'TLV-0451' }],
    };
    const filtered = filterTollReportRows(rows, query);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.tag).toBe('TLV-0451-2B');
    expect(filtered[0]!.kind).toBe('crossing');
  });

  it('reordena la selección de columnas sin perder campos', () => {
    expect(reorderTollColumns(['Fecha', 'TAG', 'Importe'], 'Importe', 'TAG')).toEqual(['Fecha', 'Importe', 'TAG']);
  });
});