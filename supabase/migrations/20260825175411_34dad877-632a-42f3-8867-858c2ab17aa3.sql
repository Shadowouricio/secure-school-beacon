CREATE POLICY ocorrencia_foto_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ocorrencias' AND (storage.foldername(name))[1] = public.minha_escola()::text);

CREATE POLICY ocorrencia_foto_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ocorrencias' AND (storage.foldername(name))[1] = public.minha_escola()::text);

CREATE POLICY ocorrencia_foto_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ocorrencias' AND (storage.foldername(name))[1] = public.minha_escola()::text AND public.sou_diretor());