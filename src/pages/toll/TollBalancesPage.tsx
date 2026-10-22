import { useMemo, useState } from 'react';
import { Badge, Button, Card, Input, Switch, Table, type GridColumn } from '@er-mobility-mx/design-system';
import { EmptyState } from '../../components/ui/EmptyState';
import { TollAmountDialog, type TollAmountMode } from '../../components/toll/TollAmountDialog';
import { fleetVehicles as vehicles } from '../../data/dispersion';
import { fleetAssignableGroups as assignableGroups } from '../../data/limits';
import {
  MOVEMENT_LABEL,
  tollAccount,
  tollAutoTopUps as seedAutoTopUps,
  tollMovements as seedMovements,
  tollTags as seedTags,
} from '../../data/toll';
import type { TollAutoTopUp, TollMovement, TollTag } from '../../types/toll';
import { businessNow } from '../../domain/demo/clock';
import { formatDateTime, formatMoney } from '../../utils/format';
import { ReadOnlyNotice } from '../../components/ui/ReadOnlyNotice';
import '../TablePage.css';
import './toll.css';

interface TollBalancesPageProps {
  onNotice: (message: string) => void;
  /** The role reads balances but can't top up, cut or change automatic top-ups (ADR-TCP-001). */
  readOnly?: boolean;
}

const MOVEMENT_TONE: Record<TollMovement['kind'], 'success' | 'warning' | 'neutral' | 'danger'> = {
  crossing: 'neutral',
  'top-up': 'success',
  cut: 'warning',
  rejected: 'danger',
};

let movementSequence = 100;

