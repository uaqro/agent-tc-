import { RECOMMENDATION_DISCLAIMER, type RecommendationInput } from '../../data/recommendations';
import { ApiTag } from '../api/ApiCoverage';
import { Modal } from '../ui/Modal';
import '../limits/PolicyDialog.css';

interface SendRecommendationDialogProps {
  recommendation: RecommendationInput;
  onClose: () => void;
  onSend: () => void;
}

/** One recommendation to one driver, always confirmed by hand. There is no bulk version of this dialog. */
export function SendRecommendationDialog({ recommendation, onClose, onSend }: SendRecommendationDialogProps) {
  return (
    <Modal
      open
      title="Enviar recomendación al conductor"
      subtitle={`${recommendation.driverName} · ${recommendation.plate} · ${recommendation.maskedCard}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={onSend}>
            Enviar recomendación
          </button>
        </>
      }
    >
      <p className="policy-form__preview">
        <strong>{RECOMMENDATION_DISCLAIMER}.</strong>
      </p>
      <dl className="policy-form__summary">
        <div>
          <dt>Carga hoy en</dt>
          <dd>{recommendation.fromStation}</dd>
        </div>
        <div>
          <dt>Se le recomienda</dt>
          <dd>{recommendation.toStation}</dd>
        </div>
      </dl>
      <p className="policy-form__preview">
        El envío queda registrado con tu usuario y la hora en el detalle del optimizador. Canal de envío simulado en este
        prototipo.
        <ApiTag id="opt-send-driver" />
      </p>
    </Modal>
  );
}
