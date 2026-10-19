import './FloatingControls.css';
import { ChatIcon } from '../icons/Icons';

interface FloatingControlsProps {
  onFeedback: () => void;
  onChat: () => void;
}

export function FloatingControls({ onFeedback, onChat }: FloatingControlsProps) {
  return (
    <>
      <button type="button" className="feedback-tab" onClick={onFeedback}>
        Opiniones
      </button>

      <button type="button" className="chat-button" onClick={onChat} title="Preguntar a TED">
        <ChatIcon width={24} height={24} />
        <span className="visually-hidden">Preguntar a TED, el asistente de la flota</span>
      </button>
    </>
  );
}
