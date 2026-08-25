import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIAS_OCORRENCIA, carregarPerfilEscolar } from "@/lib/ocorrencias";

export const Route = createFileRoute("/_authenticated/registros/novo")({
  head: () => ({
    meta: [
      { title: "Nova Ocorrência Escolar | Rede de Segurança Escolar" },
      {
        name: "description",
        content:
          "Formulário de registro de ocorrência escolar com aluno, turma, local, descrição e fotos. Apenas a data da ocorrência é obrigatória.",
      },
      { property: "og:title", content: "Nova Ocorrência Escolar" },
      {
        property: "og:description",
        content: "Registre ocorrências da escola com fotos e gere o PDF do documento.",
      },
    ],
  }),
  component: NovaOcorrencia,
});

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function NovaOcorrencia() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputFoto = useRef<HTMLInputElement>(null);

  const [aluno, setAluno] = useState("");
  const [turma, setTurma] = useState("");
  const [data, setData] = useState(hoje());
  const [hora, setHora] = useState("");
  const [local, setLocal] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [detalhes, setDetalhes] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erroData, setErroData] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const perfil = await carregarPerfilEscolar();
      if (perfil.nome) setResponsavel((atual) => atual || perfil.nome!);
    })();
  }, []);

  useEffect(() => {
    const urls = fotos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [fotos]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    // Regra: apenas a data da ocorrência é obrigatória.
    if (!data.trim()) {
      setErroData("A data da ocorrência é obrigatória.");
      toast.error("A data da ocorrência é obrigatória.");
      return;
    }
    setErroData(null);
    setSalvando(true);

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    const perfil = await carregarPerfilEscolar();
    if (!uid || !perfil.escolaId) {
      setSalvando(false);
      toast.error("Seu usuário não está vinculado a uma escola.");
      return;
    }

    const { data: criado, error } = await supabase
      .from("alertas")
      .insert({
        escola_id: perfil.escolaId,
        created_by: uid,
        registro_tipo: "ocorrencia",
        prioridade: "baixa",
        orgaos_destino: [],
        aluno_nome: aluno.trim() || null,
        turma: turma.trim() || null,
        data_ocorrencia: data,
        hora_ocorrencia: hora || null,
        local_ocorrencia: local.trim() || null,
        categoria: categoria || null,
        descricao: descricao.trim() || null,
        detalhes: detalhes.trim() || null,
        responsavel_registro: responsavel.trim() || null,
      })
      .select("id")
      .single();

    if (error || !criado) {
      setSalvando(false);
      toast.error("Não foi possível salvar a ocorrência", { description: error?.message });
      return;
    }

    for (const arquivo of fotos) {
      const ext = arquivo.name.split(".").pop() ?? "jpg";
      const caminho = `${perfil.escolaId}/${criado.id}/${crypto.randomUUID()}.${ext}`;
      const { error: erroUpload } = await supabase.storage
        .from("ocorrencias")
        .upload(caminho, arquivo, { contentType: arquivo.type });
      if (erroUpload) {
        toast.error("Falha ao enviar uma das fotos", { description: erroUpload.message });
        continue;
      }
      await supabase
        .from("ocorrencia_fotos")
        .insert({ alerta_id: criado.id, storage_path: caminho, created_by: uid });
    }

    setSalvando(false);
    await queryClient.invalidateQueries({ queryKey: ["registros"] });
    toast.success("Ocorrência registrada com sucesso");
    navigate({ to: "/registros/$id", params: { id: criado.id } });
  }

  return (
    <AppShell titulo="Nova ocorrência">
      <h1 className="font-display text-2xl font-bold">Registro de ocorrência</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Somente a <strong>data da ocorrência</strong> é obrigatória. Os demais campos são opcionais.
      </p>

      <form onSubmit={salvar} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nome do aluno" value={aluno} onChange={setAluno} placeholder="Opcional" />
          <Campo label="Turma" value={turma} onChange={setTurma} placeholder="Opcional" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="data" className="text-xs uppercase tracking-wide text-muted-foreground">
              Data da ocorrência <span className="text-emergency">*</span>
            </Label>
            <Input
              id="data"
              type="date"
              value={data}
              onChange={(e) => {
                setData(e.target.value);
                if (e.target.value) setErroData(null);
              }}
              aria-invalid={!!erroData}
              className="h-11 bg-surface"
            />
            {erroData ? <p className="text-xs text-emergency">{erroData}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hora" className="text-xs uppercase tracking-wide text-muted-foreground">
              Horário da ocorrência
            </Label>
            <Input
              id="hora"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="h-11 bg-surface"
            />
          </div>
        </div>

        <Campo label="Local da ocorrência" value={local} onChange={setLocal} placeholder="Ex.: pátio, sala 3B" />

        <div className="space-y-1.5">
          <Label htmlFor="categoria" className="text-xs uppercase tracking-wide text-muted-foreground">
            Tipo / categoria
          </Label>
          <select
            id="categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-surface px-3 text-sm"
          >
            <option value="">Selecione (opcional)</option>
            {CATEGORIAS_OCORRENCIA.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <AreaTexto label="Descrição da ocorrência" value={descricao} onChange={setDescricao} />
        <AreaTexto label="Detalhes adicionais" value={detalhes} onChange={setDetalhes} />
        <Campo label="Professor / responsável pelo registro" value={responsavel} onChange={setResponsavel} />

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Fotos (opcional)
          </Label>
          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setFotos((atual) => [...atual, ...Array.from(e.target.files ?? [])])}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputFoto.current?.click()}
            className="w-full"
          >
            <ImagePlus className="size-4" />
            Anexar fotos
          </Button>
          {previews.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative overflow-hidden rounded-lg border border-border">
                  <img src={src} alt={`Anexo ${i + 1}`} className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remover foto"
                    onClick={() => setFotos((atual) => atual.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-1"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={salvando}>
          {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar ocorrência
        </Button>
      </form>
    </AppShell>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Opcional"}
        className="h-11 bg-surface"
      />
    </div>
  );
}

function AreaTexto({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Opcional"
        className="bg-surface"
      />
    </div>
  );
}
