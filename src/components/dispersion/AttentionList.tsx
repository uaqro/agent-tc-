import type { ReactNode } from 'react';
import { Button } from '@er-mobility-mx/design-system';
import type { AttentionItem, AttentionKind, Vehicle } from '../../types/dispersion';
import { toLiters } from '../../data/dispersion';
import { AlertIcon, BoltIcon, CheckCircleIcon, RequestIcon, ScissorsIcon } from '../icons/Icons';
import { formatLiters, formatMoney } from '../../utils/format';
import { ApiTag } from '../api/ApiCoverage';
import './AttentionList.css';

export interface AttentionAction {
  label: string;
  kind: 'fund' | 'review' | 'cut';
}

interface AttentionListProps {
  items: AttentionItem[];
  vehicles: Vehicle[];
  headerSlot?: ReactNode;
  onResolve: (item: AttentionItem, action: AttentionAction) => void;
  onDismiss: (item: AttentionItem) => void;
}

const KIND_META: Record<AttentionKind, { label: string; chip: string; Icon: typeof AlertIcon }> = {
  'balance-request': { label: 'Solicitud de saldo', chip: 'chip--info', Icon: RequestIcon },
  'zero-balance': { label: 'Saldo en cero', chip: 'chip--danger', Icon: BoltIcon },
  'anomalous-consumption': { label: 'Consumo anómalo', chip: 'chip--review', Icon: AlertIcon },
  'trapped-balance': { label: 'Saldo atrapado', chip: 'chip--info', Icon: ScissorsIcon },
};

function primaryAction(item: AttentionItem): AttentionAction {
  switch (item.kind) {
    case 'balance-request':
      return { label: `Aprobar ${formatMoney(item.amountMXN)}`, kind: 'fund' };
    case 'zero-balance':
      return { label: `Fondear ${formatMoney(item.amountMXN)}`, kind: 'fund' };
    case 'anomalous-consumption':
      return { label: 'Excluir de la corrida', kind: 'review' };
    case 'trapped-balance':
      return { label: `Recortar ${formatMoney(item.amountMXN)}`, kind: 'cut' };
  }
}

export function AttentionList({ items, vehicles, headerSlot, onResolve, onDismiss }: AttentionListProps) {
  if (items.length === 0) {
    return (
      <section className="attention">
        <header className="attention__head">
          <h2 className="attention__title">
            Sin unidades por revisar
            <ApiTag id="disp-attention" />
          </h2>
          {headerSlot}
        </header>
        <p className="attention__clear-row">
          <CheckCircleIcon width={20} height={20} />
          La próxima corrida puede ejecutarse sin intervención.
        </p>
      </section>
    );
  }

  return (
    <section className="attention" aria-labelledby="attention-title">
      <header className="attention__head">
        <h2 className="attention__title" id="attention-title">
          {items.length} {items.length === 1 ? 'unidad necesita' : 'unidades necesitan'} atención
          <ApiTag id="disp-attention" />
        </h2>
        {headerSlot}
      </header>

      <ul className="attention__list">
        {items.map((item) => {
          const vehicle = vehicles.find((candidate) => candidate.id === item.vehicleId);
          const meta = KIND_META[item.kind];
          const action = primaryAction(item);

          return (
            <li className="attention__item" key={item.id}>
              <span className={`attention__icon attention__icon--${item.kind}`}>
                <meta.Icon width={18} height={18} />
              </span>

              <div className="attention__content">
                <p className="attention__unit">
                  <strong>{vehicle?.plate}</strong>
                  <span className="attention__driver">{vehicle?.driver}</span>
                  <span className={`chip ${meta.chip}`}>{meta.label}</span>
                </p>
                <p className="attention__detail">{item.detail}</p>
                <p className="attention__meta">
                  {vehicle?.group} · Saldo {formatMoney(vehicle?.balanceMXN ?? 0, true)} ·{' '}
                  {formatLiters(toLiters(vehicle?.balanceMXN ?? 0))}
                </p>
              </div>

              <div className="attention__actions">
                {action.kind === 'cut' && <ApiTag id="disp-cut" />}
                <Button size="sm" onClick={() => onResolve(item, action)}>
                  {action.label}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDismiss(item)}>
                  {item.kind === 'balance-request' ? 'Rechazar' : 'Posponer'}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
