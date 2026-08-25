import { jsPDF } from "jspdf";

import { supabase } from "@/integrations/supabase/client";

export const CATEGORIAS_OCORRENCIA = [
  "Indisciplina",
  "Agressão física",
  "Agressão verbal / Bullying",
  "Dano ao patrimônio",
  "Atraso ou falta",
  "Uso indevido de celular",
  "Saúde / Mal-estar",
  "Outro",
] as const;

export type RegistroOcorrencia = {
  id: string;
  escola_id: string;
  aluno_nome: string | null;
  turma: string | null;
  data_ocorrencia: string | null;
  hora_ocorrencia: string | null;
  local_ocorrencia: string | null;
  categoria: string | null;
  descricao: string | null;
  detalhes: string | null;
  responsavel_registro: string | null;
  created_at: string;
  created_by: string | null;
};

export type PerfilEscolar = { escolaId: string | null; cargo: "professor" | "diretor" | null; nome: string | null };

export async function carregarPerfilEscolar(): Promise<PerfilEscolar> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? null;
  if (!uid) return { escolaId: null, cargo: null, nome: null };

  const { data: membro } = await supabase
    .from("membros_escola")
    .select("escola_id, cargo, nome")
    .eq("user_id", uid)
    .maybeSingle();

  if (membro) {
    return {
      escolaId: membro.escola_id,
      cargo: membro.cargo === "diretor" ? "diretor" : "professor",
      nome: membro.nome,
    };
  }

  // Conta da própria instituição: acesso equivalente ao de diretor.
  const { data: escola } = await supabase
    .from("escolas")
    .select("id, responsavel, nome")
    .eq("id", uid)
    .maybeSingle();
  if (escola) {
    return { escolaId: escola.id, cargo: "diretor", nome: escola.responsavel ?? escola.nome };
  }
  return { escolaId: null, cargo: null, nome: null };
}

export function formatarData(iso: string | null) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso;
}

export function formatarHora(hora: string | null) {
  if (!hora) return "—";
  return hora.slice(0, 5);
}

async function urlParaDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarPdfOcorrencia(
  registro: RegistroOcorrencia,
  escola: { nome?: string | null; endereco?: string | null; cidade?: string | null; estado?: string | null },
  fotosUrls: string[] = [],
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const alturaPagina = doc.internal.pageSize.getHeight();
  const margem = 48;
  let y = margem;

  // Cabeçalho
  doc.setFillColor(24, 26, 31);
  doc.rect(0, 0, larguraPagina, 88, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(escola.nome ?? "Instituição de ensino", margem, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const enderecoLinha = [escola.endereco, escola.cidade, escola.estado].filter(Boolean).join(" · ");
  if (enderecoLinha) doc.text(enderecoLinha, margem, 58);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("REGISTRO DE OCORRÊNCIA", margem, 76);

  y = 120;
  doc.setTextColor(20, 20, 20);

  function linha(rotulo: string, valor: string) {
    if (y > alturaPagina - 80) {
      doc.addPage();
      y = margem;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(rotulo.toUpperCase(), margem, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const texto = doc.splitTextToSize(valor || "—", larguraPagina - margem * 2);
    doc.text(texto, margem, y + 15);
    y += 15 + texto.length * 14 + 12;
    doc.setDrawColor(225, 225, 225);
    doc.line(margem, y - 8, larguraPagina - margem, y - 8);
  }

  linha("Aluno(a)", registro.aluno_nome ?? "—");
  linha("Turma", registro.turma ?? "—");
  linha(
    "Data e horário da ocorrência",
    `${formatarData(registro.data_ocorrencia)}${registro.hora_ocorrencia ? ` às ${formatarHora(registro.hora_ocorrencia)}` : ""}`,
  );
  linha("Local", registro.local_ocorrencia ?? "—");
  linha("Tipo / categoria", registro.categoria ?? "—");
  linha("Descrição", registro.descricao ?? "—");
  if (registro.detalhes) linha("Detalhes", registro.detalhes);
  linha("Responsável pelo registro", registro.responsavel_registro ?? "—");

  // Fotos anexadas
  for (const url of fotosUrls) {
    const dataUrl = await urlParaDataUrl(url);
    if (!dataUrl) continue;
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ANEXO FOTOGRÁFICO", margem, margem);
    try {
      doc.addImage(dataUrl, "JPEG", margem, margem + 16, larguraPagina - margem * 2, 0);
    } catch {
      /* imagem inválida */
    }
  }

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Documento gerado em ${new Date().toLocaleString("pt-BR")}  ·  Página ${p} de ${total}`,
      margem,
      alturaPagina - 28,
    );
  }

  const nome = `ocorrencia-${(registro.aluno_nome ?? "registro").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${registro.data_ocorrencia ?? ""}.pdf`;
  doc.save(nome);
}
