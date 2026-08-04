export const TIPOS_OCORRENCIA = [
  { value: "ameaca_seguranca", label: "Ameaça de segurança" },
  { value: "invasao", label: "Invasão" },
  { value: "emergencia_medica", label: "Emergência médica" },
  { value: "incendio", label: "Incêndio" },
  { value: "outro", label: "Outro" },
] as const;

export type TipoOcorrencia = (typeof TIPOS_OCORRENCIA)[number]["value"];

export const STATUS_ALERTA = [
  { value: "aguardando_resposta", label: "Aguardando atendimento" },
  { value: "recebimento_confirmado", label: "Recebido" },
  { value: "equipe_acionada", label: "Em atendimento" },
  { value: "atendimento_iniciado", label: "Em atendimento" },
  { value: "encerrado", label: "Finalizado" },
] as const;

export type StatusAlerta = (typeof STATUS_ALERTA)[number]["value"];

/** Etapas exibidas na linha do tempo (status agrupados em 4 fases). */
export const ETAPAS_ATENDIMENTO = [
  { label: "Aguardando atendimento", status: ["aguardando_resposta"] },
  { label: "Recebido", status: ["recebimento_confirmado"] },
  { label: "Em atendimento", status: ["equipe_acionada", "atendimento_iniciado"] },
  { label: "Finalizado", status: ["encerrado"] },
] as const;

export function etapaAtual(status: string) {
  const i = ETAPAS_ATENDIMENTO.findIndex((e) => (e.status as readonly string[]).includes(status));
  return i < 0 ? 0 : i;
}

export function labelTipo(tipo: string) {
  return TIPOS_OCORRENCIA.find((t) => t.value === tipo)?.label ?? "Outro";
}

export function labelStatus(status: string) {
  return STATUS_ALERTA.find((s) => s.value === status)?.label ?? status;
}


export function corStatus(status: string) {
  switch (status) {
    case "aguardando_resposta":
      return "bg-warning/15 text-warning border-warning/40";
    case "recebimento_confirmado":
      return "bg-info/15 text-info border-info/40";
    case "equipe_acionada":
      return "bg-info/15 text-info border-info/40";
    case "atendimento_iniciado":
      return "bg-emergency/15 text-emergency border-emergency/40";
    case "encerrado":
      return "bg-success/15 text-success border-success/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type Localizacao = {
  latitude: number;
  longitude: number;
  precisao_metros: number | null;
  capturada_em: string;
  origem: "dispositivo" | "escola";
};

export const PRIORIDADES_LABEL: Record<string, string> = {
  baixa: "Baixa urgência",
  media: "Média urgência",
  alta: "Alta urgência",
  vermelho: "Vermelho · ameaça imediata",
};

export function labelPrioridade(p: string | null | undefined) {
  return p ? (PRIORIDADES_LABEL[p] ?? p) : "—";
}

/** Abre o app de mapas do aparelho (ou o Google Maps na web) com rota até o ponto. */
export function abrirNavegacao(latitude: number, longitude: number, rotulo?: string) {
  const destino = `${latitude},${longitude}`;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`;
  if (typeof window === "undefined") return;
  const ua = navigator.userAgent;
  const nativo = /iPad|iPhone|iPod/.test(ua)
    ? `maps://?daddr=${destino}&dirflg=d`
    : /Android/.test(ua)
      ? `geo:${destino}?q=${destino}(${encodeURIComponent(rotulo ?? "Ocorrência")})`
      : null;

  if (nativo) {
    // Se nenhum app de mapas atender, cai para o Google Maps na web.
    const inicio = Date.now();
    window.location.href = nativo;
    window.setTimeout(() => {
      if (Date.now() - inicio < 2000 && !document.hidden) window.open(web, "_blank", "noopener");
    }, 1200);
    return;
  }
  window.open(web, "_blank", "noopener");
}


export function capturarLocalizacao(): Promise<Localizacao> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocalização indisponível neste dispositivo."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisao_metros: pos.coords.accuracy ?? null,
          capturada_em: new Date(pos.timestamp || Date.now()).toISOString(),
          origem: "dispositivo",
        }),
      (err) => reject(new Error(err.message || "Não foi possível obter a localização.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

