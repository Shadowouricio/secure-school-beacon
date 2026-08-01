-- roles
CREATE TYPE public.app_role AS ENUM ('escola', 'autoridade');
CREATE TYPE public.orgao_tipo AS ENUM ('policia', 'samu', 'bombeiros', 'conselho_tutelar');
CREATE TYPE public.acao_atendimento AS ENUM ('recebimento_confirmado', 'equipe_em_deslocamento', 'chegada_ao_local', 'ocorrencia_finalizada');

ALTER TYPE public.status_alerta ADD VALUE IF NOT EXISTS 'recebimento_confirmado' AFTER 'aguardando_resposta';

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY user_roles_insert_own ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- backfill existing users as escolas
INSERT INTO public.user_roles (user_id, role) SELECT id, 'escola'::public.app_role FROM public.escolas ON CONFLICT DO NOTHING;

-- autoridades
CREATE TABLE public.autoridades (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_agente text NOT NULL,
  orgao public.orgao_tipo NOT NULL,
  unidade text,
  matricula text,
  telefone text,
  cidade text,
  estado text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.autoridades TO authenticated;
GRANT ALL ON public.autoridades TO service_role;
ALTER TABLE public.autoridades ENABLE ROW LEVEL SECURITY;
CREATE POLICY autoridade_select_own ON public.autoridades FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY autoridade_insert_own ON public.autoridades FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY autoridade_update_own ON public.autoridades FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER autoridades_updated_at BEFORE UPDATE ON public.autoridades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- atendimentos (registro de acoes por agente)
CREATE TABLE public.atendimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id uuid NOT NULL REFERENCES public.alertas(id) ON DELETE CASCADE,
  autoridade_id uuid NOT NULL REFERENCES public.autoridades(id) ON DELETE CASCADE,
  acao public.acao_atendimento NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.atendimentos TO authenticated;
GRANT ALL ON public.atendimentos TO service_role;
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY atendimento_select_autoridade ON public.atendimentos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'autoridade'));
CREATE POLICY atendimento_select_escola ON public.atendimentos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.alertas a WHERE a.id = alerta_id AND a.escola_id = auth.uid()));
CREATE POLICY atendimento_insert_autoridade ON public.atendimentos FOR INSERT TO authenticated
  WITH CHECK (autoridade_id = auth.uid() AND public.has_role(auth.uid(), 'autoridade'));

-- autoridades podem ver e atualizar alertas, e ver escolas
CREATE POLICY alerta_select_autoridade ON public.alertas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'autoridade'));
CREATE POLICY alerta_update_autoridade ON public.alertas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'autoridade')) WITH CHECK (public.has_role(auth.uid(), 'autoridade'));
CREATE POLICY escola_select_autoridade ON public.escolas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'autoridade'));
CREATE POLICY autoridade_select_escola_relacionada ON public.autoridades FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.atendimentos t JOIN public.alertas a ON a.id = t.alerta_id
                 WHERE t.autoridade_id = autoridades.id AND a.escola_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas;