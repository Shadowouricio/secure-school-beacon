import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, ExternalLink, MapPin, Phone, School } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AutoridadeShell } from "@/components/AutoridadeShell";
import { Button } from "@/components/ui/button";
import { useRealtimeAlertas } from "@/hooks/use-realtime-alertas";
import { corStatus, formatarDataHora, labelStatus, labelTipo } from "@/lib/alertas";
import { ACOES, labelAcao } from "@/lib/autoridades";

export const Route = createFileRoute("/_authenticated/ocorrencia/$id")({
  head: () => ({
    meta: [
      { title: "Ocorrência em Atendimento | Autoridades" },
      {
        name: "description",
        content:
          "Detalhes críticos da ocorrência: escola, endereço, mapa, tipo, horário, descrição e ações de atendimento.",
      },
      { property: "og:title", content: "Ocorrência em Atendimento" },
      {
        property: "og:description",
        content: "Informações completas do alerta escolar e registro das ações da equipe.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ocorrencia,
});

function Ocorrencia() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [salvando, setSalvando] = useState<string | null>(null);

  const { data: alerta, isLoading } = useQuery({
    queryKey: ["central", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas")
        .select("*, escolas(nome, endereco, cidade, estado, telefone, responsavel)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: registros } = useQuery({
    queryKey: ["atendimentos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atendimentos")
        .select("*, autoridades(nome_agente, orgao)")
        .eq("alerta_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  async function registrar(acao: (typeof ACOES)[number]) {
    setSalvando(acao.acao);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setSalvando(null);
      return;
    }
    const { error: erroRegistro } = await supabase
      .from("atendimentos")
      .insert({ alerta_id: id, autoridade_id: uid, acao: acao.acao });
    if (!erroRegistro) {
      await supabase.from("alertas").update({ status: acao.status }).eq("id", id);
    }
    setSalvando(null);
    if (erroRegistro) {
      toast.error("Não foi possível registrar a ação", { description: erroRegistro.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
    await queryClient.invalidateQueries({ queryKey: ["central"] });
    toast.success(acao.label + " registrado");
  }

  if (isLoading) {
    return (
      <AutoridadeShell subtitulo="Ocorrência">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </AutoridadeShell>
    );
  }

  if (!alerta) {
    return (
      <AutoridadeShell subtitulo="Ocorrência">
        <p className="text-sm text-muted-foreground">Ocorrência não encontrada.</p>
        <Link to="/central" className="mt-4 inline-block text-sm underline underline-offset-4">
          Voltar à central
        </Link>
      </AutoridadeShell>
    );
  }

  const escola = alerta.escolas as {
    nome: string;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    telefone: string | null;
    responsavel: string | null;
  } | null;

  const temCoords = alerta.latitude != null && alerta.longitude != null;
  const bbox = temCoords
    ? `${alerta.longitude! - 0.004},${alerta.latitude! - 0.003},${alerta.longitude! + 0.004},${alerta.latitude! + 0.003}`
    : "";

  return (
    <AutoridadeShell subtitulo="Ocorrência">
      <div className="rounded-2xl border border-emergency/50 bg-surface p-4">
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${corStatus(alerta.status)}`}
        >
          {labelStatus(alerta.status)}
        </span>
        <h1 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-wide text-emergency">
          {labelTipo(alerta.tipo)}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-4" />
          {formatarDataHora(alerta.created_at)}
        </p>
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <p className="flex items-center gap-2 font-display font-semibold">
          <School className="size-4 text-info" />
          {escola?.nome ?? "Escola"}
        </p>
        <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span>
            {escola?.endereco || "Endereço não informado"}
            {escola?.cidade ? ` — ${escola.cidade}/${escola.estado ?? ""}` : ""}
          </span>
        </p>
        {escola?.telefone ? (
          <a
            href={`tel:${escola.telefone}`}
            className="mt-2 flex items-center gap-2 text-sm text-info underline-offset-4 hover:underline"
          >
            <Phone className="size-4" />
            {escola.telefone}
            {escola.responsavel ? ` · ${escola.responsavel}` : ""}
          </a>
        ) : null}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Descrição
        </h2>
        <p className="mt-2 text-sm">{alerta.descricao}</p>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
        {temCoords ? (
          <>
            <iframe
              title="Localização da ocorrência"
              className="h-56 w-full border-0"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${alerta.latitude},${alerta.longitude}`}
            />
            <div className="flex items-center justify-between gap-2 p-3 text-xs text-muted-foreground">
              <span>
                {alerta.latitude!.toFixed(5)}, {alerta.longitude!.toFixed(5)}
                {alerta.precisao_metros ? ` · ±${Math.round(alerta.precisao_metros)} m` : ""}
              </span>
              <a
                className="flex items-center gap-1 text-info underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${alerta.latitude},${alerta.longitude}`}
              >
                Traçar rota <ExternalLink className="size-3" />
              </a>
            </div>
          </>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">Localização não disponível.</p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Ações de atendimento
        </h2>
        <div className="mt-3 grid gap-2">
          {ACOES.map((a) => (
            <Button
              key={a.acao}
              size="lg"
              variant={a.acao === "ocorrencia_finalizada" ? "outline" : "default"}
              disabled={salvando !== null || alerta.status === "encerrado"}
              onClick={() => registrar(a)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Registro de horários
        </h2>
        {registros && registros.length > 0 ? (
          <ol className="mt-3 space-y-2">
            {registros.map((r) => {
              const agente = r.autoridades as { nome_agente: string } | null;
              return (
                <li key={r.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
                  <p className="font-medium">{labelAcao(r.acao)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatarDataHora(r.created_at)} · {agente?.nome_agente ?? "Agente"}
                  </p>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
            Nenhuma ação registrada.
          </p>
        )}
      </section>

      <Link
        to="/central"
        className="mt-6 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Voltar à central
      </Link>
    </AutoridadeShell>
  );
}
