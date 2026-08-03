import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useRealtimeAlertas } from "@/hooks/use-realtime-alertas";
import { corStatus, formatarDataHora, labelStatus, labelTipo } from "@/lib/alertas";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Ocorrências | Rede de Segurança Escolar" },
      {
        name: "description",
        content:
          "Consulte todos os alertas de emergência enviados pela escola, com tipo, data, horário e status do atendimento.",
      },
      { property: "og:title", content: "Histórico de Ocorrências" },
      {
        property: "og:description",
        content: "Todos os alertas enviados pela instituição e seus status.",
      },
    ],
  }),
  component: Historico,
});

function Historico() {
  const { data, isLoading } = useQuery({
    queryKey: ["alertas", "todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell titulo="Histórico">
      <h1 className="font-display text-xl font-bold">Ocorrências enviadas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Registro completo dos alertas emitidos pela instituição.
      </p>

      <div className="mt-5 space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : data && data.length > 0 ? (
          data.map((a) => (
            <Link
              key={a.id}
              to="/alerta/$id"
              params={{ id: a.id }}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{labelTipo(a.tipo)}</p>
                <p className="truncate text-xs text-muted-foreground">{a.descricao}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatarDataHora(a.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${corStatus(a.status)}`}
                >
                  {labelStatus(a.status)}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nenhuma ocorrência registrada.
          </p>
        )}
      </div>
    </AppShell>
  );
}
