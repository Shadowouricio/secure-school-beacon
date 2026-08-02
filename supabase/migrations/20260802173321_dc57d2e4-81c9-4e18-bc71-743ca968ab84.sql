CREATE TYPE public.prioridade_alerta AS ENUM ('baixa','media','alta','vermelho');

ALTER TABLE public.alertas
  ADD COLUMN prioridade public.prioridade_alerta NOT NULL DEFAULT 'alta';