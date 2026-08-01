import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AutoridadeShell } from "@/components/AutoridadeShell";
import { corStatus, formatarDataHora, labelStatus, labelTipo } from "@/lib/alertas";
import { labelAcao } from "@/lib/autoridades";

export const Route = createFileRoute("/_authenticated/atendimentos")({
  head: () => ({
    meta: [
      { title: "Histórico de Atendimentos | Autoridades" },
      {
        name: "description",
        content:
          "Histórico completo de atendimentos realizados pelo órgão, com horários registrados e agente responsável por cada ação.",
      },
      { property: "og:title", content: "Histórico de Atendimentos" },
      {
        property: "og:description",
        content: "Registro de ocorrências atendidas, horários e agentes responsáveis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Atendimentos,
});

function Atendimentos() {
  const { data, isLoading } = useQuery({
    queryKey: ["atendimentos", "meus"],
    queryFn: async () => {
      const { data: registros, error } = await supabase
        .from("atendimentos")
        .select("*, autoridades(nome_agente, orgao), alertas(id, tipo, status, created_at, escola_id, escolas(nome, cidade))")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return registros;
    },
  });

  return (
    <AutoridadeShell subtitulo="Atendimentos">
      <h1 className="font-display text-lg font-bold">Histórico de atendimentos</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Cada ação registrada com horário e agente responsável.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : data && data.length > 0 ? (
        <ul className="space-y-2">
          {data.map((r) => {
            const alerta = r.alertas as
              | { id: string; tipo: string; status: string; escolas: { nome: string; cidade: string | null } | null }
              | null;
            const agente = r.autoridades as { nome_agente: string } | null;
            return (
              <li key={r.id}>
                <Link
                  to="/ocorrencia/$id"
                  params={{ id: alerta?.id ?? "" }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{labelAcao(r.acao)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {labelTipo(alerta?.tipo ?? "")} · {alerta?.escolas?.nome ?? "Escola"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatarDataHora(r.created_at)} · {agente?.nome_agente ?? "Agente"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${corStatus(alerta?.status ?? "")}`}
                    >
                      {labelStatus(alerta?.status ?? "")}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nenhum atendimento registrado ainda.
        </p>
      )}
    </AutoridadeShell>
  );
}
