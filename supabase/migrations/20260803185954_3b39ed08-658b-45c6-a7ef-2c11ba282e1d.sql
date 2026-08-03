ALTER TABLE public.alertas REPLICA IDENTITY FULL;
ALTER TABLE public.atendimentos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.atendimentos;

CREATE TABLE public.dispositivos_push (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  plataforma text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispositivos_push TO authenticated;
GRANT ALL ON public.dispositivos_push TO service_role;

ALTER TABLE public.dispositivos_push ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_select_own" ON public.dispositivos_push FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "push_insert_own" ON public.dispositivos_push FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_update_own" ON public.dispositivos_push FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_delete_own" ON public.dispositivos_push FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER dispositivos_push_updated_at BEFORE UPDATE ON public.dispositivos_push
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();