import { useMemo } from 'react';
import { BarChart } from '../components/charts/BarChart';
import { EmptyChart } from '../components/charts/EmptyChart';
import { LineChart } from '../components/charts/LineChart';
import { ChartCard } from '../components/dashboard/ChartCard';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { useGlobalFilters } from '../components/filters/GlobalFilters';
import { clientAccount } from '../data/client';
import { refillsAndCuts } from '../data/dashboard';
import { costPerKilometer, organizationalConsumption, performanceByVehicle } from '../data/dashboardCharts';
import { summaryMetricsFor } from '../data/summary';
import type { ChartSeries } from '../types';
import { ApiCoverageBanner, ApiTag, ApiTagRow } from '../components/api/ApiCoverage';
import './FuelDashboardPage.css';

interface FuelDashboardPageProps {
  onCardOption: (chart: string, option: string) => void;
}

const hasData = (series: ChartSeries[]) => series.some((item) => item.values.some((value) => value !== 0));

export function FuelDashboardPage({ onCardOption }: FuelDashboardPageProps) {
  const { filters } = useGlobalFilters();
  const summaryMetrics = useMemo(() => summaryMetricsFor(filters), [filters]);
  const performance = useMemo(() => performanceByVehicle(filters), [filters]);
  const costPerKm = useMemo(() => costPerKilometer(filters), [filters]);
  const organization = useMemo(() => organizationalConsumption(filters), [filters]);
  const period = `últimos ${filters.periodDays} ${filters.periodDays === 1 ? 'día' : 'días'}`;

  return (
    <div className="dashboard">
      <ApiCoverageBanner page="dashboard" />

      <ApiTagRow id="dash-kpis" label="Indicadores del periodo" />
      <section className="dashboard__summary" aria-label="Indicadores principales">
        {summaryMetrics.map((metric) => (
          <SummaryCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="dashboard__charts" aria-label="Gráficas de combustible">
        <ChartCard
          title={`Rendimiento por vehículo (${period})`}
          badge={<ApiTag id="dash-performance" />}
          info="Kilómetros recorridos entre litros cargados de las unidades que más consumieron en el periodo, contra el rendimiento esperado para su clase."
          onOptionSelect={(option) => onCardOption('Rendimiento por vehículo', option)}
        >
          {hasData(performance.series) ? (
            <BarChart
              labels={performance.labels}
              series={performance.series}
              yMin={performance.yMin}
              yMax={performance.yMax}
              ariaLabel={`Rendimiento real contra esperado de las ${performance.labels.length} unidades con más consumo`}
            />
          ) : (
            <EmptyChart hint="No hay cargas en el periodo para los filtros elegidos. Cambia el periodo o quita algún filtro." />
          )}
        </ChartCard>

        <ChartCard
          title="Costo por kilómetro"
          badge={<ApiTag id="dash-cost-km" />}
          subtitle={`${clientAccount.name} · ${period}`}
          info="Importe de combustible entre kilómetros recorridos. Diario hasta dos semanas, semanal en periodos más largos."
          onOptionSelect={(option) => onCardOption('Costo por kilómetro', option)}
        >
          {hasData(costPerKm.series) ? (
            <LineChart
              labels={costPerKm.labels}
              series={costPerKm.series}
              yMin={costPerKm.yMin}
              yMax={costPerKm.yMax}
              valueSuffix=" MXN/km"
              ariaLabel={`Costo por kilómetro de ${clientAccount.name} en los ${period}`}
            />
          ) : (
            <EmptyChart hint="No hay kilómetros recorridos en el periodo para los filtros elegidos." />
          )}
        </ChartCard>

        <ChartCard
          title={`Consumo organizacional (${period})`}
          badge={<ApiTag id="dash-org" />}
          subtitle={organization.parentName}
          info="Litros cargados por cada rama del organigrama que cuelga del nodo elegido, contra el periodo anterior."
          onOptionSelect={(option) => onCardOption('Consumo organizacional', option)}
        >
          {organization.labels.length > 0 && hasData(organization.series) ? (
            <BarChart
              labels={organization.labels}
              series={organization.series}
              yMin={organization.yMin}
              yMax={organization.yMax}
              ariaLabel={`Litros por rama de ${organization.parentName}, periodo actual contra el anterior`}
            />
          ) : (
            <EmptyChart
              hint={
                organization.labels.length === 0
                  ? `${organization.parentName} no tiene niveles por debajo: es el último nivel del organigrama.`
                  : 'No hay consumo en el periodo para la estructura organizacional elegida.'
              }
            />
          )}
        </ChartCard>

        <ChartCard
          title="Recargas y Recortes"
          badge={<ApiTag id="dash-refills" />}
          info="Compara los montos dispersados como recarga contra los montos recortados en el periodo."
          onOptionSelect={(option) => onCardOption('Recargas y Recortes', option)}
        >
          {hasData(refillsAndCuts.series) ? (
            <BarChart
              labels={refillsAndCuts.labels}
              series={refillsAndCuts.series}
              yMin={refillsAndCuts.yMin}
              yMax={refillsAndCuts.yMax}
              ariaLabel="Recargas y recortes de enero 2026 a julio 2026"
            />
          ) : (
            <EmptyChart hint="No hay recargas ni recortes en el periodo. Aparecen cuando se dispersa o se recorta saldo desde Saldos." />
          )}
        </ChartCard>
      </section>
    </div>
  );
}
