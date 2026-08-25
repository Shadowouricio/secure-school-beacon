REVOKE EXECUTE ON FUNCTION public.minha_escola() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sou_diretor() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.listar_escolas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minha_escola() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sou_diretor() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.listar_escolas() TO authenticated, service_role;