import { useMemo, useState } from 'react';
import { CardIcon } from '../../components/icons/Icons';
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
import { formatDateTime, formatMoney } from '../../utils/format';
import { ReadOnlyNotice } from '../../components/ui/ReadOnlyNotice';
import '../TablePage.css';
import './toll.css';

interface TollBalancesPageProps {
  onNotice: (message: string) => void;
  /** The role reads balances but can't top up, cut or change automatic top-ups (ADR-TCP-001). */
  readOnly?: boolean;
}

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
        at: new Date().toISOString(),
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

  const budgetShare = tollAccount.spentMonthMXN / tollAccount.monthBudgetMXN;

  return (
    <div className="table-page">
      {readOnly && <ReadOnlyNotice what="los saldos y las recargas de peaje" />}
      <dl className="table-page__summary">
        <div>
          <dt>Bolsa de peaje disponible</dt>
          <dd>{formatMoney(availableMXN)}</dd>
        </div>
        <div>
          <dt>Saldo en TAGs</dt>
          <dd>{formatMoney(tagsBalance)}</dd>
        </div>
        <div>
          <dt>Gasto en casetas · mes</dt>
          <dd>
            {formatMoney(tollAccount.spentMonthMXN)}
            <span className="toll__dd-sub">
              {Math.round(budgetShare * 100)}% de {formatMoney(tollAccount.monthBudgetMXN)}
            </span>
          </dd>
        </div>
        <div>
          <dt>TAGs bajo su umbral</dt>
          <dd className={balanceTags.some(isLow) ? 'is-alert' : undefined}>{balanceTags.filter(isLow).length}</dd>
        </div>
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
            icon={<CardIcon width={20} height={20} />}
            title="Aún no hay TAGs asignados"
            description="Asigna un TAG a una unidad en Peaje · Medios de pago para administrar su saldo."
          />
        ) : (
          <div className="table-page__scroll">
            <table className="table-page__table">
              <thead>
                <tr>
                  <th scope="col">TAG</th>
                  <th scope="col">Unidad</th>
                  <th scope="col">Saldo</th>
                  <th scope="col">Recarga automática</th>
                  <th scope="col">Último cruce</th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {balanceTags.map((tag) => {
                  const vehicle = vehicleOf(tag.vehicleId);
                  const config = autoTopUpOf(tag);
                  const operable = tag.status === 'active';

                  return (
                    <tr key={tag.id}>
                      <td>
                        <span className="table-page__main">{tag.number}</span>
                        {!operable && <span className="table-page__sub">TAG no operable</span>}
                      </td>
                      <td>
                        <span className="table-page__main">{vehicle?.plate}</span>
                        <span className="table-page__sub">
                          {vehicle?.driver} · {vehicle?.group}
                        </span>
                      </td>
                      <td className={isLow(tag) ? 'table-page__warn' : undefined}>{formatMoney(tag.balanceMXN, true)}</td>
                      <td>
                        {config?.enabled ? (
                          <span className="table-page__sub">
                            Debajo de {formatMoney(config.thresholdMXN)} → {formatMoney(config.targetMXN)}
                          </span>
                        ) : (
                          <span className="table-page__sub">Manual</span>
                        )}
                      </td>
                      <td>
                        {tag.lastCrossing ? (
                          <>
                            {formatDateTime(new Date(tag.lastCrossing))}
                            <span className="table-page__sub">{tag.lastPlaza}</span>
                          </>
                        ) : (
                          <span className="table-page__sub">Sin cruces</span>
                        )}
                      </td>
                      <td className="table-page__action">
                        {!readOnly && (
                          <>
                            <button
                              type="button"
                              className="btn btn--secondary btn--sm"
                              disabled={!operable}
                              onClick={() => setDialog({ tag, mode: 'top-up' })}
                            >
                              Recargar
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              disabled={tag.balanceMXN <= 0}
                              onClick={() => setDialog({ tag, mode: 'cut' })}
                            >
                              Recortar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                <label className="toll-auto__toggle">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    disabled={readOnly}
                    onChange={(event) => {
                      patchAutoTopUp(config.groupId, { enabled: event.target.checked });
                      onNotice(
                        event.target.checked
                          ? `Recarga automática activada para ${group?.label}.`
                          : `Recarga automática desactivada para ${group?.label}.`,
                      );
                    }}
                  />
                  <span>{group?.label}</span>
                </label>
                <label className="toll-auto__field">
                  <span>Si baja de</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    disabled={readOnly || !config.enabled}
                    value={config.thresholdMXN}
                    onChange={(event) => patchAutoTopUp(config.groupId, { thresholdMXN: Number(event.target.value) })}
                  />
                </label>
                <label className="toll-auto__field">
                  <span>Recargar a</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    disabled={readOnly || !config.enabled}
                    value={config.targetMXN}
                    onChange={(event) => patchAutoTopUp(config.groupId, { targetMXN: Number(event.target.value) })}
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
        <div className="table-page__scroll">
          <table className="table-page__table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Tipo</th>
                <th scope="col">TAG · unidad</th>
                <th scope="col">Detalle</th>
                <th scope="col">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.slice(0, 10).map((movement) => {
                const tag = tags.find((candidate) => candidate.id === movement.tagId);
                const meta = MOVEMENT_LABEL[movement.kind];
                return (
                  <tr key={movement.id}>
                    <td className="table-page__nowrap">{formatDateTime(new Date(movement.at))}</td>
                    <td>
                      <span className={`chip ${meta.chip}`}>{meta.label}</span>
                    </td>
                    <td>
                      <span className="table-page__main">{tag?.number}</span>
                      <span className="table-page__sub">{vehicleOf(tag?.vehicleId ?? null)?.plate ?? 'Sin unidad'}</span>
                    </td>
                    <td>{movement.detail}</td>
                    <td className="table-page__nowrap">
                      {movement.kind === 'rejected'
                        ? '—'
                        : `${movement.amountMXN < 0 ? '− ' : ''}${formatMoney(Math.abs(movement.amountMXN), true)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
