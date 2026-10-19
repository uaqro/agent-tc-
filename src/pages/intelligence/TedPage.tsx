import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react';
import { SendIcon, SparklesIcon } from '../../components/icons/Icons';
import { tedAnswers, tedFallback, tedSuggestions } from '../../data/intelligence';
import './intelligence.css';
import './TedPage.css';

interface Message {
  id: number;
  from: 'ted' | 'user';
  text: string;
  time: string;
}

const GREETING =
  '¡Hola! Soy **TED**, tu asistente de inteligencia para Ticket Car.\n\nPuedo analizar tus consumos, detectar cargas anómalas, revisar saldos y límites de tus tarjetas, y encontrar dónde conviene cargar.\n\n¿Qué quieres saber hoy?';

const clock = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

let messageSequence = 0;
const message = (from: Message['from'], text: string): Message => ({ id: ++messageSequence, from, text, time: clock() });

/**
 * TED explains, summarizes and links; it never executes anything (ADR-TCP-001, sección 5): no blocking, no limits, no
 * top-ups. Its answers carry text only, and any action stays on the screen it points to, under that screen's permission.
 *
 * TODO(Fase 2): answer from the session's data, inside the user's scope (`sessionPrincipal().scopeNodeId`) and the
 * active account only. Today the answers are the fixed texts of `tedAnswers` and do not depend on the session.
 */
function answerFor(question: string): string {
  const normalized = question.toLowerCase();
  return tedAnswers.find((answer) => answer.keywords.some((keyword) => normalized.includes(keyword)))?.text ?? tedFallback;
}

/** Renders the small subset of Markdown TED uses: **bold** and line breaks. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
            part.startsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
          )}
        </Fragment>
      ))}
    </>
  );
}

export function TedPage() {
  const [messages, setMessages] = useState<Message[]>(() => [message('ted', GREETING)]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text || thinking) return;
    setMessages((current) => [...current, message('user', text)]);
    setDraft('');
    setThinking(true);
    timerRef.current = window.setTimeout(() => {
      setMessages((current) => [...current, message('ted', answerFor(text))]);
      setThinking(false);
    }, 900);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(draft);
  };

  const restart = () => {
    window.clearTimeout(timerRef.current);
    setThinking(false);
    setDraft('');
    setMessages([message('ted', GREETING)]);
  };

  return (
    <div className="intel ted">
      <section className="ted__chat intel-card" aria-label="Conversación con TED">
        <header className="ted__head">
          <span className="ted__avatar ted__avatar--lg" aria-hidden="true">
            <SparklesIcon width={20} height={20} />
          </span>
          <div>
            <h2 className="ted__name">TED</h2>
            <p className="ted__status">
              <span className="ted__online" aria-hidden="true" />
              En línea · datos de Ticket Car al día
            </p>
          </div>
          <button type="button" className="btn btn--secondary btn--sm ted__restart" onClick={restart}>
            Nueva conversación
          </button>
        </header>

        <div className="ted__messages" ref={scrollRef} aria-live="polite">
          {messages.map((item) => (
            <div key={item.id} className={`ted__message ted__message--${item.from}`}>
              {item.from === 'ted' && (
                <span className="ted__avatar" aria-hidden="true">
                  <SparklesIcon width={15} height={15} />
                </span>
              )}
              <div>
                <p className="ted__bubble">
                  <RichText text={item.text} />
                </p>
                <span className="ted__time">{item.time}</span>
              </div>
            </div>
          ))}

          {thinking && (
            <div className="ted__message ted__message--ted">
              <span className="ted__avatar" aria-hidden="true">
                <SparklesIcon width={15} height={15} />
              </span>
              <p className="ted__bubble ted__typing">
                <span />
                <span />
                <span />
                <span className="visually-hidden">TED está escribiendo</span>
              </p>
            </div>
          )}
        </div>

        <div className="ted__suggestions" aria-label="Preguntas sugeridas">
          {tedSuggestions.map((suggestion) => (
            <button type="button" key={suggestion} disabled={thinking} onClick={() => ask(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>

        <form className="ted__composer" onSubmit={handleSubmit}>
          <label className="visually-hidden" htmlFor="ted-input">
            Pregunta para TED
          </label>
          <input
            id="ted-input"
            type="text"
            value={draft}
            autoComplete="off"
            placeholder="Pregunta sobre tus tarjetas, consumos, saldos o alertas…"
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="ted__send" disabled={!draft.trim() || thinking}>
            <SendIcon width={18} height={18} />
            <span className="visually-hidden">Enviar</span>
          </button>
        </form>
      </section>
    </div>
  );
}
