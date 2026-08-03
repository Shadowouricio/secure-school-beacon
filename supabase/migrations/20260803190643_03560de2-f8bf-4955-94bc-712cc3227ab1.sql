-- Remove primeiro todas as policies existentes de alertas.
DROP POLICY IF EXISTS "alerta_insert_own" ON public.alertas;
DROP POLICY IF EXISTS "alerta_select_autoridade" ON public.alertas;
DROP POLICY IF EXISTS "alerta_select_own" ON public.alertas;
DROP POLICY IF EXISTS "alerta_update_autoridade" ON public.alertas;
DROP POLICY IF EXISTS "alerta_update_own" ON public.alertas;

-- Remove policies dependentes da antiga função que consultava alertas.
DROP POLICY IF EXISTS "atendimento_insert_autoridade" ON public.atendimentos;
DROP POLICY IF EXISTS "atendimento_select_autoridade" ON public.atendimentos;

-- A função antiga consultava public.alertas durante a autorização.
DROP FUNCTION IF EXISTS public.alerta_destinado_a(uuid, uuid);

-- Esta função de autorização consulta somente tabelas auxiliares.
-- SECURITY DEFINER evita que a policy de autoridades seja avaliada e forme
-- um ciclo indireto alertas -> autoridades -> atendimentos -> alertas.
CREATE OR REPLACE FUNCTION public.autoridade_pode_acessar_alerta(
  _user_id uuid,
  _escola_id uuid,
  _orgaos_destino public.orgao_tipo[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _user_id <> _escola_id
    AND EXISTS (
      SELECT 1
      FROM public.autoridades AS au
      JOIN public.user_roles AS ur
        ON ur.user_id = au.id
       AND ur.role = 'autoridade'::public.app_role
      WHERE au.id = _user_id
        AND au.orgao = ANY (_orgaos_destino)
    );
$$;

REVOKE ALL ON FUNCTION public.autoridade_pode_acessar_alerta(uuid, uuid, public.orgao_tipo[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.autoridade_pode_acessar_alerta(uuid, uuid, public.orgao_tipo[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.autoridade_pode_acessar_alerta(uuid, uuid, public.orgao_tipo[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.autoridade_pode_acessar_alerta(uuid, uuid, public.orgao_tipo[]) TO service_role;

-- Isolamento das escolas: somente a escola proprietária.
CREATE POLICY "alerta_select_own"
ON public.alertas
FOR SELECT
TO authenticated
USING (auth.uid() = escola_id);

CREATE POLICY "alerta_insert_own"
ON public.alertas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = escola_id);

CREATE POLICY "alerta_update_own"
ON public.alertas
FOR UPDATE
TO authenticated
USING (auth.uid() = escola_id)
WITH CHECK (auth.uid() = escola_id);

-- Segurança por órgão sem SELECT recursivo em alertas.
CREATE POLICY "alerta_select_autoridade"
ON public.alertas
FOR SELECT
TO authenticated
USING (
  public.autoridade_pode_acessar_alerta(
    auth.uid(),
    escola_id,
    orgaos_destino
  )
);

CREATE POLICY "alerta_update_autoridade"
ON public.alertas
FOR UPDATE
TO authenticated
USING (
  public.autoridade_pode_acessar_alerta(
    auth.uid(),
    escola_id,
    orgaos_destino
  )
)
WITH CHECK (
  public.autoridade_pode_acessar_alerta(
    auth.uid(),
    escola_id,
    orgaos_destino
  )
);

-- As policies de atendimentos validam o alerta pela policy não recursiva
-- acima; nenhuma função SECURITY DEFINER volta a consultar public.alertas.
CREATE POLICY "atendimento_insert_autoridade"
ON public.atendimentos
FOR INSERT
TO authenticated
WITH CHECK (
  autoridade_id = auth.uid()
  AND public.has_role(auth.uid(), 'autoridade'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.alertas AS a
    WHERE a.id = alerta_id
      AND public.autoridade_pode_acessar_alerta(
        auth.uid(),
        a.escola_id,
        a.orgaos_destino
      )
  )
);

CREATE POLICY "atendimento_select_autoridade"
ON public.atendimentos
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'autoridade'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.alertas AS a
    WHERE a.id = alerta_id
      AND public.autoridade_pode_acessar_alerta(
        auth.uid(),
        a.escola_id,
        a.orgaos_destino
      )
  )
);