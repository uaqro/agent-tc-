import { BarChart } from '../components/charts/BarChart';
import { EmptyChart } from '../components/charts/EmptyChart';
import { LineChart } from '../components/charts/LineChart';
import { ChartCard } from '../components/dashboard/ChartCard';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { costPerKilometer, refillsAndCuts, summaryMetrics } from '../data/dashboard';
import type { ChartSeries } from '../types';
import { ApiCoverageBanner, ApiTag, ApiTagRow } from '../components/api/ApiCoverage';
import './FuelDashboardPage.css';

interface FuelDashboardPageProps {
  onCardOption: (chart: string, option: string) => void;
}

const hasData = (series: ChartSeries[]) => series.some((item) => item.values.length > 0);

export function FuelDashboardPage({ onCardOption }: FuelDashboardPageProps) {
  return (
    <div className="dashboard">
      <ApiCoverageBanner page="dashboard" />

      <ApiTagRow id="dash-kpis" label="Indicadores del mes" />
      <section className="dashboard__summary" aria-label="Indicadores principales">
        {summaryMetrics.map((metric) => (
          <SummaryCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="dashboard__charts" aria-label="Gráficas de combustible">
        <ChartCard
          title="Rendimiento por vehículo (mes actual)"
          badge={<ApiTag id="dash-performance" />}
          info="Compara los kilómetros recorridos contra los litros cargados por cada vehículo del mes en curso."
          onOptionSelect={(option) => onCardOption('Rendimiento por vehículo', option)}
        >
          <EmptyChart
            hint="No hay transacciones registradas para el mes actual. Los datos aparecen cuando se procesan las cargas de combustible."
          />
        </ChartCard>

        <ChartCard
          title="Costo por kilómetro"
          badge={<ApiTag id="dash-cost-km" />}
          subtitle="EDENRED MEXICO1"
          info="Muestra el costo de combustible por kilómetro recorrido para la unidad seleccionada."
          onOptionSelect={(option) => onCardOption('Costo por kilómetro', option)}
        >
          {hasData(costPerKilometer.series) ? (
            <LineChart
              labels={costPerKilometer.labels}
              series={costPerKilometer.series}
              yMin={costPerKilometer.yMin}
              yMax={costPerKilometer.yMax}
              valueSuffix=" MXN/km"
              ariaLabel="Costo por kilómetro de enero 2026 a julio 2026 para EDENRED MEXICO1"
            />
          ) : (
            <EmptyChart hint="Aún no hay cargas con odómetro registrado. El costo por kilómetro se calcula cuando la unidad reporta kilometraje en sus cargas." />
          )}
        </ChartCard>

        <ChartCard
          title="Consumo organizacional (últimos 30 días)"
          badge={<ApiTag id="dash-org" />}
          info="Agrupa el consumo de combustible por centro de costo durante los últimos 30 días."
          onOptionSelect={(option) => onCardOption('Consumo organizacional', option)}
        >
          <EmptyChart
            hint="No hay consumo registrado en los últimos 30 días para la estructura organizacional actual."
            axisCaption="Eje inferior: número de transacciones"
          />
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
