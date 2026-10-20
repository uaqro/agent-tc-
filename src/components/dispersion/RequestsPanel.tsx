import { useEffect, useRef, useState } from 'react';
import { Badge, Button } from '@er-mobility-mx/design-system';
import type { AttentionItem, Receipt, Vehicle } from '../../types/dispersion';
import { BellIcon } from '../icons/Icons';
import { QuickTopUp } from './QuickTopUp';
import { formatMoney } from '../../utils/format';
import { ApiTag } from '../api/ApiCoverage';
import './RequestsPanel.css';

interface RequestsPanelProps {
  requests: AttentionItem[];
  vehicles: Vehicle[];
  availableMXN: number;
  onApprove: (item: AttentionItem) => void;
  onReject: (item: AttentionItem) => void;
  onSend: (vehicle: Vehicle, amountMXN: number) => Receipt;
  onViewReceipt: (receipt: Receipt) => void;
}

export function RequestsPanel({
  requests,
  vehicles,
  availableMXN,
  onApprove,
  onReject,
  onSend,
  onViewReceipt,
}: RequestsPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ vehicle: Vehicle; amountMXN: number } | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="requests" ref={containerRef}>
      <Button
        variant="secondary"
        size="sm"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        style={{ height: 34, padding: '0 12px' }}
      >
        <BellIcon width={17} height={17} />
        Ver solicitudes
        {requests.length > 0 && <Badge tone="danger">{requests.length}</Badge>}
      </Button>
      <ApiTag id="disp-quick" />

      {open && (
        <div className="requests__panel" role="dialog" aria-label="Dispersión puntual y solicitudes de saldo">
          <QuickTopUp
            key={prefill?.vehicle.id ?? 'blank'}
            variant="embedded"
            vehicles={vehicles}
            availableMXN={availableMXN}
            initialVehicle={prefill?.vehicle ?? null}
            initialAmount={prefill?.amountMXN ?? null}
            onSend={onSend}
            onViewReceipt={onViewReceipt}
          />

          <section className="requests__list-block">
            <h3 className="requests__list-title">
              Solicitudes de saldo ({requests.length})
              <ApiTag id="disp-requests" />
            </h3>

            {requests.length === 0 ? (
              <p className="requests__empty">Sin solicitudes pendientes.</p>
            ) : (
              <ul className="requests__list">
                {requests.map((item) => {
                  const vehicle = vehicles.find((candidate) => candidate.id === item.vehicleId);
                  if (!vehicle) return null;

                  return (
                    <li className="requests__item" key={item.id}>
                      <p className="requests__unit">
                        <strong>{vehicle.plate}</strong> {vehicle.driver}
                        <span className="requests__amount">{formatMoney(item.amountMXN)}</span>
                      </p>
                      <p className="requests__detail">{item.detail}</p>
                      <div className="requests__actions">
                        <Button size="sm" onClick={() => onApprove(item)}>
                          Aprobar {formatMoney(item.amountMXN)}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPrefill({ vehicle, amountMXN: item.amountMXN })}
                        >
                          Ajustar monto
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onReject(item)}>
                          Rechazar
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
