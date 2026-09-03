import type { Orgao } from "@/lib/autoridades";

/** Números oficiais de emergência usados quando o aparelho está sem internet. */
export const TELEFONES_PADRAO: Record<Orgao, string> = {
  policia: "190",
  samu: "192",
  bombeiros: "193",
  conselho_tutelar: "100",
};

const CHAVE = "rse.telefones-emergencia";

/** Números configurados pela escola (com fallback nos números oficiais). */
export function telefonesEmergencia(): Record<Orgao, string> {
  if (typeof window === "undefined") return { ...TELEFONES_PADRAO };
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return { ...TELEFONES_PADRAO };
    const salvo = JSON.parse(bruto) as Partial<Record<Orgao, string>>;
    return { ...TELEFONES_PADRAO, ...salvo };
  } catch {
    return { ...TELEFONES_PADRAO };
  }
}

export function salvarTelefonesEmergencia(valores: Partial<Record<Orgao, string>>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE, JSON.stringify(valores));
}

/** Abre o discador do aparelho com o número da autoridade correspondente. */
export function ligarPara(orgao: Orgao) {
  if (typeof window === "undefined") return;
  const numero = telefonesEmergencia()[orgao] ?? TELEFONES_PADRAO[orgao];
  window.location.href = `tel:${numero.replace(/[^\d+]/g, "")}`;
}
