import { useMemo, useState } from 'react';
import { Button, FileUpload, Table, type GridColumn, type RejectedFile, type UploadedFile } from '@er-mobility-mx/design-system';
import type { BulkRow, Vehicle } from '../../types/dispersion';
import { toLiters } from '../../data/dispersion';
import { downloadTemplate, parseBulkCsv } from '../../utils/bulkUpload';
import { Modal } from '../ui/Modal';
import { AlertIcon, DownloadIcon } from '../icons/Icons';
import { formatCount, formatLiters, formatMoney } from '../../utils/format';
import './BulkUploadDialog.css';

interface BulkUploadDialogProps {
  open: boolean;
  vehicles: Vehicle[];
  availableMXN: number;
  onClose: () => void;
  onApply: (rows: BulkRow[], fileName: string) => void;
}

export function BulkUploadDialog({ open, vehicles, availableMXN, onClose, onApply }: BulkUploadDialogProps) {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const valid = useMemo(() => rows.filter((row) => row.status === 'ok'), [rows]);
  const errors = rows.length - valid.length;
  const total = valid.reduce((sum, row) => sum + row.amountMXN, 0);
  const overBudget = total > availableMXN;
  const columns: GridColumn<BulkRow>[] = [
    {
      key: 'line',
      label: 'Línea',
      render: (row) => <span className={row.status === 'ok' ? undefined : 'bulk__cell--error'}>{row.line}</span>,
    },
    {
      key: 'plate',
      label: 'Placa',
      render: (row) => <span className={row.status === 'ok' ? undefined : 'bulk__cell--error'}>{row.plate}</span>,
    },
    {
      key: 'driver',
      label: 'Conductor',
      render: (row) => (
        <span className={row.status === 'ok' ? undefined : 'bulk__cell--error'}>
          {row.status === 'ok' ? row.driver : row.message}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Monto',
      render: (row) => (
        <span className={row.status === 'ok' ? undefined : 'bulk__cell--error'}>
          {row.status === 'ok' ? formatMoney(row.amountMXN, true) : '—'}
        </span>
      ),
    },
    {
      key: 'liters',
      label: 'Litros',
      render: (row) => (
        <span className={row.status === 'ok' ? undefined : 'bulk__cell--error'}>
          {row.status === 'ok' ? formatLiters(toLiters(row.amountMXN)) : '—'}
        </span>
      ),
    },
  ];

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setRows(parseBulkCsv(String(reader.result ?? ''), vehicles));
      setFileName(file.name);
      setFileError(null);
    };
    reader.onerror = () => setFileError(`No se pudo leer ${file.name}. Intenta con otro archivo.`);
    reader.readAsText(file);
  };

  const close = () => {
    setRows([]);
    setFileName('');
    setFiles([]);
    setFileError(null);
    onClose();
  };

  const handleFileChange = (nextFiles: UploadedFile[]) => {
    setFiles(nextFiles);
    const file = nextFiles[0]?.file;
    if (file) {
      readFile(file);
    } else {
      setRows([]);
      setFileName('');
      setFileError(null);
    }
  };

  const handleFileReject = (rejected: RejectedFile[]) => {
    const reasons: Record<RejectedFile['reason'], string> = {
      accept: 'no es un archivo CSV',
      maxSize: 'supera el tamaño permitido',
      maxFiles: 'no se admite más de un archivo',
    };
    setFileError(rejected.map(({ file, reason }) => `${file.name} ${reasons[reason]}.`).join(' '));
  };

  return (
    <Modal
      open={open}
      size="lg"
      title="Dispersión masiva desde archivo"
      subtitle="Archivo CSV con dos columnas: placa y monto."
      onClose={close}
      footer={
        <>
          <Button variant="ghost" onClick={() => downloadTemplate(vehicles)}>
            <DownloadIcon width={16} height={16} />
            Descargar plantilla
          </Button>
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button
            disabled={valid.length === 0 || overBudget}
            onClick={() => {
              onApply(valid, fileName);
              setRows([]);
              setFileName('');
              setFiles([]);
              setFileError(null);
            }}
          >
            Dispersar {valid.length > 0 ? formatMoney(total) : ''}
          </Button>
        </>
      }
    >
      <FileUpload
        files={files}
        onChange={handleFileChange}
        onReject={handleFileReject}
        accept=".csv,text/csv,text/plain"
        label={fileName || 'Arrastra el archivo o selecciónalo'}
        hint="Formato: placa,monto · una unidad por línea"
        multiple={false}
        style={{ marginBottom: 12 }}
      />

      {fileError && (
        <p className="bulk__error" role="alert">
          <AlertIcon width={16} height={16} />
          {fileError}
        </p>
      )}

      {rows.length > 0 && (
        <>
          <dl className="bulk__stats">
            <div>
              <dt>Unidades válidas</dt>
              <dd>{formatCount(valid.length)}</dd>
            </div>
            <div>
              <dt>Con error</dt>
              <dd className={errors > 0 ? 'bulk__stat--error' : undefined}>{formatCount(errors)}</dd>
            </div>
            <div>
              <dt>Total a dispersar</dt>
              <dd>{formatMoney(total)}</dd>
            </div>
            <div>
              <dt>Disponible después</dt>
              <dd className={overBudget ? 'bulk__stat--error' : undefined}>{formatMoney(availableMXN - total)}</dd>
            </div>
          </dl>

          {overBudget && (
            <p className="bulk__error" role="alert">
              <AlertIcon width={16} height={16} />
              El total supera el disponible de la cuenta.
            </p>
          )}

          <div className="bulk__scroll">
            <Table
              caption="Vista previa de dispersiones masivas"
              columns={columns}
              rows={rows}
              rowKey="line"
              surface="none"
              sortable={false}
              density="compact"
              style={{ maxHeight: 240 }}
            />
          </div>
        </>
      )}
    </Modal>
  );
}
