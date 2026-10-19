import { LockIcon } from '../icons/Icons';
import './ReadOnlyNotice.css';

/** Shown on a page the role can see but not change (ADR-TCP-001): the actions are not there, and this says why. */
export function ReadOnlyNotice({ what }: { what: string }) {
  return (
    <p className="read-only-notice" role="note">
      <LockIcon width={14} height={14} />
      Solo lectura: tu rol puede consultar {what}, pero no cambiarlos.
    </p>
  );
}
