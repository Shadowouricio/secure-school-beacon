import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useRealtimeAlertas } from "@/hooks/use-realtime-alertas";
import { STATUS_ALERTA, corStatus, formatarDataHora, labelStatus, labelTipo } from "@/lib/alertas";

export const Route = createFileRoute("/_authenticated/alerta/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    enviado: search['enviado'] === true || search['enviado'] === "true",
  }),
  head: () => ({
    meta: [
      { title: "Detalhes da Ocorrência | Rede de Segurança Escolar" },
      {
        name: "description",
        content:
          "Acompanhe o status do alerta enviado: aguardando resposta, equipe acionada, atendimento iniciado ou encerrado.",
      },
      { property: "og:title", content: "Detalhes da Ocorrência" },
      {
        property: "og:description",
        content: "Status e informações completas do alerta de emergência enviado.",
      },
    ],
  }),
  component: DetalheAlerta,
});

function DetalheAlerta() {
  const { id } = Route.useParams();
  const { enviado } = Route.useSearch();
  const queryClient = useQueryClient();

  const { data: alerta, isLoading } = useQuery({
    queryKey: ["alertas", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("alertas").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function encerrar() {
    const { error } = await supabase
      .from("alertas")
      .update({ status: "encerrado" })
      .eq("id", id);
    if (error) {
      toast.error("Não foi possível encerrar a ocorrência");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["alertas"] });
    toast.success("Ocorrência encerrada");
  }

  if (isLoading) {
    return (
      <AppShell titulo="Ocorrência">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </AppShell>
    );
  }

  if (!alerta) {
    return (
      <AppShell titulo="Ocorrência">
        <p className="text-sm text-muted-foreground">Ocorrência não encontrada.</p>
        <Link to="/historico" className="mt-4 inline-block text-sm underline underline-offset-4">
          Voltar ao histórico
        </Link>
      </AppShell>
    );
  }

  const indiceAtual = STATUS_ALERTA.findIndex((s) => s.value === alerta.status);

  return (
    <AppShell titulo="Ocorrência">
      {enviado ? (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-4">
          <CheckCircle2 className="size-6 text-success" />
          <div>
            <p className="font-display font-semibold text-success">Alerta enviado com sucesso</p>
            <p className="text-xs text-muted-foreground">
              Os órgãos cadastrados foram notificados.
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-surface p-4">
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${corStatus(alerta.status)}`}
        >
          {labelStatus(alerta.status)}
        </span>
        <h1 className="mt-3 font-display text-xl font-bold">{labelTipo(alerta.tipo)}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{alerta.descricao}</p>

        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <p className="flex items-center gap-2 text-muted-foreground">
            <Clock className="size-4" />
            {formatarDataHora(alerta.created_at)}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4" />
            {alerta.latitude != null && alerta.longitude != null
              ? `${alerta.latitude.toFixed(5)}, ${alerta.longitude.toFixed(5)}`
              : "Localização não disponível"}
          </p>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Status do atendimento
        </h2>
        <ol className="mt-3 space-y-3">
          {STATUS_ALERTA.map((s, i) => {
            const concluido = i <= indiceAtual;
            return (
              <li key={s.value} className="flex items-center gap-3">
                <span
                  className={`flex size-7 items-center justify-center rounded-full border text-xs ${
                    concluido
                      ? "border-emergency bg-emergency text-emergency-foreground"
                      : "border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {concluido ? <ShieldCheck className="size-4" /> : i + 1}
                </span>
                <span className={concluido ? "font-medium" : "text-muted-foreground"}>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {alerta.status !== "encerrado" ? (
        <Button variant="surface" size="lg" className="mt-6 w-full" onClick={() => void encerrar()}>
          Encerrar ocorrência
        </Button>
      ) : null}

      <Link to="/" className="mt-3 block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        Voltar ao início
      </Link>
    </AppShell>
  );
}
