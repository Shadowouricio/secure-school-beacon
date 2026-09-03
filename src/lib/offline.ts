import type { Orgao } from "@/lib/autoridades";

export type OfflineContato = {
  orgao: Orgao;
  label: string;
  telefone: string;
};

const configurarTelefone = (nome: string, padrao: string) => {
  const valor: unknown = import.meta.env[nome];
  return typeof valor === "string" && valor.trim() ? valor.trim() : padrao;
};

export const CONTATOS_OFFLINE: OfflineContato[] = [
  {
    orgao: "policia",
    label: "Polícia",
    telefone: configurarTelefone("VITE_OFFLINE_PHONE_POLICIA", "190"),
  },
  { orgao: "samu", label: "SAMU", telefone: configurarTelefone("VITE_OFFLINE_PHONE_SAMU", "192") },
  {
    orgao: "bombeiros",
    label: "Bombeiros",
    telefone: configurarTelefone("VITE_OFFLINE_PHONE_BOMBEIROS", "193"),
  },
  {
    orgao: "conselho_tutelar",
    label: "Conselho Tutelar",
    telefone: configurarTelefone("VITE_OFFLINE_PHONE_CONSELHO_TUTELAR", "100"),
  },
];

export function contatoOffline(orgao: Orgao) {
  return CONTATOS_OFFLINE.find((contato) => contato.orgao === orgao) ?? null;
}

export function linkTelefone(telefone: string) {
  return `tel:${telefone.replace(/[^\d+]/g, "")}`;
}
