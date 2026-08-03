import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Flame, Loader2, MapPin, Shield, Siren, Stethoscope, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  capturarLocalizacao,
  formatarDataHora,
  type Localizacao,
  type TipoOcorrencia,
} from "@/lib/alertas";
import type { Orgao } from "@/lib/autoridades";

export const Route = createFileRoute("/_authenticated/novo-alerta")({
  head: () => ({
    meta: [
      { title: "Enviar Alerta de Emergência | Rede de Segurança Escolar" },
      {
        name: "description",
        content:
          "Envie um alerta em dois toques: escolha o serviço (Polícia, Ambulância ou Conselho Tutelar) e o nível de prioridade.",
      },
      { property: "og:title", content: "Enviar Alerta de Emergência" },
      {
        property: "og:description",
        content: "Dois toques para acionar Polícia, Ambulância ou Conselho Tutelar.",
      },
    ],
  }),
  component: NovoAlerta,
});

type Servico = {
  orgao: Orgao;
  nome: string;
  emoji: string;
  Icone: typeof Shield;
  tipoPadrao: TipoOcorrencia;
  classe: string;
};

const SERVICOS: Servico[] = [
  {
    orgao: "policia",
    nome: "Polícia",
    emoji: "🚓",
    Icone: Shield,
    tipoPadrao: "ameaca_seguranca",
    classe: "bg-info/15 border-info/50 text-info hover:bg-info/25",
  },
  {
    orgao: "samu",
    nome: "Ambulância / Médico",
    emoji: "🚑",
    Icone: Stethoscope,
    tipoPadrao: "emergencia_medica",
    classe: "bg-emergency/15 border-emergency/50 text-emergency hover:bg-emergency/25",
  },
  {
    orgao: "conselho_tutelar",
    nome: "Conselho Tutelar",
    emoji: "👨‍👩‍👧",
    Icone: Users,
    tipoPadrao: "outro",
    classe: "bg-warning/15 border-warning/50 text-warning hover:bg-warning/25",
  },
];

type Prioridade = "baixa" | "media" | "alta" | "vermelho";

const PRIORIDADES: {
  value: Prioridade;
  emoji: string;
  titulo: string;
  descricao: string;
  tempo: string;
  classe: string;
}[] = [
  {
    value: "baixa",
    emoji: "🟢",
    titulo: "Baixa Urgência",
    descricao: "Situação controlada.",
    tempo: "15–20 minutos",
    classe: "border-success/50 bg-success/10 text-success",
  },
  {
    value: "media",
    emoji: "🟡",
    titulo: "Média Urgência",
    descricao: "Necessita atendimento rápido.",
    tempo: "5–10 minutos",
    classe: "border-warning/50 bg-warning/10 text-warning",
  },
  {
    value: "alta",
    emoji: "🟠",
    titulo: "Alta Urgência",
    descricao: "Situação grave.",
    tempo: "1–5 minutos",
    classe: "border-warning/70 bg-warning/20 text-warning",
  },
  {
    value: "vermelho",
    emoji: "🔴",
    titulo: "Invasão / Ameaça Imediata",
    descricao: "Invasão, atirador ativo, agressão grave ou ameaça iminente à vida.",
    tempo: "Resposta imediata",
    classe: "border-emergency bg-emergency/20 text-emergency",
  },
];

