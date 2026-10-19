import type { ReactNode } from 'react';
import { useDevMode } from './DevMode';

interface DevNoteProps {
  /** Short label of the open item, such as "Pregunta de producto". */
  label: string;
  children: ReactNode;
}

/** Open question or TODO shown on the page only while dev mode is on, so it travels with the screen it affects. */
export function DevNote({ label, children }: DevNoteProps) {
  const { devMode } = useDevMode();
  if (!devMode) return null;
  return (
    <aside className="dev-note" aria-label={label}>
      <span className="dev-note__label">{label}</span>
      <p>{children}</p>
    </aside>
  );
}