export function TollBalancesPage({ onNotice, readOnly = false }: TollBalancesPageProps) {
  const [tags, setTags] = useState<TollTag[]>(seedTags);
  const [autoTopUps, setAutoTopUps] = useState<TollAutoTopUp[]>(seedAutoTopUps);
  const [movements, setMovements] = useState<TollMovement[]>(seedMovements);
  const [availableMXN, setAvailableMXN] = useState(tollAccount.availableMXN);
  const [dialog, setDialog] = useState<{ tag: TollTag; mode: TollAmountMode } | null>(null);

  const vehicleOf = (id: string | null) => vehicles.find((vehicle) => vehicle.id === id);
  const groupOf = (tag: TollTag) => assignableGroups.find((group) => group.label === vehicleOf(tag.vehicleId)?.group);
  const autoTopUpOf = (tag: TollTag) => autoTopUps.find((config) => config.groupId === groupOf(tag)?.id);

  /** Assigned tags only: an unassigned tag has no balance to manage. */
  const balanceTags = useMemo(() => tags.filter((tag) => tag.vehicleId !== null), [tags]);
  const tagsBalance = balanceTags.reduce((sum, tag) => sum + tag.balanceMXN, 0);

  const isLow = (tag: TollTag) => {
    const config = autoTopUpOf(tag);
    return tag.status === 'active' && !!config && tag.balanceMXN < config.thresholdMXN;
  };

  const apply = (tag: TollTag, mode: TollAmountMode, amountMXN: number) => {
    const delta = mode === 'top-up' ? amountMXN : -amountMXN;
    const plate = vehicleOf(tag.vehicleId)?.plate ?? tag.number;

    setTags((current) =>
      current.map((candidate) =>
        candidate.id === tag.id ? { ...candidate, balanceMXN: candidate.balanceMXN + delta } : candidate,
      ),
    );
    setAvailableMXN((current) => current - delta);
    setMovements((current) => [
      {
        id: `tm-${++movementSequence}`,
        kind: mode === 'top-up' ? 'top-up' : 'cut',
        tagId: tag.id,
        at: new Date(businessNow()).toISOString(),
        amountMXN: delta,
        detail: mode === 'top-up' ? 'Recarga puntual desde la bolsa de peaje' : 'Recorte a la bolsa de peaje',
      },
      ...current,
    ]);
    setDialog(null);
    onNotice(
      mode === 'top-up'
        ? `${formatMoney(amountMXN)} recargados al TAG de ${plate}.`
        : `${formatMoney(amountMXN)} regresan a la bolsa de peaje desde ${plate}.`,
    );
  };

  const patchAutoTopUp = (groupId: string, changes: Partial<TollAutoTopUp>) =>
    setAutoTopUps((current) => current.map((config) => (config.groupId === groupId ? { ...config, ...changes } : config)));

  const balanceColumns: GridColumn<TollTag>[] = [
    {
      key: 'tag',
      label: 'TAG',
      render: (tag) => (
        <>
          <span className="table-page__main table-page__data">{tag.number}</span>
          {tag.status !== 'active' && <span className="table-page__sub">TAG no operable</span>}
        </>
      ),
    },
    {
      key: 'vehicle',
      label: 'Unidad',
      render: (tag) => {
        const vehicle = vehicleOf(tag.vehicleId);
        return (
          <>
            <span className="table-page__main table-page__data">{vehicle?.plate}</span>
            <span className="table-page__sub">
              {vehicle?.driver} · {vehicle?.group}
            </span>
          </>
        );
      },
    },
    {
      key: 'balance',
      label: 'Saldo',
      align: 'right',
      render: (tag) => (
        <span className={isLow(tag) ? 'table-page__warn' : 'table-page__data'}>{formatMoney(tag.balanceMXN, true)}</span>
      ),
    },
    {
      key: 'autoTopUp',
      label: 'Recarga automática',
      render: (tag) => {
        const config = autoTopUpOf(tag);
        return config?.enabled ? (
          <span className="table-page__sub">
            Debajo de {formatMoney(config.thresholdMXN)} → {formatMoney(config.targetMXN)}
          </span>
        ) : (
          <span className="table-page__sub">Manual</span>
        );
      },
    },
    {
      key: 'lastCrossing',
      label: 'Último cruce',
      render: (tag) =>
        tag.lastCrossing ? (
          <>
            <span className="table-page__data">{formatDateTime(new Date(tag.lastCrossing))}</span>
            <span className="table-page__sub">{tag.lastPlaza}</span>
          </>
        ) : (
          <span className="table-page__sub">Sin cruces</span>
        ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      align: 'right',
      render: (tag) => {
        const operable = tag.status === 'active';
        return !readOnly ? (
          <div className="table-page__row-actions">
            <Button
              variant="secondary"
              size="sm"
              disabled={!operable}
              onClick={() => setDialog({ tag, mode: 'top-up' })}
            >
              Recargar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={tag.balanceMXN <= 0}
              onClick={() => setDialog({ tag, mode: 'cut' })}
            >
              Recortar
            </Button>
          </div>
        ) : null;
      },
    },
  ];

  const movementColumns: GridColumn<TollMovement>[] = [
    {
      key: 'date',
      label: 'Fecha',
      render: (movement) => <span className="table-page__data">{formatDateTime(new Date(movement.at))}</span>,
    },
    {
      key: 'kind',
      label: 'Tipo',
      render: (movement) => <Badge tone={MOVEMENT_TONE[movement.kind]}>{MOVEMENT_LABEL[movement.kind].label}</Badge>,
    },
    {
      key: 'tag',
      label: 'TAG · unidad',
      render: (movement) => {
        const tag = tags.find((candidate) => candidate.id === movement.tagId);
        return (
          <>
            <span className="table-page__main table-page__data">{tag?.number}</span>
            <span className="table-page__sub">{vehicleOf(tag?.vehicleId ?? null)?.plate ?? 'Sin unidad'}</span>
          </>
        );
      },
    },
    { key: 'detail', label: 'Detalle', render: (movement) => movement.detail },
    {
      key: 'amount',
      label: 'Monto',
      align: 'right',
      render: (movement) => (
        <span className="table-page__data">
          {movement.kind === 'rejected'
            ? '—'
            : `${movement.amountMXN < 0 ? '− ' : ''}${formatMoney(Math.abs(movement.amountMXN), true)}`}
        </span>
      ),
    },
  ];

  const budgetShare = tollAccount.spentMonthMXN / tollAccount.monthBudgetMXN;

  return (
    <div className="table-page table-page--catalog">
      {readOnly && <ReadOnlyNotice what="los saldos y las recargas de peaje" />}
      <dl className="table-page__summary">
        <Card padding="sm" surface="outlined">
          <dt>Bolsa de peaje disponible</dt>
          <dd>{formatMoney(availableMXN)}</dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>Saldo en TAGs</dt>
          <dd>{formatMoney(tagsBalance)}</dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>Gasto en casetas · mes</dt>
          <dd>
            {formatMoney(tollAccount.spentMonthMXN)}
            <span className="toll__dd-sub">
              {Math.round(budgetShare * 100)}% de {formatMoney(tollAccount.monthBudgetMXN)}
            </span>
          </dd>
        </Card>
        <Card padding="sm" surface="outlined">
          <dt>TAGs bajo su umbral</dt>
          <dd className={balanceTags.some(isLow) ? 'is-alert' : undefined}>{balanceTags.filter(isLow).length}</dd>
        </Card>
      </dl>

      <section className="table-page__card" aria-labelledby="toll-balances-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="toll-balances-title">
            Saldo por TAG
          </h2>
        </header>

        {balanceTags.length === 0 ? (
          <EmptyState
            compact
            icon="credit_card"
            title="Aún no hay TAGs asignados"
            description="Asigna un TAG a una unidad en Peaje · Medios de pago para administrar su saldo."
          />
        ) : (
          <Table
            caption="Saldo por TAG"
            columns={balanceColumns}
            rows={balanceTags}
            rowKey="id"
            surface="none"
            sortable={false}
          />
        )}
      </section>

      <section className="table-page__card" aria-labelledby="toll-auto-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="toll-auto-title">
            Recarga automática por grupo
          </h2>
          <p className="toll__hint">Cuando el saldo de un TAG baja del umbral, se recarga desde la bolsa de peaje.</p>
        </header>

        <ul className="toll-auto">
          {autoTopUps.map((config) => {
            const group = assignableGroups.find((candidate) => candidate.id === config.groupId);
            const invalid = config.targetMXN <= config.thresholdMXN;

            return (
              <li className={`toll-auto__row${config.enabled ? '' : ' toll-auto__row--off'}`} key={config.groupId}>
                <div className="toll-auto__toggle">
                  <Switch
                    checked={config.enabled}
                    disabled={readOnly}
                    onChange={(enabled) => {
                      patchAutoTopUp(config.groupId, { enabled });
                      onNotice(
                        enabled
                          ? `Recarga automática activada para ${group?.label}.`
                          : `Recarga automática desactivada para ${group?.label}.`,
                      );
                    }}
                  />
                </div>
                <label className="toll-auto__field">
                  <span>Si baja de</span>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    disabled={readOnly || !config.enabled}
                    size="sm"
                    value={String(config.thresholdMXN)}
                    onChange={(value) => patchAutoTopUp(config.groupId, { thresholdMXN: Number(value) })}
                  />
                </label>
                <label className="toll-auto__field">
                  <span>Recargar a</span>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    disabled={readOnly || !config.enabled}
                    size="sm"
                    value={String(config.targetMXN)}
                    onChange={(value) => patchAutoTopUp(config.groupId, { targetMXN: Number(value) })}
                  />
                </label>
                {config.enabled && invalid && (
                  <p className="toll-auto__error">El saldo objetivo debe ser mayor que el umbral.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="table-page__card" aria-labelledby="toll-movements-title">
        <header className="table-page__head">
          <h2 className="table-page__title" id="toll-movements-title">
            Últimos movimientos
          </h2>
        </header>
        <Table
          caption="Últimos movimientos"
          columns={movementColumns}
          rows={movements.slice(0, 10)}
          rowKey="id"
          surface="none"
          sortable={false}
        />
      </section>

      {dialog && (
        <TollAmountDialog
          tag={dialog.tag}
          mode={dialog.mode}
          plate={vehicleOf(dialog.tag.vehicleId)?.plate ?? dialog.tag.number}
          availableMXN={availableMXN}
          onClose={() => setDialog(null)}
          onConfirm={(amount) => apply(dialog.tag, dialog.mode, amount)}
        />
      )}
    </div>
  );
}
