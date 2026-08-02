import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, Loader2, MapPin, RefreshCw } from "lucide-react";
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
import {
  TIPOS_OCORRENCIA,
  capturarLocalizacao,
  formatarDataHora,
  labelTipo,
  type Localizacao,
  type TipoOcorrencia,
} from "@/lib/alertas";
import { DESTINOS_SUGERIDOS, ORGAOS, labelOrgao, type Orgao } from "@/lib/autoridades";

export const Route = createFileRoute("/_authenticated/novo-alerta")({
  head: () => ({
    meta: [
      { title: "Novo Alerta de Emergência | Rede de Segurança Escolar" },
      {
        name: "description",
        content:
          "Registre o tipo de ocorrência, descreva a situação e envie o alerta com localização, data e hora automáticas.",
      },
      { property: "og:title", content: "Novo Alerta de Emergência" },
      {
        property: "og:description",
        content: "Selecione a ocorrência, descreva a situação e acione as autoridades.",
      },
    ],
  }),
  component: NovoAlerta,
});

function NovoAlerta() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tipo, setTipo] = useState<TipoOcorrencia | null>(null);
  const [destinos, setDestinos] = useState<Orgao[]>([]);

  function selecionarTipo(t: TipoOcorrencia) {
    setTipo(t);
    setDestinos(DESTINOS_SUGERIDOS[t] ?? []);
  }

  function alternarDestino(orgao: Orgao) {
    setDestinos((atual) =>
      atual.includes(orgao) ? atual.filter((o) => o !== orgao) : [...atual, orgao],
    );
  }

  const [descricao, setDescricao] = useState("");
  const [local, setLocal] = useState<Localizacao | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [buscandoLocal, setBuscandoLocal] = useState(true);
  const [agora, setAgora] = useState(() => new Date().toISOString());
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function obterLocal() {
    setBuscandoLocal(true);
    setErroLocal(null);
    try {
      setLocal(await capturarLocalizacao());
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : "Falha ao obter localização.");
      setLocal(null);
    } finally {
      setBuscandoLocal(false);
    }
  }

  useEffect(() => {
    void obterLocal();
    const t = setInterval(() => setAgora(new Date().toISOString()), 30000);
    return () => clearInterval(t);
  }, []);

  function abrirConfirmacao() {
    if (!tipo) {
      toast.error("Selecione o tipo de ocorrência");
      return;
    }
    if (descricao.trim().length < 5) {
      toast.error("Descreva brevemente a situação");
      return;
    }
    if (destinos.length === 0) {
      toast.error("Selecione ao menos um órgão destinatário");
      return;
    }

    setAgora(new Date().toISOString());
    setConfirmando(true);
  }

  async function enviar() {
    if (!tipo) return;
    setEnviando(true);
    const { data: userData } = await supabase.auth.getUser();
    const escolaId = userData.user?.id;
    if (!escolaId) {
      setEnviando(false);
      toast.error("Sessão expirada. Entre novamente.");
      return;
    }

    const { data, error } = await supabase
      .from("alertas")
      .insert({
        escola_id: escolaId,
        tipo,
        descricao: descricao.trim().slice(0, 1000),
        latitude: local?.latitude ?? null,
        longitude: local?.longitude ?? null,
        precisao_metros: local?.precisao_metros ?? null,
        orgaos_destino: destinos,
      })
      .select("id")
      .single();

    setEnviando(false);
    setConfirmando(false);

    if (error || !data) {
      toast.error("Falha ao enviar o alerta", { description: error?.message });
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["alertas"] });
    navigate({ to: "/alerta/$id", params: { id: data.id }, search: { enviado: true } });
  }

  return (
    <AppShell titulo="Novo alerta">
      <h1 className="font-display text-xl font-bold">Registrar ocorrência</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Selecione o tipo, descreva a situação e confirme o envio.
      </p>

      <div className="mt-5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Tipo de ocorrência
        </Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {TIPOS_OCORRENCIA.map((t) => {
            const ativo = tipo === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => selecionarTipo(t.value)}
                className={`rounded-xl border p-3 text-left text-sm font-medium transition-colors ${
                  ativo
                    ? "border-emergency bg-emergency/15 text-foreground"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Órgãos que receberão o alerta
        </Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {ORGAOS.map((o) => {
            const ativo = destinos.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={ativo}
                onClick={() => alternarDestino(o.value)}
                className={`rounded-xl border p-3 text-left text-sm font-medium transition-colors ${
                  ativo
                    ? "border-info bg-info/15 text-foreground"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Somente agentes dos órgãos selecionados receberão esta notificação.
        </p>
      </div>


      <div className="mt-5 space-y-1.5">
        <Label htmlFor="descricao" className="text-xs uppercase tracking-wide text-muted-foreground">
          Descrição da situação
        </Label>
        <Textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          maxLength={1000}
          rows={5}
          placeholder="Ex.: Pessoa não identificada tentando entrar pelo portão dos fundos."
          className="bg-surface"
        />
      </div>

      <div className="mt-5 space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 text-emergency" />
          <div className="flex-1">
            <p className="font-medium">Localização automática</p>
            {buscandoLocal ? (
              <p className="text-muted-foreground">Capturando localização…</p>
            ) : local ? (
              <p className="text-muted-foreground">
                {local.latitude.toFixed(5)}, {local.longitude.toFixed(5)}
                {local.precisao_metros ? ` · ±${Math.round(local.precisao_metros)} m` : ""}
              </p>
            ) : (
              <p className="text-warning">{erroLocal}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void obterLocal()}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Atualizar localização"
          >
            <RefreshCw className={`size-4 ${buscandoLocal ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 text-emergency" />
          <div>
            <p className="font-medium">Data e horário</p>
            <p className="text-muted-foreground">{formatarDataHora(agora)}</p>
          </div>
        </div>
      </div>

      <Button variant="emergency" size="xl" className="mt-6" onClick={abrirConfirmacao}>
        <AlertTriangle className="size-6" />
        Enviar alerta
      </Button>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent className="max-w-[340px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio do alerta?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-left text-sm">
                <p>
                  <strong className="text-foreground">Tipo:</strong> {tipo ? labelTipo(tipo) : "—"}
                </p>
                <p>
                  <strong className="text-foreground">Horário:</strong> {formatarDataHora(agora)}
                </p>
                <p>
                  <strong className="text-foreground">Local:</strong>{" "}
                  {local
                    ? `${local.latitude.toFixed(5)}, ${local.longitude.toFixed(5)}`
                    : "não disponível"}
                </p>
                <p className="pt-1">
                  O alerta será enviado imediatamente para:{" "}
                  {destinos.map((d) => labelOrgao(d)).join(", ") || "—"}.

                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={enviando}>Revisar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void enviar();
              }}
              disabled={enviando}
              className="bg-emergency text-emergency-foreground hover:bg-emergency/90"
            >
              {enviando ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
