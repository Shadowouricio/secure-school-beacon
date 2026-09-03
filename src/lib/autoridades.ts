import { supabase } from "@/integrations/supabase/client";

export const ORGAOS = [
  { value: "policia", label: "Polícia", sigla: "PM" },
  { value: "samu", label: "SAMU", sigla: "SAMU" },
  { value: "bombeiros", label: "Bombeiros", sigla: "CB" },
  { value: "conselho_tutelar", label: "Conselho Tutelar", sigla: "CT" },
] as const;

export type Orgao = (typeof ORGAOS)[number]["value"];

export function labelOrgao(orgao: string) {
  return ORGAOS.find((o) => o.value === orgao)?.label ?? orgao;
}

/** Órgãos sugeridos como destinatários conforme o tipo de ocorrência. */
export const DESTINOS_SUGERIDOS: Record<string, Orgao[]> = {
  ameaca_seguranca: ["policia"],
  invasao: ["policia"],
  emergencia_medica: ["samu"],
  incendio: ["bombeiros"],
  outro: ["policia"],
};

export const ACOES = [
  {
    acao: "recebimento_confirmado",
    label: "Recebimento confirmado",
    status: "recebimento_confirmado",
  },
  {
    acao: "equipe_em_deslocamento",
    label: "Equipe acionada",
    status: "equipe_acionada",
  },
  {
    acao: "chegada_ao_local",
    label: "Em atendimento",
    status: "atendimento_iniciado",
  },
  {
    acao: "ocorrencia_finalizada",
    label: "Atendimento concluído",
    status: "encerrado",
  },
] as const;

/** Ações exibidas como botões de mudança de status (3 etapas após o envio). */
export const ACOES_STATUS = ACOES;


export type Acao = (typeof ACOES)[number]["acao"];

export function labelAcao(acao: string) {
  return ACOES.find((a) => a.acao === acao)?.label ?? acao;
}

export type Perfil = "escola" | "autoridade" | null;

export async function carregarPerfil(): Promise<Perfil> {
  const { data } = await supabase.from("user_roles").select("role").limit(1).maybeSingle();
  return (data?.role as Perfil) ?? null;
}

/** Sinal sonoro curto para alertas de alta prioridade. */
export function tocarAlerta() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const agora = ctx.currentTime;
    [0, 0.35].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, agora + offset);
      gain.gain.exponentialRampToValueAtTime(0.15, agora + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, agora + offset + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(agora + offset);
      osc.stop(agora + offset + 0.28);
    });
  } catch {
    /* áudio indisponível */
  }
}
