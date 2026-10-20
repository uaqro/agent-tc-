import { useMemo, useState } from 'react';
import { Button } from '@er-mobility-mx/design-system';
import type { BulkRow, Vehicle } from '../../types/dispersion';
import { toLiters } from '../../data/dispersion';
import { downloadTemplate, parseBulkCsv } from '../../utils/bulkUpload';
import { Modal } from '../ui/Modal';
import { AlertIcon, DownloadIcon, UploadIcon } from '../icons/Icons';
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
  const [dragging, setDragging] = useState(false);

  const valid = useMemo(() => rows.filter((row) => row.status === 'ok'), [rows]);
  const errors = rows.length - valid.length;
  const total = valid.reduce((sum, row) => sum + row.amountMXN, 0);
  const overBudget = total > availableMXN;

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setRows(parseBulkCsv(String(reader.result ?? ''), vehicles));
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const close = () => {
    setRows([]);
    setFileName('');
    onClose();
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
            }}
          >
            Dispersar {valid.length > 0 ? formatMoney(total) : ''}
          </Button>
        </>
      }
    >
      <label
        className={`bulk__drop${dragging ? ' bulk__drop--over' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) readFile(file);
        }}
      >
        <UploadIcon width={26} height={26} />
        <span className="bulk__drop-title">{fileName || 'Arrastra el archivo o selecciónalo'}</span>
        <span className="bulk__drop-hint">Formato: placa,monto · una unidad por línea</span>
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) readFile(file);
          }}
        />
      </label>

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
            <table className="bulk__table">
              <thead>
                <tr>
                  <th scope="col">Línea</th>
                  <th scope="col">Placa</th>
                  <th scope="col">Conductor</th>
                  <th scope="col">Monto</th>
                  <th scope="col">Litros</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.line}-${row.plate}`} className={row.status !== 'ok' ? 'bulk__row--error' : undefined}>
                    <td>{row.line}</td>
                    <td>{row.plate}</td>
                    <td>{row.status === 'ok' ? row.driver : row.message}</td>
                    <td>{row.status === 'ok' ? formatMoney(row.amountMXN, true) : '—'}</td>
                    <td>{row.status === 'ok' ? formatLiters(toLiters(row.amountMXN)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
