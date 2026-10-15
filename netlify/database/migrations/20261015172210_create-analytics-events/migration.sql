-- La tabla de ejemplo que creó "netlify database init" no se usa.
DROP TABLE IF EXISTS planets;

-- Actividad del asistente DamIAn: visitas, preguntas y descargas de PDF.
-- Anónimo: device_id es un identificador aleatorio del navegador; no se guarda la IP.
CREATE TABLE events (
  id              bigserial PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  type            text NOT NULL CHECK (type IN ('visit', 'question', 'download')),
  device_id       text NOT NULL,
  conversation_id text,
  device_type     text,          -- mobile | tablet | desktop
  browser         text,
  os              text,
  country         text,
  city            text,
  -- Preguntas
  question        text,
  answer          text,
  related_guides  text[],
  status          text,          -- ok | no_guide | refusal | error
  latency_ms      integer,
  input_tokens    integer,
  output_tokens   integer,
  cache_read_tokens integer,
  -- Descargas
  pdf_name        text
);

CREATE INDEX events_created_at_idx ON events (created_at DESC);
CREATE INDEX events_type_created_at_idx ON events (type, created_at DESC);
CREATE INDEX events_device_id_idx ON events (device_id);
