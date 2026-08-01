CREATE TYPE public.tipo_ocorrencia AS ENUM ('ameaca_seguranca','invasao','emergencia_medica','incendio','outro');
CREATE TYPE public.status_alerta AS ENUM ('aguardando_resposta','equipe_acionada','atendimento_iniciado','encerrado');

CREATE TABLE public.escolas (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  telefone TEXT,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.escolas TO authenticated;
GRANT ALL ON public.escolas TO service_role;
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escola_select_own" ON public.escolas FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "escola_insert_own" ON public.escolas FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "escola_update_own" ON public.escolas FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  tipo public.tipo_ocorrencia NOT NULL,
  descricao TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  precisao_metros DOUBLE PRECISION,
  endereco_aproximado TEXT,
  status public.status_alerta NOT NULL DEFAULT 'aguardando_resposta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.alertas TO authenticated;
GRANT ALL ON public.alertas TO service_role;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerta_select_own" ON public.alertas FOR SELECT TO authenticated USING (auth.uid() = escola_id);
CREATE POLICY "alerta_insert_own" ON public.alertas FOR INSERT TO authenticated WITH CHECK (auth.uid() = escola_id);
CREATE POLICY "alerta_update_own" ON public.alertas FOR UPDATE TO authenticated USING (auth.uid() = escola_id) WITH CHECK (auth.uid() = escola_id);

CREATE INDEX alertas_escola_created_idx ON public.alertas (escola_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER escolas_updated_at BEFORE UPDATE ON public.escolas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER alertas_updated_at BEFORE UPDATE ON public.alertas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_school()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.escolas (id, nome, cnpj, endereco, cidade, estado, telefone, responsavel)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', 'Escola'),
    NEW.raw_user_meta_data ->> 'cnpj',
    NEW.raw_user_meta_data ->> 'endereco',
    NEW.raw_user_meta_data ->> 'cidade',
    NEW.raw_user_meta_data ->> 'estado',
    NEW.raw_user_meta_data ->> 'telefone',
    NEW.raw_user_meta_data ->> 'responsavel'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created_school
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_school();