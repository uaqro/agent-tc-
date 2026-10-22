import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { fleetVehicles } from '../../../data/dispersion';
import { limitPolicies, unitAssignments } from '../../../data/limits';
import { AssignmentsTable } from '../AssignmentsTable';

const assignedVehicles = fleetVehicles.filter((vehicle) =>
  unitAssignments.some((assignment) => assignment.vehicleId === vehicle.id),
);
const assignmentProps = {
  vehicles: assignedVehicles,
  assignments: unitAssignments,
  policies: limitPolicies,
  onReassign: vi.fn(),
  onOverride: vi.fn(),
  onRemoveOverride: vi.fn(),
};

describe('AssignmentsTable Flow table', () => {
  it('preserves assigned units, policy controls, usage, and exception actions', () => {
    const html = renderToStaticMarkup(createElement(AssignmentsTable, assignmentProps));
    const table = html.match(/<table\b[\s\S]*?<\/table>/)?.[0];

    expect(table).toBeDefined();
    expect(table).toContain('<caption data-sr-only="">Asignación por unidad</caption>');
    expect(table?.match(/<tr\b/g)).toHaveLength(assignedVehicles.length + 1);
    expect(table).toContain('aria-labelledby="assignment-vehicle-');
    expect(table).toContain('del límite usado');
    expect(table).toContain('Excepción temporal');
    expect(table).not.toContain('data-sortable');
  });

  it('keeps the empty-fleet message when no units are available', () => {
    const html = renderToStaticMarkup(
      createElement(AssignmentsTable, {
        ...assignmentProps,
        vehicles: [],
      }),
    );

    expect(html).toContain('Aún no hay unidades en la flota');
    expect(html).not.toContain('<table');
  });
});
