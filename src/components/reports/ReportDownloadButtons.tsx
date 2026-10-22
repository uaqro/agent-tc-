import { downloadReport, type ReportFileFormat } from '../../domain/reporting/export';
import { DownloadIcon } from '../icons/Icons';
import './ReportDownloadButtons.css';

interface ReportDownloadButtonsProps {
  columns: string[];
  rows: (string | number)[][];
  fileName: string;
}

const FORMATS: { id: ReportFileFormat; label: string }[] = [
  { id: 'xlsx', label: 'Excel' },
  { id: 'csv', label: 'CSV' },
  { id: 'txt', label: 'TXT' },
];

export function ReportDownloadButtons({ columns, rows, fileName }: ReportDownloadButtonsProps) {
  const exportRows = [columns, ...rows];
  return (
    <div className="report-downloads" aria-label="Descargar reporte">
      {FORMATS.map((format) => (
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          key={format.id}
          disabled={rows.length === 0}
          title={`Descargar ${format.label}`}
          onClick={() => downloadReport(exportRows, format.id, fileName)}
        >
          <DownloadIcon width={14} height={14} />
          {format.label}
        </button>
      ))}
    </div>
  );
}