CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

ALTER FUNCTION public.autoridade_pode_acessar_alerta(uuid, uuid, public.orgao_tipo[])
SET SCHEMA private;

REVOKE ALL ON FUNCTION private.autoridade_pode_acessar_alerta(uuid, uuid, public.orgao_tipo[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.autoridade_pode_acessar_alerta(uuid, uuid, public.orgao_tipo[]) FROM anon;
GRANT EXECUTE ON FUNCTION private.autoridade_pode_acessar_alerta(uuid, uuid, public.orgao_tipo[]) TO authenticated;
GRANT EXECUTE ON FUNCTION private.autoridade_pode_acessar_alerta(uuid, uuid, public.orgao_tipo[]) TO service_role;