import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ChevronRight, MapPin, Siren } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AutoridadeShell } from "@/components/AutoridadeShell";
import { corStatus, formatarDataHora, labelStatus, labelTipo } from "@/lib/alertas";
import { labelOrgao, tocarAlerta } from "@/lib/autoridades";

export const Route = createFileRoute("/_authenticated/central")({
  head: () => ({
    meta: [
      { title: "Central de Alertas | Autoridades" },
      {
        name: "description",
        content:
          "Central de recebimento de alertas escolares em tempo real para Polícia, SAMU, Bombeiros e Conselho Tutelar.",
      },
      { property: "og:title", content: "Central de Alertas | Autoridades" },
      {
        property: "og:description",
        content: "Alertas ativos enviados por escolas, com local, tipo e horário da ocorrência.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Central,
});

function Central() {
  const queryClient = useQueryClient();

  const { data: autoridade } = useQuery({
    queryKey: ["autoridade"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("autoridades")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const orgao = autoridade?.orgao ?? null;
  const meuId = autoridade?.id ?? null;

  const { data: alertas, isLoading } = useQuery({
    enabled: !!orgao,
    queryKey: ["central", "ativos", orgao],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas")
        .select("*, escolas(nome, endereco, cidade, estado, telefone)")
        .neq("status", "encerrado")
        .neq("escola_id", meuId!)
        .overlaps("orgaos_destino", [orgao!])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!orgao || !meuId) return;
    const canal = supabase
      .channel("central-alertas")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alertas" },
        (payload) => {
          const novo = payload.new as {
            tipo: string;
            escola_id: string;
            orgaos_destino: string[] | null;
          };
          // Só notifica agentes do órgão destinatário e nunca o próprio remetente.
          if (novo.escola_id === meuId) return;
          if (!novo.orgaos_destino?.includes(orgao)) return;
          tocarAlerta();
          toast.error("🚨 NOVO ALERTA DE EMERGÊNCIA", {
            description: labelTipo(novo.tipo),
            duration: 15000,
          });
          queryClient.invalidateQueries({ queryKey: ["central"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alertas" },
        () => queryClient.invalidateQueries({ queryKey: ["central"] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [queryClient, orgao, meuId]);


  return (
    <AutoridadeShell subtitulo={autoridade ? labelOrgao(autoridade.orgao) : "Autoridades"}>
      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Agente em serviço</p>
        <h1 className="mt-1 font-display text-lg font-bold">{autoridade?.nome_agente ?? "—"}</h1>
        <p className="text-sm text-muted-foreground">
          {autoridade ? labelOrgao(autoridade.orgao) : ""}
          {autoridade?.unidade ? ` · ${autoridade.unidade}` : ""}
        </p>
      </section>

      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Alertas ativos
        </h2>
        <span className="rounded-full border border-emergency/40 bg-emergency/10 px-2 py-0.5 text-xs text-emergency">
          {alertas?.length ?? 0}
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando ocorrências…</p>
      ) : alertas && alertas.length > 0 ? (
        <ul className="space-y-3">
          {alertas.map((a) => {
            const escola = a.escolas as { nome: string; endereco: string | null; cidade: string | null; estado: string | null } | null;
            const urgente = a.status === "aguardando_resposta";
            return (
              <li key={a.id}>
                <Link
                  to="/ocorrencia/$id"
                  params={{ id: a.id }}
                  className={`block rounded-2xl border bg-surface p-4 ${
                    urgente ? "border-emergency pulse-emergency" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-display font-bold">
                        <Siren className={`size-4 ${urgente ? "text-emergency" : "text-muted-foreground"}`} />
                        {labelTipo(a.tipo)}
                      </p>
                      <p className="mt-1 truncate text-sm">{escola?.nome ?? "Escola"}</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {escola?.endereco || "Endereço não informado"}
                        {escola?.cidade ? ` — ${escola.cidade}/${escola.estado ?? ""}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatarDataHora(a.created_at)}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  </div>
                  <span
                    className={`mt-3 inline-block rounded-full border px-2 py-0.5 text-[11px] ${corStatus(a.status)}`}
                  >
                    {labelStatus(a.status)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nenhum alerta ativo no momento.
        </p>
      )}
    </AutoridadeShell>
  );
}
