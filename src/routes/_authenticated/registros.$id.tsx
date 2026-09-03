import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  carregarPerfilEscolar,
  formatarData,
  formatarHora,
  gerarPdfOcorrencia,
  type RegistroOcorrencia,
} from "@/lib/ocorrencias";

type FotoAnexo = { id: string; storage_path: string; url: string };

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
  const queryClient = useQueryClient();
  const inputFoto = useRef<HTMLInputElement>(null);
  const [gerando, setGerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

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
        .select("id, storage_path")
        .eq("alerta_id", id)
        .order("created_at", { ascending: true });

      const anexos: FotoAnexo[] = [];
      for (const foto of fotos ?? []) {
        const { data: assinada } = await supabase.storage
          .from("ocorrencias")
          .createSignedUrl(foto.storage_path, 3600);
        if (assinada?.signedUrl) {
          anexos.push({ id: foto.id, storage_path: foto.storage_path, url: assinada.signedUrl });
        }
      }

      const perfil = await carregarPerfilEscolar();

      return {
        registro: registro as RegistroOcorrencia,
        escola: escola ?? {},
        anexos,
        cargo: perfil.cargo,
      };
    },
  });

  async function baixarPdf() {
    if (!data) return;
    setGerando(true);
    try {
      await gerarPdfOcorrencia(
        data.registro,
        data.escola,
        data.anexos.map((a) => a.url),
      );
    } catch (e) {
      toast.error("Não foi possível gerar o PDF", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGerando(false);
    }
  }

  async function anexarFotos(arquivos: File[]) {
    if (!data || arquivos.length === 0) return;
    setEnviando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada. Entre novamente.");

      for (const arquivo of arquivos) {
        const ext = arquivo.name.split(".").pop() ?? "jpg";
        const caminho = `${data.registro.escola_id}/${id}/${crypto.randomUUID()}.${ext}`;
        const { error: erroUpload } = await supabase.storage
          .from("ocorrencias")
          .upload(caminho, arquivo, { contentType: arquivo.type });
        if (erroUpload) {
          toast.error("Falha ao enviar uma das fotos", { description: erroUpload.message });
          continue;
        }
        await supabase
          .from("ocorrencia_fotos")
          .insert({ alerta_id: id, storage_path: caminho, created_by: uid });
      }
      await queryClient.invalidateQueries({ queryKey: ["registros", id] });
      toast.success("Foto anexada à ocorrência");
    } catch (e) {
      toast.error("Não foi possível anexar a foto", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setEnviando(false);
      if (inputFoto.current) inputFoto.current.value = "";
    }
  }

  async function removerFoto(foto: FotoAnexo) {
    setRemovendoId(foto.id);
    try {
      const { error: erroStorage } = await supabase.storage
        .from("ocorrencias")
        .remove([foto.storage_path]);
      if (erroStorage) throw erroStorage;
      await supabase.from("ocorrencia_fotos").delete().eq("id", foto.id);
      await queryClient.invalidateQueries({ queryKey: ["registros", id] });
      toast.success("Foto removida");
    } catch (e) {
      toast.error("Não foi possível remover a foto", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setRemovendoId(null);
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

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Fotos anexadas
          </h2>
          <span className="text-xs text-muted-foreground">{data.anexos.length}</span>
        </div>

        <input
          ref={inputFoto}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void anexarFotos(Array.from(e.target.files ?? []))}
        />

        {data.anexos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {data.anexos.map((foto, i) => (
              <div key={foto.id} className="relative overflow-hidden rounded-lg border border-border">
                <img
                  src={foto.url}
                  alt={`Anexo fotográfico ${i + 1} da ocorrência`}
                  className="h-24 w-full object-cover"
                />
                {data.cargo === "diretor" ? (
                  <button
                    type="button"
                    aria-label={`Remover anexo ${i + 1}`}
                    disabled={removendoId === foto.id}
                    onClick={() => void removerFoto(foto)}
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-emergency"
                  >
                    {removendoId === foto.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nenhuma foto anexada.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={enviando}
          onClick={() => inputFoto.current?.click()}
        >
          {enviando ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          Anexar foto
        </Button>
      </div>

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
