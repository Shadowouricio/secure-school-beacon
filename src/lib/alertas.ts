export const TIPOS_OCORRENCIA = [
  { value: "ameaca_seguranca", label: "Ameaça de segurança" },
  { value: "invasao", label: "Invasão" },
  { value: "emergencia_medica", label: "Emergência médica" },
  { value: "incendio", label: "Incêndio" },
  { value: "outro", label: "Outro" },
] as const;

export type TipoOcorrencia = (typeof TIPOS_OCORRENCIA)[number]["value"];

export const STATUS_ALERTA = [
  { value: "aguardando_resposta", label: "Aguardando resposta" },
  { value: "recebimento_confirmado", label: "Recebimento confirmado" },
  { value: "equipe_acionada", label: "Equipe em deslocamento" },
  { value: "atendimento_iniciado", label: "Equipe no local" },
  { value: "encerrado", label: "Encerrado" },
] as const;

export type StatusAlerta = (typeof STATUS_ALERTA)[number]["value"];

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
};

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
        }),
      (err) => reject(new Error(err.message || "Não foi possível obter a localização.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  });
}
