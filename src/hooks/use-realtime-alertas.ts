import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Assina as mudanças em tempo real de `alertas` e `atendimentos` e revalida
 * as consultas indicadas. Usado pelas telas da escola (Sistema A) para ver
 * mudanças de status feitas pelas autoridades (Sistema B) sem recarregar.
 */
export function useRealtimeAlertas(chave: string, queryKeys: unknown[][]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidar = () => {
      queryKeys.forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey });
      });
    };

    const canal = supabase
      .channel(`realtime-${chave}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "alertas" }, invalidar)
      .on("postgres_changes", { event: "*", schema: "public", table: "atendimentos" }, invalidar)
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, queryClient]);
}
