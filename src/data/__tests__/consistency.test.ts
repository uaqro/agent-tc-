/**
 * One fuelling dataset for the whole portal: with the same period and the same scope, the total spend is identical in
 * the Resumen, the consolidated report and the optimizer. They all read the padrón's dispatches.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { buildConsolidatedReport } from '../../domain/consolidated-report/build';
import { DEFAULT_FILTERS, type GlobalFilters } from '../../domain/filters/types';
import { applyOptimizerFilters, DEFAULT_OPTIMIZER_FILTERS } from '../../domain/optimizer/filters';
import { computeOptimizerKpis } from '../../domain/optimizer/metrics';
import { DEFAULT_ASSUMPTIONS } from '../../domain/optimizer/rules';
import type { PortalPrincipal } from '../../domain/rbac/scope';
import { portalPrincipals } from '../access';
import { CLIENT_ACCOUNT_ID, clientOrgTree } from '../client';
import { reportPrincipal } from '../consolidatedReport';
import { optimizerWindows, scopedOptimizerLoads } from '../optimizer';
import { DEFAULT_PRINCIPAL, setSessionPrincipal } from '../session';
import { periodSpend } from '../summary';

/** Friday 16 October 2026, 11:00: the business date. The last 30 closed days run from 16 September to 15 October. */
const AT = new Date(2026, 9, 16, 11, 0).getTime();
const RANGE = { from: '2026-09-16', to: '2026-10-15' };

afterEach(() => setSessionPrincipal(DEFAULT_PRINCIPAL));

function spendEverywhere(filters: GlobalFilters = DEFAULT_FILTERS) {
  const resumen = periodSpend(filters, AT);

  const report = buildConsolidatedReport(
    { type: 'operativo', period: RANGE, scope: { accountId: CLIENT_ACCOUNT_ID, kind: 'cuenta', value: null } },
    reportPrincipal(),
    AT,
    { orgTree: clientOrgTree },
  );
  if ('error' in report) throw new Error(report.error);
  const reportSpend = filters.product === 'todos' ? report.kpis.amountMxn : report.kpis.bySource[filters.product].amountMxn;

  const window = optimizerWindows(AT).find((option) => option.id === '30')!;
  const loads = applyOptimizerFilters(scopedOptimizerLoads(AT), {
    ...DEFAULT_OPTIMIZER_FILTERS,
    fromDay: window.fromDay,
    toDay: window.toDay,
  }).filter((load) => filters.product === 'todos' || load.product === filters.product);
  const optimizer = computeOptimizerKpis(loads, DEFAULT_ASSUMPTIONS, 'bruto', 30).spend;

  return { resumen, report: reportSpend, optimizer };
}

const expectSame = ({ resumen, report, optimizer }: ReturnType<typeof spendEverywhere>) => {
  expect(resumen).toBeGreaterThan(0);
  expect(report).toBeCloseTo(resumen, 2);
  expect(optimizer).toBeCloseTo(resumen, 2);
};

describe('the same spend in Resumen, consolidated report and optimizer', () => {
  it('for the whole account, last 30 closed days', () => {
    expectSame(spendEverywhere());
  });

  it('for each product on its own', () => {
    expectSame(spendEverywhere({ ...DEFAULT_FILTERS, product: 'ticketcar_plus' }));
    expectSame(spendEverywhere({ ...DEFAULT_FILTERS, product: 'autoconsumo' }));
  });

  it('for a user limited to a division', () => {
    setSessionPrincipal(portalPrincipals.find((principal) => principal.userId === 'u-2')!);
    expectSame(spendEverywhere());
  });

  it('for a user limited to an area, which the optimizer now covers too', () => {
    const area: PortalPrincipal = { ...portalPrincipals.find((principal) => principal.userId === 'u-7')!, scopeNodeId: `org:${CLIENT_ACCOUNT_ID}:area-zapopan` };
    setSessionPrincipal(area);
    expectSame(spendEverywhere());
  });

  it('the scoped spend is a part of the account spend, not a different dataset', () => {
    const account = spendEverywhere().resumen;
    setSessionPrincipal(portalPrincipals.find((principal) => principal.userId === 'u-2')!);
    const noreste = spendEverywhere().resumen;
    expect(noreste).toBeGreaterThan(0);
    expect(noreste).toBeLessThan(account);
  });
});