function NovoAlerta() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [servico, setServico] = useState<Servico | null>(null);
  const [confirmarVermelho, setConfirmarVermelho] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [local, setLocal] = useState<Localizacao | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => new Date().toISOString());
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setLocal(await capturarLocalizacao());
      } catch (e) {
        setErroLocal(e instanceof Error ? e.message : "Localização indisponível.");
      }
    })();
    const t = setInterval(() => setAgora(new Date().toISOString()), 30000);
    return () => clearInterval(t);
  }, []);

  function escolherPrioridade(p: Prioridade) {
    if (p === "vermelho") {
      setConfirmarVermelho(true);
      return;
    }
    void enviar(p);
  }

  async function enviar(prioridade: Prioridade) {
    if (!servico) return;
    setEnviando(true);

    const { data: userData } = await supabase.auth.getUser();
    const escolaId = userData.user?.id;
    if (!escolaId) {
      setEnviando(false);
      toast.error("Sessão expirada. Entre novamente.");
      return;
    }

    const { data: escola } = await supabase
      .from("escolas")
      .select("nome, responsavel, endereco, cidade, estado")
      .eq("id", escolaId)
      .maybeSingle();

    const partes = [
      `Serviço: ${servico.nome}`,
      `Escola: ${escola?.nome ?? "—"}`,
      `Solicitante: ${escola?.responsavel ?? userData.user?.email ?? "—"} (Escola)`,
      escola?.endereco
        ? `Endereço: ${escola.endereco}${escola.cidade ? `, ${escola.cidade}` : ""}${escola.estado ? `/${escola.estado}` : ""}`
        : null,
      observacoes.trim() ? `Observações: ${observacoes.trim()}` : null,
    ].filter(Boolean);

    const { data, error } = await supabase
      .from("alertas")
      .insert({
        escola_id: escolaId,
        tipo: prioridade === "vermelho" ? "invasao" : servico.tipoPadrao,
        prioridade,
        descricao: partes.join("\n").slice(0, 1000),
        latitude: local?.latitude ?? null,
        longitude: local?.longitude ?? null,
        precisao_metros: local?.precisao_metros ?? null,
        endereco_aproximado: escola?.endereco ?? null,
        orgaos_destino: [servico.orgao],
      })
      .select("id")
      .single();

    setEnviando(false);
    setConfirmarVermelho(false);

    if (error || !data) {
      toast.error("Falha ao enviar o alerta", { description: error?.message });
      return;
    }

    setSucesso(true);
    await queryClient.invalidateQueries({ queryKey: ["alertas"] });
    setTimeout(() => {
      navigate({ to: "/alerta/$id", params: { id: data.id }, search: { enviado: true } });
    }, 1400);
  }

  return (
    <AppShell titulo="Enviar alerta">
      <h1 className="font-display text-2xl font-bold">Qual serviço você precisa?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Toque no serviço e escolha a prioridade. Apenas dois toques.
      </p>

      <div className="mt-5 grid gap-4">
        {SERVICOS.map((s, i) => (
          <button
            key={s.orgao}
            type="button"
            onClick={() => setServico(s)}
            style={{ animationDelay: `${i * 70}ms` }}
            className={`animate-fade-in flex min-h-[124px] items-center gap-5 rounded-3xl border-2 p-5 text-left shadow-lg transition-all duration-200 active:scale-[0.97] ${s.classe}`}
          >
            <span className="text-5xl leading-none" aria-hidden>
              {s.emoji}
            </span>
            <span className="flex-1">
              <span className="block font-display text-xl font-bold text-foreground">{s.nome}</span>
              <span className="block text-sm text-muted-foreground">Acionar agora</span>
            </span>
            <s.Icone className="size-8 shrink-0" />
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-1.5">
        <Label htmlFor="obs" className="text-xs uppercase tracking-wide text-muted-foreground">
          Observações (opcional)
        </Label>
        <Textarea
          id="obs"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Ex.: portão dos fundos, aluno ferido na quadra…"
          className="bg-surface"
        />
      </div>

      <div className="mt-4 space-y-2 rounded-2xl border border-border bg-surface p-4 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="size-4 text-emergency" />
          {local
            ? `${local.latitude.toFixed(5)}, ${local.longitude.toFixed(5)}`
            : (erroLocal ?? "Capturando localização…")}
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Clock className="size-4 text-emergency" />
          {formatarDataHora(agora)}
        </p>
      </div>

      <Drawer open={!!servico && !sucesso} onOpenChange={(o) => !o && setServico(null)}>
        <DrawerContent className="border-border bg-background">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="font-display text-xl">
              Prioridade · {servico?.nome ?? ""}
            </DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-3 px-4 pb-8">
            {PRIORIDADES.map((p, i) => (
              <button
                key={p.value}
                type="button"
                disabled={enviando}
                onClick={() => escolherPrioridade(p.value)}
                style={{ animationDelay: `${i * 60}ms` }}
                className={`animate-fade-in flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-transform duration-150 active:scale-[0.97] disabled:opacity-60 ${p.classe}`}
              >
                <span className="text-3xl leading-none" aria-hidden>
                  {p.emoji}
                </span>
                <span className="flex-1">
                  <span className="block font-display text-base font-bold text-foreground">
                    {p.titulo}
                  </span>
                  <span className="block text-sm text-muted-foreground">{p.descricao}</span>
                  <span className="mt-1 block text-xs font-medium">
                    Tempo estimado: {p.tempo}
                  </span>
                </span>
                {enviando ? <Loader2 className="size-5 animate-spin" /> : null}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmarVermelho} onOpenChange={setConfirmarVermelho}>
        <AlertDialogContent className="max-w-[340px] rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emergency">
              <Siren className="size-5" />
              Alerta Vermelho
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja enviar um ALERTA VERMELHO para {servico?.nome ?? "—"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void enviar("vermelho");
              }}
              disabled={enviando}
              className="bg-emergency text-emergency-foreground hover:bg-emergency/90"
            >
              {enviando ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {sucesso ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/95 animate-fade-in">
          <CheckCircle2 className="size-24 text-success animate-scale-in" />
          <p className="font-display text-xl font-bold">Alerta enviado com sucesso.</p>
        </div>
      ) : null}
    </AppShell>
  );
}
