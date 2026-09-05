import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, MapPin } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useRealtimeAlertas } from "@/hooks/use-realtime-alertas";
import { corStatus, formatarDataHora, labelStatus, labelTipo } from "@/lib/alertas";
import { carregarPerfil } from "@/lib/autoridades";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel de Emergência | Rede de Segurança Escolar" },
      {
        name: "description",
        content:
          "Painel da escola para acionar autoridades com alertas de emergência em poucos toques, com localização e horário automáticos.",
      },
      { property: "og:title", content: "Painel de Emergência | Rede de Segurança Escolar" },
      {
        property: "og:description",
        content: "Envie alertas de emergência para os órgãos cadastrados em segundos.",
      },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const { data: escola } = useQuery({
    queryKey: ["escola"],
    queryFn: async () => {
      const { data, error } = await supabase.from("escolas").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: ultimos } = useQuery({
    queryKey: ["alertas", "recentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas")
        .select("*")
        .eq("registro_tipo", "emergencia")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  useRealtimeAlertas("escola-inicio", [["alertas"]]);



  return (
    <AppShell titulo={escola?.nome ?? "Escola"}>
      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Instituição</p>
        <h1 className="mt-1 font-display text-xl font-bold">{escola?.nome ?? "—"}</h1>
        {escola?.cidade ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {escola.cidade}
            {escola.estado ? ` / ${escola.estado}` : ""}
          </p>
        ) : null}
      </section>

      <Link to="/novo-alerta" className="mt-6 block">
        <span className="pulse-emergency flex w-full flex-col items-center gap-3 rounded-2xl bg-emergency px-6 py-10 text-center text-emergency-foreground">
          <AlertTriangle className="size-10" />
          <span className="font-display text-2xl font-extrabold uppercase leading-tight tracking-wide">
            Enviar alerta
            <br />
            de emergência
          </span>
          <span className="text-sm opacity-90">Toque para acionar as autoridades</span>
        </span>
      </Link>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Ocorrências recentes
          </h2>
          <Link to="/historico" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Ver tudo
          </Link>
        </div>

        {ultimos && ultimos.length > 0 ? (
          <ul className="space-y-2">
            {ultimos.map((a) => (
              <li key={a.id}>
                <Link
                  to="/alerta/$id"
                  params={{ id: a.id }}
                  search={{ enviado: false }}

                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{labelTipo(a.tipo)}</p>
                    <p className="text-xs text-muted-foreground">{formatarDataHora(a.created_at)}</p>
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
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nenhum alerta enviado até o momento.
          </p>
        )}
      </section>
    </AppShell>
  );
}
