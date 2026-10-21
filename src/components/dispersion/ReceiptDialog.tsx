import type { Receipt } from '../../types/dispersion';
import { Button } from '@er-mobility-mx/design-system';
import { toLiters } from '../../data/dispersion';
import { Modal } from '../ui/Modal';
import { CheckCircleIcon, DownloadIcon, ShareIcon } from '../icons/Icons';
import { formatCount, formatDateTime, formatLiters, formatMoney } from '../../utils/format';
import { downloadReceipt } from '../../utils/receipt';
import './ReceiptDialog.css';

interface ReceiptDialogProps {
  open: boolean;
  receipt: Receipt | null;
  onClose: () => void;
  onShare: (receipt: Receipt) => void;
}

export function ReceiptDialog({ open, receipt, onClose, onShare }: ReceiptDialogProps) {
  if (!receipt) return null;

  const isCut = receipt.totalMXN < 0;

  return (
    <Modal
      open={open}
      title="Comprobante de dispersión"
      subtitle={`Folio ${receipt.folio}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="secondary" onClick={() => onShare(receipt)}>
            <ShareIcon width={16} height={16} />
            Compartir con finanzas
          </Button>
          <Button onClick={() => downloadReceipt(receipt)}>
            <DownloadIcon width={16} height={16} />
            Descargar comprobante
          </Button>
        </>
      }
    >
      <p className="receipt__status">
        <CheckCircleIcon width={18} height={18} />
        {isCut ? 'Recorte aplicado' : 'Dispersión aplicada'} · {formatDateTime(new Date(receipt.issuedAt))}
      </p>

      <dl className="receipt__meta">
        <div>
          <dt>Origen</dt>
          <dd>{receipt.sourceLabel}</dd>
        </div>
        <div>
          <dt>Alcance</dt>
          <dd>{receipt.scopeLabel}</dd>
        </div>
        <div>
          <dt>Unidades</dt>
          <dd>{formatCount(receipt.units)}</dd>
        </div>
        <div>
          <dt>Autorizó</dt>
          <dd>{receipt.user}</dd>
        </div>
      </dl>

      <div className="receipt__total">
        <span>{isCut ? 'Monto recortado' : 'Monto dispersado'}</span>
        <strong>{formatMoney(Math.abs(receipt.totalMXN), true)}</strong>
        <span className="receipt__total-liters">{formatLiters(Math.abs(toLiters(receipt.totalMXN)))}</span>
      </div>

      {receipt.lines.length > 0 && (
        <table className="receipt__table">
          <thead>
            <tr>
              <th scope="col">Placa</th>
              <th scope="col">Conductor</th>
              <th scope="col">Monto</th>
            </tr>
          </thead>
          <tbody>
            {receipt.lines.map((line) => (
              <tr key={line.plate}>
                <td>{line.plate}</td>
                <td>{line.driver}</td>
                <td>{formatMoney(line.amountMXN, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="receipt__trace">
        Registro firmado con el usuario, la hora y la regla aplicada. El archivo descargable incluye la lista completa de
        unidades para finanzas.
      </p>
    </Modal>
  );
}
