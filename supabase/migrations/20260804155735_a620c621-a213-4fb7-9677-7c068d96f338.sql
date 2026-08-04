ALTER TABLE public.escolas
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.alertas
  ADD COLUMN IF NOT EXISTS localizacao_capturada_em timestamptz,
  ADD COLUMN IF NOT EXISTS localizacao_origem text NOT NULL DEFAULT 'escola';