-- MEMBROS DA ESCOLA
CREATE TABLE public.membros_escola (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text NOT NULL DEFAULT 'professor',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.membros_escola TO authenticated;
GRANT ALL ON public.membros_escola TO service_role;
ALTER TABLE public.membros_escola ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.minha_escola()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT m.escola_id FROM public.membros_escola m WHERE m.user_id = auth.uid() LIMIT 1),
    (SELECT e.id FROM public.escolas e WHERE e.id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.sou_diretor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membros_escola m
     WHERE m.user_id = auth.uid() AND m.cargo = 'diretor'
  ) OR EXISTS (
    SELECT 1 FROM public.escolas e WHERE e.id = auth.uid()
  );
$$;

CREATE POLICY membro_select_propria_escola ON public.membros_escola
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR escola_id = public.minha_escola());

CREATE POLICY membro_insert_self ON public.membros_escola
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY membro_update_diretor ON public.membros_escola
  FOR UPDATE TO authenticated
  USING (escola_id = public.minha_escola() AND public.sou_diretor())
  WITH CHECK (escola_id = public.minha_escola() AND public.sou_diretor());

CREATE POLICY membro_delete_diretor ON public.membros_escola
  FOR DELETE TO authenticated
  USING (escola_id = public.minha_escola() AND public.sou_diretor() AND user_id <> auth.uid());

CREATE TRIGGER membros_escola_updated_at BEFORE UPDATE ON public.membros_escola
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LISTA PÚBLICA DE ESCOLAS (apenas id e nome) PARA O CADASTRO DE MEMBROS
CREATE OR REPLACE FUNCTION public.listar_escolas()
RETURNS TABLE (id uuid, nome text, cidade text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.id, e.nome, e.cidade FROM public.escolas e ORDER BY e.nome;
$$;

GRANT EXECUTE ON FUNCTION public.listar_escolas() TO authenticated;

-- CAMPOS DO REGISTRO DE OCORRÊNCIA
ALTER TABLE public.alertas
  ADD COLUMN IF NOT EXISTS registro_tipo text NOT NULL DEFAULT 'emergencia',
  ADD COLUMN IF NOT EXISTS aluno_nome text,
  ADD COLUMN IF NOT EXISTS turma text,
  ADD COLUMN IF NOT EXISTS data_ocorrencia date,
  ADD COLUMN IF NOT EXISTS hora_ocorrencia time,
  ADD COLUMN IF NOT EXISTS local_ocorrencia text,
  ADD COLUMN IF NOT EXISTS detalhes text,
  ADD COLUMN IF NOT EXISTS responsavel_registro text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.alertas ALTER COLUMN descricao DROP NOT NULL;
ALTER TABLE public.alertas ALTER COLUMN tipo SET DEFAULT 'outro'::public.tipo_ocorrencia;

CREATE POLICY alerta_select_membro ON public.alertas
  FOR SELECT TO authenticated
  USING (escola_id = public.minha_escola());

CREATE POLICY alerta_insert_membro ON public.alertas
  FOR INSERT TO authenticated
  WITH CHECK (escola_id = public.minha_escola() AND created_by = auth.uid());

CREATE POLICY alerta_update_diretor ON public.alertas
  FOR UPDATE TO authenticated
  USING (escola_id = public.minha_escola() AND public.sou_diretor())
  WITH CHECK (escola_id = public.minha_escola() AND public.sou_diretor());

CREATE POLICY alerta_delete_diretor ON public.alertas
  FOR DELETE TO authenticated
  USING (escola_id = public.minha_escola() AND public.sou_diretor());

-- FOTOS DA OCORRÊNCIA
CREATE TABLE public.ocorrencia_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id uuid NOT NULL REFERENCES public.alertas(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocorrencia_fotos TO authenticated;
GRANT ALL ON public.ocorrencia_fotos TO service_role;
ALTER TABLE public.ocorrencia_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY foto_select_escola ON public.ocorrencia_fotos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.alertas a
     WHERE a.id = ocorrencia_fotos.alerta_id AND a.escola_id = public.minha_escola()
  ));

CREATE POLICY foto_insert_escola ON public.ocorrencia_fotos
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.alertas a
     WHERE a.id = ocorrencia_fotos.alerta_id AND a.escola_id = public.minha_escola()
  ));

CREATE POLICY foto_delete_diretor ON public.ocorrencia_fotos
  FOR DELETE TO authenticated
  USING (public.sou_diretor() AND EXISTS (
    SELECT 1 FROM public.alertas a
     WHERE a.id = ocorrencia_fotos.alerta_id AND a.escola_id = public.minha_escola()
  ));