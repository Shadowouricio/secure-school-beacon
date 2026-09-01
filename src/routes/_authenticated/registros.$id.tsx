import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  formatarData,
  formatarHora,
  gerarPdfOcorrencia,
  type RegistroOcorrencia,
} from "@/lib/ocorrencias";

export const Route = createFileRoute("/_authenticated/registros/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da Ocorrência | Rede de Segurança Escolar" },
      {
        name: "description",
        content:
          "Consulte os dados completos de uma ocorrência escolar registrada e gere o PDF do documento.",
      },
      { property: "og:title", content: "Detalhes da Ocorrência Escolar" },
      {
        property: "og:description",
        content: "Dados do aluno, turma, local, descrição, fotos e geração de PDF.",
      },
    ],
  }),
  component: DetalheOcorrencia,
});

function DetalheOcorrencia() {
  const { id } = Route.useParams();
  const [gerando, setGerando] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["registros", id],
    queryFn: async () => {
      const { data: registro, error } = await supabase
        .from("alertas")
        .select(
          "id, escola_id, aluno_nome, turma, data_ocorrencia, hora_ocorrencia, local_ocorrencia, categoria, descricao, detalhes, responsavel_registro, created_at, created_by",
        )
        .eq("id", id)
        .single();
      if (error) throw error;

      const { data: escola } = await supabase
        .from("escolas")
        .select("nome, endereco, cidade, estado")
        .eq("id", registro.escola_id)
        .maybeSingle();

      const { data: fotos } = await supabase
        .from("ocorrencia_fotos")
        .select("storage_path")
        .eq("alerta_id", id);

      const urls: string[] = [];
      for (const foto of fotos ?? []) {
        const { data: assinada } = await supabase.storage
          .from("ocorrencias")
          .createSignedUrl(foto.storage_path, 3600);
        if (assinada?.signedUrl) urls.push(assinada.signedUrl);
      }

      return { registro: registro as RegistroOcorrencia, escola: escola ?? {}, urls };
    },
  });

  async function baixarPdf() {
    if (!data) return;
    setGerando(true);
    try {
      await gerarPdfOcorrencia(data.registro, data.escola, data.urls);
    } catch (e) {
      toast.error("Não foi possível gerar o PDF", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGerando(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell titulo="Ocorrência">
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell titulo="Ocorrência">
        <p className="py-16 text-center text-sm text-muted-foreground">Ocorrência não encontrada.</p>
      </AppShell>
    );
  }

  const r = data.registro;

  return (
    <AppShell titulo="Ocorrência">
      <h1 className="font-display text-2xl font-bold">Registro de ocorrência</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatarData(r.data_ocorrencia)}
        {r.hora_ocorrencia ? ` às ${formatarHora(r.hora_ocorrencia)}` : ""}
      </p>

      <div className="mt-6 space-y-3 rounded-xl border border-border bg-surface p-4">
        <Item rotulo="Aluno(a)" valor={r.aluno_nome} />
        <Item rotulo="Turma" valor={r.turma} />
        <Item rotulo="Local" valor={r.local_ocorrencia} />
        <Item rotulo="Tipo / categoria" valor={r.categoria} />
        <Item rotulo="Descrição" valor={r.descricao} />
        <Item rotulo="Detalhes" valor={r.detalhes} />
        <Item rotulo="Responsável pelo registro" valor={r.responsavel_registro} />
      </div>

      {data.urls.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {data.urls.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={`Anexo fotográfico ${i + 1} da ocorrência`}
              className="h-24 w-full rounded-lg border border-border object-cover"
            />
          ))}
        </div>
      ) : null}

      <Button onClick={baixarPdf} size="lg" className="mt-6 w-full" disabled={gerando}>
        {gerando ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
        Gerar PDF
      </Button>
    </AppShell>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="text-sm">{valor?.trim() ? valor : "—"}</p>
    </div>
  );
}
