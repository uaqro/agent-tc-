import { toLiters } from '../../data/dispersion';
import { formatLiters, formatMoney } from '../../utils/format';
import { ApiTag } from '../api/ApiCoverage';
import './AccountBar.css';

interface AccountBarProps {
  accountName: string;
  availableMXN: number;
  committedMXN: number;
  onViewScheduled: () => void;
}

export function AccountBar({ accountName, availableMXN, committedMXN, onViewScheduled }: AccountBarProps) {
  const free = availableMXN - committedMXN;

  return (
    <section className="account-bar" aria-label="Saldo de la cuenta">
      <div className="account-bar__main">
        <p className="account-bar__label">
          Total disponible · {accountName}
          <ApiTag id="disp-account" />
        </p>
        <p className="account-bar__value">
          {formatMoney(availableMXN, true)}
          <span>{formatLiters(toLiters(availableMXN))}</span>
        </p>
      </div>

      <div className="account-bar__figures">
        <div>
          <p className="account-bar__label">
            Comprometido en pagos programados
            <ApiTag id="disp-scheduled" />
          </p>
          <p className="account-bar__figure">{formatMoney(committedMXN)}</p>
        </div>
        <div>
          <p className="account-bar__label">Libre después de programados</p>
          <p className={`account-bar__figure${free < 0 ? ' account-bar__figure--negative' : ''}`}>
            {formatMoney(free)}
          </p>
        </div>
      </div>

      <button type="button" className="btn btn--secondary btn--sm" onClick={onViewScheduled}>
        Ver pagos programados
      </button>
    </section>
  );
}
