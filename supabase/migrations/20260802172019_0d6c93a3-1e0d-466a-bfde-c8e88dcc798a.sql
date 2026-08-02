ALTER TABLE public.alertas
  ADD COLUMN IF NOT EXISTS orgaos_destino orgao_tipo[] NOT NULL DEFAULT ARRAY['policia','samu','bombeiros','conselho_tutelar']::orgao_tipo[];

UPDATE public.alertas
SET orgaos_destino = ARRAY['policia','samu','bombeiros','conselho_tutelar']::orgao_tipo[]
WHERE orgaos_destino IS NULL OR cardinality(orgaos_destino) = 0;

CREATE OR REPLACE FUNCTION public.alerta_destinado_a(_alerta_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.alertas a
    JOIN public.autoridades au ON au.id = _user_id
    WHERE a.id = _alerta_id
      AND a.escola_id <> _user_id
      AND au.orgao = ANY (a.orgaos_destino)
  );
$$;

DROP POLICY IF EXISTS alerta_select_autoridade ON public.alertas;
CREATE POLICY alerta_select_autoridade ON public.alertas
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'autoridade'::app_role)
  AND escola_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.autoridades au
    WHERE au.id = auth.uid() AND au.orgao = ANY (alertas.orgaos_destino)
  )
);

DROP POLICY IF EXISTS alerta_update_autoridade ON public.alertas;
CREATE POLICY alerta_update_autoridade ON public.alertas
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'autoridade'::app_role)
  AND escola_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.autoridades au
    WHERE au.id = auth.uid() AND au.orgao = ANY (alertas.orgaos_destino)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'autoridade'::app_role)
  AND escola_id <> auth.uid()
);

DROP POLICY IF EXISTS atendimento_insert_autoridade ON public.atendimentos;
CREATE POLICY atendimento_insert_autoridade ON public.atendimentos
FOR INSERT TO authenticated
WITH CHECK (
  autoridade_id = auth.uid()
  AND has_role(auth.uid(), 'autoridade'::app_role)
  AND public.alerta_destinado_a(alerta_id, auth.uid())
);

DROP POLICY IF EXISTS atendimento_select_autoridade ON public.atendimentos;
CREATE POLICY atendimento_select_autoridade ON public.atendimentos
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'autoridade'::app_role)
  AND public.alerta_destinado_a(alerta_id, auth.uid())
);