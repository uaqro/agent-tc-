import { Accordion, Table } from '@er-mobility-mx/design-system';
import type { GapSeries } from '../../types';

interface ChartDataTableProps {
  labels: string[];
  series: GapSeries[];
  caption: string;
  categoryLabel: string;
  valueSuffix?: string;
}

export function ChartDataTable({ labels, series, caption, categoryLabel, valueSuffix = '' }: ChartDataTableProps) {
  const rows = labels.map((label, index) => ({ id: index, label }));
  const columns = [
    { key: 'label', label: categoryLabel },
    ...series.map((item, index) => ({
      key: `series-${index}`,
      label: item.name,
      mono: true,
      render: (row: { id: number }) => {
        const value = item.values[row.id];
        return value == null ? item.gapLabel ?? 'Sin datos' : `${value}${valueSuffix}`;
      },
    })),
  ];

  return (
    <Accordion items={[{
      id: 'data',
      title: 'Ver datos de la gráfica',
      content: <Table caption={caption} columns={columns} rows={rows} rowKey="id" surface="none" sortable={false} />,
    }]} />
  );
}
