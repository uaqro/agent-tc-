import './FloatingControls.css';
import { Button, IconButton } from '@er-mobility-mx/design-system';

interface FloatingControlsProps {
  onFeedback: () => void;
  onChat: () => void;
}

export function FloatingControls({ onFeedback, onChat }: FloatingControlsProps) {
  return (
    <>
      <div className="feedback-tab">
        <Button variant="secondary" size="sm" onClick={onFeedback}>
          Opiniones
        </Button>
      </div>

      <div className="chat-button">
        <IconButton
          icon="chat"
          ariaLabel="Preguntar a TED, el asistente de la flota"
          variant="primary"
          size="lg"
          onClick={onChat}
          style={{ width: 54, height: 54, padding: 0, borderRadius: '50%' }}
        />
      </div>
    </>
  );
}
